---
title: "Accessing the Platform"
section: "Operations"
order: 2
path: "/docs/operations/accessing-the-platform"
---

# Accessing the Platform

You reach every Adhar service (Console, ArgoCD, Gitea, Keycloak, Harbor) the same way: **one hostname per service, derived from one base domain, served by one Gateway holding one certificate**. You never have to hardcode your own host, port or cloud into a package. `adhar up` records the edge configuration on the `AdharPlatform` resource. When the platform seeds its Git repositories, the controller rewrites the local domain in every stack file to your host, so everything renders from that one setting.

This page is for anyone who needs to reach the platform: the operator signing in on day one, a developer looking for a URL, or a script that needs a token. It explains:

- how those layers fit together
- the first sign-in, step by step
- how to test each layer on its own
- what to do when one of them is down

## At a glance

| | |
|---|---|
| **URLs** | `https://<service>.<defaultHost>` (cloud, port 443) · `https://<service>.adhar.localtest.me:8443` (local Kind) |
| **Edge** | One Cilium Gateway, `adhar-gateway` in `adhar-system`, GatewayClass `adhar` |
| **TLS** | Terminates at the Gateway, from `Secret/adhar-cert` |
| **kubeconfig** | `~/.adhar/clusters/<cluster>/kubeconfig` (mode `0600`), merged as context `adhar-<cluster>` (plain `adhar` for the default cluster name) |
| **Credentials** | `adhar get secrets [-p <provider>]` — never scrape pods |
| **Console login** | Keycloak SSO, realm `adhar` (no pasted secrets) |
| **DNS / TLS automation** | external-dns publishes records; cert-manager issues the wildcard via DNS-01 |
| **Fallback** | `kubectl port-forward` while DNS or a certificate is still settling |

## The request path

Once you understand this chain, failures become easy to read. Each arrow is a layer you can test on its own.

```diagram
gd-request-path
```

Two things follow from this:

- **TLS is a Gateway concern, not an application concern.** Backends serve plain HTTP inside the cluster, so a certificate problem never looks like an application problem.
- **A service is reachable only if its package ships an `HTTPRoute`.** A healthy pod with no route has no URL.

In-cluster clients take the same path. On Kind, CoreDNS rewrites `*.adhar.localtest.me` to `cilium-gateway-adhar-gateway.adhar-system.svc.cluster.local`. So when ArgoCD performs OIDC discovery against the Keycloak issuer, it uses the same FQDN a browser does.

That is also why the local Gateway has a third listener on `:8443`. From outside, the host's 8443 maps to the 443 node port. In-cluster callers connect to the Service on 8443 directly.

## Local Kind versus cloud

| | Local (Kind) | Cloud / on-prem |
|---|---|---|
| Base domain | `adhar.localtest.me` (public DNS → 127.0.0.1) | `globalSettings.defaultHost`, a zone you delegate |
| Reaching the edge | Host port `8443` → node port `30443` | Cloud LoadBalancer on 443 |
| Gateway Service | `NodePort`, ports pinned to 30080/30443 | `LoadBalancer` with an external address |
| Certificate | Self-signed; browser warning is expected | Let's Encrypt wildcard `*.<defaultHost>` via DNS-01 |
| DNS setup | None required, and none possible | Delegate the zone **before** `adhar up` |

`adhar up --port 9443` moves the HTTPS host port (the default is `8443`). The HTTP port is derived as *port − 363*, so `9443` gives `9080`. If a port you ask for is already in use, the Kind provider scans upwards to the next free one and reports it. Check the output rather than assuming 8443.

## Your domain drives every URL

Set the base domain once:

```yaml
globalSettings:
  defaultHost: platform.example.com
  defaultHttpsPort: 443
  email: admin@platform.example.com
```

| Service | URL |
|---|---|
| Console | `https://console.<defaultHost>` |
| ArgoCD | `https://argocd.<defaultHost>` |
| Gitea | `https://gitea.<defaultHost>` |
| Keycloak | `https://keycloak.<defaultHost>` |
| OpenBao (secrets) | `https://openbao.<defaultHost>` |
| Harbor | `https://harbor.<defaultHost>` |
| Nexus | `https://nexus.<defaultHost>` |

