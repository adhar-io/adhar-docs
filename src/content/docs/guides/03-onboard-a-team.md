---
title: "Onboard a Team"
section: "Guides"
order: 3
path: "/docs/guides/onboard-a-team"
---

# Onboard a Team

This guide gives a new application team a home on the platform. The team gets:

- an identity group
- a set of namespaces with guardrails
- a quota ceiling
- the access its engineers need to the Console, Gitea and the Kubernetes API

It is for the platform engineer doing the onboarding. One section is for the new engineer to follow on their first day.

By the end, the team can deploy into its own dev and test environments and read its prod environment. It cannot reach anything that belongs to another team. You will prove this by impersonating a team member, not by reading manifests.

## What you will build

A team called `payments` in the platform's organisation `adhar`, owning one project, also called `payments`:

```diagram
ha-team-objects
```

Every level is a namespaced Crossplane composite in `platform.adhar.io`. Every object they compose carries the same ownership labels: `adhar.io/organisation`, `adhar.io/team`, `adhar.io/project` and `adhar.io/environment`. So one selector answers "everything team payments owns".

Identity (who is *in* the team) stays in Keycloak, because people are not infrastructure. Everything the team is *granted* is composed from the objects that name its group.

### Prerequisites

| You need | Check with |
|---|---|
| A running platform with Keycloak (on in every profile) | `adhar stack status keycloak` |
| `cluster-admin`, or `platform-admin` membership | `kubectl auth can-i '*' '*'` |
| Keycloak admin access, for the group and its members | `adhar get secrets -p keycloak` |
| The seeded organisation | `kubectl -n adhar-system get organisations.platform.adhar.io` lists `adhar` |
| For quotas: the `adhar-tenant-quotas` package and cert-manager (both on in production, off locally) | `adhar stack status adhar-tenant-quotas` |
| For promotion: Kargo (on in production, off locally) | `adhar stack status kargo` |

## How access is granted

Read this before you run anything. It explains every verify step below.

**The team is a Keycloak group named `ws-team-<team>`.** Members get this group in the `groups` claim of every token the realm issues. The Kubernetes API server is configured with `--oidc-groups-claim=groups` and `--oidc-groups-prefix=oidc:`. So a member of `ws-team-payments` arrives at the API server as group `oidc:ws-team-payments`. The prefix stops OIDC identities from colliding with built-in `system:` groups.

**The Project and its Environments bind that group, one namespace at a time.** An application team gets no cluster-wide grant:

```diagram
ha-team-access
```

| Namespace | Composed by | Team role | Also bound |
|---|---|---|---|
| `payments` (project home, Kargo project) | Project | `admin` | `oidc:org-adhar-admin` → `admin` |
| `payments-dev` | Environment | `admin` | `oidc:org-adhar-admin` → `admin` |
| `payments-test` | Environment | `admin` | `oidc:org-adhar-admin` → `admin` |
| `payments-prod` | Environment | **`view`** | `oidc:org-adhar-admin` → `admin` |

`view` in prod is deliberate. Production changes arrive through a `Release` committed to Git, not through `kubectl`. Each environment entry can override this with `access: admin | edit | view`.

**The platform team's groups are separate, and cluster-wide.** The `keycloak` package binds them with ClusterRoleBindings:

- `platform-admin` and `platform-engineer` → `cluster-admin`
- `platform-developer` → `edit`
- `platform-viewer` → `view`

Self-registered users land in `base-user`, which grants nothing. Do not put application engineers in `platform-developer` to "give them access". On current Kubernetes, the built-in `edit` role **can read Secrets in every namespace**.

## Step 1 — Create the team's Keycloak group and add people

Normally, the Adhar Console creates the group and manages its membership when you create a team there. To do it from the CLI, you need a token that may manage the `adhar` realm. Use your logged-in session if your user holds realm-management rights. Otherwise, pass a Keycloak admin token with `--admin-token`.

```bash
# Locally the defaults point at https://keycloak.adhar.localtest.me:8443;
# on a cloud, add --issuer https://keycloak.<host>/realms/adhar --admin-url https://keycloak.<host>
adhar auth group create ws-team-payments -d "Payments team"

# The realm uses the email address as the username.
adhar auth user create alice@example.com --email alice@example.com --group ws-team-payments
adhar auth user reset-pwd alice@example.com --prompt --temporary

# An existing user:
adhar auth group add-member ws-team-payments bob@example.com
```

**Verify:**

```bash
adhar auth group get ws-team-payments
```

The output names the group (path `/ws-team-payments`). It lists `alice@example.com` and `bob@example.com` as members.

