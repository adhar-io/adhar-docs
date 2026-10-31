---
title: "Deploy a Function"
section: "Guides"
order: 9
path: "/docs/guides/deploy-a-function"
---

# Deploy a Function

This guide takes a function from template to production. You will:

- create it in the Console and follow its first build into dev
- call it over HTTPS, and watch it scale up under load and back to zero
- give it a schedule and an event trigger
- change its scale for one environment through a pull request
- promote it to test and prod

It is for developers shipping their first function, and for platform engineers checking that Functions work end to end. [Functions](/docs/core-concepts/functions) explains the model behind every step, and the [Function API reference](/docs/reference/function-api) lists every field.

## What you will build

- A Go function, `thumbnails`, in its own Gitea repository, with tests and an OpenAPI contract.
- An HTTPS endpoint in each environment that scales from zero to ten pods and back.
- A nightly schedule and a CloudEvent trigger on the same function.
- The same signed image running in dev, test and prod, with prod reached only through a Release.

**Prerequisites**

| Requirement | How to check |
|---|---|
| The Functions engine (`knative`). It is on in the production profile and off locally | `kubectl -n knative-serving get knativeserving knative-serving` shows `READY True` |
| The `Function` API | `kubectl get xrd functions.platform.adhar.io` shows `ESTABLISHED True` |
| Promotion: `kargo`, `cert-manager`, `argo-rollout`, on in production | `adhar stack status kargo` |
| A Project with environments. The default project `adhar` has `dev`, `test` and `prod` | `kubectl -n adhar-system get projects.platform.adhar.io` |
| Permission to create from templates in the Console | **New function** is enabled under Console → Develop → Functions |
| `curl`, `jq` and `git` on your machine | `curl --version && jq --version` |

On a laptop, turn on what is missing with `adhar stack enable knative dapr cert-manager kargo argo-rollout` and then run `adhar upgrade`. Read [Enable the engine](/docs/core-concepts/functions#enable-the-engine) first, because Knative needs room on the node.

## How it works

The function travels the same road as every application. A template scaffolds a repository. Every push builds and signs an image. Kargo promotes the image's digest from environment to environment, and in each environment the Function becomes a Knative Service:

```diagram
fn-delivery
```

You only ever edit two things: the handler, and the Function in `deploy/`. Everything else is derived from them.

## Step 1 — Create the function

In the Console, open **Develop → Functions** and select **New function**. You can also go to **Create New** and filter on **Functions (serverless)**. Pick **Function (Go)** and fill in the form:

| Page | Field | Value for this guide |
|---|---|---|
| Function | Name | `thumbnails` |
| | Description, Owner | Your own |
| Runtime | Trigger | `http` (you add more in Step 7) |
| | Visibility | `public` |
| | Request timeout (seconds) | `30` |
| | Minimum instances / Maximum instances | `0` / `10` |
| Repository | Repository Location | `adhar/thumbnails` on the platform's Gitea |
| Operations | Lifecycle, Tier, Runbook URL, On-call, Availability SLO | Your own. They go into `catalog-info.yaml` and feed the scorecard |

The wizard runs six steps and reports each one:

1. Create repository
2. Render template skeleton
3. Commit rendered files
4. Register catalog-info.yaml
5. Build the image on push (`app-ci`: buildpacks → Harbor)
6. Register the Application (type `function`): a Function per environment, scale-to-zero

It ends with a **Manage in Functions** link.

**Verify:**

```bash
kubectl -n adhar-system get applications.platform.adhar.io thumbnails \
  -o jsonpath='{.spec.parameters.type}{"\n"}'
```

**Expected:** `function`. Under Develop → Functions, `thumbnails` shows **Not deployed yet** until its first build reaches dev.

## Step 2 — Look at what you got

```bash
git clone <platform Gitea URL>/adhar/thumbnails.git && cd thumbnails
go test ./...
cat deploy/base/function.yaml
```

**Expected:** three passing tests (`TestHealthz`, `TestInvoke`, `TestCloudEvent`). The Function looks like this, with the template's comments removed:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Function
metadata:
  name: thumbnails
  labels:
    app.kubernetes.io/name: thumbnails
    adhar.io/application: thumbnails
    adhar.io/workload: function
spec:
  parameters:
    displayName: thumbnails
    runtime: go125
    image: harbor-core.adhar-system.svc.cluster.local/library/thumbnails:latest
    port: 8080
    trigger: http
    eventSource: ""
    visibility: public
    minScale: 0
    maxScale: 10
    timeoutSeconds: 30
    application: thumbnails
```

This one file serves every environment. `deploy/envs/<env>/kustomization.yaml` places it in that environment's namespace (`dev`, `test` or `prod`), and gives Kargo an `images:` entry to pin. `:latest` is only a stand-in: no environment ever runs it, because every promotion replaces it with a signed digest.

The handler is `handler.go`. `GET /healthz` reports health. Every other path and method invokes the function and returns JSON describing the call, including the CloudEvent type when an event invoked it. Run it with `go run .` and call `curl -s localhost:8080/` to see the response.

## Step 3 — Watch the first build reach dev

Creating the repository pushed its first commit, and that push starts `app-ci`:

```bash
kubectl -n adhar-system get pipelineruns -l adhar.io/app=thumbnails \
  --sort-by=.metadata.creationTimestamp
```

You can also follow it in the Console, on the function's **Builds** tab.

**Expected:** a run that succeeds within a few minutes. It builds the image with buildpacks, runs `go test`, scans and signs the image, and pushes `library/thumbnails:<commit sha>` to Harbor.

Kargo then picks up the signed build as Freight and promotes it into dev:

- it pins the digest in `deploy/envs/dev`
- it renders the overlay to the branch `stage/dev`
- Argo CD syncs that branch into the `dev` namespace

Watch it on the **Delivery** tab, or:

```bash
kubectl -n adhar-system get applications.platform.adhar.io thumbnails \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status} {.reason}{"\n"}{end}'
```

**Expected:** `Overlays=True Seeded`, and the Application turning `Healthy` once dev runs the function.

## Step 4 — Check the Function in dev

```bash
kubectl -n dev get functions.platform.adhar.io thumbnails
kubectl -n dev get functions.platform.adhar.io thumbnails \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status} {.reason}{"\n"}{end}'
```

**Expected:** the `URL` column shows `https://thumbnails.dev.<your domain>`, and the `Revision` column shows `thumbnails-00001`. The conditions read:

```text
ServiceReady=True RevisionReady
EdgeReady=True Published
TriggersReady=True HTTPOnly
Placement=True EnvironmentNamespace
Ready=True …
Synced=True …
```

See what the composition created for it:

```bash
kubectl -n dev get ksvc thumbnails --show-labels
kubectl -n dev get revisions -l serving.knative.dev/service=thumbnails
kubectl -n dev get domainmappings
kubectl -n dev get httproute thumbnails
kubectl -n dev get networkpolicy thumbnails-from-knative
kubectl -n dev get ksvc thumbnails -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

**Expected:**

- A Knative Service labelled `networking.knative.dev/visibility=cluster-local`.
- One Ready Revision.
- A DomainMapping named after the host, and an HTTPRoute for it.
- The NetworkPolicy `thumbnails-from-knative`.
- An image pinned by digest (`…/thumbnails@sha256:…`), not `:latest`.

## Step 5 — Call it

```bash
URL=$(kubectl -n dev get functions.platform.adhar.io thumbnails -o jsonpath='{.status.url}')
curl -sk "$URL/healthz"
curl -sk "$URL/" | jq
curl -sk -X POST "$URL/resize" -H 'content-type: application/json' -d '{"w": 320}' | jq
```

**Expected:** `{"ok":true,"at":"…"}` from `/healthz`. The POST returns something like:

```json
{
  "ok": true,
  "function": "thumbnails",
  "runtime": "go125",
  "trigger": "http",
  "method": "POST",
  "path": "/resize",
  "event": null,
  "received": 10,
  "at": "2026-10-30T09:14:02Z"
}
```

On a local platform the URL is `https://thumbnails.dev.adhar.localtest.me:8443`.

**From the Console.** The **Invoke** tab sends the same request from the Console server, as you, and shows the status, headers, body and duration. Use it when you cannot reach the Gateway from your machine.

**Measure a cold start.** Leave the function idle for about two minutes, so that it scales to zero, then:

```bash
curl -sk -o /dev/null -w 'cold: %{time_total}s\n' "$URL/"
curl -sk -o /dev/null -w 'warm: %{time_total}s\n' "$URL/"
```

**Expected:** the first request takes noticeably longer than the second. The difference is the cold start: Knative's activator held the request while a pod started. If that is too slow for your callers, set `minScale: 1` (Step 8 shows how to change it for one environment).

## Step 6 — Watch it scale

In one terminal, watch the function's pods:

```bash
kubectl -n dev get pods -l serving.knative.dev/service=thumbnails -w
```

In another, send 5,000 requests, 200 at a time:

```bash
seq 5000 | xargs -P 200 -I{} curl -sk -o /dev/null "$URL/"
```

**Expected:**

