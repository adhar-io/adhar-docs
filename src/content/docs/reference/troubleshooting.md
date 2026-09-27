---
title: "Troubleshooting"
section: "Reference"
order: 2
path: "/docs/reference/troubleshooting"
---

# Troubleshooting

Symptom → cause → fix. Examples assume namespace `adhar-system`; on cloud, substitute your `defaultHost`.

## First, check health

```bash
adhar get status && adhar get apps
kubectl -n adhar-system get pods
```

`adhar get status` renders `ArgoCDReady`, `GatewayReady`, `GiteaReady`, `CrossplaneReady`, `GitOpsReady`, and per-package health. It does **not** verify that Crossplane can provision — check that separately (below).

## When in doubt, re-run `adhar up`

For nearly every local failure the correct first move is to re-run **without** `--recreate` — bootstrap is idempotent and status-gated, so it resumes from the pending gate:

```bash
adhar up               # safe resume
adhar up --recreate    # destructive: delete the node and rebuild
```

On cloud, roll out changes with `adhar upgrade --yes` (or `--diff-only`), and always pass `--env <name>`.

## Common issues

### Bootstrap stopped part-way (Ctrl-C, sleep, timeout)
The local controller is ephemeral, so nothing retries automatically. Just run `adhar up` again — it resumes from the pending gate.

### No apps in ArgoCD
ArgoCD is healthy but there are zero applications — the GitOps phase never completed (bootstrap exited before seeding Gitea). Fix: re-run `adhar up` without `--recreate`.

### A URL doesn't load / Gateway never Programmed
If `curl https://argocd.<host>` returns HTTP 000, the Gateway isn't programmed. Re-run `adhar up`. Otherwise confirm the app is `Healthy` (`adhar get apps`) and ships an `HTTPRoute` (`kubectl get httproute -A`). A local browser TLS warning is expected (self-signed).

### Every app goes OutOfSync after a push (expected)
One push to `adhar/packages` flips **all** Applications to `OutOfSync` because every app tracks the monorepo at `HEAD`. Wait ~5–15 minutes for the wave to drain; only investigate an app still `Degraded` afterward.

### Zero ProviderConfigs — Crossplane can't provision
The platform reports healthy but nothing can be provisioned. This is the check `adhar get status` does **not** make:

```bash
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
kubectl get clusterproviderconfigs.helm.m.crossplane.io
# per cloud family in use, e.g.:
kubectl get clusterproviderconfigs.aws.m.upbound.io
```

"No resources found" for every group is the failure. Re-apply the control-plane configuration (a binary with the strict path), or apply ProviderConfigs from `platform/controlplane/configuration/providers/`.

### `exceed max volume count` — the per-VM volume wall
`0/3 nodes are available: 3 node(s) exceed max volume count`; pods stay `Pending` while CPU/memory look fine. Every cloud caps block volumes per VM (7 per DO droplet; 4–16 on Azure by size), and the catalogue asks for ~90 PVCs. This is the first capacity wall on every cloud. Fix — add workers, each of which brings its own volume slots:

```bash
adhar cluster scale <cluster> --workers 10 -p digitalocean -f config.yaml
```

`adhar-local` (node-local) must be the default StorageClass. `spec.storageClassName` is immutable — a wrongly-classed PVC must be deleted to move it.

### Pods Pending, node under pressure (local)
A single Kind node can't run everything. Disable packages you enabled, or give Docker more RAM. Everything wedged → `adhar up --recreate`.

### A node flaps NotReady (SystemOOM)
On saturated 16 GiB nodes, eBPF agents are the usual casualties. On the node, over SSH:

```bash
sudo systemctl restart containerd kubelet
```

Then relieve pressure — add workers and ensure memory-hungry agents carry limits.

### `adhar cluster list` says "No clusters found"
`adhar cluster list` requires `--file <config>`; without it, it queries nothing. Use `adhar cluster list --file config.yaml` (same for `scale`/`upgrade`; on `delete`, `-f` is `--force`, so spell out `--file`).

### A scoped DigitalOcean token 401s on `/v2/account`
That's expected for a scoped token — droplets/volumes/LBs/DNS still work. Never conclude a token is revoked from an account-endpoint 401. Also, `doctl` ignores `-t`/`DIGITALOCEAN_ACCESS_TOKEN` when its config has a `context:` — use `doctl --context default -t "$TOKEN"`.

### Keycloak 503 on every login
Every SSO login returns 503 across all services — usually the Keycloak database volume filled because WAL archiving stopped. Fix the archiving failure (below), then expand the PVC:

```bash
kubectl -n adhar-system patch pvc keycloak-db-1 --type merge \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

### MinIO filled → WAL archiving stops platform-wide
`barman-cloud-wal-archive: … no space left on device` on **every** CNPG database at once — the shared in-cluster MinIO (default backup target) filled. Expand MinIO, set a CNPG `retentionPolicy` (7d) on every DB, and in production point the BackupStorageLocation at real object storage. Alert on MinIO PVC usage > 80%.

### HA: SSO works but the app list is empty
On an HA install, a Keycloak user logs in but sees zero applications (local `admin` sees all) — the RBAC policy was empty. Fix:

```bash
kubectl -n adhar-system patch cm argocd-rbac-cm --type merge -p '{"data":{"policy.csv":
"g, platform-admin, role:admin\ng, platform-developer, role:readonly\ng, platform-viewer, role:readonly\n"}}'
kubectl -n adhar-system rollout restart deploy/argo-cd-argocd-server
```

## Debugging toolbox

```bash
adhar get status && adhar get apps
kubectl -n adhar-system get pods
kubectl -n adhar-system logs deploy/argo-cd-argocd-server
cilium status
hubble observe --since 5m --namespace <ns>
```

Still stuck? Ask the community on [Slack](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww) or open a [GitHub issue](https://github.com/adhar-io/adhar/issues).