> **Spell the group exactly.** The compositions build the subject as `oidc:ws-team-<team>` from the Team's name. A group called `payments` or `ws-team-Payments` signs in fine but matches no RoleBinding. The user signs in and sees nothing.

## Step 2 — Declare the Team

```yaml
# team-payments.yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Team
metadata:
  name: payments
  namespace: adhar-system
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: local
  parameters:
    name: payments           # the Keycloak group is ws-team-payments; the Gitea team is payments
    organisation: adhar      # the seeded organisation; its Gitea org holds the team's repos
    displayName: Payments
    description: Payment capture, settlement and reconciliation
    giteaPermission: write   # read | write | admin on repositories granted to the team
```

```bash
kubectl apply -f team-payments.yaml
```

A Team composes nothing that costs money. It creates a Gitea team `payments` inside organisation `adhar`, and a status record of the Keycloak group it expects. It has no namespace and no quota of its own; its projects have those.

**Verify:**

```bash
kubectl -n adhar-system get teams.platform.adhar.io payments \
  -o jsonpath='{.status.group}{"  "}{.status.giteaTeam}{"  "}{.status.phase}{"\n"}'
```

The output is `ws-team-payments  adhar/payments  Provisioned`.

## Step 3 — Set the team's quota ceiling

Every environment namespace gets its own `ResourceQuota`. That stops *one* namespace from exhausting the cluster. It does nothing to stop a team creating many projects that are each reasonable on their own.

The `adhar-tenant-quotas` package adds a ceiling above that. It is a validating admission webhook on `Project` create and update. It adds up what the team already holds and refuses a project that would take the team over its allowance.

What it enforces, exactly:

- **Four axes:** `cpu`, `memory`, `pods`, and `projects` (a count). The vocabulary is ResourceQuota's.
- **It sums the `Project` parameters** `cpuQuota`, `memoryQuota` and `podQuota` across every Project whose `parameters.team` is this team. A project being updated is not counted twice.
- **An omitted axis is unlimited**, not zero. You can cap memory without inventing a CPU number.
- **Empty by default.** With no entry, nothing is enforced. A team without its own entry falls back to a `default` entry, if you declare one.
- **It fails open.** `failurePolicy` is `Ignore`, so if the controller is down, projects are admitted. A quota ceiling is a governance control, not a security boundary.

The allowances live in the ConfigMap `adhar-tenant-quotas` in `adhar-system`. The package ships it at `platform/stack/packages/security/adhar-tenant-quotas/manifests/allowances.yaml`. ArgoCD manages it, so edit the file in your platform stack, not the live object:

```yaml
# platform/stack/packages/security/adhar-tenant-quotas/manifests/allowances.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adhar-tenant-quotas
  namespace: adhar-system
  annotations: {argocd.argoproj.io/sync-wave: "0"}
  labels:
    adhar.io/component: tenant-quotas
    app.kubernetes.io/part-of: adhar
data:
  default: |              # any team without its own entry
    cpu: "16"
    memory: 32Gi
    projects: 5
  payments: |             # the key is the Team name
    cpu: "32"
    memory: 64Gi
    pods: "200"
    projects: 10
```

Then converge with `adhar upgrade`. On a local platform the package is off. It also needs cert-manager, which injects the webhook's CA certificate and is off locally too. Turn both on first with `adhar stack enable cert-manager adhar-tenant-quotas`.

**Verify:**

```bash
kubectl -n adhar-system get configmap adhar-tenant-quotas -o jsonpath='{.data.payments}'
kubectl get validatingwebhookconfiguration adhar-tenant-quotas
```

The first command prints the allowance. The second shows that the webhook exists. Step 4 proves that it enforces the limit.

## Step 4 — Create the team's Project

The Project creates the team's environments, RBAC and delivery plumbing. Create it in `adhar-system`, because that is where the paved-road pipelines look projects up:

```yaml
# project-payments.yaml
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
    organisation: adhar       # must match where the team's repos live in Gitea
    team: payments            # → RoleBindings for oidc:ws-team-payments; counted by the tenant quota
    name: payments            # the home namespace, the AppProject and the Kargo project
    description: Payment capture and settlement
    cpuQuota: "4"             # per namespace, unless an environment overrides it
    memoryQuota: 8Gi
    podQuota: 30
    createRepository: true    # creates the Gitea repo adhar/payments
    environments:             # omit for the default dev → test → prod
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

```bash
kubectl apply -f project-payments.yaml
```

To create the same object with the default environments, run `adhar project create --org adhar --team payments --name payments --cpu 4 --memory 8Gi --pods 30`.

**Verify** — the namespaces, their guardrails, and the published environment list:

```bash
kubectl get ns -l adhar.io/project=payments
kubectl -n payments-dev get resourcequota,limitrange,networkpolicy
kubectl -n payments-prod get rolebindings
kubectl -n adhar-system get projects.platform.adhar.io payments \
  -o jsonpath='{range .status.environments[*]}{.name}={.namespace}{"\n"}{end}'
