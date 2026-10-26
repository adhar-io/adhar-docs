---
title: "Functions"
section: "Core Concepts"
order: 5
badge: "planned"
path: "/docs/core-concepts/functions"
---

# Functions

A **Function** is the smallest thing you can run on Adhar: one HTTP handler, packaged as a container image. When nobody calls it, the platform scales it to zero. When traffic or an event arrives, the platform scales it back up. You write the handler and a short `Function` resource. The platform builds, signs, deploys, routes and scales it.

This page explains the Function model from end to end: the resource, the runtimes, the handler contract, triggers, scaling, delivery, security and observability. It is for application developers deciding between a Function and a long-running service. It is also for platform engineers who enable and operate the engine behind it.

> **Status: planned.** This page describes how Functions are designed to work. The five function templates, and the `Function` manifest they generate, exist today. The `Function` definition (XRD), its composition, the Knative Serving install and the trigger wiring have not shipped. [What exists today](#what-exists-today) lists every piece and its status. Read it before you build on Functions.

## At a glance

| | |
|---|---|
| **The resource** | `Function` in `platform.adhar.io/v1alpha1`, a namespaced Crossplane composite resource |
| **What runs it** | Knative Serving, installed by the `knative` package (Knative Operator v1.22.2) |
| **Runtimes** | Node.js 20, Go 1.25, Python 3.12, Java 21, Deno 2, with one template each |
| **Triggers** | `http`, `cloudevent`, `topic`, `bucket`, `cron` |
| **Scaling** | From `minScale` (default `0`) to `maxScale` (default `10`); scales to zero when idle |
| **Timeout** | `timeoutSeconds`: default `30`, maximum `300` |
| **How you create one** | `adhar application deploy <name> --template function-<lang>-service --path deploy`, or the Console's Create wizard |
| **Where the image comes from** | The paved-road `app-ci` pipeline: buildpacks, then scan, sign and push to Harbor |
| **Where you see it** | Console → Platform → Functions, or `kubectl get functions.platform.adhar.io -n <namespace>` |

## When to use a Function

A Function and an `Application` both run your container from Git. They differ in what the platform assumes about traffic.

| Choose a **Function** when | Choose an **Application** ([Your First Service](/docs/getting-started/first-service)) when |
|---|---|
| Traffic is bursty, rare or event-driven: webhooks, queue consumers, scheduled jobs, file processing | Traffic is steady, or the service must answer instantly at all times |
| Each request finishes within five minutes | Requests stream, hold long connections or run for longer |
| The handler is stateless, and state lives in a database, cache or bucket | The workload keeps state in memory or needs a persistent volume |
| A cold start on the first request after idle is acceptable | Every request has a tight latency target (or set `minScale: 1`, see [Cold starts](#cold-starts)) |
| You want one small handler per event type | You want the golden path's dev/test/prod overlays, PDBs, HPAs and alerts |

**A Function is not a lighter Application.** The function templates get less of the paved road than the service templates do (see [What exists today](#what-exists-today)). Use a Function where scale-to-zero pays for itself.

## The model

You declare a `Function`. Crossplane expands it through the composition labelled `feature: function`. The result is a Knative Service, plus the object that delivers events to it when the trigger is not `http`. Knative turns every change into an immutable Revision and scales that Revision's pods:

```diagram
fn-model
```

This is the pattern every platform API follows: a `Database` becomes a CloudNativePG cluster, and an `Application` becomes an Argo CD Application. [Control Plane](/docs/core-concepts/control-plane) explains how claims, XRDs and compositions fit together.

Following platform convention, the XRD is named `functions.platform.adhar.io`. The kind has no `Composite` prefix, and its plural is `functions`.

> **Two different kinds of "function".** Crossplane has *composition functions* (`pkg.crossplane.io/v1` `Function`, such as `function-kcl`), which the control plane uses to render compositions. They have nothing to do with the workloads on this page. On a platform cluster, plain `kubectl get functions` is ambiguous, so always write `kubectl get functions.platform.adhar.io`.

## The Function resource

Every template generates `deploy/function.yaml`. Here is the Go template's, rendered for a function called `thumbnails`:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Function
metadata:
  name: thumbnails
  labels:
    app.kubernetes.io/name: thumbnails
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        feature: function
  parameters:
    runtime: go122
    image: harbor-core.adhar-system.svc.cluster.local/library/thumbnails:latest
    trigger: http
    eventSource: ""
    minScale: 0
    maxScale: 10
    timeoutSeconds: 30
```

**`metadata.name`** must be DNS-friendly. Use lowercase letters, digits and hyphens, start with a letter, and keep it to 40 characters or fewer (`^[a-z]([-a-z0-9]*[a-z0-9])?$`). The name is used for the Function, the Knative Service, the Gitea repository and the Harbor image, and all four must stay equal. The CI write-back only rewrites an image whose name matches the repository.

**`spec.crossplane.compositionSelector`** picks the composition. Leave it as `feature: function`.

**`spec.parameters`:**

| Field | Type | Default | Allowed | Meaning |
|---|---|---|---|---|
| `runtime` | string | set by the template | `node20`, `go122`, `python312`, `custom` | The language of the handler. It is recorded on the Function and passed to the handler as `FUNCTION_RUNTIME`. It does not choose the builder: buildpacks detect the language from the source |
| `image` | string | `harbor-core.adhar-system.svc.cluster.local/library/<name>:latest` | — | The container image to run. `app-ci` rewrites the tag to the commit SHA after every build |
| `trigger` | string | `http` | `http`, `cloudevent`, `topic`, `bucket`, `cron` | What invokes the function. See [Triggers](#triggers) |
| `eventSource` | string | `""` | depends on `trigger` | Where events come from, for non-HTTP triggers. Empty for `http` |
| `minScale` | integer | `0` | 0–20 | Pods kept running when idle. `0` turns on scale-to-zero |
| `maxScale` | integer | `10` | 1–200 | The most pods the autoscaler may run. It caps cost, and the load the function can put on the systems it calls |
| `timeoutSeconds` | integer | `30` | 1–300 | The longest a single request may run before Knative ends it |

The composition maps these fields onto standard Knative settings, so Knative's own documentation applies:

| Function field | Knative setting |
|---|---|
| `image` | `spec.template.spec.containers[0].image` on the Knative Service |
| `minScale` | the `autoscaling.knative.dev/min-scale` annotation on the Revision template |
| `maxScale` | the `autoscaling.knative.dev/max-scale` annotation |
| `timeoutSeconds` | `spec.template.spec.timeoutSeconds` |
| `metadata.name`, `trigger`, `runtime` | the `FUNCTION_NAME`, `FUNCTION_TRIGGER` and `FUNCTION_RUNTIME` environment variables |

v1alpha1 has no fields for environment variables, secrets, resource requests, concurrency or a service account.

## Runtimes and templates

There is one template per language. They are served from the `adhar/adhar-templates` repository in the platform's Gitea, which mirrors `github.com/adhar-io/adhar-templates`. Each template generates a complete repository that runs as it is:

| Template | Language | Handler | `runtime` | Run it locally |
|---|---|---|---|---|
| `function-nodejs-service` | Node.js 20 | `index.js`, using Node's `http` module | `node20` | `npm install && npm run dev` |
| `function-go-service` | Go 1.25 | `main.go`, using `net/http` | `go122` | `go run .` |
| `function-python-service` | Python 3.12 with Flask | `app.py`, served by gunicorn (see `Procfile`) | `python312` | `pip install -r requirements.txt && python app.py` |
| `function-java-service` | Java 21 | `src/main/java/App.java`, using the JDK's `com.sun.net.httpserver` | `custom` | `mvn -q exec:java` |
| `function-deno-service` | Deno 2 | `src/main.ts`, using `Deno.serve` | `custom` | `deno task dev` |

Every generated repository has the same shape:

```text
<name>/
├── index.js | main.go | app.py | src/…   # the handler
├── project.toml                           # buildpack metadata (Paketo builder-jammy-base)
├── deploy/
│   ├── kustomization.yaml                 # lists function.yaml
│   └── function.yaml                      # the Function resource
├── catalog-info.yaml                      # catalog Component, lifecycle: experimental
├── docs/index.md, mkdocs.yml              # TechDocs
└── README.md
```

To list the templates on your platform, and the parameters each one accepts:

```bash
adhar application templates | grep function
adhar application templates function-go-service
```

## The handler contract

The platform does not wrap your code in a framework. A function is any HTTP server that follows four rules:

1. **Listen on `$PORT`.** Knative sets it, to 8080 by default. Do not hard-code a port.
2. **Answer `GET /healthz` with 200** once the process is ready to serve.
3. **Finish every request within `timeoutSeconds`.**
4. **Keep no state between requests.** Any pod can serve any request, and pods disappear when the function scales down.

The platform sets these environment variables:

| Variable | Value |
|---|---|
| `PORT` | The port to listen on |
| `FUNCTION_NAME` | `metadata.name` |
| `FUNCTION_TRIGGER` | `spec.parameters.trigger` |
| `FUNCTION_RUNTIME` | `spec.parameters.runtime` |

The Go template's handler, abridged:

```go
func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, payload{"ok": true, "at": time.Now().UTC().Format(time.RFC3339)})
	})

	http.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, payload{
			"ok":       true,
			"function": os.Getenv("FUNCTION_NAME"),
			"runtime":  "go122",
			"trigger":  os.Getenv("FUNCTION_TRIGGER"),
			"at":       time.Now().UTC().Format(time.RFC3339),
		})
	})

	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

