---
title: "Self-service infrastructure without the ticket queue"
excerpt: "How Adhar uses Crossplane v2 to turn a database, cache or bucket request into a Kubernetes object in your own namespace, bounded by quotas and policy the platform team writes once."
category: "Platform Updates"
author: "Adhar Team"
date: "2026-10-09"
featured: false
tags: ["Crossplane", "Self-Service", "Kubernetes", "Platform Engineering"]
---

Ask an engineer how long it takes to get a new database, and the answer usually says more about the organisation than the database. The database itself takes minutes. The wait is in the queue in front of it.

This post explains how Adhar replaces that queue with an API. A developer asks for a database, a cache or a bucket the same way they ask for a Deployment. The platform builds it, keeps it in line with the request, and puts the credentials in a Secret. The limits on what they may ask for are written once, by the platform team, as code.

## Why ticket-driven infrastructure is slow

A ticket queue is slow for structural reasons, not because the people working it are slow.

- **Every request waits for a person.** Even a routine request sits in the queue until someone picks it up.
- **Each request is solved again.** One engineer sizes the database one way, another a different way. Backups, naming and network rules drift between teams.
- **The rules live in people's heads.** Which engine versions are allowed? How big may a dev database be? The answers are in a wiki page, or in the memory of whoever handles the ticket.
- **People route around it.** When the queue is slow enough, teams start running their own databases in a corner. That is shadow IT, and it is worse than the queue.

The platform-engineering answer is self-service: the common case needs no human in the loop. But self-service without limits just moves the risk. The goal is to make the safe path the fast path.

## A database is a Kubernetes object

Adhar's control plane is built on Crossplane v2, in its namespaced form. Crossplane extends the Kubernetes API server, so infrastructure becomes ordinary Kubernetes objects. Three Crossplane terms carry the whole design:

| Term | What it is |
|---|---|
| **XRD** (CompositeResourceDefinition) | The contract: the API's name, its schema, and its default implementation |
| **XR** (composite resource) | What a developer creates, such as `Database/payments-db` |
| **Composition** | One implementation of an XRD, labelled so a request can select it |

In Crossplane v2 the XR is namespaced and created directly. There is no separate claim kind. So the request lives in the team's namespace, and Kubernetes RBAC decides who may create it.

Every self-service kind lives in `platform.adhar.io/v1alpha1` and is named for what you get: `Database`, `Cache`, `Bucket`, `Application`, `Project`, `Cluster`. The old `Composite*` names were retired and are rejected, not aliased.

The control plane ships about forty XRDs and sixty-odd Compositions. To see the live list on your own cluster:

```bash
kubectl get xrd
kubectl get compositions --show-labels
```

## Requesting a database

Here is a PostgreSQL request for a payments team. It is a trimmed version of the example in the platform repository:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Database
metadata:
  name: payments-db
  namespace: team-payments
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local             # aws | gcp on a cloud; nothing else changes
        engine: postgresql
  parameters:
    engine: postgresql
    engineVersion: "16"             # used by the cloud Compositions
    storageSize: 20Gi
    replicas: 1                     # one read replica beside the primary
    databaseName: payments
    additionalDatabases:
      - name: payments_audit        # a second logical database, not a second cluster
    backupSchedule: "0 30 1 * * *"  # six fields: the first is seconds
    deletionPolicy: Orphan          # keep the cloud database if the request is deleted
```

```bash
kubectl apply -f payments-db.yaml
```

The CLI produces the same object. On `adhar database`, `-n` means `--name`, not namespace, and `--version` is required:

```bash
adhar database create --name payments-db --engine postgresql --version 16 \
  --size 20Gi --namespace team-payments