On cloud the port is standard, so OIDC issuer URLs such as `https://keycloak.<defaultHost>/realms/adhar` match exactly. There is no port suffix to keep in step.

## kubeconfig is set up for you

`adhar up` writes the cluster's kubeconfig to `~/.adhar/clusters/<cluster>/kubeconfig` (mode `0600`). It also merges the cluster, user and context into `~/.kube/config` as `adhar-<cluster>`, and makes it current. The one exception is a cluster with the default name `adhar`: its context is plain `adhar`, not `adhar-adhar`.

Re-running `adhar up` for the same cluster **replaces** those entries rather than duplicating them. If the same name now points at a different API server, the old entry is kept as `<name>@<host>` so you do not lose it.

```bash
kubectl config current-context      # adhar-dev
kubectl get nodes

# or use the standalone file (scripts, CI, another shell):
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
```

Every `adhar` command resolves its cluster the standard way: `--kubeconfig`, then `$KUBECONFIG`, then `~/.kube/config`.

## Getting credentials

Never scrape secrets from pods or YAML. The CLI reads the platform's labelled credential secrets from whichever cluster your kubeconfig points at:

```bash
adhar get secrets                 # the credentials needed to sign in
adhar get secrets -p argocd       # one credential set (the ArgoCD admin login)
adhar get secrets -p gitea
adhar get secrets -p keycloak
adhar get secrets --all           # every credential in the cluster
```

`-p` is short for `--provider`. Despite the name, it selects a *credential set*, not a cloud provider. The built-in sets are `argocd`, `gitea`, `keycloak`, `adhar-console`, `openbao`, `vault`, `postgres`, `redis`, `harbor` and `rustfs`.

Packages that keep their own login publish a Secret labelled `adhar.io/cli-secret=true` with `adhar.io/package-name=<package>`. So `-p <package>` works for them, with no per-app code in the CLI.

The **Console** uses Keycloak SSO. Sign in at `https://console.<defaultHost>` with your Keycloak user rather than pasting a secret.

The `adhar-credential-rotation` package rotates the day-0 `gitea_admin` and ArgoCD `admin` passwords. It is on in the production profile and off locally, so the documented local credentials keep working. It updates the in-cluster Secrets that `adhar get secrets` reads, and, when a secrets backend (OpenBao or Vault) is installed, writes break-glass copies (emergency-access copies) to it at `secret/adhar/bootstrap-credentials`. With no backend, it skips the break-glass copy.

**In production, the secrets backend is OpenBao** (`security/openbao`), an open-source fork of HashiCorp Vault. The `vault` package ships disabled, and at most one of the two may be on, because both claim the same objects. In the local profile *both* are off: a single Kind node does not need a secrets backend, and the platform's own credential chains fall back to Kubernetes-backed stores.

OpenBao speaks Vault's API, and the platform keeps Vault's names, so consumers do not need to know which backend runs:

- the External Secrets provider is still `vault:`
- the `ClusterSecretStore` is still named `vault`
- a compatibility Service named `vault` answers on `vault.adhar-system.svc.cluster.local:8200` (the store itself points at `openbao.adhar-system.svc.cluster.local:8200`)

That store serves `adhar-system` only. Application namespaces read OpenBao through their own `SecretStore`. See [Manage Secrets End to End](/docs/guides/manage-secrets).

## Sign in for the first time

Day-0 credentials exist so you can get in before SSO is proven. The goal of the first session is to retire them safely. First prove SSO. Then let the platform rotate the local admin passwords and keep break-glass copies where only the secrets backend can read them.

```diagram
do-credential-lifecycle
```

1. **Confirm you are on the right cluster.**

   ```bash
   kubectl config current-context        # adhar-<cluster>
   adhar get status                      # Ready, with package health
   ```

