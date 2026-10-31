---
title: "Functions"
section: "Core Concepts"
order: 5
path: "/docs/core-concepts/functions"
---

# Functions

A **Function** is the smallest thing you can run on Adhar: one HTTP handler in a container image. When nobody calls it, the platform scales it to zero. When a request, a schedule or an event arrives, the platform scales it back up. Each environment serves it at its own HTTPS URL.

You write the handler. A template gives you everything else: the repository, the tests, the `Function` resource, the build, and the promotion from dev to test to prod.

This page explains how Functions work and why they behave as they do:

- the resource, and where a function runs
- how a request reaches your code
- triggers and scaling
- delivery, the Console, security and observability

It is for developers deciding whether a Function fits their workload, and for platform engineers who run the engine behind it. [Deploy a Function](/docs/guides/deploy-a-function) walks through the same ground hands-on. The [Function API reference](/docs/reference/function-api) lists every field, condition and command.

## At a glance

| | |
|---|---|
| **The resource** | `Function` in `platform.adhar.io/v1alpha1`: a namespaced Crossplane composite resource, rendered by the composition `function-local-knative` |
| **What runs it** | Knative Serving and Eventing, from the `knative` package (Knative Operator v1.23.1), with Kourier as the in-cluster ingress behind the platform Gateway. Dapr handles topic triggers |
| **Templates** | Go, Node.js, Python, Java and Deno, each a tested, runnable repository with an OpenAPI contract |
| **Invoked by** | HTTP, always; plus schedules (`cron`), CloudEvents (`cloudevent`) and pub/sub topics (`topic`) |
| **Scaling** | From `minScale` (default `0`, so scale-to-zero) to `maxScale`, at a target of 100 in-flight requests per pod |
| **Request timeout** | `timeoutSeconds`: default `30`, maximum `600` |
| **URL** | `https://<name>.<environment>.<platform domain>`, or in-cluster only with `visibility: cluster` |
| **Delivery** | An `Application` of type `function`: `app-ci` builds and signs it, Kargo promotes it dev → test → prod, Argo CD syncs it |
| **Where you manage it** | Console → **Develop → Functions**; `kubectl get functions.platform.adhar.io`; `adhar function` |
| **Profiles** | On in `production`. Off in `local`; see [Enable the engine](#enable-the-engine) |

## When to use a Function

A Function and a service template both run your container from Git, through the same build and promotion chain. They differ in what the platform assumes about traffic.

| Choose a **Function** when | Choose a **service** ([Your First Service](/docs/getting-started/first-service)) when |
|---|---|
| Traffic is bursty, rare or event-driven: webhooks, scheduled jobs, event and queue consumers | Traffic is steady, or every request must be answered instantly |
| Each request finishes within ten minutes | Requests stream, hold long connections or run for longer |
| The handler is stateless; state lives in a database, cache or bucket | The workload keeps state in memory or needs a persistent volume |
| A cold start on the first request after idle is acceptable | Latency targets rule out cold starts (or set `minScale: 1`; see [Cold starts](#cold-starts)) |
| The defaults (100m CPU, 128Mi requested; 500m, 512Mi limit) are enough | You need to size CPU and memory, mount volumes or run as a specific service account |

**Idle functions cost nothing.** A function at zero runs no pods. Knative's activator is shared by every function and waits for its next request.

## The model

You declare a `Function`. The composition `function-local-knative` renders it into Kubernetes objects, and Knative runs the result:

```diagram
fn-model
```

The composition creates these objects:

| Object | Purpose | When |
|---|---|---|
| Knative `Service` `<name>` | Runs the function. Always `cluster-local`: Knative publishes nothing outside the cluster itself | Always |
| `NetworkPolicy` `<name>-from-knative` | Lets Knative's activator and event sources reach the pods. Environment namespaces deny all other ingress by default | In an environment namespace |
| `ClusterDomainClaim`, `DomainMapping`, `HTTPRoute`, `ReferenceGrant` | Publish the function on the platform Gateway at its hostname | `visibility: public`, once the platform domain is known |
| `PingSource`, `Trigger` and `Broker`, or Dapr `Subscription` | One event source per trigger | Per trigger |

Every change to the Function's image or configuration creates a new **Revision**, an immutable snapshot. Knative routes traffic to the newest Revision only once it is Ready. Until then, the previous one keeps answering.

The composition writes the outcome back to the Function. `status.url`, `status.readyRevision` and `status.triggers` tell you what is serving. The conditions `ServiceReady`, `EdgeReady`, `TriggersReady` and `Placement` tell you why something is not. They are listed in the [reference](/docs/reference/function-api#conditions).

> **Two kinds of "function".** Crossplane also has *composition functions* (`pkg.crossplane.io/v1` `Function`, such as `function-go-templating`), which the control plane uses to render compositions. They are unrelated to this page. On a platform cluster, plain `kubectl get functions` is ambiguous, so always write `kubectl get functions.platform.adhar.io`.

## Where a function runs

**A function's namespace decides where it runs, not its parameters.** A Project creates one namespace per environment, labelled with its organisation, team, project and environment. A Function in that namespace takes those four values from the labels, and they override anything in `spec.parameters`. The `Placement` condition reports when a parameter disagreed and was ignored.

This is why one `deploy/base/function.yaml` serves every environment: each overlay places it in a different namespace. For the default project `adhar`, those namespaces are `dev`, `test` and `prod`.

A Function outside an environment namespace runs too. In that case it uses the `organisation`, `team`, `project` and `environment` parameters, which default to `adhar`, `platform`, no project and `dev`. It gets no NetworkPolicy, because only environment namespaces deny ingress by default.

## How a request reaches your code

```diagram
fn-request-path
```

1. The platform **Gateway** (`adhar-system/adhar-gateway`) terminates TLS for `<name>.<environment>.<platform domain>`, a host it already holds a certificate for.
2. The function's **HTTPRoute** sends the request to **Kourier**, Knative's ingress, which listens only inside the cluster. The route's timeout is the function's `timeoutSeconds` plus 15 seconds, so Knative, not the Gateway, decides when a request has run too long.
3. Kourier resolves the **DomainMapping** for the host to the function's Knative Service.
4. If the function is **scaled to zero**, Knative's **activator** holds the request, asks the autoscaler for a pod, and forwards the request once the pod is ready.
5. The **queue-proxy** sidecar in the pod counts the request for the autoscaler, enforces the timeout and any concurrency limit, and hands the request to your process on `$PORT`.

### URLs and visibility

| `visibility` | URL (`status.url`) | Reachable from |
|---|---|---|
| `public` (default) | `https://<name>.<environment>.<platform domain>` | Anything that can reach the platform Gateway |
| `cluster` | `http://<name>.<namespace>.svc.cluster.local` | Inside the cluster only, including the function's event sources |

On a local platform, the public URL carries the Gateway's port: `https://<name>.dev.adhar.localtest.me:8443`. When the domain's first label is the environment name itself, the host becomes `<name>-<environment>.<domain>`, so that the environment does not appear twice.

**Custom hostnames.** Set `spec.parameters.hostname` to serve the function somewhere else, such as `api.example.org`. You also need DNS that points at the Gateway, and a certificate the Gateway serves for that name.

**A hostname belongs to one namespace.** The first namespace to claim a host keeps it: the composition creates the `ClusterDomainClaim` but never updates or deletes it. A Function in another namespace that asks for the same host gets `EdgeReady=False` with reason `HostClaimed`, and serves only inside the cluster.

## The handler contract

The platform does not wrap your code in a framework. A function is any HTTP server that follows these rules:

1. **Listen on `$PORT`.** Knative sets it from `spec.parameters.port`, which defaults to 8080. Knative's queue-proxy reserves ports 8008, 8012, 8013, 8022, 9090 and 9091.
2. **Answer `GET /healthz`** once the process can serve.
3. **Treat every other request as an invocation.** Events arrive as `POST` requests to the trigger's `path`, which defaults to `/`.
4. **Finish each request within `timeoutSeconds`.**
5. **Exit cleanly on `SIGTERM`.** Knative sends it before removing a pod. Finish the requests in flight, then exit. The templates allow 25 seconds.
6. **Keep no state between requests.** Any pod can serve any request, and pods disappear when the function scales down.

The platform injects these environment variables. Your own `spec.parameters.env` entries are applied after them and override them:

| Variable | Value |
|---|---|
| `FUNCTION_NAME`, `APP_ID` | The Function's name |
| `FUNCTION_RUNTIME` | `spec.parameters.runtime` |
| `FUNCTION_TRIGGER` | The trigger types, comma-separated (for example `cron,cloudevent`), or `http` when there are none |
| `ADHAR_ENVIRONMENT` | `dev`, `test` or `prod` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://alloy.adhar-system.svc.cluster.local:4318` |
| `OTEL_SERVICE_NAME` | The Function's name |
| `OTEL_RESOURCE_ATTRIBUTES` | `deployment.environment.name=<env>,deployment.environment=<env>,service.namespace=<namespace>` |
| `PORT`, `K_SERVICE`, `K_REVISION`, `K_CONFIGURATION` | Set by Knative. `env` may not override them |
| `BPL_JVM_THREAD_COUNT`, `JAVA_TOOL_OPTIONS` | Java runtimes only: `50` and `-XX:ReservedCodeCacheSize=64M`, so the JVM fits the default 512Mi limit |

### Receiving events

A `cron` or `cloudevent` trigger delivers a CloudEvent in *binary* mode. The event's attributes arrive as `ce-` headers, and its data is the request body:

```http
POST / HTTP/1.1
ce-specversion: 1.0
ce-type: com.acme.order.created
ce-source: shop
ce-id: 6f0c2b5e-…
content-type: application/json

{"order": 1042}
```

A `topic` trigger delivers through Dapr, which sends the message as a CloudEvent in *structured* mode: the body is `application/cloudevents+json`, and the message is its `data` field.

Return a 2xx status to acknowledge an event. What happens after a failure depends on the trigger. See [Triggers](#triggers).

## Templates

Each template generates a complete repository. It runs and passes its tests as soon as it is created:

| Template | Language | Handler | `runtime` | Run and test locally |
|---|---|---|---|---|
| `function-go-service` | Go 1.26, standard library only | `handler.go`, `main.go` | `go125` | `go run .` · `go test ./...` |
| `function-nodejs-service` | Node.js 24, no dependencies | `index.js` (`node:http`) | `node24` | `npm start` · `npm test` |
| `function-python-service` | Python 3.13, Flask, served by gunicorn | `app.py` | `python313` | `flask --app app run --port 8080` · `python -m pytest` |
| `function-java-service` | Java 25, JDK `HttpServer` on virtual threads | `src/main/java/io/adhar/function/App.java` | `java25` | `mvn -q package && java -jar target/<name>-0.1.0.jar` · `mvn verify` |
| `function-deno-service` | TypeScript written for Deno (`Deno.serve`) | `src/main.ts` | `node24` | The builder has no Deno buildpack, so the image runs the source on Node.js 24 |

Every template produces the same layout. The Go template's:

```text
<name>/
├── handler.go, main.go, handler_test.go   # the function and its tests
├── project.toml                           # buildpack builder and runtime version
├── api/openapi.yaml                       # the HTTP contract, published to the catalog as <name>-api
├── deploy/
│   ├── base/
│   │   ├── function.yaml                  # the Function: one definition for every environment
│   │   ├── kustomization.yaml
│   │   └── kustomizeconfig.yaml           # tells kustomize where a Function keeps its image
│   └── envs/
│       ├── dev/kustomization.yaml         # namespace, environment and image pin, per environment
│       ├── test/kustomization.yaml
│       └── prod/kustomization.yaml
├── catalog-info.yaml                      # Component (type: function) and API entities
├── docs/                                  # index, architecture, operations (TechDocs)
└── README.md
```

The Create form asks for three groups of values, besides the repository:

- **Function:** name, description and owner.
- **Runtime:** trigger, event source, visibility, timeout, and minimum and maximum instances.
- **Operations:** lifecycle, tier, documentation URL, runbook URL, on-call, and availability SLO.

The Operations values land in `catalog-info.yaml`, so the function starts with a scorecard score rather than earning one later. Everything in Runtime lands in `deploy/base/function.yaml`, where you can change it later.

## Triggers

**Every function answers HTTP.** Triggers add event sources that invoke it as well:

```diagram
fn-triggers
```

Declare triggers as a list. One function can have up to 16:

```yaml
spec:
  parameters:
    triggers:
      - type: cron
        name: nightly
        schedule: "0 3 * * *"
        timezone: Europe/Berlin
        data: '{"sweep": true}'
      - type: cloudevent
        filter:
          type: com.acme.media.uploaded
          source: media
        path: /events
      - type: topic
        topic: media.resized
        deadLetterTopic: media.dead
```

| Type | Composed into | Delivery | After a failed delivery |
|---|---|---|---|
| `cron` | Knative `PingSource` | A CloudEvent on each tick of `schedule` (crontab syntax, in `timezone`, default UTC). Each tick carries `data` | Not retried. The next tick runs as scheduled |
| `cloudevent` | Knative `Trigger` on a `Broker` in the namespace (`default` unless you name one) | Every event whose attributes exactly match `filter` | Not retried. The Broker is in-memory: an event in flight is lost if the dispatcher restarts |
| `topic` | Dapr `Subscription` | Every message on `topic` of the pub/sub component (`pubsub` unless you name one) | Retried with exponential backoff, up to 15 seconds apart and 10 times (about a minute), then sent to `deadLetterTopic` if set |
| `bucket` | Nothing | Accepted but **not implemented**: `TriggersReady` reports `Unsupported`, and the function is served over HTTP only | — |

**Topic triggers keep one pod warm.** Dapr delivers topic messages through a sidecar in the function's own pod, and a function at zero has no sidecar. A topic trigger therefore raises `minScale` to 1.

Every environment namespace has a Dapr `pubsub` component. It is backed by Kafka when the `kafka-operator` package runs, and by Redis streams otherwise.

**Make handlers idempotent.** Topic deliveries are at least once, so the same message can arrive twice. Use the CloudEvent `id` to recognise one you have already handled.

The older one-trigger shorthand, `trigger` plus `eventSource`, still works. The `triggers` list replaces it when both are set. See the [reference](/docs/reference/function-api#the-one-trigger-shorthand).

## Scaling

Knative's autoscaler scales each Revision on the requests in flight:

| Parameter | Default | What it does |
|---|---|---|
| `minScale` | `0` | Pods kept when idle. `0` is scale-to-zero. A `topic` trigger raises it to 1 |
| `maxScale` | `20` (templates set `10`) | The most pods the autoscaler may run. It caps cost, and the load the function can put on what it calls |
| `targetConcurrency` | `100` | The **soft** target of in-flight requests per pod. The autoscaler adds pods to stay near it |
| `containerConcurrency` | `0` (unlimited) | The **hard** limit per pod. Requests above it queue in the queue-proxy. Set it only for handlers that cannot run requests in parallel |
| `timeoutSeconds` | `30` | The longest one request may run, at most 600. Knative ends the request after that |

The platform sets no autoscaler overrides, so Knative's own defaults apply. A Revision with `minScale: 0` loses its last pod after 60 seconds without traffic (the stable window) plus a 30-second grace period.

**Choosing `maxScale`.** It is a safety limit as much as a capacity setting. At peak, a function that writes to a database can open `maxScale` × (connections per pod) connections. Size it to what the systems it calls can take.

**CPU and memory.** A Function has no resource fields. In an environment namespace, the namespace's LimitRange gives each container a request of 100m CPU and 128Mi, and a limit of 500m and 512Mi. So `maxScale` × 500m must fit in the namespace's quota. Java runtimes get JVM settings that leave at least 256M of heap within 512Mi.

### Cold starts

The first request after idle pays a **cold start**. The pod is scheduled, the image is pulled if the node does not have it, and your process starts. This ranges from well under a second (Go or Node.js, image already on the node) to several seconds (Java, image not yet pulled). The activator holds the request meanwhile; it is not dropped.

| Lever | Effect |
|---|---|
| `minScale: 1` | Keeps one warm pod. Use it for user-facing paths with tight latency targets. It costs one pod around the clock |
| A small image that boots fast | Go and Node.js start fastest. Do no heavy work at start-up |
| A high enough `maxScale` | Stops a burst from queueing behind too few pods |

## Delivery

A function travels the same road as every application on the platform. The Console's Create flow registers it as an **`Application` of type `function`**. That Application gives the function a pipeline, a Kargo Warehouse, and one Argo CD Application per environment of its project:

```diagram
fn-delivery
```

1. **Build.** Every push to `main` runs `app-ci`. It builds the image with Cloud Native Buildpacks, runs the tests, gitleaks, Trivy and an SBOM step, signs the image with cosign, and pushes `library/<name>:<sha>` to Harbor. Kargo records the signed build as **Freight**.
2. **Promote to dev.** Kargo pins the image **digest** in `deploy/envs/dev`, renders that overlay, and commits it to the branch `stage/dev`. Argo CD syncs `stage/dev` into the `dev` namespace.
3. **Verify.** Kargo checks the function using what Knative reports, not a Rollout:
   - Argo CD's health for the Function is not Degraded
   - its Revision pods are ready
   - nothing restarts
   - the activator's 5xx rate stays under the threshold
4. **Promote to test.** A build verified in dev moves to test automatically and is verified again.
5. **Promote to prod.** Production only takes a build verified in test, and only through a **Release**, which is a manual approval. See [Promote Across Environments](/docs/guides/promote-across-environments#step-4--promote-to-prod-with-a-release).

**The same digest runs everywhere.** Nothing is rebuilt between environments, so what you verified in test is byte for byte what reaches prod.

**Configuration changes ride with promotions.** Argo CD syncs `stage/<env>`, not `main`. A change you commit to `deploy/base` or `deploy/envs/prod` reaches prod with the next promotion into prod. In dev it arrives within minutes, because the same push also builds a new image.

**Missing overlays are reported.** If the repository lacks an environment's overlay, the Application's `Overlays` condition says `OverlayMissing` and names the overlay. It does not crash-loop.

## In the Console

**Develop → Functions** lists every function across environments. It shows one row per function and one column per environment, with tiles for Ready, Deploying, Failing and Scaled to zero. Open a function to see these tabs:

| Tab | What it shows or does |
|---|---|
| **Overview** | URL, runtime, triggers, scale, concurrency, timeout, image digest, ready revision, ownership, and conditions |
| **Revisions & traffic** | Every Revision with its image, and how traffic is split between them |
| **Scale** | Pods running now, pods the autoscaler wants, bounds and target |
| **Pods & logs** | Pod list and a live log stream from `user-container` |
| **Metrics** | Requests, 5xx errors, p95 latency, CPU and memory over 1, 6 or 24 hours |
| **Events**, **Builds**, **Delivery** | Kubernetes events, `app-ci` runs, and what each environment runs and how it was verified |
| **Invoke** | Send a request to the function and see the response (see below) |
| **Configuration** | Parameters and environment variables. **Change scale, timeout or env…** opens a pull request against `deploy/envs/<env>` |
| **Delete** | Deletes the owning Application, and the repository too if you tick the box |

**Invoke from the Console.** The request goes from the Console server, as you, to the function's own URL; it never comes from your browser. The body can be up to 64 KiB, the response is cut at 256 KiB, and the call times out after 15 seconds. Only the function's own hosts are allowed as targets. Every call is audited as `function.invoke`.

**Edits go through Git.** Argo CD self-heals, so a change made to the live Function would be reverted. The Configuration tab therefore writes a merge patch, `deploy/envs/<env>/function-<name>.patch.yaml`, and opens a pull request. Nothing changes until the pull request merges and the next promotion carries it.

**Deliver → Functions** opens the same view on the Delivery tab. **Adhar Resources → Functions** lists the raw `Function` objects.

## Security

- **TLS ends at the Gateway.** Kourier listens only inside the cluster, and every Knative Service is `cluster-local`. The HTTPRoute is the only public path, and `visibility: cluster` removes it.
- **Function URLs have no SSO.** Platform UIs sit behind Keycloak, but a public function answers anyone who can reach the Gateway. Authenticate requests in the handler, for example by checking a bearer token or a webhook signature. For internal-only functions, use `visibility: cluster`.
- **Network isolation.** Environment namespaces deny ingress by default. A function's NetworkPolicy admits only Knative's own namespaces, for the activator and event delivery.
- **Signed images only.** Kyverno's `verify-supply-chain-images` policy rejects unsigned `library/*` images from Harbor in every profile. `app-ci` signs every build, and Kargo deploys it by digest.
- **No secrets in `env`.** Values in `spec.parameters.env` sit in Git in plain text, and the Console warns you of this. With Dapr on (`dapr.enabled: true`), read secrets through the namespace's Dapr `secretstore` component.
- **Who can change functions.** The ClusterRole `adhar-platform-function-edit` grants full rights on `functions.platform.adhar.io`. It is bound to the OIDC group `platform-developer`. Creating a function from the Console needs `create applications.console.adhar.io`.
- **Service account.** A function runs as its namespace's `default` service account. Grant that account nothing.

## Observability

- **Logs.** Write JSON to stdout, as the templates do. Read logs in the Console's Pods & logs tab, or with `kubectl -n <namespace> logs -l serving.knative.dev/service=<name> -c user-container`. In the production profile, Alloy ships them to Loki.
- **Metrics.** The platform scrapes Knative's activator, autoscaler and controller, so request counts and 5xx rates for every function are available, and Kargo's verification uses them. Per-pod request metrics come from each pod's queue-proxy, which needs a PodMonitor. The Console's Metrics tab notes when they are missing.
- **Dashboards.** Each function gets the per-application Grafana dashboard `app-<name>`, matched to its Knative Revision pods. The catalog links to it.
- **Traces.** The OpenTelemetry variables point at Alloy. Add the OpenTelemetry SDK for your language, and spans flow with no further configuration.
- **Argo CD health.** Argo CD reports a Function as Degraded when it fails to reconcile, when `ServiceReady` is False, or when its hostname is claimed elsewhere. It reports Healthy once the Function is Ready.

## Enable the engine

This section is for platform engineers. Functions need these packages:

| Package | Why | `local` | `production` |
|---|---|---|---|
| `knative` | Knative Operator, Serving and Eventing | off | on |
| `dapr` | `topic` triggers and the optional Dapr sidecar | off | on |
| `kafka-operator` | Kafka as the Dapr pub/sub backend. Without it, Redis streams are used | off | on |
| `kargo`, `cert-manager`, `argo-rollout` | Promotion across environments | off | on |
| `tekton`, `adhar-supply-chain`, `harbor` | `app-ci` and the registry | on | on |

On a laptop, turn the engine on and apply the change:

```bash
adhar stack enable knative dapr cert-manager kargo argo-rollout
adhar upgrade
kubectl -n knative-serving get knativeserving knative-serving   # READY True
kubectl get xrd functions.platform.adhar.io                      # ESTABLISHED True
```

The `knative` package is marked `localSafe: false` because of its footprint. Run it on a Kind node with room to spare.

**How the package is laid out:**

- **Where it runs.** The operator runs in `adhar-system`. Serving and Eventing run in their own namespaces, `knative-serving` and `knative-eventing`, which is an exception to the shared-namespace rule.
- **No ConfigMap clash with Tekton.** That namespace isolation is what removed the old clash with Tekton over `config-logging` and `config-observability`.
- **Ingress.** Kourier is the ingress, as a ClusterIP service, and is reached only through the platform Gateway.
- **Domain and DNS.** Knative's domain is rewritten to the platform host when the stack is seeded. Domain claims are created automatically.
- **Eventing scope.** Eventing installs the in-memory Broker, PingSource, ApiServerSource, ContainerSource and SinkBinding. KafkaSource and the Kafka-backed Broker are not installed; topics go through Dapr instead.

## Limits

| Not provided | What to do instead |
|---|---|
| `bucket` triggers | Publish an event from whatever writes the object, and use a `cloudevent` or `topic` trigger |
| Durable or retried delivery for `cron` and `cloudevent` | Use a `topic` trigger when an event must not be lost |
| CPU, memory, volumes or a service account per function | Use a service template |
| Secret references in `env` | Dapr's `secretstore`, or a service template |
| Authentication on function URLs | Check tokens in the handler, or use `visibility: cluster` |
| Autoscaler class, metric or window per function | Knative's defaults apply |
| Traffic splitting between Revisions | Knative sends 100% to the latest Ready Revision. Roll back through Git |
| The test-tier resilience gate | Functions are verified by their health, readiness, restart and error-rate checks |

## Next steps

- **[Deploy a Function](/docs/guides/deploy-a-function)** — create, call, scale, trigger and promote a function, step by step
- **[Function API reference](/docs/reference/function-api)** — every field, condition, composed object and `adhar function` flag
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages and Releases in depth
- **[Your First Service](/docs/getting-started/first-service)** — when a long-running service fits better
- **[Observability](/docs/operations/observability)** — logs, metrics and traces
