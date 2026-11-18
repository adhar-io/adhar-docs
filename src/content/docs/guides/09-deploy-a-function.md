---
title: "Deploy a Function"
section: "Guides"
order: 9
path: "/docs/guides/deploy-a-function"
---

# Deploy a Function

This guide takes a function from template to production. You create it in the Console, call it over HTTPS, watch it scale to zero and back, add a schedule and an event trigger, and promote it to test and prod.

It is for developers shipping their first function, and for platform engineers checking that Functions work end to end. [Functions](/docs/core-concepts/functions) explains the model behind every step, and the [Function API reference](/docs/reference/function-api) lists every field.

## What you'll build

```diagram
nsv-function-guide
```

- A Go function, `thumbnails`, in its own Gitea repository, with tests and an OpenAPI contract.
- An HTTPS endpoint in each environment that scales from zero to ten pods and back.
- A nightly schedule and a CloudEvent trigger on the same function.
- The same signed image in dev, test and prod, with prod reached only through a Release.

You only ever edit two things: the handler, and the Function in `deploy/`. Everything else is derived from them.

## Prerequisites

- **The Functions engine (`knative`).** It is on in the production profile and off locally. `kubectl -n knative-serving get knativeserving knative-serving` shows `READY True`.
- **The `Function` API.** `kubectl get xrd functions.platform.adhar.io` shows `ESTABLISHED True`.
- **Promotion: `kargo`, `cert-manager` and `argo-rollout`**, on in both profiles. Check with `adhar stack status kargo`.
- **A Project with environments.** The default project `adhar` has `dev`, `test` and `prod`. Check with `kubectl -n adhar-system get projects.platform.adhar.io`.
- **Permission to create from templates.** **New function** is enabled under Console → **Develop → Functions**.
- **`curl`, `jq` and `git`** on your machine.