The other four templates implement the same two routes in their own language.

### Receiving events

Every non-HTTP trigger delivers its events the same way: as a **CloudEvent in an HTTP `POST` to `/`**. Knative uses CloudEvents *binary* mode. The event's attributes arrive as `ce-` headers, and its data is the request body:

```http
POST / HTTP/1.1
ce-specversion: 1.0
ce-type: io.adhar.platform.component.ready
ce-source: <producer>
ce-id: <unique event id>
content-type: application/json

{ …event data… }
```

Return a 2xx status to acknowledge an event. A non-2xx status, or a request that runs past `timeoutSeconds`, counts as a failed delivery and is retried with backoff. **Delivery is at least once, so make handlers idempotent.** Use `ce-id` to recognise an event you have already handled.

## Triggers

`trigger` says what invokes the function. `eventSource` says where its events come from:

```diagram
fn-triggers
```

| `trigger` | `eventSource` format | Example | What invokes the handler |
|---|---|---|---|
| `http` | empty | `""` | HTTP requests to the function's URL |
| `cloudevent` | a CloudEvent `type` from the platform event bus | `io.adhar.platform.component.ready` | Every event of that type on the bus |
| `topic` | `kafka://<topic>` for a Kafka topic, or `topic://<name>` for a platform `Topic` in the same namespace | `kafka://orders-events` | Every record on the topic |
| `bucket` | `bucket://<bucket>/<key prefix>*` | `bucket://web-assets/uploads/*` | Every object created under the prefix |
| `cron` | a five-field cron expression, evaluated in UTC | `"*/15 * * * *"` | Each tick of the schedule |

