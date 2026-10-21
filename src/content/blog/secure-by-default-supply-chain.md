---
title: "Secure by default: Adhar's signed supply chain"
excerpt: "How Adhar builds, scans, signs, stores and admits every image, and how identity, secrets, policy and runtime detection close the gaps the pipeline cannot."
category: "Security"
author: "Adhar Team"
date: "2026-09-25"
featured: false
tags: ["Security", "Supply Chain", "Cosign", "Kyverno", "OpenBao"]
---

Most Kubernetes security advice is a checklist. Checklists fail in a predictable way: they rely on someone remembering to apply them, usually under deadline pressure. Adhar takes a different approach. Each control is built into the path a change has to travel, so breaking the rule is not an available action.

This post walks through that path stage by stage. For each control it names the attacker move it stops. It also says plainly what is switched on by default and what you have to enable yourself, because "ships with" is not the same as "switched on".

## The chain at a glance

A commit reaches the cluster through five stages. Each one produces something the next stage can check.

| Stage | Tool | Threat it addresses | What it hands on |
|---|---|---|---|
| Build | Tekton + Cloud Native Buildpacks | Hand-written, unpatched base images; builds nobody can reproduce | An image built by the platform, tagged with its commit SHA |
| Scan | Trivy | Known HIGH and CRITICAL CVEs reaching production | A pass or fail verdict, before any signature exists |
| Sign | Cosign | An image that never came out of your pipeline | A signature over a specific digest |
| Store | Harbor | Images pulled from wherever was convenient | One registry the admission policy trusts |
| Admit | Kyverno | Unsigned, mutable or untrusted images being scheduled | A Pod that runs exactly the bytes that were signed |

The thing that moves along the chain is a **digest, not a tag**. A tag such as `app:v1.4.2` can point at different bytes tomorrow. A digest cannot. Signing and admitting by digest makes a statement about specific contents, not about a label.

## Build: make the base image a platform concern

When you push to an application repository's `main` branch in the platform's Gitea, a webhook starts the platform's `app-ci` Tekton pipeline:

```bash
git push origin main    # in adhar/orders-api, the repository a golden-path template created
```

The pipeline builds with Cloud Native Buildpacks rather than a `Dockerfile` in each repository. That matters for security more than for convenience. With buildpacks, choosing and patching the base image is the platform's job. A team that does nothing special still gets a current base.

Alongside the build, the pipeline runs independent checks in parallel: unit tests, a secret scan of the source, and an SBOM. Every build is pushed under two tags, `:latest` and `:<commit sha>`, so any image can be traced to the exact commit it came from.

## Scan: before signing, not after

Trivy scans the built image. With no project-specific scan policy, the gate fails on HIGH or CRITICAL findings.

The order is the important part. **Scanning happens before signing**, and the signing step runs only when every gate has passed. So a signature means "this digest came out of our build and passed our checks". If you scanned after signing, a vulnerable image would already carry a valid signature, and admission could not tell the difference.

Scanners produce noise, and a gate that refuses images nobody can fix gets bypassed. Adhar handles this with waivers that are narrowly scoped and carry an expiry date. When the date passes, the gate starts failing again and forces someone to look. An exception with no end date is a policy change made by whoever asked loudest.

## Sign: prove where the image came from

The pipeline signs each image with Cosign, using a platform-owned key pair held in the `cosign-key` Secret in `adhar-system`. A one-time job generates that key when the supply chain is first installed, and it lasts for the life of the cluster.

Two details are worth knowing:

- **Platform builds are signed with a key, not keylessly**, and the signature is not uploaded to a public transparency log. The admission policy is configured to match.
- **Adhar's own release images** on `ghcr.io/adhar-io` are signed keylessly from the project's GitHub Actions release workflow. The admission policy accepts either identity.

The threat a signature addresses is narrow but serious. An attacker who can push to a registry, or a developer who builds on a laptop and pushes by hand, can produce an image that looks legitimate. Without a signature check, the cluster has no way to know it skipped the pipeline.

## Store: one registry the cluster trusts

Signed images land in Harbor. Promotion between environments moves the same digest forward rather than rebuilding it, so what you tested is byte-for-byte what you ship. Kargo records each build as Freight, a content-addressed record of the digest. That is covered in more depth in our GitOps post.

## Admit: the cluster refuses what the pipeline did not produce

Kyverno is the enforcement point, at two levels.

**In every profile**, the `adhar-supply-chain` package ships `verify-supply-chain-images` in Enforce mode. It checks images the platform built (`library/*` in Harbor) in workload namespaces: unsigned, they don't run. Upstream images the platform didn't build aren't matched, so nothing else is blocked.

**In the production profile**, the `adhar-supply-chain-policies` pack adds a wider set of rules, in both Audit and Enforce packs. It's off in the local profile. It carries three policies:

| Policy | Stops |
|---|---|
| `verify-image-signatures` | An image with no valid Cosign signature from the platform key or the release identity |
| `restrict-image-registries` | A typosquatted or unvetted registry |
| `disallow-latest-tag` | A mutable tag that can change after review |

