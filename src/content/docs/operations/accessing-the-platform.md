---
title: "Accessing the Platform"
section: "Operations"
order: 2
path: "/docs/operations/accessing-the-platform"
---

# Accessing the Platform

After `adhar up` provisions a cloud cluster, here's how to reach it — URLs, credentials, kubeconfig, and how DNS/TLS come up. (Local Kind uses `*.adhar.localtest.me:8443` instead; see [Quick Start](/docs/getting-started/quick-start).)

## At a glance

| | |
|---|---|
| **URLs** | `https://<service>.<defaultHost>` (on 443, no port) |
| **kubeconfig** | Saved to `~/.adhar/clusters/<cluster>/kubeconfig`, merged as context `adhar-<cluster>` |
| **Credentials** | `adhar get secrets [-p <service>]` — never scrape pods |
| **Console login** | Keycloak SSO (no pasted secrets) |
| **DNS / TLS** | Automatic — external-dns + cert-manager (wildcard via DNS-01) |
| **Fallback** | `kubectl port-forward` while DNS/cert propagate |

## Your domain drives every URL

Set the base domain once:

```yaml
globalSettings:
  defaultHost: platform.example.com
  defaultHttpsPort: 443
  email: admin@platform.example.com
```

Every hostname derives from it — behind a cloud LoadBalancer on 443, so URLs carry no explicit port:

| Service | URL |
|---|---|
| Console | `https://console.<defaultHost>` |
| ArgoCD | `https://argocd.<defaultHost>` |
| Gitea | `https://gitea.<defaultHost>` |
| Keycloak | `https://keycloak.<defaultHost>` |
| OpenBao (secrets) | `https://openbao.<defaultHost>` |
| Harbor | `https://harbor.<defaultHost>` |

## kubeconfig is set up for you

`adhar up` saves the kubeconfig to `~/.adhar/clusters/<cluster>/kubeconfig` (mode `0600`) and merges it into `~/.kube/config` as context `adhar-<cluster>`, making it current:

```bash
kubectl config current-context      # adhar-dev
kubectl get nodes
# or use the standalone file:
export KUBECONFIG=~/.adhar/clusters/dev/kubeconfig
```

## Getting credentials

Never scrape secrets from pods or YAML — the CLI reads the platform's labelled credential secrets:

```bash
adhar get secrets                 # all platform credentials
adhar get secrets -p argocd       # one package (e.g. the ArgoCD admin login)
adhar get secrets -p gitea
adhar get secrets -p keycloak
adhar get secrets --all           # include every package that publishes one
```

The **Console** uses Keycloak SSO — log in at `https://console.<defaultHost>` with your Keycloak user; you don't paste secrets into it. Rotate the day-0 `gitea_admin` and ArgoCD `admin` passwords in production by enabling the `credential-rotation` package.

**Secrets backend is OpenBao** (`security/openbao`); the `vault` package ships disabled. It's API-compatible, so nothing changed for consumers: the External Secrets provider is still `vault:`, the `ClusterSecretStore` is still named `vault`, and the in-cluster address is still `vault.adhar-system.svc.cluster.local:8200`.

## DNS and TLS are automatic

`adhar up` records edge config on the `AdharPlatform` spec and renders the stack from it:

| Piece | Behaviour |
|---|---|
| **DNS provider** | Derived from the environment's cloud; override with `globalSettings.dnsProvider` (`cloudflare` for on-prem, `none` to disable). Zone must be `<defaultHost>`, delegated to that provider |
| **Credentials** | Materialised into the `adhar-dns-provider` Secret — never in Git |
| **external-dns** | Publishes a record per platform HTTPRoute hostname pointing at the Gateway LB IP |
| **cert-manager** | Issues wildcard `*.<defaultHost>` via DNS-01 into the `adhar-cert` Secret; without a DNS-01 provider it stays self-signed |

## Checklist after `adhar up`

```bash
kubectl config current-context                      # adhar-<cluster>
adhar get status                                    # platform + package health
adhar get secrets -p argocd                         # credentials
kubectl get gateway -n adhar-system                 # LoadBalancer IP (ADDRESS)
dig +short console.<defaultHost>                     # should resolve to that IP
curl -sI https://console.<defaultHost> | head -1     # HTTP/2 200

# Crossplane can actually provision (adhar get status does NOT check this):
kubectl get clusterproviderconfigs.kubernetes.m.crossplane.io
```

Then log into ArgoCD **through Keycloak** (not the local admin) and confirm you see the full application list.

## Port-forward fallback

While DNS propagates or before a cert is issued:

```bash
kubectl port-forward -n adhar-system svc/argo-cd-argocd-server 8443:443   # https://localhost:8443
kubectl port-forward -n adhar-system svc/adhar-console        3000:3000   # http://localhost:3000
```

> `adhar cluster list` requires `--file <config>`. `adhar cluster scale/upgrade/delete` take the same file — and on `cluster delete`, `-f` means `--force`, so spell out `--file`.
