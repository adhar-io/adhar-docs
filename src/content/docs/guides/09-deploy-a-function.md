---
title: "Deploy a Function"
section: "Guides"
order: 9
badge: "planned"
path: "/docs/guides/deploy-a-function"
---

# Deploy a Function

This guide takes a function from template to production shape. You scaffold it, watch the paved road build and sign it, call it over HTTP, and watch it scale up under load and back to zero. Then you make it event-driven and roll out a code change as a new Revision.

It is for application developers shipping their first function, and for platform engineers checking that the Functions engine works end to end. [Functions](/docs/core-concepts/functions) explains the model behind every step.

> **Status: planned.** This guide follows the designed Functions flow. Steps 1–3 (templates, scaffolding, build) work today. Steps 4–8 need the `functions.platform.adhar.io` XRD, its composition and Knative Serving, which have not shipped. See [What exists today](/docs/core-concepts/functions#what-exists-today).

## What you will build

- A Go function, `thumbnails`, in its own Gitea repository, built and signed by `app-ci`.
- A public HTTPS endpoint that scales from zero to ten pods and back.
- The same function moved onto a schedule, then onto a Kafka topic.
- A code change rolled out as a new Knative Revision, with no downtime.

**Prerequisites**

| Requirement | How to check |
|---|---|
| A healthy platform and a logged-in CLI | `adhar get status` reports `● Healthy` |
| The `knative` package enabled, with Knative Serving and Eventing ready | `kubectl get knativeserving,knativeeventing -A` shows `Ready: True` |
| The `Function` API installed | `kubectl get xrd functions.platform.adhar.io` shows `ESTABLISHED: True` |
| The paved-road CI (`adhar-supply-chain`), which builds every function image | `kubectl -n adhar-system get eventlistener app-ci` |
| For Step 7 only: `kafka-operator`, which is on in production and off locally | `kubectl get kafka -A` |
| `curl` and `jq` on your machine | `curl --version && jq --version` |

To turn the engine on, see [Enabling the engine](/docs/core-concepts/functions#enabling-the-engine). Read its warning about the Knative–Tekton conflict first.

## How it works

The function travels the same road as any service. The template scaffolds a repository. Every push builds a signed image. Argo CD syncs the `Function`, and Crossplane composes it into a Knative Service:

```diagram
fn-delivery
```

You only ever edit two things: the handler and `deploy/function.yaml`. Everything else is derived from them.

## Step 1 — Pick a template

List the function templates on your platform and look at the one you want:

```bash
adhar application templates | grep function
adhar application templates function-go-service
```

**Expected:** five templates (`function-go-service`, `function-nodejs-service`, `function-python-service`, `function-java-service`, `function-deno-service`). The Go template accepts `trigger`, `eventSource`, `timeoutSeconds`, `minScale` and `maxScale`, plus `name`, `description` and `owner`.

This guide uses Go because it has the fastest cold start. Every step works the same for the other languages. Only the handler file and the `runtime` value differ.

## Step 2 — Scaffold and deploy

Deploy into the `dev` namespace, which is the CLI's default:

```bash
adhar application deploy thumbnails --template function-go-service \
  --param trigger=http \
  --param minScale=0 \
  --param maxScale=10 \
  --param timeoutSeconds=30
```

You don't need `--path`. The CLI defaults to `deploy`, which is where function templates keep their manifest. The CLI then reports three steps:

1. **Scaffold.** It creates the Gitea repository `adhar/thumbnails`, with the handler, `project.toml` and `deploy/function.yaml`.
2. **Declare.** It creates an `Application` named `thumbnails` in `dev` that points at the repository's `deploy/` directory.
3. **Reconcile.** Argo CD syncs `deploy/`, which contains a single `Function`.

You can do the same from the Console instead: **Create** → filter on the `function` tag → **Function Service (Go)**. The form asks for the same values.

Do not pass `--wait` on this first deploy. The image does not exist until Step 3 finishes, so the first Revision cannot become Ready before then.

**Verify:**

```bash
kubectl get functions.platform.adhar.io -n dev thumbnails
```

**Expected:** the Function exists. `SYNCED` is `True`, and `READY` is `False` until the image from Step 3 is in Harbor.

## Step 3 — Watch the first build

Scaffolding pushed a commit to `adhar/thumbnails`. The Gitea org webhook fires `app-ci` for it:

```bash
kubectl -n adhar-system get pipelineruns --sort-by=.metadata.creationTimestamp | tail -3
```

**Expected:** an `app-ci-thumbnails-…` run that succeeds within a few minutes. In order, it:

1. builds the image with buildpacks (Go is detected from `go.mod`)
2. runs the tests, gitleaks, Trivy and SBOM steps
3. signs the image with cosign
4. pushes `library/thumbnails:<sha>` and `library/thumbnails:latest` to Harbor
5. commits a write-back to `main` that pins `deploy/function.yaml` to `:<sha>`

Check the write-back:

```bash
git clone <platform Gitea URL>/adhar/thumbnails.git && cd thumbnails
git log --oneline -2
grep image: deploy/function.yaml
```

**Expected:** the newest commit is the CI write-back. `image:` ends in the commit SHA, not `:latest`.

## Step 4 — See what was composed

Once Argo CD syncs the write-back, the Function becomes Ready:

```bash
kubectl get functions.platform.adhar.io -n dev thumbnails
kubectl get ksvc -n dev thumbnails
kubectl get revisions -n dev -l serving.knative.dev/service=thumbnails
```

**Expected:**

- The Function is `READY: True`.
- One Knative Service, `thumbnails`, whose `URL` column shows `https://thumbnails.dev.<your domain>`.
- One Revision, `thumbnails-00001`, Ready.

Check that the composition carried your parameters through to Knative:

```bash
kubectl get ksvc -n dev thumbnails -o json | jq '{
  image:   .spec.template.spec.containers[0].image,
  timeout: .spec.template.spec.timeoutSeconds,
  min:     .spec.template.metadata.annotations["autoscaling.knative.dev/min-scale"],
  max:     .spec.template.metadata.annotations["autoscaling.knative.dev/max-scale"],
  env:     .spec.template.spec.containers[0].env
}'
```

**Expected:** the SHA-pinned image, `30`, `"0"`, `"10"`, and the variables `FUNCTION_NAME=thumbnails`, `FUNCTION_TRIGGER=http` and `FUNCTION_RUNTIME=go122`.

## Step 5 — Call it

```bash
URL=$(kubectl get ksvc -n dev thumbnails -o jsonpath='{.status.url}')
curl -sk "$URL/healthz"
curl -sk "$URL/" | jq
```

**Expected:** `{"ok":true,"at":"…"}` from `/healthz`. The root returns:

```json
{
  "ok": true,
  "function": "thumbnails",
  "runtime": "go122",
  "trigger": "http",
  "at": "2026-10-27T09:14:02Z"
}
```

On a local platform the URL is `https://thumbnails.dev.adhar.localtest.me:8443`.

**Measure a cold start.** Leave the function idle for about two minutes, so it scales to zero (see Step 6), then time a request:

```bash
curl -sk -o /dev/null -w 'cold: %{time_total}s\n' "$URL/"
curl -sk -o /dev/null -w 'warm: %{time_total}s\n' "$URL/"
```

**Expected:** the first request takes noticeably longer than the second. The difference is the cold start: Knative's activator held the request while a pod started. If that delay is too long for your callers, set `minScale: 1` (Step 8 shows how to change a parameter).

## Step 6 — Watch it scale

In one terminal, watch the function's pods:

```bash
kubectl get pods -n dev -l serving.knative.dev/service=thumbnails -w
```

In another, send 2,000 requests, 50 at a time:

```bash
seq 2000 | xargs -P 50 -I{} curl -sk -o /dev/null "$URL/"
```

**Expected:** pods are added as concurrency rises, up to `maxScale` (10) and no further. When the load stops, they drain back down. With no traffic for the stable window (60 seconds) plus the scale-to-zero grace period (30 seconds), the last pod terminates and the watch shows no pods.

Each pod has two containers: `user-container`, which runs your code, and `queue-proxy`, the Knative sidecar that measures requests for the autoscaler. Read your function's logs with:

```bash
kubectl logs -n dev -l serving.knative.dev/service=thumbnails -c user-container --tail=20
```

## Step 7 — Make it event-driven

A function's trigger is one field in Git. Change it, push, and the composition swaps the event source. Here the function moves onto a schedule, then onto a Kafka topic.

**On a schedule.** Edit `deploy/function.yaml`:

```yaml
  parameters:
    trigger: cron
    eventSource: "*/1 * * * *"   # every minute, UTC
```

```bash
git commit -am "Run thumbnails every minute" && git push
```

**Verify:**

```bash
kubectl get pingsources -n dev
kubectl get ksvc -n dev thumbnails -o jsonpath='{.status.url}{"\n"}'
kubectl logs -n dev -l serving.knative.dev/service=thumbnails -c user-container -f
```

**Expected:**

- A PingSource with schedule `*/1 * * * *` and the `thumbnails` Service as its sink.
- The Service URL is now cluster-local (`http://thumbnails.dev.svc.cluster.local`), so the function no longer has a public endpoint.
- A pod starts about once a minute, logs the request, and scales back to zero between ticks.

**On a Kafka topic.** Change the trigger again:

```yaml
  parameters:
    trigger: topic
    eventSource: kafka://orders-events
```

**Expected:** after the push, the PingSource is gone and a KafkaSource reads `orders-events`, with `thumbnails` as its sink. Each record arrives as a CloudEvent `POST` to `/`, as described in [Receiving events](/docs/core-concepts/functions#receiving-events). The function scales on the consumer's backlog. To trigger on a platform `Topic` in the same namespace instead, write `eventSource: topic://<topic name>`.

Before you put an event-driven function into production, make the handler **idempotent**. Delivery is at least once, so the same event can arrive twice.

## Step 8 — Ship a change as a new Revision

Edit the handler. For example, add a field to the root response in `main.go`:

```go
			"version":  "2",
```

Commit and push:

```bash
git commit -am "Report version 2" && git push
```

**Verify:**

```bash
kubectl get revisions -n dev -l serving.knative.dev/service=thumbnails
```

**Expected:**

1. `app-ci` builds and signs a new image, and writes the new SHA back.
2. Argo CD syncs the Function, and Knative creates `thumbnails-00002` (or the next number).
3. Traffic moves to the new Revision only once it is Ready. Until then, the old Revision keeps answering, so callers see no error.
4. The old Revision scales to zero but is kept.

Parameters change the same way. Edit `minScale`, `maxScale` or `timeoutSeconds` in `deploy/function.yaml`, then push. Each change is a new Revision, so it rolls out with the same no-downtime guarantee.

**To roll back,** `git revert` the commit you want to undo and push. `app-ci` rebuilds the earlier code and writes its SHA back.

## Step 9 — Clean up

```bash
adhar application delete thumbnails
kubectl get functions.platform.adhar.io,ksvc -n dev
```

**Expected:** the Function, its Knative Service, its Revisions and any event source are gone. The Gitea repository `adhar/thumbnails` and its images in Harbor stay. Delete them from Gitea and Harbor if you no longer need them.

## What is not implemented

| Not provided | What to do instead |
|---|---|
| Environment variables, secrets or resource requests on a Function | Not in v1alpha1. Read configuration from a bound backing service, or use an `Application` for workloads that need them |
| Promotion from dev to test to prod | The function templates have no environment overlays. Deploy a separate Function per environment, or use a service template with [Promote Across Environments](/docs/guides/promote-across-environments) |
| Preview environments for function pull requests | The templates do not ship `preview/`, so the [preview ApplicationSet](/docs/guides/preview-environments) skips them |
| Authentication on function URLs | Validate a token or webhook signature in the handler |
| OpenTelemetry tracing | Add the SDK for your language and export OTLP to Alloy |
| An `adhar function` command | Use `adhar application` and `kubectl get functions.platform.adhar.io` |
| Building the Deno template | Deno is not in the buildpacks' auto-detect list. Use another runtime until the build is verified |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Argo CD reports `no matches for kind "Function"` | The `functions.platform.adhar.io` XRD is not installed | Check `kubectl get xrd functions.platform.adhar.io`. See [What exists today](/docs/core-concepts/functions#what-exists-today) |
| The Function stays `READY: False` and the Revision shows `ImagePullBackOff` | The first `app-ci` build has not finished, or it failed | Check the PipelineRun from Step 3 |
| Pods are rejected by `verify-supply-chain-images` | The image is unsigned: it was pushed by hand, or the signing step failed | Let `app-ci` build it. Never push function images by hand |
| Pods are rejected for using `:latest` in production | The write-back has not replaced the template's `:latest` tag yet | Wait for the first `app-ci` run to commit its write-back |
| Tekton PipelineRuns start failing after you enable `knative` | Knative and Tekton overwrite each other's `config-logging` and `config-observability` ConfigMaps | See the warning in [Enabling the engine](/docs/core-concepts/functions#enabling-the-engine) |
| Requests fail with `504` after about 30 seconds | The handler ran longer than `timeoutSeconds` | Make the handler faster, or raise `timeoutSeconds` (300 at most). Move longer work to an `Application` or a pipeline |
| The first request after idle is slow | Cold start | Set `minScale: 1` for latency-sensitive paths. Keep images small |
| The function never scales to zero | `minScale` is above `0`, or something calls it regularly (a probe, a cron, a retrying client) | Check `minScale`, then the `queue-proxy` request metrics |
| A `cloudevent` or `topic` function never runs | `kafka-operator` is off (it is off locally), or `eventSource` has a typo | Enable `kafka-operator`; check the Knative Trigger or KafkaSource status with `kubectl describe` |
| The Console's Functions page says "not installed" | The Console looks for the plural `compositefunctions`, but the XRD's plural is `functions` | Use `kubectl get functions.platform.adhar.io` until the Console is updated |

## Next steps

- **[Functions](/docs/core-concepts/functions)** — the full model: every field, every trigger, scaling and security
- **[Your First Service](/docs/getting-started/first-service)** — when a long-running service fits better
- **[Manage Secrets End to End](/docs/guides/manage-secrets)** — for the backing services your functions call
- **[Observability](/docs/operations/observability)** — logs, metrics and traces
- **[CLI Reference](/docs/reference/cli)** — every `adhar application` flag