**HTTP URLs.** An `http` function gets an external URL, `https://<name>.<namespace>.<platform domain>`. On a local platform that is `https://<name>.<namespace>.adhar.localtest.me:8443`. A function with any other trigger is **cluster-local**: it has no external route, and only its event source calls it.

**The platform event bus.** `cloudevent` functions subscribe to the bus the platform itself publishes to: CloudEvents 1.0 on Kafka, written through the Strimzi KafkaBridge. Event types follow the pattern `io.adhar.<domain>.<object>.<verb>`, with the verb in the past tense, for example `io.adhar.cluster.node.added` or `io.adhar.platform.component.failed`. Publishing is advisory: the platform drops an event rather than block a reconcile. **Never make a `cloudevent` function the only record of something important.**

## Scaling

Knative's autoscaler scales each Revision on the number of requests in flight:

- **Up** as concurrent requests grow, to at most `maxScale` pods.
- **Down** as traffic falls, to `minScale`. With `minScale: 0`, the last pod is removed once the Revision has had no traffic for the stable window (60 seconds by default) plus the scale-to-zero grace period (30 seconds).

While a Revision is at zero, Knative's **activator** receives its requests. It holds each request, asks the autoscaler for a pod, and forwards the request once the pod is ready. Nothing is dropped.

For event triggers, events wait in their source (the Broker or the Kafka topic) while the function is at zero. They are delivered once a pod starts.