- **Under load:** pods are added as in-flight requests climb past the target of 100 per pod, up to `maxScale` (10) and no further. The Console's **Scale** tab shows "Running now", "Wanted" and the bounds.
- **When the load stops:** after about 90 seconds without traffic (Knative's 60-second stable window plus a 30-second grace period), the last pod terminates. The Console shows **Scaled to zero**.

Each pod has two containers: `user-container`, which runs your code, and `queue-proxy`, Knative's sidecar. Read your logs with:

```bash
kubectl -n dev logs -l serving.knative.dev/service=thumbnails -c user-container --tail=20
```

The **Pods & logs** tab streams the same logs. The **Metrics** tab charts requests, 5xx errors, p95 latency, CPU and memory.

## Step 7 — Add a schedule and an event trigger

Triggers are part of the Function. Add them to `deploy/base/function.yaml` so that every environment gets them:

```yaml
spec:
  parameters:
    # …everything from Step 2, minus `trigger` and `eventSource`…
    triggers:
      - type: cron
        name: nightly
        schedule: "0 3 * * *"
        timezone: Europe/Berlin
        data: '{"sweep": true}'
      - type: cloudevent
        name: uploads
        filter:
          type: com.acme.media.uploaded
        path: /events
```

```bash
git commit -am "Run thumbnails nightly and on uploads" && git push
```

The push builds a new image, and Kargo promotes it to dev with the changed overlay. When the Function updates, check its triggers:

```bash
kubectl -n dev get functions.platform.adhar.io thumbnails -o jsonpath='{.status.triggers}' | jq
kubectl -n dev get pingsources,triggers,brokers
```

**Expected:**

- `TriggersReady=True Ready`, and `status.triggers` lists `nightly` (`PingSource`) and `uploads` (`Trigger`), both ready.
- A PingSource `thumbnails-nightly`, a Trigger `thumbnails-uploads`, and the namespace Broker `default`, which is created because it did not exist yet.
- The function still answers HTTP at the same URL. Triggers add event sources; they never take HTTP away.

**Send it an event.** Forward the Broker's ingress to your machine, then post a CloudEvent to the `dev` namespace's `default` Broker:

```bash
kubectl -n knative-eventing port-forward svc/broker-ingress 8081:80 &
curl -s -X POST http://localhost:8081/dev/default \
  -H 'ce-specversion: 1.0' -H 'ce-type: com.acme.media.uploaded' \
  -H 'ce-source: guide' -H "ce-id: $(date +%s)" \
  -H 'content-type: application/json' -d '{"object": "cat.png"}'
kubectl -n dev logs -l serving.knative.dev/service=thumbnails -c user-container --tail=5
```

**Expected:** the function scales up if it was at zero, and logs a `POST /events` request whose `event` is `com.acme.media.uploaded`.

> **Which trigger to use.** The Broker is in-memory, and neither cron nor CloudEvent deliveries are retried. For events that must not be lost, use a `topic` trigger: Dapr retries with backoff for about a minute, then sends the message to `deadLetterTopic`. A topic trigger keeps one pod running. See [Triggers](/docs/core-concepts/functions#triggers).

## Step 8 — Change scale for one environment

Dev can scale to zero, but prod should stay warm. Configuration that differs per environment belongs in that environment's overlay.

In the Console, open the function, switch to the **prod** environment, and open **Configuration → Change scale, timeout or env…**. Set **Min scale** to `1`, then submit. The Console:

1. writes `deploy/envs/prod/function-thumbnails.patch.yaml`, a merge patch
2. adds it to the overlay's `patches:`
3. opens a pull request from the branch `functions/thumbnails-prod-<stamp>`

To do the same by hand:

```yaml
# deploy/envs/prod/function-thumbnails.patch.yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Function
metadata:
  name: thumbnails
spec:
  parameters:
    minScale: 1
```

Add `- path: function-thumbnails.patch.yaml` under `patches:` in `deploy/envs/prod/kustomization.yaml`, then open the pull request yourself.

**The change reaches prod with the next promotion into prod**, not when the pull request merges. Argo CD syncs the rendered branch `stage/prod`, which only a promotion rewrites.

Never put secrets in `env`. Values in the overlay sit in Git in plain text.

## Step 9 — Promote to test and prod

**Test is automatic.** A build that passes dev's verification moves to test on its own and is verified again there. The checks are:

- Argo CD reports the Function healthy
- its Revision pods are ready
- nothing restarts
- the activator's 5xx rate stays low

Watch both environments on the **Delivery** tab:

```bash
kubectl -n test get functions.platform.adhar.io thumbnails
```

**Expected:** the same digest as dev, now at `https://thumbnails.test.<your domain>`.

**Prod needs a Release.** Prod takes only Freight that test has verified, and only through a `Release`, which is a manual approval recorded as an object. Create one as described in [Promote to prod with a Release](/docs/guides/promote-across-environments#step-4--promote-to-prod-with-a-release), or start it from the Delivery tab's **Promote** link.

**Verify:**

```bash
kubectl -n prod get functions.platform.adhar.io thumbnails
kubectl -n prod get ksvc thumbnails \
  -o jsonpath='{.spec.template.metadata.annotations.autoscaling\.knative\.dev/min-scale}{"\n"}'
```

**Expected:** Ready at `https://thumbnails.prod.<your domain>`, with min-scale `1` from Step 8. One pod stays running in prod even when idle.

**Roll back** the way you would any application: create a Release that names the previous Freight. Knative switches traffic back once that Revision is Ready.

## Step 10 — Clean up

In the Console, open the function and go to **Delete**. A delivered function cannot be deleted on its own, because Argo CD would put it back from Git. So the tab deletes its **Application** instead. Type the name to confirm. Tick **Also delete its repository** only if you no longer want the code.

```bash
kubectl -n adhar-system get applications.platform.adhar.io thumbnails   # NotFound
kubectl get functions.platform.adhar.io -A | grep thumbnails              # nothing
```

**Expected:** the Function, its Knative Service, Revisions, route and triggers are gone from every environment. The Broker `default` stays, because other functions in the namespace may use it. The images in Harbor stay too.

## Limits to know

| Not provided | What to do instead |
|---|---|
| `bucket` triggers | Have whatever writes the object publish an event; use `cloudevent` or `topic` |
| Retries for cron and CloudEvent deliveries; a durable Broker | Use a `topic` trigger for events that must not be lost |
| CPU, memory or a service account per function | Functions get the namespace's defaults (100m / 128Mi requested, 500m / 512Mi limit). Use a service template for anything bigger |
| Authentication on function URLs | Check a token or signature in the handler, or set `visibility: cluster` |
| Traffic splits between Revisions | Knative serves the latest Ready Revision. Roll back with a Release |
| Preview environments for function pull requests | The function templates do not ship `preview/` |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Develop → Functions says "Functions are not available on this cluster" | The `Function` API is not installed: the `knative` package is off | Enable it (see Prerequisites); check `kubectl get xrd functions.platform.adhar.io` |
| The function stays **Not deployed yet** | The first `app-ci` run failed, or its Freight has not been promoted to dev | Check the Builds and Delivery tabs. A missing overlay shows as `Overlays=False OverlayMissing` on the Application |
| `ServiceReady=False RevisionFailed`, with `Unable to fetch image` | The image or digest does not exist, or cannot be pulled | Check the `app-ci` run. For an image outside Harbor, set `imagePullSecrets` |
| `EdgeReady=False HostClaimed` | Another namespace already owns the hostname | Set `spec.parameters.hostname` to another name. Claims are never released automatically |
| `EdgeReady=False DomainUnknown` | The platform domain is not published (`adhar-system/argocd-cm` has no `url`) | Wait for the platform to finish bootstrapping, or set `hostname` |
| `EdgeReady=False RouteNotReady` | The Gateway did not accept the HTTPRoute, or cannot reach Kourier | `kubectl -n dev describe httproute thumbnails`, and check the ReferenceGrant in `knative-serving` |
| `TriggersReady=False Unsupported` | A `bucket` trigger is set | Remove it, or replace it with `cloudevent` or `topic` |
| A topic trigger stays `Waiting` | Dapr is off, or the namespace has no `pubsub` component | Enable `dapr`; check `kubectl -n dev get components.dapr.io` |
| Requests fail after `timeoutSeconds` | The handler ran too long | Make it faster, or raise `timeoutSeconds` (600 at most). Move longer work to a service or a pipeline |
| The first request after idle is slow | Cold start | `minScale: 1` for latency-sensitive environments; keep the image small |
| The function never scales to zero | `minScale` above 0, a topic trigger, or something calling it regularly | Check `minScale` and the triggers, then the Metrics tab |
| Java pods are `OOMKilled` | The handler needs more than the namespace's 512Mi default limit | Reduce memory use. Functions cannot set their own limits |
| The Metrics tab shows no data | The function served no traffic, or the queue-proxy's per-pod metrics are not scraped | Send it traffic; ask a platform engineer to add a PodMonitor for queue-proxy |
| A config change merged but has not reached prod | Argo CD syncs `stage/prod`, which only a promotion rewrites | Create a Release |

## Next steps

- **[Functions](/docs/core-concepts/functions)** — the model: placement, request path, triggers, scaling and security
- **[Function API reference](/docs/reference/function-api)** — every field, condition and `adhar function` flag
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages, Releases and rollbacks in depth
- **[Observability](/docs/operations/observability)** — logs, metrics and traces
- **[Your First Service](/docs/getting-started/first-service)** — when a long-running service fits better
