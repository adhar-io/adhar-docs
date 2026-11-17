---
title: "Golden Paths"
section: "Platform Engineering"
order: 3
path: "/docs/platform-engineering/golden-paths"
---

# Golden Paths

A *golden path* is **the supported, opinionated, fastest route through a task your organisation does over and over**: standing up a service, attaching a database, getting a change to production. It is a route, not a rule. Other routes stay allowed; this is the one the platform team has built, instrumented and promised to keep working.

This page explains what separates a golden path from an unused template, and shows the paths Adhar ships.

## How it works

```diagram
gd-golden-path-escape-hatch
```

Three words carry the definition:

| Word | What it means | What goes wrong without it |
|---|---|---|
| **Supported** | Someone owns the path, answers questions, fixes it and upgrades it | You have a template that rots after day 0 |
| **Opinionated** | It picks one database, one build system, one deployment shape. The value is in the choices it removes | You have a framework with a setting for every decision |
| **Fastest** | It reaches the same result quicker than doing it yourself | Teams go around it, and they are right to |

The trade is fewer choices in exchange for someone else handling the wiring. Ten teams no longer solve auth, ingress, CI, secrets and dashboards in ten slightly different ways.

The golden path is the route a team chooses. The [paved road](/docs/platform-engineering/paved-road) is the pipeline every route runs on, with its guardrails.

## A path is more than a template

A *scaffolder* generates a new project from a template. That is the cheapest part of a service's life. A path covers what comes after.

| | First deploy | First incident | Months later |
|---|---|---|---|
| **With a path** | A running service with a URL, a pipeline and a dashboard | Alerts already existed; rollback works | A dependency CVE is patched by the platform; the base image moved underneath |
| **With only a template** | The same, plus the parts the template forgot | You find out what was forgotten | A fork of an old mistake that nobody is funded to fix |

Four properties make the difference:

1. **It is faster than building your own**, measured against a competent engineer doing the job by hand.
2. **It stays supported and upgraded.** Base images, library versions and policies change. Those changes reach existing services without each team copying them by hand.
3. **It covers the whole lifecycle**: the second deploy, the first incident, the dependency upgrade, the compliance question.
4. **It has an escape hatch.** A service with a real reason to differ can leave without asking permission. It accepts a smaller support promise.

## Golden path or gilded cage

A path becomes a cage in three ways. Each is a failure of the platform team, not of the teams complaining.

| Failure | Symptom | Cause | Fix |
|---|---|---|---|
| **Made mandatory** | Teams comply on paper, then build a shadow stack | The path was losing on merit, so adoption was ordered | Drop the mandate. Treat non-adoption as a product defect and find the part that is slower than doing it by hand |
| **Not maintained** | Generated services pin versions nobody dares change | Funded as a project, not staffed as a product | Give it an owner and a published support commitment, or retire it |
| **No way off** | A team needs one exception and the answer is no | Path and policy were mixed up | Separate them: policy belongs to the [paved road](/docs/platform-engineering/paved-road); the path is one supported way to meet it |

> **Note:** A mandate also destroys your feedback. When teams are free to leave, adoption measures quality. When they are not, it measures nothing. See [Platform as a Product](/docs/platform-engineering/platform-as-a-product).

## Choose which paths to build

Start from what teams already do repeatedly and badly. Signals, most reliable first:

1. **Copy-paste.** The same `Dockerfile`, CI config and ingress block across many repositories, drifting apart.
2. **The ticket queue.** Any request a person fulfils from a runbook is a path waiting to be written.
3. **Repeated incidents with one root cause**, such as a timeout nothing set a default for.
4. **Questions in chat.** Asked once, it is support. Asked every week, it is a design gap.

Build a few paths and make them good. Two that cover most new work beat nine that each cover a slice.

## Design one