A trimmed version of the Enforce rule shows how the pieces fit:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures-enforce
spec:
  background: false
  failurePolicy: Ignore             # fail open: a restarting Kyverno must not wedge the API server
  rules:
    - name: verify-platform-built-images
      match:
        any:
          - resources: { kinds: ["Pod"] }
      exclude:
        any:
          - resources: { namespaces: ["adhar-system", "kube-system"] }
          - resources:
              namespaceSelector:
                matchLabels: { adhar.io/plane: control }
      verifyImages:
        - failureAction: Enforce
          imageReferences:
            - "harbor-core.adhar-system.svc.cluster.local/library/*"
            - "ghcr.io/adhar-io/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret: { name: cosign-key, namespace: adhar-system }
                    rekor: { ignoreTlog: true }
          required: true
          mutateDigest: true        # rewrite the tag to the digest that was verified
          verifyDigest: true
```

Three design choices deserve a closer look.

**Audit before enforce.** The policies ship in two packs. The Audit pack records violations and allows the resource. The Enforce pack rejects it. In the production profile, both packs are on. On any other profile, enable the pack in Audit first, read the PolicyReports, run the drill, and only then enforce. Starting with enforce on an existing estate blocks a deploy nobody expected, usually during an incident.

**The platform excludes itself.** Every policy in the pack excludes `adhar-system` by name and by the `adhar.io/plane: control` label, and `verify-supply-chain-images` skips `adhar-system` by name. An Enforce flip therefore cannot brick the platform. The flip side is that admission policy does not protect that namespace, so RBAC and network policy have to.

**`mutateDigest`.** When Kyverno admits a Pod, it rewrites the image tag to the digest it verified. What runs is exactly what was signed, even if someone moves the tag a second later.

Verify enforcement on your own cluster rather than assuming it:

```bash
kubectl get clusterpolicy                 # which policies exist, and their action
kubectl get policyreport -A               # what they found
hack/verify-supply-chain.sh               # signature enforcement, end to end
adhar compliance --failures-only
```

## Beyond the pipeline

A signed image is only one part of the picture. The controls below cover what the pipeline cannot.

### Identity: Keycloak SSO

Keycloak is the single identity provider. ArgoCD, Gitea, Grafana, the Console and Kargo all authenticate against the `adhar` realm. Two things are yours to do:

- **Rotate the bootstrap credentials.** The day-0 Gitea and ArgoCD admin passwords are well known. The credential-rotation package, on in the production profile, replaces them and writes break-glass copies to OpenBao.
- **Enable API server OIDC as a day-2 change.** It is off by default, deliberately. Turning it on makes Keycloak group membership a grant of Kubernetes authority, so it is the operator's decision.

One trap is worth repeating. On current Kubernetes, the built-in `edit` role can read Secrets. The `platform-developer` group is bound to `edit` cluster-wide, so bind a custom role if developers should not read Secrets.

### Secrets: OpenBao and External Secrets, never in Git

Credentials committed to Git are replicated to every clone, forever. Adhar's answer is that manifests reference an `ExternalSecret`, and External Secrets fetches the value from OpenBao at runtime:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: myapp-config, namespace: my-team }
spec:
  secretStoreRef: { name: openbao, kind: SecretStore }   # the namespace's own store
  target: { name: myapp-config }
  data:
    - secretKey: password
      remoteRef: { key: tenants/my-team/myapp/config, property: password }
```

The namespace's `SecretStore` logs in to OpenBao with the `tenant` role. Its policy grants read only on `secret/data/tenants/<namespace>/*`, and the namespace comes from the verified ServiceAccount token. So a namespace can only ever read its own path.

The platform's own `ClusterSecretStore`s are restricted too. The broad stores serve only platform namespaces, matched by name, which a tenant cannot create or rename. The two narrow stores reach specific named Secrets only, and serve namespaces labelled `adhar.io/plane` `workload` or `preview`.

Two hardening steps are not done for you: cloud-KMS auto-unseal for OpenBao, and etcd encryption at rest.

### Policy as code

Kyverno also carries the baseline rules in `adhar-kyverno-policies` and `adhar-policy-packs`. A denial names the policy that rejected the workload, so a developer knows what to fix. Your own rules go through the same path:

```bash
adhar policy validate my-policy.yaml --client
adhar policy apply my-policy.yaml --mode audit
adhar policy status                        # pass/fail/warn per PolicyReport
```

### Runtime: Falco and Tetragon

Admission control only sees what is declared. Falco and Tetragon watch what processes actually do once they are running. Both are enabled in the production profile. Treat their findings as visibility, not blocking: they catch post-exploitation behaviour you had no policy for, and someone has to triage them.

## What Adhar deliberately does not do

There is no SPIFFE/SPIRE and no platform-provided mutual TLS between pods. Two pods that can reach each other cannot prove who they are to each other. Use network policy for reachability, and application-level mTLS where you need peer identity.

Network policy also needs your attention. Cilium runs with `enable-policy: default`, so a pod that no policy selects is unrestricted. Per-tenant ingress isolation ships. Cluster-wide default-deny and WireGuard encryption are yours to turn on, ideally based on Hubble flow data.

## Try it

- Read [Security Best Practices](/docs/security/security-best-practices) for the full threat model and the production hardening checklist.
- See [The Paved Road to Production](/docs/platform-engineering/paved-road) for why the chain is ordered this way.
- Follow [Manage Secrets End to End](/docs/guides/manage-secrets) to wire an `ExternalSecret` for your own service.
- Build your first signed image with [Your First Service](/docs/getting-started/first-service).