kubectl -n adhar-system get appprojects.argoproj.io payments
```

You should see:

- Four namespaces: `payments`, `payments-dev`, `payments-test` and `payments-prod`.
- In each environment: a `<ns>-quota` ResourceQuota, a `<ns>-limits` LimitRange and a `<ns>-default-deny` NetworkPolicy (plus a `<ns>-allow-gateway` CiliumNetworkPolicy that lets the Gateway reach your pods). The LimitRange gives containers default limits of 500m / 512Mi and default requests of 100m / 128Mi.
- In prod: `payments-prod-team-view` and `payments-prod-org-admin`.
- A status listing `dev=payments-dev`, `test=payments-test`, `prod=payments-prod`.
- The AppProject.

**Prove the quota ceiling.** The allowance above is `projects: 10`, `cpu: "32"`. Submit a dry-run project that asks for more CPU than remains. Admission refuses it:

```bash
kubectl apply --dry-run=server -f - <<'EOF'
apiVersion: platform.adhar.io/v1alpha1
kind: Project
metadata: { name: payments-big, namespace: adhar-system }
spec:
  parameters: { organisation: adhar, team: payments, name: payments-big, cpuQuota: "64" }
EOF
```

The response is a denial: `project exceeds the "payments" team's tenant quota — cpu: 64 requested + 4 already committed = 68, over the team's 32. Raise the team's entry in the adhar-tenant-quotas ConfigMap, or reduce this project's quotas.`

> **What the ceiling counts.** It sums the Project-level parameters, once per project. Each environment *inherits* those numbers unless it overrides them. So the namespaces of one project can together hold several times `cpuQuota`. Size allowances with that in mind.

## Step 5 — Prove the boundary

Check the grants by impersonating a team member, not by reading YAML. For group bindings the username does not matter; the group does:

```bash
AS="--as=oidc:alice@example.com --as-group=oidc:ws-team-payments"

kubectl auth can-i create deployments -n payments-dev  $AS   # yes
kubectl auth can-i create deployments -n payments-test $AS   # yes
kubectl auth can-i get pods          -n payments-prod $AS   # yes  (view)
kubectl auth can-i create deployments -n payments-prod $AS   # no   (view)
kubectl auth can-i get secrets       -n payments-prod $AS   # no   (view excludes Secrets)
kubectl auth can-i get pods          -n adhar-system  $AS   # no
kubectl auth can-i get pods          -n other-team-dev $AS  # no
```

Every line should answer as its comment says. If a "yes" comes back "no", the group name in Keycloak and the Team name do not match. See Step 1.

## Step 6 — Give the team its tools

**The Console** (`https://console.<host>`) signs users in through Keycloak and talks to the API server *as the user*. Its tokens carry the `kubernetes` audience and the `groups` claim, and the Console impersonates them. So a team member sees exactly what Step 5 allows: their namespaces and read-only prod, and nothing else. There is nothing to configure.

**Gitea** (`https://gitea.<host>`) offers Keycloak sign-in, and creates the account on first login. Two things are not automatic for application teams:

- The `keycloak` package ships a Keycloak → Gitea team mapping that covers only the platform groups: `platform-admin` → `Owners`, `platform-developer` → `developers`, `platform-viewer` → `viewers`, in organisation `adhar`. Membership of `ws-team-payments` is **not** synced into the Gitea team `payments`. After each engineer has signed in once, add them in Gitea: organisation `adhar` → Teams → `payments` → Add member.
- The Gitea team is created with `includes_all_repositories: false`, so grant it repositories one by one. Grant at least `adhar/payments` and each application repo the team owns.

**ArgoCD** maps groups to roles in `argocd-rbac-cm`:

- `platform-admin` → `role:admin`
- `platform-developer` → a role that may get, sync and run actions on applications
- `platform-viewer` → `role:readonly`
- `policy.default` is empty.

**No ArgoCD role is composed for `ws-team-*` groups.** A team member who signs in to ArgoCD sees no applications. This is not available out of the box. For application teams, the Console is the supported view of sync and health. Adding team roles means changing the platform's ArgoCD configuration; a Project does not do it.

**OpenBao** holds the production secrets. It maps only `platform-admin`, `platform-developer` and `platform-viewer` to policies. Team members who sign in get the `default` policy, which reads no secrets.

