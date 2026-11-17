---
title: "Onboard a Team"
section: "Guides"
order: 3
path: "/docs/guides/onboard-a-team"
---

# Onboard a Team

This guide gives a new application team a home on the platform: an identity group, guard-railed namespaces, a quota ceiling, and access to the Console, Gitea and the Kubernetes API. It is for the platform engineer doing the onboarding; [Step 7](#step-7-the-new-engineers-first-day-kubectl-through-oidc) is for the new engineer. When you finish, the team can deploy into its own dev and test environments, read its prod environment, and reach nothing that belongs to another team.

## What you'll build

A team called `payments` in the platform's organisation `adhar`, owning one project, also called `payments`:

```diagram
ha-team-objects
```

Every level is a namespaced Crossplane composite in `platform.adhar.io`. Every object they compose carries the same ownership labels (`adhar.io/organisation`, `adhar.io/team`, `adhar.io/project` and `adhar.io/environment`), so one selector answers "everything team payments owns".

Identity, meaning who is *in* the team, stays in Keycloak. Everything the team is *granted* is composed from the objects that name its group.

```diagram
nga-onboard-steps
```

## Prerequisites

- A running platform with Keycloak, which is on in every profile. Check with `adhar stack status keycloak`.
- `cluster-admin`, or membership of `platform-admin`: `kubectl auth can-i '*' '*'`.
- Keycloak admin access, for the group and its members: `adhar get secrets -p keycloak`.
- The seeded organisation: `kubectl -n adhar-system get organisations.platform.adhar.io` lists `adhar`.
- For quotas: the `adhar-tenant-quotas` package and cert-manager. Both are on in production and off locally. Check with `adhar stack status adhar-tenant-quotas`.
- For promotion: Kargo, on in production and off locally. Check with `adhar stack status kargo`.

## How access is granted

Read this first. It explains every check below.

**Groups come from Keycloak.** Three groups matter for an application team:

| Keycloak group | Who is in it |
|---|---|
| `org-adhar` | Everyone in organisation `adhar` |
| `org-adhar-admin` | The organisation's admins |
| `ws-team-<organisation>.<team>` (here `ws-team-adhar.payments`) | The team's members, who must also be in the organisation |

The organisation is part of the team group's name because two organisations can each have a team called `payments`. A `.` cannot occur in a slug, so the name can only mean one pair.

**The API server sees those groups with an `oidc:` prefix.** Members get their groups in the `groups` claim of every token the realm issues. The Kubernetes API server runs with `--oidc-groups-claim=groups` and `--oidc-groups-prefix=oidc:`, so a member of `ws-team-adhar.payments` arrives as group `oidc:ws-team-adhar.payments`. The prefix stops OIDC identities from colliding with built-in `system:` groups.

**The Project and its Environments bind that group, one namespace at a time.** An application team gets no cluster-wide grant:

```diagram
ha-team-access
```

| Namespace | Composed by | Team role | Also bound |
|---|---|---|---|
| `adhar` (organisation home) | Organisation | — | `oidc:org-adhar-admin` → `admin`, `oidc:org-adhar` → `view` |
| `payments` (project home, Kargo project) | Project | `admin` | `oidc:org-adhar-admin` → `admin` |
| `payments-dev` | Environment | `admin` | `oidc:org-adhar-admin` → `admin` |
| `payments-test` | Environment | `admin` | `oidc:org-adhar-admin` → `admin` |
| `payments-prod` | Environment | **`view`** | `oidc:org-adhar-admin` → `admin` |

`view` in prod is deliberate: production changes arrive through a `Release` committed to Git, not through `kubectl`. Each environment entry can override this with `access: admin | edit | view`.

**The platform team's groups are separate and cluster-wide.** The `keycloak` package binds them with ClusterRoleBindings:

| Group | ClusterRole |
|---|---|
| `platform-admin`, `platform-engineer` | `cluster-admin` |
| `platform-developer` | `edit` |
| `platform-viewer` | `view` |

Self-registered users land in `base-user`, which grants nothing.

> **Warning:** Do not put application engineers in `platform-developer` to "give them access". The built-in `edit` role can read Secrets in every namespace.

## Step 1 — Create the team's Keycloak group and add people

**In the Console** (the usual way), as an organisation admin:

1. **Settings → Members** adds people: an existing Keycloak account, or a new one. For a new account, Keycloak emails a set-password link, which needs an SMTP server on the realm.
2. **Settings → Teams** creates the team and its group `ws-team-adhar.payments`, and adds organisation members to it.

The Console writes only to Keycloak; it keeps no member list of its own.

**From the CLI**, you need a token that may manage the `adhar` realm. Your logged-in session works if your user holds realm-management rights. Otherwise pass a Keycloak admin token with `--admin-token`.

```bash
# Locally the defaults point at https://keycloak.adhar.localtest.me:8443.
# On a cloud, add: --issuer https://keycloak.<host>/realms/adhar --admin-url https://keycloak.<host>
adhar auth group create ws-team-adhar.payments -d "Payments team"

# A new user. The realm uses the email address as the username.
adhar auth user create alice@example.com --email alice@example.com --group org-adhar
adhar auth group add-member ws-team-adhar.payments alice@example.com
adhar auth user reset-pwd alice@example.com --prompt --temporary

# An existing user.
adhar auth group add-member org-adhar bob@example.com
adhar auth group add-member ws-team-adhar.payments bob@example.com
```

**Check:**

```bash
adhar auth group get ws-team-adhar.payments
```

The output names the group (path `/ws-team-adhar.payments`) and lists `alice@example.com` and `bob@example.com` as members.

> **Warning:** Spell the group exactly. The compositions build the subject as `oidc:ws-team-<organisation>.<team>` from the Team's parameters. A group called `payments`, `ws-team-payments` or `ws-team-adhar.Payments` matches no RoleBinding: the user signs in and sees nothing.

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
    name: payments           # the Keycloak group is ws-team-adhar.payments; the Gitea team is payments
    organisation: adhar      # the seeded organisation; its Gitea org holds the team's repos
    displayName: Payments
    description: Payment capture, settlement and reconciliation
    giteaPermission: write   # read | write | admin on repositories granted to the team
```

```bash
kubectl apply -f team-payments.yaml
```

A Team creates a Gitea team `payments` inside organisation `adhar`, and a status record of the Keycloak group it expects. It has no namespace and no quota of its own; its projects have those.

**Check:**

```bash
kubectl -n adhar-system get teams.platform.adhar.io payments \
  -o jsonpath='{.status.group}{"  "}{.status.giteaTeam}{"  "}{.status.phase}{"\n"}'
```

The output is `ws-team-adhar.payments  adhar/payments  Provisioned`.

## Step 3 — Set the team's quota ceiling

Every environment namespace gets its own `ResourceQuota`, which stops *one* namespace from exhausting the cluster. It does not stop a team creating many projects that are each reasonable on their own. The `adhar-tenant-quotas` package adds a ceiling above that:

```diagram
nga-quota-ceiling
```

It is a validating admission webhook on `Project` create and update. It adds up what the team already holds and refuses a project that would take the team over its allowance.

| Behaviour | Detail |
|---|---|
| Axes | `cpu`, `memory`, `pods`, and `projects` (a count) |
| What it sums | The `Project` parameters `cpuQuota`, `memoryQuota` and `podQuota`, across every Project whose `parameters.team` is this team. A project being updated is not counted twice. |
| Omitted axis | Unlimited, not zero. You can cap memory without inventing a CPU number. |
| No entry for the team | Falls back to a `default` entry, if you declare one. With neither, nothing is enforced. |
| Controller down | Projects are admitted: `failurePolicy` is `Ignore`. The ceiling is a governance control, not a security boundary. |

The allowances live in the ConfigMap `adhar-tenant-quotas` in `adhar-system`. ArgoCD manages it, so edit the file in your platform stack, not the live object:

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

Converge with `adhar upgrade`. On a local platform, first turn on the package and cert-manager, which injects the webhook's CA certificate:

```bash
adhar stack enable cert-manager adhar-tenant-quotas
```

**Check:**

```bash
kubectl -n adhar-system get configmap adhar-tenant-quotas -o jsonpath='{.data.payments}'
kubectl get validatingwebhookconfiguration adhar-tenant-quotas
```

The first command prints the allowance. The second shows that the webhook exists. Step 4 proves that it enforces the limit.

## Step 4 — Create the team's Project

The Project creates the team's environments, RBAC and delivery plumbing. Create it in `adhar-system`, where the paved-road pipelines look projects up:

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
    team: payments            # → RoleBindings for oidc:ws-team-adhar.payments; counted by the tenant quota
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

The CLI creates the same object with the default environments:

```bash
adhar project create --org adhar --team payments --name payments \
  --cpu 4 --memory 8Gi --pods 30
```

**Check:** the namespaces, their guardrails, and the published environment list.

```bash
kubectl get ns -l adhar.io/project=payments
kubectl -n payments-dev get resourcequota,limitrange,networkpolicy
kubectl -n payments-prod get rolebindings
kubectl -n adhar-system get projects.platform.adhar.io payments \
  -o jsonpath='{range .status.environments[*]}{.name}={.namespace}{"\n"}{end}'
kubectl -n adhar-system get appprojects.argoproj.io payments
```

- Four namespaces: `payments`, `payments-dev`, `payments-test` and `payments-prod`.
- In each environment: a `<ns>-quota` ResourceQuota, a `<ns>-limits` LimitRange and a `<ns>-default-deny` NetworkPolicy, plus a `<ns>-allow-gateway` CiliumNetworkPolicy that lets the Gateway reach your pods. The LimitRange gives containers default limits of 500m / 512Mi and default requests of 100m / 128Mi.
- In prod: the RoleBindings `payments-prod-team-view` and `payments-prod-org-admin`.
- A status listing `dev=payments-dev`, `test=payments-test`, `prod=payments-prod`.
- The AppProject `payments`.

**Check the quota ceiling.** The allowance is `cpu: "32"`. Submit a dry-run project that asks for more CPU than remains:

```bash
kubectl apply --dry-run=server -f - <<'EOF'
apiVersion: platform.adhar.io/v1alpha1
kind: Project
metadata: { name: payments-big, namespace: adhar-system }
spec:
  parameters: { organisation: adhar, team: payments, name: payments-big, cpuQuota: "64" }
EOF
```

Admission refuses it:

```text
project exceeds the "payments" team's tenant quota — cpu: 64 requested + 4 already committed = 68, over the team's 32. Raise the team's entry in the adhar-tenant-quotas ConfigMap, or reduce this project's quotas.
```

> **Note:** The ceiling sums the Project-level parameters, once per project. Each environment inherits those numbers unless it overrides them, so the namespaces of one project can together hold several times `cpuQuota`. Size allowances with that in mind.

## Step 5 — Prove the boundary

Check the grants by impersonating a team member, not by reading YAML. For group bindings the username does not matter; the group does.

```bash
AS="--as=oidc:alice@example.com --as-group=oidc:ws-team-adhar.payments"

kubectl auth can-i create deployments -n payments-dev  $AS   # yes
kubectl auth can-i create deployments -n payments-test $AS   # yes
kubectl auth can-i get pods          -n payments-prod $AS   # yes  (view)
kubectl auth can-i create deployments -n payments-prod $AS   # no   (view)
kubectl auth can-i get secrets       -n payments-prod $AS   # no   (view excludes Secrets)
kubectl auth can-i get pods          -n adhar-system  $AS   # no
kubectl auth can-i get pods          -n other-team-dev $AS  # no
```

**Check:** every line answers as its comment says. If a "yes" comes back "no", the group name in Keycloak and the Team name do not match; return to Step 1.

## Step 6 — Give the team its tools

What a team member gets in each tool, and what you still have to do:

| Tool | What a team member gets | Your action |
|---|---|---|
| Console (`https://console.<host>`) | Their namespaces, with read-only prod; nothing else | None |
| Gitea (`https://gitea.<host>`) | An account on first Keycloak sign-in, with no team membership | Add each engineer to the Gitea team; grant it repositories |
| ArgoCD | No applications | None; use the Console for sync and health |
| OpenBao | The `default` policy, which reads no secrets | None; workloads read secrets through a `SecretStore` |

**Console.** It signs users in through Keycloak and talks to the API server *as the user*. Its tokens carry the `kubernetes` audience and the `groups` claim, and the Console impersonates them. A team member sees exactly what Step 5 allows.

**Gitea.** Two things are not automatic for application teams:

- The `keycloak` package's Keycloak → Gitea team mapping covers only the platform groups (`platform-admin` → `Owners`, `platform-developer` → `developers`, `platform-viewer` → `viewers`, in organisation `adhar`). Membership of `ws-team-adhar.payments` is **not** synced into the Gitea team `payments`. After each engineer has signed in once, add them in Gitea: organisation `adhar` → **Teams** → `payments` → **Add member**.
- The Gitea team is created with `includes_all_repositories: false`, so grant it repositories one by one: at least `adhar/payments` and each application repository the team owns.

**ArgoCD.** `argocd-rbac-cm` maps `platform-admin` → `role:admin`, `platform-developer` → a role that may get, sync and run actions on applications, and `platform-viewer` → `role:readonly`. `policy.default` is empty, and no ArgoCD role is composed for `ws-team-<organisation>.<team>` groups. Adding team roles means changing the platform's ArgoCD configuration; a Project does not do it.

**OpenBao.** It maps only `platform-admin`, `platform-developer` and `platform-viewer` to policies. The team's workloads read their secrets through a `SecretStore` in their own namespace, which OpenBao confines to `secret/tenants/<namespace>/`. The platform's `ClusterSecretStore/vault` does not serve team namespaces. See [Manage Secrets End to End](/docs/guides/manage-secrets).

## Step 7 — The new engineer's first day: kubectl through OIDC

This step is for the engineer who was just added.

1. **Confirm the API server trusts Keycloak.** If it does not, ask your platform team; no client-side step works around it. See [Security Best Practices](/docs/security/security-best-practices) for the flags.

   | Platform | OIDC on the API server |
   |---|---|
   | Local Kind | Set when the cluster is created |
   | Cloud, built with kubeadm | Enabled by the platform team as a day-2 step, once Keycloak is serving |
   | Managed control plane (EKS, AKS, GKE, DOKS) | The cloud's own OIDC setting, with the same claims and prefixes |

2. **Sign in.** The CLI performs the password grant against the realm, stores the session and refreshes it.

   ```bash
   # Local:
   adhar auth login alice@example.com --insecure
   # Cloud:
   adhar auth login alice@example.com --issuer https://keycloak.<host>/realms/adhar

   adhar auth whoami
   adhar auth token --show
   ```

   `--show` prints who the token is for, its groups and when it expires. The groups include `org-adhar` and `ws-team-adhar.payments`.

3. **Point kubectl at the cluster.** Get the API server address and its CA certificate from your platform team; both are in any admin kubeconfig.

   ```bash
   kubectl config set-cluster adhar --server=https://<api-server> \
     --certificate-authority=<ca.crt> --embed-certs
   kubectl config set-context payments-dev --cluster=adhar --namespace=payments-dev
   kubectl config use-context payments-dev

   kubectl --token "$(adhar auth token)" get pods
   ```

   Pass the token on each call. `adhar auth token` refreshes an expired token, which a token pasted into a kubeconfig cannot do.

**Check:**

```bash
kubectl --token "$(adhar auth token)" auth whoami
kubectl --token "$(adhar auth token)" auth can-i create deployments -n payments-dev
```

The first command reports username `oidc:alice@example.com` with groups `oidc:org-adhar` and `oidc:ws-team-adhar.payments`. The second answers `yes`.

## Offboarding

Remove the person in the Console: **Settings → Members → Remove** takes them out of the organisation's groups and every team group in it. Or remove them from the groups directly:

```bash
adhar auth group remove-member ws-team-adhar.payments alice@example.com
# Out of the organisation altogether:
adhar auth group remove-member org-adhar alice@example.com
```

Their next token carries no team group, so Kubernetes, the Console and every SSO service stop granting team access. A token already issued stays valid until it expires.

Two follow-ups:

- To stop new sign-ins entirely, disable the user in Keycloak: `adhar auth user update alice@example.com --status inactive`.
- Remove them from the Gitea team by hand, since that membership was added by hand.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| User signs in everywhere but sees no namespaces | The Keycloak group name does not match `ws-team-<organisation>.<team>` (for example an old `ws-team-payments`) | Add them to the qualified group (**Settings → Teams**); check `adhar auth token --show` |
| `kubectl` returns `Unauthorized` with a valid token | API server OIDC is not enabled, or `--oidc-client-id` is not `kubernetes` | Ask the platform team; the audience is `kubernetes`, not `adhar-cli` |
| `Forbidden` for a member who should have access | The token predates their group membership | `adhar auth login … --force` for a fresh token |
| Project denied: `exceeds the … team's tenant quota` | The team's allowance is used up | Raise the team's entry in `allowances.yaml`, or lower the project's quotas |
| Tenant quota never denies anything | The package is off, there is no entry for the team and no `default`, cert-manager is missing (no serving certificate), or the controller is down (fails open) | `adhar stack status adhar-tenant-quotas`; `adhar stack status cert-manager`; check the ConfigMap |
| Project `READY=False`, events name `kargo.akuity.io` kinds | Kargo is not installed (off in the local profile) | Namespaces, quotas and RBAC are still created; `adhar stack enable kargo` for promotion |
| Team member sees nothing in ArgoCD | No ArgoCD role is mapped for team groups | Use the Console for sync and health |
| Member cannot push to the repository in Gitea | Gitea team membership and repository grants are manual for team groups | Add the user to team `payments`; grant the repository |
| A Service in `payments-dev` is unreachable from another team namespace | Default-deny ingress admits only the same namespace, `adhar-system` and the Gateway | Add a NetworkPolicy in the target namespace for that source |
| ArgoCD refuses to deploy a repository into the project | The AppProject admits only `adhar/*` Gitea repositories | Add the source to `allowedSourceRepos` on the Project |

## Next steps

- **[Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service)** — the team's first stateful workload
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — how the dev, test and prod environments you created are used
- **[Manage Secrets End to End](/docs/guides/manage-secrets)** — how the team gets credentials without seeing the backend
- **[Security Best Practices](/docs/security/security-best-practices)** — the identity model and API server OIDC flags in full