2. **Read the day-0 credentials** for ArgoCD and Gitea. Sign in to each once as the local admin to confirm the edge works.

   ```bash
   adhar get secrets -p argocd
   adhar get secrets -p gitea
   ```

   *Verify:* both UIs load over HTTPS at `https://argocd.<defaultHost>` and `https://gitea.<defaultHost>` (locally, with the `:8443` suffix).

3. **Sign in through Keycloak as a non-admin user.** Open the Console at `https://console.<defaultHost>` and use your Keycloak user in realm `adhar`. Then sign in to ArgoCD with *Log in via Keycloak*.

   *Verify:* the ArgoCD application list is **not** empty. An empty list after a successful SSO login is an RBAC defect (see [Troubleshooting](/docs/reference/troubleshooting)). Fix it before going further, or rotation will lock you out.

4. **Rotate the bootstrap credentials.** In the production profile the `adhar-credential-rotation` package is already on. Elsewhere, enable it. If you want break-glass copies, enable `openbao` as well, because the local profile ships no secrets backend:

   ```bash
   adhar stack enable adhar-credential-rotation
   adhar upgrade
   ```

   *Verify:* the marker exists, and the old `gitea_admin` / `admin` passwords no longer work.

   ```bash
   kubectl -n adhar-system get secret bootstrap-credentials-rotated
   ```

5. **Know where the break-glass copies are.** The rotated passwords are written to `secret/adhar/bootstrap-credentials` in the secrets backend (OpenBao in production). Tenants cannot reach it:

   - `ClusterSecretStore/vault` serves only `adhar-system`.
   - A tenant's own `SecretStore` reads only `secret/tenants/<namespace>/`.
   - OpenBao's `platform-developer` and `platform-viewer` policies deny `secret/adhar/*`.

   Reading it takes `platform-admin` in OpenBao, the root token, or rights in `adhar-system` (see [Security Best Practices](/docs/security/security-best-practices)). On a platform built before these restrictions, run `adhar upgrade` before you rely on it as break-glass. To rotate again, delete the `bootstrap-credentials-rotated` marker Secret.

### Tokens for the CLI and scripts

For API access without a browser, the CLI performs an OIDC login against the `adhar-cli` Keycloak client. It prints a bearer token on stdout, with nothing else:

```bash
adhar auth login alice \
  --issuer https://keycloak.platform.example.com/realms/adhar   # locally: --insecure, no --issuer
adhar auth whoami                       # identity and group membership
TOKEN=$(adhar auth token)
curl -H "Authorization: Bearer $TOKEN" https://<service>.<defaultHost>/…
```

Services fronted by the platform's oauth2-proxy in bearer mode accept that token directly. That is how scripts reach API-shaped services.

## DNS and TLS are automatic

| Piece | Behaviour |
|---|---|
| **DNS provider** | Derived from the environment's cloud. Override with `globalSettings.dnsProvider`: one of `digitalocean`, `aws`, `gcp`, `azure`, `civo`, `cloudflare` (typical for on-prem), or `none` to disable. The zone must be `<defaultHost>`, delegated to that provider |
| **Credentials** | Written by the CLI into the `adhar-dns-provider` Secret in `adhar-system`; never written to Git |
| **external-dns** | Runs with `--domain-filter=<defaultHost>` and a per-cluster TXT owner id. Publishes one record per platform HTTPRoute hostname, pointing at the Gateway LB address |
| **cert-manager** | Issues `*.<defaultHost>` through the DNS-01 `adhar-letsencrypt-dns` ClusterIssuer into `Secret/adhar-cert`. Without a DNS-01-capable provider, the Gateway keeps `adhar-selfsigned` |

> On AWS the Route 53 solver **requires a region**. Without one, the ACME challenge sits pending forever and no `_acme-challenge` TXT record is written. Every URL then fails TLS, while DNS, the load balancer and the Gateway all look healthy.
>
> Temporary credentials (SSO, assumed role) work until they expire. Then certificate renewal stops silently. Use a long-lived key for the platform's DNS identity.

## Verify each layer independently

Work down the request path. The first command that fails names the layer to fix.