The team's workloads read their secrets through a `SecretStore` in their own namespace. OpenBao confines that store to `secret/tenants/<namespace>/`. The platform's `ClusterSecretStore/vault` does not serve team namespaces. [Manage Secrets End to End](/docs/guides/manage-secrets) covers how teams supply secrets.

## Step 7 — The new engineer's first day: kubectl through OIDC

This section is for the engineer who was just added.

**Check that the API server trusts Keycloak.**

- On a local Kind platform, it does. The OIDC flags are set when the cluster is created.
- On a cloud platform built with kubeadm, your platform team enables it as a deliberate day-2 step once Keycloak is serving.
- On a managed control plane (EKS, AKS, GKE, DOKS), it is the cloud's own OIDC setting, with the same claims and prefixes.

See [Security Best Practices](/docs/security/security-best-practices) for the flags. If it is not enabled, ask your platform team. No client-side step works around it.

**Sign in and get a token.** The CLI performs the password grant against the realm, stores the session and refreshes it:

```bash
# Local:
adhar auth login alice@example.com --insecure
# Cloud:
adhar auth login alice@example.com --issuer https://keycloak.<host>/realms/adhar

adhar auth whoami
adhar auth token --show
```

`--show` prints who the token is for, its groups and when it expires. You should see `ws-team-payments` among the groups.

**Point kubectl at the cluster** with your identity. Get the API server address and its CA certificate from your platform team; both are in any admin kubeconfig. Then pass the token on each call. `adhar auth token` refreshes the token when it has expired, which a token pasted into a kubeconfig would not do:

```bash
kubectl config set-cluster adhar --server=https://<api-server> \
  --certificate-authority=<ca.crt> --embed-certs
kubectl config set-context payments-dev --cluster=adhar --namespace=payments-dev
kubectl config use-context payments-dev

kubectl --token "$(adhar auth token)" get pods
```

**Verify:**

```bash
kubectl --token "$(adhar auth token)" auth whoami
kubectl --token "$(adhar auth token)" auth can-i create deployments -n payments-dev
```

The first command reports username `oidc:alice@example.com` with group `oidc:ws-team-payments`. The second answers `yes`.

## Offboarding

Remove the person from the group. This one change covers every service that reads the claim:

```bash
adhar auth group remove-member ws-team-payments alice@example.com
```

Their next token carries no team group, so Kubernetes, the Console and every SSO service stop granting team access. A token already issued stays valid until it expires.

To stop new sign-ins entirely, disable the user in Keycloak: `adhar auth user update alice@example.com --status inactive`. Also remove them from the Gitea team by hand, since that membership was added by hand.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| User signs in everywhere but sees no namespaces | Keycloak group name does not match `ws-team-<team>` | Rename the group; check `adhar auth token --show` |
| `kubectl` returns `Unauthorized` with a valid token | API server OIDC not enabled, or `--oidc-client-id` is not `kubernetes` | Ask the platform team; the audience is `kubernetes`, not `adhar-cli` |
| `Forbidden` for a member who should have access | The token predates their group membership | `adhar auth login … --force` for a fresh token |
| Project denied: `exceeds the … team's tenant quota` | The team's allowance is used up | Raise the team's entry in `allowances.yaml`, or lower the project's quotas |
| Tenant quota never denies anything | Package off, no entry for the team and no `default`, cert-manager missing (no serving certificate), or the controller is down (fails open) | `adhar stack status adhar-tenant-quotas`; `adhar stack status cert-manager`; check the ConfigMap |
| Project `READY=False`, events name `kargo.akuity.io` kinds | Kargo is not installed (off in the local profile) | Namespaces, quotas and RBAC are still created; `adhar stack enable kargo` for promotion |
| `ws-team` member sees nothing in ArgoCD | No ArgoCD role is mapped for team groups | Use the Console for sync and health |
| Member cannot push to the repo in Gitea | Gitea team membership and repo grants are manual for team groups | Add the user to team `payments`; grant the repository |
| A Service in `payments-dev` is unreachable from another team namespace | Default-deny ingress admits only the same namespace, `adhar-system` and the Gateway | Add a NetworkPolicy in the target namespace for that source |
| ArgoCD refuses to deploy a repo into the project | The AppProject admits only `adhar/*` Gitea repos | Add the source to `allowedSourceRepos` on the Project |

## Next steps

- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — the team's first stateful workload
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — how the dev/test/prod environments you just created are used
- **[Manage Secrets End to End](/docs/guides/manage-secrets)** — how the team gets credentials without seeing the backend
- **[Security Best Practices](/docs/security/security-best-practices)** — the identity model and API server OIDC flags in full
- **[Accessing the Platform](/docs/operations/accessing-the-platform)** — URLs, credentials and the request path