### Cold starts

The first request after idle pays a **cold start**. The pod is scheduled, the image is pulled if the node does not already have it, and your process starts. This takes from under a second (Go, image already on the node) to several seconds (Java, image not yet pulled).

| Lever | Effect |
|---|---|
| `minScale: 1` | Keeps one warm pod. Use it for user-facing paths with tight latency targets; it costs one pod around the clock |
| A small image that boots fast | Go and Deno start fastest. Avoid heavy work at start-up |
| A high enough `maxScale` | Stops a burst from queueing behind too few pods |

### Choosing maxScale

`maxScale` is a safety limit as much as a capacity setting. At peak, a function that writes to a database can open `maxScale` × (connections per pod) connections. Size `maxScale` to what the systems it calls can take, not only to the traffic you expect. Function pods also count against the namespace's ResourceQuota like any other pod, so `maxScale` × per-pod requests must fit inside it.

## Build and delivery

Functions use the same paved road as every service. There is no separate function builder:

```diagram
fn-delivery
```

1. **Scaffold.** The template creates the Gitea repository `adhar/<name>`, an Argo CD Application that syncs `deploy/`, and a catalog entry.
2. **Build.** Every push runs the `app-ci` Tekton pipeline. It builds the image with Cloud Native Buildpacks, which detect Java, Go, Node.js and Python from the source. Then it runs the tests, gitleaks, Trivy and an SBOM step, signs the image with cosign, and pushes `library/<name>:<sha>` and `library/<name>:latest` to Harbor.
3. **Write back.** `app-ci` rewrites the image tag in `deploy/function.yaml` to the commit SHA and commits the change. Git then always records exactly which build is running.
4. **Deploy.** Argo CD syncs the Function, and Crossplane updates the Knative Service. Knative creates a new Revision and moves traffic to it once it is Ready.

**Roll back with Git.** Revert the commit you want to undo, and the write-back of the build it triggers puts the earlier image back. Knative keeps earlier Revisions (scaled to zero), so the old image is usually still on the node.

## Enabling the engine

This section is for platform engineers. Functions depend on these packages:

| Package | Why Functions need it | `local` | `production` |
|---|---|---|---|
| `knative` | The Knative Operator. The platform creates the KnativeServing and KnativeEventing instances from it | off | off |
| `tekton`, `adhar-supply-chain` | The `app-ci` pipeline that builds function images | on | on |
| `harbor` | The registry function images are pushed to | on | on |
| `kafka-operator` | Kafka and the KafkaBridge, for `cloudevent` and `topic` triggers | off | on |
| `rustfs` | The object store behind `bucket` triggers | on | on |

Turn the engine on the GitOps way:

```bash
adhar stack describe knative       # contract, stability (alpha), footprint
adhar stack enable knative         # edits the appset and environment config; review the diff
adhar upgrade
kubectl get xrd functions.platform.adhar.io
```

> **Knative and Tekton conflict today.** Knative ships ConfigMaps with fixed upstream names, `config-logging` and `config-observability`. When both packages install into `adhar-system`, these collide with Tekton's copies, and Tekton runs `app-ci`, which builds every function. `adhar stack enable knative` does not refuse, but the two packages overwrite each other on every sync. kpack's copies of the same ConfigMaps were renamed to resolve the identical clash. Knative needs the same fix before Functions can ship. See `platform/stack/packages/CONFLICTS.md` in the platform repository.