```bash
kubectl config current-context                       # 0. right cluster
adhar get status                                     # 1. platform + package health

kubectl get gateway -n adhar-system adhar-gateway \
  -o custom-columns=NAME:.metadata.name,PROGRAMMED:'.status.conditions[?(@.type=="Programmed")].status'
                                                     # 2. want PROGRAMMED=True

kubectl get svc -n adhar-system cilium-gateway-adhar-gateway
                                                     # 3. cloud: LoadBalancer + ADDRESS
                                                     #    local: NodePort 30080/30443

dig +short console.<defaultHost>                     # 4. resolves to that address
kubectl -n adhar-system get secret adhar-cert        # 5. the certificate exists
kubectl get httproute -A | grep console              # 6. a route claims the hostname
curl -sI https://console.<defaultHost> | head -1     # 7. an HTTP status line (200, or a redirect to sign-in)

# Crossplane can actually provision (adhar get status does NOT check this):
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
```

Then sign in to ArgoCD **through Keycloak**, not as the local admin. Confirm you see the full application list. An empty list after a successful SSO login is an RBAC defect, not a missing cluster.

## The debugging ladder

Climb it in order. Each rung removes one layer from the picture.

1. **Is anything serving?** `curl -sk -o /dev/null -w 'HTTP %{http_code}\n' https://<svc>.<host>`. `000` means the socket opened but nothing answered: the Gateway is not Programmed. A TLS error means the Gateway is fine and the certificate is not.
2. **Bypass DNS, keep the edge.** `curl -k --resolve <svc>.<host>:443:<LB-IP> https://<svc>.<host>` sends the right SNI and Host to the right address. If this works, the problem is DNS only.
3. **Bypass the edge, keep the Service.** Port-forward the backend and hit it directly. If this works, the problem is the Gateway, route or certificate, not the application.

   ```bash
   kubectl port-forward -n adhar-system svc/argo-cd-argocd-server 8443:443
   # https://localhost:8443
   kubectl port-forward -n adhar-system svc/console 3000:80
   # http://localhost:3000
   ```

4. **Bypass the Service, keep the pod.** `kubectl port-forward -n adhar-system pod/<pod> <port>:<port>`. If this works but step 3 did not, the Service selector or endpoints are wrong.
5. **Read the pod.** `kubectl -n adhar-system logs <pod>` and `kubectl -n adhar-system describe pod <pod>`.

To remove the local browser warning entirely, trust the platform CA:

```bash
kubectl -n adhar-system get secret adhar-cert \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > adhar-ca.crt
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `HTTP 000` on every URL | Gateway never Programmed | Re-run `adhar up`; see [Troubleshooting](/docs/reference/troubleshooting) |
| Browser TLS warning locally | Self-signed platform certificate, by design | Trust the CA, or ignore it |
| `adhar cluster list` says "No clusters found" | Without `--file` it knows no cloud provider (only local Kind clusters are listed) | `adhar cluster list --file config.yaml` |
| `adhar get secrets -p <name>` prints nothing | `-p` (`--provider`) takes a credential-set name, and no set or labelled package Secret has that name | Use a name from `adhar get secrets --help`, e.g. `-p argocd` |
| Locked out after rotation | Rotation ran before SSO worked for a non-admin | Read the break-glass copy at `secret/adhar/bootstrap-credentials` as `platform-admin` or with the OpenBao root token |
| `adhar up -f config.yaml` built everything | Without `--env`, **every** environment in the file is provisioned | Always pass `--env <name>` |
| DNS resolves, TLS fails | No DNS-01 provider, or an expired cloud credential | Check `adhar-dns-provider` and the cert-manager logs |

## Next steps

- [Troubleshooting](/docs/reference/troubleshooting) — symptom-first diagnosis for each layer above.
- [CLI Reference](/docs/reference/cli) — every command, flag and workflow.
- [Production](/docs/operations/production) — hardening the edge, backups and DR.
- [Local (Kind)](/docs/providers/local-kind) — the local topology in full.
