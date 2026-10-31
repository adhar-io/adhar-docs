---
title: "Function API Reference"
section: "Reference"
order: 2
path: "/docs/reference/function-api"
---

# Function API Reference

This page is the complete reference for the `Function` resource and the `adhar function` command. It lists:

- every field, with its type, default and limits
- every trigger option
- every status field and condition reason
- every object the composition creates
- every command and flag

It is for anyone writing or debugging a `Function` by hand. [Functions](/docs/core-concepts/functions) explains the model, and [Deploy a Function](/docs/guides/deploy-a-function) walks through it.

## At a glance

| | |
|---|---|
| **Group / version / kind** | `platform.adhar.io` / `v1alpha1` / `Function` |
| **Plural** | `functions` — always qualify it: `kubectl get functions.platform.adhar.io` |
| **Scope** | Namespaced |
| **Definition** | XRD `functions.platform.adhar.io` (Crossplane v2) |
| **Composition** | `function-local-knative` (default; labels `feature: function`, `provider: local`, `runtime: knative`) |
| **Printer columns** | `URL` (`.status.url`), `Revision` (`.status.readyRevision`) |
| **Required** | `spec.parameters.runtime`, `spec.parameters.image` |

## A complete example

Every field below is optional except `runtime` and `image`. This function runs on a schedule, on CloudEvents and on a topic, besides HTTP:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Function
metadata:
  name: thumbnails
  namespace: dev                       # an environment namespace decides org, team, project, environment
spec:
  parameters:
    displayName: Image thumbnailer
    runtime: python313
    image: harbor-core.adhar-system.svc.cluster.local/library/thumbnails@sha256:…
    port: 8080
    visibility: public                 # https://thumbnails.dev.<platform domain>
    minScale: 0
    maxScale: 5
    targetConcurrency: 10
    containerConcurrency: 4
    timeoutSeconds: 120
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
    env:
      LOG_LEVEL: debug
    labels:
      cost-center: media
    application: thumbnails