On a laptop, turn on the Functions engine with `adhar stack enable knative dapr`, then run `adhar upgrade`. Read [Enable the engine](/docs/core-concepts/functions#enable-the-engine) first, because Knative needs room on the node.

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

The wizard creates the repository, renders and commits the template, registers `catalog-info.yaml`, sets up the `app-ci` build, and registers an Application of type `function`. It ends with a **Manage in Functions** link.

**Check:**

```bash
kubectl -n adhar-system get applications.platform.adhar.io thumbnails \
  -o jsonpath='{.spec.parameters.type}{"\n"}'
```

The output is `function`. Under Develop → Functions, `thumbnails` shows **Not deployed yet** until its first build reaches dev.

## Step 2 — Look at what you got

```bash
git clone <platform Gitea URL>/adhar/thumbnails.git && cd thumbnails
go test ./...
cat deploy/base/function.yaml
```

**Check:** three tests pass (`TestHealthz`, `TestInvoke`, `TestCloudEvent`). The Function looks like this, with the template's comments removed:

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

This one file serves every environment. `deploy/envs/<env>/kustomization.yaml` places it in that environment's namespace (`dev`, `test` or `prod`) and gives Kargo an `images:` entry to pin. `:latest` is only a stand-in: no environment ever runs it, because every promotion replaces it with a signed digest.

The handler is `handler.go`. `GET /healthz` reports health. Every other path and method invokes the function and returns JSON describing the call, including the CloudEvent type when an event invoked it. Run it with `go run .` and call `curl -s localhost:8080/` to see the response.

## Step 3 — Watch the first build reach dev

Creating the repository pushed its first commit, and that push starts `app-ci`:

```bash
kubectl -n adhar-system get pipelineruns -l adhar.io/app=thumbnails \
  --sort-by=.metadata.creationTimestamp
```

You can also follow it on the function's **Builds** tab in the Console. The run builds the image with buildpacks, runs `go test`, scans and signs the image, and pushes `library/thumbnails:<commit sha>` to Harbor.

Kargo then picks up the signed build as Freight and promotes it into dev:

1. It pins the digest in `deploy/envs/dev`.
2. It renders the overlay to the branch `stage/dev`.
3. Argo CD syncs that branch into the `dev` namespace.

**Check:** the pipeline run succeeds. Then watch the **Delivery** tab, or run:

```bash
kubectl -n adhar-system get applications.platform.adhar.io thumbnails \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status} {.reason}{"\n"}{end}'
```

The output includes `Overlays=True Seeded`, and the Application turns `Healthy` once dev runs the function.

## Step 4 — Check the Function in dev

```bash
kubectl -n dev get functions.platform.adhar.io thumbnails
kubectl -n dev get functions.platform.adhar.io thumbnails \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status} {.reason}{"\n"}{end}'
```

**Check:** the `URL` column shows `https://thumbnails.dev.<your domain>`, and the `Revision` column shows `thumbnails-00001`. The conditions read:

```text
ServiceReady=True RevisionReady
EdgeReady=True Published
TriggersReady=True HTTPOnly
Placement=True EnvironmentNamespace
Ready=True …
Synced=True …
```

To see what the composition created for it:

```bash
kubectl -n dev get ksvc thumbnails --show-labels
kubectl -n dev get revisions -l serving.knative.dev/service=thumbnails
kubectl -n dev get domainmappings
kubectl -n dev get httproute thumbnails
kubectl -n dev get networkpolicy thumbnails-from-knative
kubectl -n dev get ksvc thumbnails -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

You get a Knative Service labelled `networking.knative.dev/visibility=cluster-local`, one Ready Revision, a DomainMapping named after the host with an HTTPRoute for it, the NetworkPolicy, and an image pinned by digest (`…/thumbnails@sha256:…`), not `:latest`. [How it works](/docs/core-concepts/functions#how-it-works) explains each object.

## Step 5 — Call it

```bash
URL=$(kubectl -n dev get functions.platform.adhar.io thumbnails -o jsonpath='{.status.url}')
curl -sk "$URL/healthz"
curl -sk "$URL/" | jq
curl -sk -X POST "$URL/resize" -H 'content-type: application/json' -d '{"w": 320}' | jq
```

On a local platform the URL is `https://thumbnails.dev.adhar.localtest.me:8443`.

**Check:** `/healthz` returns `{"ok":true,"at":"…"}`. The POST returns something like:

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
  "at": "…"
}
```

> **Tip:** The Console's **Invoke** tab sends the same request from the Console server, as you, and shows the status, headers, body and duration. Use it when you cannot reach the Gateway from your machine.

**See a cold start.** Leave the function idle until the Console shows **Scaled to zero**, then time two requests:

```bash
curl -sk -o /dev/null -w 'cold: %{time_total}s\n' "$URL/"
curl -sk -o /dev/null -w 'warm: %{time_total}s\n' "$URL/"
```

The first request takes noticeably longer than the second. The difference is the cold start: Knative's activator held the request while a pod started. If that is too slow for your callers, set `minScale: 1`. Step 8 shows how to change it for one environment.

## Step 6 — Watch it scale

In one terminal, watch the function's pods:

```bash
kubectl -n dev get pods -l serving.knative.dev/service=thumbnails -w
```

In another, send 5,000 requests, 200 at a time:

```bash
seq 5000 | xargs -P 200 -I{} curl -sk -o /dev/null "$URL/"
```

**Check:**

- **Under load,** pods are added as in-flight requests climb past the target of 100 per pod, up to `maxScale` (10) and no further. The Console's **Scale** tab shows "Running now", "Wanted" and the bounds.
- **When the load stops,** the last pod terminates after Knative's 60-second stable window plus a 30-second grace period. The Console shows **Scaled to zero**.

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

The push builds a new image, and Kargo promotes it to dev with the changed overlay.

**Check:** when the Function updates, look at its triggers:

```bash
kubectl -n dev get functions.platform.adhar.io thumbnails -o jsonpath='{.status.triggers}' | jq
kubectl -n dev get pingsources,triggers,brokers
```

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

The function scales up if it was at zero, and logs a `POST /events` request whose `event` is `com.acme.media.uploaded`.

> **Note:** Cron and CloudEvent deliveries are not retried, and the Broker is in-memory. For events that must not be lost, use a `topic` trigger, which retries and then dead-letters. See [Triggers](/docs/core-concepts/functions#triggers).

## Step 8 — Change scale for one environment

Dev can scale to zero, but prod should stay warm. Configuration that differs per environment belongs in that environment's overlay.

In the Console, open the function, switch to the **prod** environment, and open **Configuration → Change scale, timeout or env…**. Set **Min scale** to `1`, then submit. The Console:

1. writes `deploy/envs/prod/function-thumbnails.patch.yaml`, a merge patch
2. adds it to the overlay's `patches:`
3. opens a pull request from the branch `functions/thumbnails-prod-<stamp>`

To do the same by hand, add the patch, list it as `- path: function-thumbnails.patch.yaml` under `patches:` in `deploy/envs/prod/kustomization.yaml`, and open the pull request yourself:

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

Merge the pull request. **The change reaches prod with the next promotion into prod**, not when the pull request merges. Argo CD syncs the rendered branch `stage/prod`, which only a promotion rewrites.

> **Warning:** Never put secrets in `env`. Values in the overlay sit in Git in plain text.

## Step 9 — Promote to test and prod

**Test is automatic.** A build that passes dev's verification moves to test on its own and is verified again there. [Delivery](/docs/core-concepts/functions#delivery) lists the checks.

**Check:** the **Delivery** tab shows both environments, and test runs the same digest as dev at `https://thumbnails.test.<your domain>`:

```bash
kubectl -n test get functions.platform.adhar.io thumbnails
```

**Prod needs a Release.** Prod takes only Freight that test has verified, and only through a `Release`, which is a manual approval recorded as an object. Create one as described in [Promote to prod with a Release](/docs/guides/promote-across-environments#step-4--promote-to-prod-with-a-release), or start it from the Delivery tab's **Promote** link.

**Check:**

```bash
kubectl -n prod get functions.platform.adhar.io thumbnails
kubectl -n prod get ksvc thumbnails \
  -o jsonpath='{.spec.template.metadata.annotations.autoscaling\.knative\.dev/min-scale}{"\n"}'
```

The Function is Ready at `https://thumbnails.prod.<your domain>`, with min-scale `1` from Step 8. One pod stays running in prod even when idle.

**Roll back** the way you would any application: create a Release that names the previous Freight. Knative switches traffic back once that Revision is Ready.

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
| Requests fail after `timeoutSeconds` | The handler ran too long | Make it faster, or raise `timeoutSeconds` (600 at most). Move longer work to a service or a [batch job](/docs/core-concepts/batch) |
| The first request after idle is slow | Cold start | `minScale: 1` for latency-sensitive environments; keep the image small |
| The function never scales to zero | `minScale` above 0, a topic trigger, or something calling it regularly | Check `minScale` and the triggers, then the Metrics tab |
| Java pods are `OOMKilled` | The handler needs more than the namespace's 512Mi default limit | Reduce memory use. Functions cannot set their own limits |
| The Metrics tab shows no data | The function served no traffic, or the queue-proxy's per-pod metrics are not scraped | Send it traffic; ask a platform engineer to add a PodMonitor for queue-proxy |
| A config change merged but has not reached prod | Argo CD syncs `stage/prod`, which only a promotion rewrites | Create a Release |

For what Functions do not provide, such as `bucket` triggers, per-function CPU and memory, and authentication on function URLs, see [Limits](/docs/core-concepts/functions#limits). The function templates also ship no `preview/` overlay, so function pull requests get no preview environment.

## Clean up

In the Console, open the function and go to **Delete**. A delivered function cannot be deleted on its own, because Argo CD would put it back from Git. So the tab deletes its **Application** instead. Type the name to confirm. Tick **Also delete its repository** only if you no longer want the code.

**Check:**

```bash
kubectl -n adhar-system get applications.platform.adhar.io thumbnails   # NotFound
kubectl get functions.platform.adhar.io -A | grep thumbnails              # nothing
```

The Function, its Knative Service, Revisions, route and triggers are gone from every environment. The Broker `default` stays, because other functions in the namespace may use it. The images in Harbor stay too.

## Next steps

- **[Functions](/docs/core-concepts/functions)** — the model: placement, request path, triggers, scaling and security
- **[Function API reference](/docs/reference/function-api)** — every field, condition and `adhar function` flag
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages, Releases and rollbacks in depth
- **[Your First Service](/docs/getting-started/first-service)** — when a long-running service fits better