The `open-function` package is a different, older engine. Functions do not use it, and it conflicts with Tekton too, so leave it off.

## Security

- **Signed images only.** In every profile, the Kyverno policy `verify-supply-chain-images` rejects a Pod that runs an unsigned `library/*` image from Harbor. `app-ci` signs function images. An image you build and push by hand is unsigned and will not run.
- **No `:latest` in production.** The production profile's `adhar-supply-chain-policies-enforce` pack rejects `:latest` tags. The template's `function.yaml` starts at `:latest`, so a function becomes admissible in production only after the first `app-ci` write-back has replaced the tag with a SHA.
- **HTTP functions have no SSO in front of them.** Platform UIs sit behind Keycloak, but a function URL is reachable by anyone who can reach the platform's ingress. Authenticate requests in the handler, for example by validating a bearer token or a webhook signature.
- **No Kubernetes API access.** v1alpha1 has no service-account field, so a function runs as its namespace's `default` service account. Do not grant that account any permissions.

## Observability

Function pods are ordinary pods, with your code in the `user-container` container:

- **Logs.** Write to stdout and stderr. Read them with `kubectl logs -n <namespace> -l serving.knative.dev/service=<name> -c user-container`. In the production profile, Alloy ships them to Loki.
- **Request metrics.** Knative's `queue-proxy` sidecar runs in every function pod. It measures request count, latency and concurrency per Revision, and the autoscaler scales on these numbers.
- **Traces.** The function templates do not include OpenTelemetry. Add the SDK for your language and export OTLP to Alloy, as described in [Observability](/docs/operations/observability).
- **Console.** Platform → Functions lists every Function with its readiness and the resources it composed.

```bash
kubectl get functions.platform.adhar.io -n dev
kubectl get ksvc,revisions -n dev
kubectl get pods -n dev -l serving.knative.dev/service=thumbnails -w
```

## What exists today

| Piece | Status |
|---|---|
| The five function templates and the `Function` manifest they generate | **Exists**, in `adhar-templates` since 2026-10-25 |
| `adhar application deploy --template function-*` and the Console Create wizard | **Exists**, through the generic template path |
| Build, scan, sign and write-back through `app-ci` | **Exists** for Node.js, Go, Python and Java. Deno is not in the buildpacks' auto-detect list, so the Deno template is unverified |
| The `knative` package (Knative Operator v1.22.2) | **Exists, off** in both profiles because it conflicts with `tekton` |
| KnativeServing and KnativeEventing instances | **Designed**. The package installs only the operator |
| The `functions.platform.adhar.io` XRD and the `feature: function` composition | **Designed**. Until they land, a synced `Function` has no CRD to apply to, and its Argo CD Application fails to sync |
| Trigger wiring: Broker Triggers, KafkaSource, bucket notifications, PingSource | **Designed** |
| Function URLs | **Designed** |
| Console → Platform → Functions | **Exists**, but it looks for an XRD with the plural `compositefunctions`, so it will not list `functions.platform.adhar.io` until one side changes |
| An `adhar function` CLI subcommand | **Not planned**. Use `adhar application` |
| Spec fields for environment variables, secrets, resources, concurrency and a service account | **Not in v1alpha1** |
| Promotion overlays (dev/test/prod), HPA, PDB, alerts and OpenTelemetry | **Not in the function templates**. The service templates have them |

Track progress on the [Roadmap](/docs/reference/roadmap).

## Next steps

- **[Deploy a Function](/docs/guides/deploy-a-function)** — scaffold, deploy, invoke and scale a function, step by step
- **[Your First Service](/docs/getting-started/first-service)** — the long-running alternative
- **[Control Plane](/docs/core-concepts/control-plane)** — how claims, XRDs and compositions work
- **[Platform Services](/docs/core-concepts/platform-services)** — enable `knative` and the packages it depends on
- **[Observability](/docs/operations/observability)** — logs, metrics and traces for function pods