```

The Adhar Console produces it too. A resource created one way cannot be told apart from one created another way, because all three paths write the same Kubernetes object.

### One contract, many implementations

The `provider` label picks the Composition. Locally, the default is `database-local-cnpg`, which builds a CloudNativePG cluster in the team's namespace. On a cloud, the same request with `provider: aws` or `provider: gcp` builds RDS or Cloud SQL. The application's manifests do not change when the platform moves.

A bare request that selects nothing gets the in-cluster CloudNativePG default. That default needs no cloud credentials, so a careless request can never reach for a cloud by accident.

The same pattern covers the other backing services:

```bash
adhar cache create sessions --engine valkey --replicas 2
adhar cache connection sessions           # host, port and URI
adhar bucket create uploads --size 100Gi --versioning
adhar bucket credentials uploads
```

It also covers whole clusters. A `Cluster` request with `provider: digitalocean` composes a DOKS cluster, and the same kind with a different selector gives you EKS, GKE, AKS, Civo or a vcluster.

### Watch it compose

You do not have to trust a summary. Each layer is visible with ordinary tools:

```bash
kubectl get databases.platform.adhar.io -n team-payments        # SYNCED and READY
kubectl describe databases.platform.adhar.io payments-db -n team-payments
kubectl get clusters.postgresql.cnpg.io -n team-payments        # what it composed
adhar database status payments-db --namespace team-payments
```

Qualify the resource name. `Database` and `Cluster` also exist in the CloudNativePG API group, so a bare `kubectl get databases` may not show what you meant.

## Connection details land in a Secret

Crossplane v2 removed automatic connection-detail propagation. Each Composition decides where credentials land. For the common cases:

| Request | Secret | Keys |
|---|---|---|
| `Database`, local PostgreSQL | `<name>-app` | CNPG's standard set, including `uri`, `host`, `port`, `username`, `password` |
| `Database`, local Valkey | `<name>-app` | `uri`, `host`, `port`, `engine` |
| `Database` on AWS, GCP or Azure | `<name>-db` | The provider's connection details |

Binding it into an application is one command. It adds the Secret as `envFrom` on the app's first container and rolls the Deployment:

```bash
adhar application bind payments-api payments-db --namespace team-payments
```

On a cloud, the Secret is `<name>-db`, so name it with `--secret payments-db-db`.

Nobody pastes a password into a ticket, a chat thread or a wiki page. The credentials go from the operator to a Secret to the workload.

## Guardrails: quotas, Project tiers and policy

Self-service is only safe if the limits are enforced by the platform, not by a reviewer. Adhar layers three kinds of limit.

### Projects and tiers

A team's namespaces come from a `Project`. The Project composes the namespaces, quotas, RBAC and delivery plumbing in one request:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Project
metadata:
  name: payments
  namespace: adhar-system
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local
  parameters:
    organisation: adhar
    team: payments            # RoleBindings for the team's Keycloak group
    name: payments
    tier: dev                 # guardrail tier of the home namespace
    cpuQuota: "4"             # per namespace, unless an environment overrides it
    memoryQuota: 8Gi
    podQuota: 30
    createRepository: true
    environments:
      - name: dev
        autoPromote: true
      - name: test
        autoPromote: true
      - name: prod
        autoPromote: false    # prod waits for a Release
        access: view          # the team's role in payments-prod
        cpuQuota: "8"
        memoryQuota: 16Gi
```

Each environment gets its own namespace, with a `ResourceQuota`, a `LimitRange` and a default-deny `NetworkPolicy`. Tiers are `dev`, `test` and `prod`. By default the team is admin in dev and test and has view access in prod, so production changes arrive through a Release rather than a direct edit.

The CLI makes a Project too:

```bash
adhar project create --name payments --org acme --team payments --tier dev
```

### Quotas at two levels

| Limit | Scope | Enforced by |
|---|---|---|
| `ResourceQuota` | One namespace | Kubernetes, from the Project's `cpuQuota`, `memoryQuota` and `podQuota` |
| Tenant quota | A whole team, across all its projects | The `adhar-tenant-quotas` admission webhook, on Project create and update |

The namespace quota stops one namespace from exhausting the cluster. It does not stop a team from creating many projects that are each reasonable on their own. The tenant quota adds that ceiling. It sums CPU, memory and pods across the team's projects, counts the projects, and refuses one that would take the team over its allowance. The allowances live in a ConfigMap that ArgoCD manages, so changing one is a commit.

The tenant quota is on in the production profile and off locally. It also fails open: if its controller is down, projects are admitted. It is a governance control, not a security boundary.

### Policy as code

Architectural rules are Kyverno policies. The `adhar-kyverno-policies` and `adhar-policy-packs` packages carry the baseline, and a denial names the policy that rejected the workload. The `CompliancePolicy` API puts your own Kyverno guardrails, in audit or enforce mode, behind the same self-service contract as a database.

Start in audit mode, read the PolicyReports, and enforce once you know what would break:

```bash
adhar policy validate my-policy.yaml --client
adhar policy apply my-policy.yaml --mode audit
adhar policy status
```

## The platform team writes the rule once

This is the shift that matters. In a ticket queue, the platform team makes the same decision on every request. With a control plane, they make it once and encode it.

In Adhar's 6 D's framework, that work belongs to the **Design** stage: how a service will be built, and within which limits. A self-service contract is an XRD. Each implementation is a Composition. An architectural rule is a Kyverno policy. A tenancy boundary is a quota. Each one is an ordinary manifest in Git, reviewed like any other change.

A Design stage is done when every constraint a reviewer would check by hand is a Composition, a policy or a quota. After that, a developer's request is checked by the platform in seconds, the same way every time.

When the platform team needs a new API, they add an XRD and one Composition per implementation. A new implementation of an existing API is just one more Composition with a distinguishing label. Consumers who select that label get it, and nobody else notices.

## Next steps

- Read [Control Plane](/docs/core-concepts/control-plane) for every shipped API, connection Secrets, deletion and retention.
- Follow [Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service) end to end.
- Set up a team with [Onboard a Team](/docs/guides/onboard-a-team), including the tenant quota.
- See where Design fits in [The 6 D's Framework](/docs/core-concepts/ds-framework).
- Write your own XRDs and Compositions with [Customization](/docs/operations/customization).
- New to Adhar? One `adhar up` gives you a local platform in about ten minutes. Start with the [Quick Start](/docs/getting-started/quick-start).