1. **Name the task, not the technology.** "Ship an HTTP service that talks to Postgres", not "a Spring Boot template".
2. **Start from the best implementation already running** in your organisation. Teams trust a path built from production code.
3. **Remove choices on purpose.** Write down what the path decides and what it leaves open. Keep both lists short.
4. **Separate owned from managed.** Teams edit *owned* material freely: business logic, service config. Keep *managed* material — pipeline wiring, policy bindings, base images — behind a reference such as a shared pipeline or a chart version, so it upgrades without a merge conflict in every repository.
5. **Write the escape hatch before you ship**, and track who started, who stayed and who left. The people who left are your roadmap.

## Version it without stranding anyone

- **Record which path version each service came from.** Without it you cannot reason about the fleet.
- **Let additive changes flow automatically**: a new default alert, a patch release.
- **Give breaking changes a new version and a migration note**: a new runtime major, a different deployment shape.
- **Do the migration for people where you can.** A bot pull request against every service moves the fleet. A migration guide alone leaves a long tail.
- **Deprecate with a date and a named successor.**

## How Adhar does this

Adhar keeps its golden paths in **one collection with two entry points**. The templates are Backstage scaffolder templates in the `adhar/adhar-templates` repository. The platform's Gitea mirrors that repository from GitHub, so the collection updates without a platform release.

```diagram
npe-golden-path-flow
```

**Start a service from the terminal:**

```bash
adhar application templates                             # list the paths your platform offers
adhar application templates <name>                      # show the parameters one accepts
adhar application deploy <app> --template <name>        # render into the app's Gitea repo, then deploy
```

**Or from the Console:** the create flow reads the same collection and generates the same repository.

The collection includes these families. The live list comes from the mirror, so check `adhar application templates`.

| Family | Templates |
|---|---|
| Web services | `go-web-service`, `nodejs-web-service`, `python-web-service`, `quarkus-web-service`, `springboot-web-service` |
| Frontends | `react-spa-app`, `angular-spa-app`, `tanstack-start-fullstack-app` |
| Functions | `function-go-service`, `function-nodejs-service`, `function-python-service`, `function-java-service`, `function-deno-service` |
| Batch | `springboot-batch-service`, `springboot-batch-partitioned` |

**What the generated service lands on.** This is what makes the templates paths and not snippets:

| The service is | Provided by |
|---|---|
| Routable | The Cilium-backed Gateway API. The web-service and frontend templates ship an `HTTPRoute`, served at `<name>.<environment>.<host>` |
| Monitored | The shared monitoring stack. The web-service templates export telemetry over OTLP and can ship a `PrometheusRule`; the platform composes a Grafana dashboard per application |
| Built, scanned and signed | The `app-ci` Tekton pipeline on every push — see [The Paved Road](/docs/platform-engineering/paved-road) |
| In scope for policy | The cluster's Kyverno policies, including signature checks on images from Harbor |
| Kept in sync | Argo CD, from Git, with self-heal on. An out-of-band `kubectl edit` on a managed object is put back |
| Previewable | A pull request labelled `preview` gets its own namespace, image and hostname — see [Preview Environments](/docs/guides/preview-environments) |

**Infrastructure follows the same model.** Crossplane exposes `Database`, `Cache`, `Bucket`, `Cluster` and more as namespaced Kubernetes resources. A team requests a bucket in the same place, and the same way, as a Deployment. See [Control Plane](/docs/core-concepts/control-plane).

**What the path does not do:**

- The templates do not register an OIDC client in Keycloak for the service. Identity is not wired in per service.
- The generated repository belongs to the team. Template improvements do not flow into it automatically. Platform capabilities do: they are upgraded as packages in `platform/stack/packages`, not as pull requests against every repository.

**The escape hatch** is the foundation itself. Everything a template generates is ordinary Kubernetes and ordinary Git. A team can stop using the template, own the manifests, and keep everything the platform provides underneath.

## Next steps

- [Your First Service](/docs/getting-started/first-service) — walk an Adhar golden path end to end.
- [The Paved Road to Production](/docs/platform-engineering/paved-road) — the pipeline and guardrails a path runs on.
- [Platform as a Product](/docs/platform-engineering/platform-as-a-product) — why adoption beats mandate.
- [Measuring Platform Success](/docs/platform-engineering/measuring-success) — adoption funnels and service scorecards.
