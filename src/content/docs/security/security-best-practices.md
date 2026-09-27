---
title: "Security Best Practices"
section: "Security"
order: 1
path: "/docs/security/security-best-practices"
---

# Security Best Practices

Adhar is **secure by default, not by add-on** — identity, secrets, supply-chain integrity, and policy are wired into the platform's own operation before they're offered to workloads. This page is the hardening checklist for running it safely.

## At a glance

| Domain | What ships | Harden with |
|---|---|---|
| **Identity** | Keycloak OIDC everywhere | Rotate bootstrap creds; OIDC group RBAC |
| **Secrets** | OpenBao + External Secrets, never in Git | KMS auto-unseal; etcd encryption at rest |
| **Network** | Cilium network policy + WireGuard | Default-deny; Gateway as only entry |
| **Supply chain** | Trivy scan + Cosign sign + Harbor | Kyverno in `Enforce` |
| **Runtime** | Falco + Tetragon | Alert on findings |
| **Workload identity** | SPIFFE/SPIRE | — |

## Identity & access

- **Keycloak (OIDC) everywhere.** ArgoCD, Gitea, Grafana, the Console, and the Kubernetes API all authenticate against the `adhar` realm. Group claims map to platform roles.
- **Rotate bootstrap credentials.** The day-0 `gitea_admin` and ArgoCD `admin` passwords are well-known — enable the `credential-rotation` package (on by default in production), which writes break-glass copies to `secret/adhar/bootstrap-credentials`.
- **No standing cluster-admin for humans.** Use per-namespace RBAC via group claims; reserve `platform-admin` for break-glass.
- **Workload identity for cloud creds.** Give Crossplane cloud access via IRSA / Workload Identity / Managed Identity — never long-lived keys.

| Keycloak group | Kubernetes role |
|---|---|
| `platform-admin` / `platform-engineer` | `cluster-admin` |
| `platform-developer` | `edit` |
| `platform-viewer` | `view` |

## Secrets

- **OpenBao is the production backend** (`security/openbao`); the `vault` package ships disabled — exactly one may be enabled.
- **Never put secrets in Git.** Manifests reference an `ExternalSecret`; External Secrets fetches the value from OpenBao at runtime:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: myapp-config, namespace: my-team }
spec:
  secretStoreRef: { name: vault, kind: ClusterSecretStore }
  target: { name: myapp-config }
  data:
    - secretKey: password
      remoteRef: { key: myapp/config, property: password }
```

- **Harden the backend:** enable cloud-KMS auto-unseal (`seal "awskms"` / `"azurekeyvault"` / `"gcpckms"`) so the unseal key and root token don't sit in the `openbao-keys` Secret. Enable **etcd encryption at rest**.

## Network

- **Default-deny Cilium network policies** — microsegment traffic, allow by exception.
- **WireGuard** node-to-node encryption in production.
- The **Cilium Gateway is the only public entry point**; `external-dns` is scoped to the platform DNS zone.
- Use **Hubble** to observe flows and confirm policy verdicts.

## Workloads & supply chain

- **Kyverno policies in `Enforce`:** Pod Security (restricted), no `:latest` tags, resource requests required. A denial message names the policy.
- **Harbor is the only allowed registry**, with **Trivy** scanning and **Cosign** signature verification gating what runs.
- Supply-chain policies ship as `security/supply-chain-policies` (audit enabled, enforce disabled by default). Prove enforcement with `hack/verify-supply-chain.sh` before switching to Enforce.
- **Falco** provides eBPF runtime threat detection; **SPIFFE/SPIRE** issues workload identity.

## TLS

- Local platforms use a self-signed certificate. Production uses cert-manager with Let's Encrypt; the platform **wildcard** (`*.<defaultHost>`) requires a DNS-01-capable provider. See [Accessing the Platform](/docs/operations/accessing-the-platform).

## Verify

```bash
# Policy results
kubectl get policyreport -A
# Supply-chain enforcement
hack/verify-supply-chain.sh
# Network reachability & policy
cilium connectivity test
hubble observe --namespace <ns>
```

For the full production hardening checklist (HA, backups, KMS unseal, etcd encryption), see [Production](/docs/operations/production).