```

## spec.parameters

| Field | Type | Default | Limits | Meaning |
|---|---|---|---|---|
| `runtime` | string | `node20` | `node20`, `node22`, `node24`, `python312`, `python313`, `go122`, `go125`, `java21`, `java25`, `deno2`, `custom` | The runtime the image was built for. The image decides what actually runs. Published as `FUNCTION_RUNTIME` and the label `platform.adhar.io/runtime`. Java runtimes also get JVM memory settings. `go122` is kept only for existing objects |
| `image` | string | — | required | The OCI image to run. Delivered functions are pinned by digest |
| `imagePullSecrets` | string[] | `[harbor-dockercfg]` | — | Secrets the kubelet pulls the image with. The platform copies `harbor-dockercfg` into every environment namespace. Set `[]` for a public image |
| `displayName` | string | — | — | Shown in the Console. Stored as the annotation `platform.adhar.io/display-name` |
| `port` | integer | `8080` | 1–65535, except 8008, 8012, 8013, 8022, 9090, 9091 | The port your process listens on. Knative passes it as `$PORT`. The excluded ports are reserved by Knative's queue-proxy |
| `visibility` | string | `public` | `public`, `cluster` | `public` publishes the function on the platform Gateway. `cluster` keeps it reachable only inside the cluster, including from its event sources |
| `hostname` | string | `<name>.<environment>.<platform domain>` | DNS name, ≤ 253 characters, labels ≤ 63 | The public host. A custom host needs DNS pointing at the Gateway and a certificate the Gateway serves |
| `minScale` | integer | `0` | ≥ 0, ≤ `maxScale` | Pods kept when idle. `0` is scale-to-zero. A `topic` trigger raises it to 1 |
| `maxScale` | integer | `20` | ≥ 1 | The most pods the autoscaler may run |
| `targetConcurrency` | integer | `100` | ≥ 1 | The soft target of in-flight requests per pod (`autoscaling.knative.dev/target`) |
| `containerConcurrency` | integer | `0` | 0–1000 | The hard limit of in-flight requests per pod. Extra requests queue. `0` means unlimited |
| `timeoutSeconds` | integer | `30` | 1–600 | The per-request timeout. 600 is Knative's maximum, and its admission webhook refuses anything larger |
| `triggers` | object[] | — | ≤ 16 items | Event sources besides HTTP. See [triggers](#triggers) |
| `trigger` | string | `http` | `http`, `cloudevent`, `topic`, `bucket`, `cron` | The one-trigger shorthand. Ignored when `triggers` is set |
| `eventSource` | string | `""` | — | What `trigger` reads. Ignored when `triggers` is set |
| `dapr.enabled` | boolean | `false` | — | Adds a Dapr sidecar. A `topic` trigger turns it on regardless |
| `dapr.appPort` | integer | `port` | 1–65535 | The port Dapr delivers to |
| `dapr.config` | string | `adhar-dapr` | — | The Dapr Configuration the sidecar loads |
| `env` | map of string | — | may not set `PORT`, `K_SERVICE`, `K_CONFIGURATION`, `K_REVISION` | Environment variables, applied after the platform's own and overriding them |
| `labels` | map of string | — | — | Extra labels on the Knative Service and its pods. Platform labels win on conflict |
| `annotations` | map of string | — | — | Extra annotations on the Revision template. The scaling annotations always come from the fields above |
| `application` | string | the Function's name | — | The application it belongs to, as the label `adhar.io/application` |
| `organisation` | string | `adhar` | — | Used only outside an environment namespace |
| `team` | string | `platform` | — | Used only outside an environment namespace |
| `project` | string | `""` | — | Used only outside an environment namespace |
| `environment` | string | `dev` | `dev`, `test`, `prod` | Used only outside an environment namespace |

**Placement.** In an environment namespace, the namespace's labels `adhar.io/organisation`, `adhar.io/team`, `adhar.io/project` and `adhar.io/environment` override the four placement parameters. The `Placement` condition reports when a parameter disagreed and was ignored. A namespace counts as an environment namespace when it has a non-empty `adhar.io/environment` label.

`spec.compositionSelector` at the top level of `spec` is still accepted, so objects written against the first version of the API stay valid. Crossplane v2 ignores it and reads `spec.crossplane.compositionSelector`.

## Triggers

Each item in `spec.parameters.triggers`:

| Field | Applies to | Default | Meaning |
|---|---|---|---|
| `type` | all | — (required) | `cron`, `cloudevent`, `topic` or `bucket` |
| `name` | all | `<type>-<index>` | Names the composed source `<function>-<name>`. Lowercase DNS label, ≤ 30 characters, unique within the Function |
| `path` | all | `/` | The path each event is POSTed to. Must start with `/` |
| `schedule` | `cron` | — (required) | A crontab schedule, such as `*/5 * * * *` or `@hourly` |
| `timezone` | `cron` | `UTC` | An IANA time zone |
| `data` | `cron` | — | The payload each tick sends |
| `contentType` | `cron` | `application/json` | The payload's content type |
| `broker` | `cloudevent` | `default` | The Broker in the function's namespace. Created if absent and never deleted, since other functions may use it |
| `filter` | `cloudevent` | — | CloudEvent attributes to match exactly, such as `type` and `source` |
| `pubsub` | `topic` | `pubsub` | The Dapr pub/sub component, in the function's namespace |
| `topic` | `topic` | — (required) | The topic to subscribe to |
| `deadLetterTopic` | `topic` | — | Where Dapr sends a message after its retries fail |
| `bucket`, `events` | `bucket` | — | Accepted, **not implemented** |

What each type composes, and how it delivers:

| Type | Composed object | Notes |
|---|---|---|
| `cron` | `sources.knative.dev/v1` `PingSource` | Sink: the Knative Service, at `path` |
| `cloudevent` | `eventing.knative.dev/v1` `Trigger`, plus the namespace `Broker` | Multi-tenant, channel-based Broker over InMemoryChannel: not durable. No retry or dead-letter policy is set |
| `topic` | `dapr.io/v2alpha1` `Subscription` | Scoped to the function. Retries come from the namespace's Dapr Resiliency `adhar-default`: exponential, up to 15 s apart, 10 retries |
| `bucket` | — | `TriggersReady` reports `False/Unsupported`. The function is still served over HTTP |

A composed source is named `<function>-<trigger name>`. Names longer than 63 characters are cut to 54 characters plus an 8-character hash.

### The one-trigger shorthand

The first version of the API took a single `trigger` and `eventSource`. That form still works when `triggers` is not set. An optional `scheme://` prefix is stripped from `eventSource`:

| `trigger` | `eventSource` examples | Becomes |
|---|---|---|
| `http` | `""` | No triggers |
| `cron` | `cron://*/5 * * * *`, `*/5 * * * *`, `@hourly` | A cron trigger named `cron` with that schedule |
| `topic` | `topic://orders.v1`, `topic://kafka-pubsub/orders.v1`, `kafka://orders` | A topic trigger named `topic`. `a/b` means pub/sub `a`, topic `b`. Otherwise the pub/sub component is `pubsub`, so `kafka://orders` is Dapr topic `orders` |
| `cloudevent` | `type=com.acme.order.created,source=shop`, `com.acme.order.created` | A cloudevent trigger named `cloudevent`. A bare value filters on `type` |
| `bucket` | `bucket://media` | Not implemented |

## Status

| Field | Meaning |
|---|---|
| `status.url` | Where the function answers. This is the public URL, or the in-cluster URL with `visibility: cluster` or when the platform domain is unknown |
| `status.address` | The in-cluster URL that event sources deliver to |
| `status.readyRevision` | The Revision serving traffic |
| `status.latestRevision` | The newest Revision. It differs from `readyRevision` while a rollout is in progress, or after it has failed |
| `status.message` | One line, such as `serving thumbnails-00002 at https://thumbnails.dev.example.com` |
| `status.triggers[]` | One entry per trigger: `name`, `type`, `kind` (`PingSource`, `Trigger`, `Subscription`), `resource`, `ready`, `message` |
| `status.conditions[]` | See below |

### Conditions

Besides Crossplane's own `Ready` and `Synced`, the composition reports four conditions:

| Condition | Status / reason | Meaning |
|---|---|---|
| `ServiceReady` | `True` / `RevisionReady` | The Knative Service's latest Revision is serving |
| | `False` / e.g. `RevisionFailed` | The Revision failed. The message carries Knative's reason, such as `Unable to fetch image` |
| | `Unknown` / `Creating` | Not observed yet |
| `EdgeReady` | `True` / `Published` | Published at `status.url` |
| | `True` / `ClusterLocal` | `visibility: cluster`, so there is no edge |
| | `Unknown` / `Publishing` | The route and mapping are being created |
| | `False` / `HostClaimed` | Another namespace owns the hostname. Set `hostname` to another name |
| | `False` / `DomainUnknown` | The platform domain is not published yet (`adhar-system/argocd-cm` has no `url`). Set `hostname`, or wait |
| | `False` / `RouteNotReady` | The HTTPRoute was not accepted by the Gateway, or cannot resolve Kourier |
| | `False` / `DomainMappingNotReady` | Knative has not readied the DomainMapping |
| `TriggersReady` | `True` / `HTTPOnly` | There are no event triggers |
| | `True` / `Ready` | Every trigger's source is ready |
| | `Unknown` / `Waiting` | A source is not ready yet |
| | `False` / `Unsupported` | A `bucket` trigger is set. It is served over HTTP only |
| `Placement` | `True` / `EnvironmentNamespace` | Placement came from the namespace |
| | `True` / `ParameterOverridden` | A placement parameter disagreed with the namespace and was ignored. The message names it |
| | `True` / `Parameters` | Outside an environment namespace: placement came from the parameters |

**Argo CD health** for a Function is:

- **Degraded** when it is not `Synced` because of a reconcile error, when `ServiceReady` is `False`, or when `EdgeReady` is `False/HostClaimed`
- **Healthy** when it is `Ready`
- **Progressing** otherwise

## Composed objects

Each composed object is a provider-kubernetes `Object`:

| Composition resource | Kubernetes object | When |
|---|---|---|
| `knative-service` | `serving.knative.dev/v1` `Service` `<name>` | Always |
| `ingress-policy` | `networking.k8s.io/v1` `NetworkPolicy` `<name>-from-knative` | In an environment namespace |
| `domain-claim` | `networking.internal.knative.dev/v1alpha1` `ClusterDomainClaim` `<host>` | Public, with a known host. Create-only |
| `domain-mapping` | `serving.knative.dev/v1beta1` `DomainMapping` `<host>` | Public, with a known host |
| `route` | `gateway.networking.k8s.io/v1` `HTTPRoute` `<name>` on `adhar-system/adhar-gateway` | Public, with a known host |
| `route-grant` | `gateway.networking.k8s.io/v1beta1` `ReferenceGrant` `function-<namespace>-<name>` in `knative-serving` | Public, with a known host |
| `trigger-<name>` | `PingSource`, `Trigger` or Dapr `Subscription` | Per trigger |
| `broker-<broker>` | `eventing.knative.dev/v1` `Broker` | Per Broker a `cloudevent` trigger names. Create-only |

The Knative Service carries:

- **Labels:** `app.kubernetes.io/name`, `platform.adhar.io/function`, `platform.adhar.io/runtime`, `adhar.io/organisation`, `adhar.io/team`, `adhar.io/environment`, `adhar.io/application`, `adhar.io/plane: workload`, `adhar.io/project` (when set), and `networking.knative.dev/visibility: cluster-local`.
- **Revision template annotations:** `autoscaling.knative.dev/min-scale`, `max-scale` and `target`.
- **With Dapr on:** `dapr.io/enabled`, `app-id`, `app-port`, `config`, metrics on port 9095 (the queue-proxy holds 9090), and JSON logs.

The only container is `user-container`. It sets no resources, so the namespace's LimitRange applies.

## Validation

The API server rejects an object when:

- `minScale` is greater than `maxScale`
- `port` is one of Knative's reserved ports
- a `cron` trigger has no `schedule`, or a `topic` trigger has no `topic`
- a value is outside its enum or numeric range

The composition refuses to render, and reports a reconcile error, when:

- the name is not a DNS-1035 label of 63 characters or fewer (it names the Knative Service)
- `image` is empty
- `hostname` is not a valid DNS name
- two triggers share a name
- `env` sets `PORT` or a `K_*` variable that Knative owns

## adhar function

`adhar function` (aliases `fn`, `functions`) creates and inspects Function objects directly. It runs an image you already have. It does not create a repository, a build or promotion. For a function delivered through dev, test and prod, create it from a template in the Console instead.

| Command | What it does | Notes |
|---|---|---|
| `create <name>` | Creates a Function | Fails if one with that name exists |
| `list` (alias `ls`) | Columns `NAME`, `READY`, `RUNTIME`, `SCALE`, `URL`, `AGE` | `-o json`, `-o yaml` |
| `status <name>` | Namespace, readiness, runtime, image, scale, URL and every condition | |
| `delete <name>` (alias `rm`) | Deletes the Function | A delivered function comes back: Argo CD re-syncs it from Git. Delete its Application instead |

Flags for `create`:

| Flag | Default | Field |
|---|---|---|
| `--image` | — (required) | `image` |
| `--runtime` | `node20` | `runtime`. The CLI accepts `node20`, `python312`, `go122` and `custom` only |
| `--trigger` | `http` | `trigger` |
| `--event-source` | `""` | `eventSource` |
| `--port` | `8080` | `port` |
| `--min-scale` | `0` | `minScale` |
| `--max-scale` | `20` | `maxScale` |
| `--target-concurrency` | `100` | `targetConcurrency` |
| `--timeout` | `30` | `timeoutSeconds`. The API refuses values over 600 |

Persistent flags are `-n/--namespace` (default `adhar-system`) and `-o/--output` (`table`, `json`, `yaml`). **Pass `-n dev` (or another environment namespace)**. The default, `adhar-system`, is not an environment namespace, so the function falls back to the placement defaults and gets no NetworkPolicy.

```bash
adhar function create echo -n dev \
  --image harbor-core.adhar-system.svc.cluster.local/library/echo@sha256:… \
  --runtime node20 --min-scale 0 --max-scale 5 --timeout 60
adhar fn list -n dev
adhar fn status echo -n dev
adhar fn delete echo -n dev
```

For the fields the CLI has no flags for (`triggers`, `visibility`, `hostname`, `env`, `dapr`, `containerConcurrency`, `imagePullSecrets`, `labels`), write the YAML and apply it with `kubectl apply -f`. The CLI selects the composition by `provider: $ADHAR_PROVIDER` (or `local`), and the Function composition is labelled `provider: local`. If a Function created with the CLI never renders, apply it as YAML without a composition selector; the XRD's default composition is then used.

## Permissions

| To | You need |
|---|---|
| Create, edit or delete `Function` objects | `functions.platform.adhar.io`, granted by the ClusterRole `adhar-platform-function-edit` to the OIDC group `platform-developer`. It is not part of the built-in `edit` role |
| Create a function from a template in the Console | `create applications.console.adhar.io` |
| Invoke a function from the Console | `get functions.platform.adhar.io` on it |
| Stream its logs in the Console | `get pods/log` in its namespace |
| Delete a delivered function (its Application) in the Console | `delete applications.console.adhar.io` |

## See also

- **[Functions](/docs/core-concepts/functions)** — the model behind these fields
- **[Deploy a Function](/docs/guides/deploy-a-function)** — the fields in use, step by step
- **[CLI Reference](/docs/reference/cli)** — every other `adhar` command
- **[Control Plane](/docs/core-concepts/control-plane)** — XRDs, compositions and how claims are reconciled
