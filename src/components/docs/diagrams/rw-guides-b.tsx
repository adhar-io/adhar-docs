import type { ComponentType } from "react";
import { Flow, Ladder, Split } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "ngb-". */

/* ------------------------------------------------------------------ *
 * Backup and Restore
 * ------------------------------------------------------------------ */

/* Why a healthy Velero can still fail every backup: validation runs against the store. */
const BackupValidation = () => (
  <Flow
    label="Velero validates every Backup against its BackupStorageLocation. The ExternalSecret velero-s3-credentials produces the credential Secret; with it the default BackupStorageLocation reports Available against the adhar-backups bucket, and a Backup can reach Completed. Without the Secret the location is Unavailable and every Backup ends in FailedValidation, while the Velero Deployment still looks healthy."
    caption="Break any link and every backup ends in FailedValidation, while the Velero Deployment stays healthy."
    nodes={[
      { title: "ExternalSecret", lines: ["velero-s3-credentials"] },
      { title: "Secret", lines: ["object-store", "credentials"] },
      { title: "BackupStorageLocation", lines: ["default · Available", "bucket adhar-backups"], tone: "primary" },
      { title: "Backup", lines: ["validated, then", "Completed"], tone: "accent" },
    ]}
    edges={[{ label: "produces" }, { label: "authenticates" }, { label: "validates" }]}
  />
);

/* ------------------------------------------------------------------ *
 * Run a Multi-Cluster Fleet
 * ------------------------------------------------------------------ */

/* Two ways to bring a cluster into the fleet. */
const FleetTwoApis = () => (
  <Split
    label="Two APIs bring a cluster into the fleet. A Cluster is a namespaced Crossplane composite resource that builds a cloud cluster, publishes its kubeconfig, registers it with ArgoCD as cluster-<name> and lands the thin profile. A DataPlane is a cluster-scoped fleet resource reconciled by the DataPlane controller: it registers the plane as dp-<name>-cluster, wires the observability hub, joins Cluster Mesh and Karmada, and is what adhar fleet operates on."
    caption="Use one per cluster: each writes its own ArgoCD cluster Secret."
    width={780}
    left={{
      heading: "Cluster — builds a cluster",
      tone: "primary",
      items: [
        "Crossplane composite resource, namespaced",
        "Provisions DOKS, EKS, GKE, AKS, Civo, vcluster",
        "Publishes Secret <name>-kubeconfig",
        "ArgoCD Secret cluster-<name>",
        "Thin profile lands on it",
      ],
      note: "Not listed by adhar fleet.",
    }}
    right={{
      heading: "DataPlane — governs a plane",
      tone: "accent",
      items: [
        "Fleet resource, cluster-scoped",
        "Modes: composite, vcluster, adopt",
        "ArgoCD Secret dp-<name>-cluster",
        "Wires the observability hub",
        "Cluster Mesh, Karmada, adhar fleet",
      ],
      note: "mode: composite creates the Cluster for you.",
    }}
  />
);

/* From a Cluster in Git to the thin profile running on a new cluster. */
const ClusterProvisioning = () => (
  <Ladder
    label="Provisioning a workload cluster: a committed Cluster resource is composed by Crossplane into a DOKS cluster, its kubeconfig is published as a Secret in adhar-system, an ArgoCD cluster Secret is created with the adhar.io labels, and the adhar-workload-clusters ApplicationSet lands the thin profile on it."
    heading={["what happens", "what you can observe"]}
    width={800}
    boxW={246}
    caption="You commit the first rung. Crossplane and ArgoCD do the rest."
    rungs={[
      { name: "Cluster in Git", detail: "platform.adhar.io/v1alpha1", adds: ["kind Cluster, provider DIGITALOCEAN_DOKS;", "the provider label picks the composition"], tone: "primary" },
      { name: "Crossplane composes", detail: "cluster-digitalocean-doks", adds: ["DOKS cluster and node pool;", "phase Pending → Provisioning → Available"] },
      { name: "kubeconfig published", detail: "<name>-kubeconfig", adds: ["Secret in adhar-system, re-rendered on every", "reconcile so expiring credentials stay fresh"] },
      { name: "ArgoCD registration", detail: "Secret cluster-<name>", adds: ["labels adhar.io/cluster, adhar.io/dataplane,", "adhar.io/dataplane-mode=composite"] },
      { name: "thin profile lands", detail: "adhar-workload-clusters", adds: ["one Application per agent, named <cluster>-<package>"], tone: "accent" },
    ]}
  />
);

/* Hub-and-spoke telemetry: what a spoke needs to reach the hub. */
const FleetTelemetry = () => (
  <Flow
    label="Hub-and-spoke telemetry: Alloy on a workload cluster reads the HUB_ keys from the observability-hub ConfigMap and pushes to the management cluster's Gateway hostnames for Mimir, Loki and Tempo. Those routes sit behind oauth2-proxy in bearer mode, which accepts a Keycloak access token for the mimir, loki or tempo client. The data is stored on the hub under the spoke's cluster name and queried from one Grafana."
    caption="A spoke stores nothing. It needs the hub's external URLs and a bearer token."
    nodes={[
      { title: "Alloy (spoke)", lines: ["ConfigMap", "observability-hub"], tone: "primary" },
      { title: "hub Gateway", lines: ["mimir. loki. tempo.", "<host>"] },
      { title: "oauth2-proxy", lines: ["bearer mode", "Keycloak token"] },
      { title: "Mimir · Loki · Tempo", lines: ["labelled with the", "spoke's cluster name"] },
      { title: "Grafana", lines: ["one query,", "every cluster"], tone: "accent" },
    ]}
    edges={[{ label: "HUB_* URLs" }, {}, { label: "authorised" }, { label: "query" }]}
  />
);

/* How adhar fleet upgrade rolls a version across DataPlanes. */
const FleetUpgradeWaves = () => (
  <Flow
    label="adhar fleet upgrade plans waves across the registered DataPlanes. A dry run prints the plan. The canary wave upgrades the least-loaded plane first by editing spec.infrastructure.version. The command waits for the wave to become Ready, up to the wave timeout, then proceeds through batches. It stops when a plane that was Ready stops being Ready, and with rollback-on-failure it restores the previous version on planes that regressed."
    caption="Stops when a plane that was Ready regresses. --rollback-on-failure restores its previous version."
    nodes={[
      { title: "plan", lines: ["--dry-run prints", "the waves"], tone: "primary" },
      { title: "canary wave", lines: ["--canary 1", "least-loaded plane"] },
      { title: "wait for Ready", lines: ["--wave-timeout", "default 20m"] },
      { title: "batches", lines: ["--batch-size", "planes per wave"] },
      { title: "fleet upgraded", lines: ["every plane on", "--to-version"], tone: "accent" },
    ]}
    edges={[{ label: "confirm" }, { label: "edit version" }, { label: "healthy" }, { label: "repeat" }]}
  />
);

/* ------------------------------------------------------------------ *
 * Upgrade the Platform
 * ------------------------------------------------------------------ */

const UpgradePhases = () => (
  <Ladder
    label="The upgrade sequence: pre-flight, a diff-only preview that changes nothing, phase one converging the foundation with server-side apply, phase two force-pushing the stack after confirmation, ArgoCD re-comparing every application, and finally every application Synced and Healthy."
    heading={["step", "what it does"]}
    width={800}
    boxW={256}
    caption="Only the two phase rungs change the cluster. Everything above them is reversible."
    rungs={[
      { name: "pre-flight", detail: "backup · health · staging", adds: ["a backup that restores, every app Synced/Healthy,", "the same release already run on staging"] },
      { name: "adhar upgrade --diff-only", detail: "changes nothing", adds: ["clones packages + environments from Gitea and", "diffs them against the stack the CLI would push"], tone: "primary" },
      { name: "phase 1 · foundation", detail: "server-side apply", adds: ["gateway-api-crds → cilium → gateway → (cnpg, HA) →", "argocd → gitea → crossplane → controller-manager"] },
      { name: "phase 2 · stack", detail: "force-push on confirm", adds: ["pushes the stack, re-applies the ApplicationSet,", "requests an ArgoCD refresh"] },
      { name: "ArgoCD re-compares", detail: "every app OutOfSync", adds: ["every app tracks the packages repository, so every", "app re-compares after any push; this is expected"] },
      { name: "Synced / Healthy", detail: "adhar get status", adds: ["judge health only after the re-sync settles"], tone: "accent" },
    ]}
  />
);

/* Why a one-file push makes every Application re-compare. */
const UpgradeResync = () => (
  <Flow
    label="Why every Application re-syncs after an upgrade: the push creates a new commit on the packages repository; every platform Application tracks that repository at HEAD, so each gets a new target revision and turns OutOfSync; applications with PostSync hooks stay Progressing until their Jobs finish; then everything returns to Synced and Healthy."
    caption="A push of identical content creates no commit, so nothing re-compares."
    nodes={[
      { title: "push", lines: ["new commit on", "packages"], tone: "primary" },
      { title: "new HEAD", lines: ["every Application", "tracks it"] },
      { title: "OutOfSync", lines: ["all Applications", "at once"] },
      { title: "Progressing", lines: ["PostSync hook", "Jobs running"] },
      { title: "Synced / Healthy", lines: ["judge health", "here"], tone: "accent" },
    ]}
    edges={[{}, { label: "new revision" }, { label: "sync" }, { label: "hooks done" }]}
  />
);

/* ------------------------------------------------------------------ *
 * Preview Environments
 * ------------------------------------------------------------------ */

/* What the ApplicationSet replaces in the overlay a repository ships. */
const PreviewOverrides = () => (
  <Ladder
    label="What the preview ApplicationSet overrides in a repository's preview overlay. The Git revision becomes the pull request's head commit. The Namespace the overlay declares is renamed to preview-<repo>-<number>. The image named library/<repo> gets the head commit as its tag. The hostnames of every HTTPRoute are replaced with <repo>-pr-<number>.<domain>."
    heading={["your overlay declares", "the ApplicationSet sets, per pull request"]}
    width={800}
    boxW={262}
    caption="The overlay names things once. The pull request number and head commit fill in the rest."
    rungs={[
      { name: "preview/kustomization.yaml", detail: "on the default branch", adds: ["synced at targetRevision = the PR head commit"], tone: "primary" },
      { name: "a Namespace", detail: "any name", adds: ["renamed to preview-<repo>-<number>;", "ArgoCD owns it, so teardown prunes it"] },
      { name: "image library/<repo>", detail: "tag :latest as a stand-in", adds: ["tag replaced with the head commit SHA", "(the name must match exactly)"] },
      { name: "an HTTPRoute", detail: "any hostnames", adds: ["hostnames replaced with", "<repo>-pr-<number>.<domain>"], tone: "accent" },
    ]}
  />
);

/* The Kyverno policy that bounds every preview namespace. */
const PreviewGuardrails = () => (
  <Flow
    label="Preview guardrails: every Namespace labelled adhar.io/preview=true matches the Kyverno ClusterPolicy preview-namespace-guardrails, which generates a ResourceQuota named preview-quota and a LimitRange named preview-limits in it. Kyverno keeps both synchronised, so edits are reverted, and both are deleted with the namespace."
    caption="synchronize: true reverts edits, so a pull request cannot widen its own limits."
    nodes={[
      { title: "Namespace", lines: ["adhar.io/preview:", "\"true\""], tone: "primary" },
      { title: "ClusterPolicy", lines: ["preview-namespace-", "guardrails"] },
      { title: "ResourceQuota", lines: ["preview-quota"], tone: "accent" },
      { title: "LimitRange", lines: ["preview-limits"], tone: "accent" },
    ]}
    edges={[{ label: "matches" }, { label: "generates" }, { label: "and" }]}
  />
);

/* ------------------------------------------------------------------ *
 * Accessing the Platform
 * ------------------------------------------------------------------ */

/* One setting becomes every URL. */
const AccessDomain = () => (
  <Flow
    label="One base domain drives every URL: you set globalSettings.defaultHost in the configuration file, adhar up records it on the AdharPlatform resource, the controller rewrites the local domain adhar.localtest.me to that host in every stack file as it seeds the Git repositories, and each package's HTTPRoute then serves https://<service>.<defaultHost> through the one Gateway."
    caption="No package hardcodes a host. Change the base domain in one place."
    nodes={[
      { title: "defaultHost", lines: ["globalSettings", "in config.yaml"], tone: "primary" },
      { title: "AdharPlatform", lines: ["edge settings", "recorded by adhar up"] },
      { title: "stack seeded", lines: ["adhar.localtest.me", "→ your host"] },
      { title: "HTTPRoutes", lines: ["one hostname", "per service"] },
      { title: "adhar-gateway", lines: ["https://<service>", ".<defaultHost>"], tone: "accent" },
    ]}
    edges={[{ label: "adhar up" }, { label: "rewrite" }, { label: "ArgoCD sync" }, { label: "attach" }]}
  />
);

/* How DNS records and the wildcard certificate appear without manual steps. */
const AccessDnsTls = () => (
  <Ladder
    label="DNS and TLS automation on a cloud platform: the CLI writes DNS provider credentials into the adhar-dns-provider Secret; external-dns publishes one record per platform HTTPRoute hostname pointing at the Gateway load balancer address; cert-manager solves a DNS-01 challenge through the adhar-letsencrypt-dns ClusterIssuer and stores the wildcard certificate in Secret adhar-cert; the Gateway terminates TLS with that Secret."
    heading={["piece", "what it does"]}
    width={800}
    boxW={236}
    caption="Without a DNS-01-capable provider the Gateway keeps the adhar-selfsigned certificate."
    rungs={[
      { name: "adhar-dns-provider", detail: "Secret in adhar-system", adds: ["DNS provider credentials, written by the CLI;", "never written to Git"], tone: "primary" },
      { name: "external-dns", detail: "--domain-filter=<defaultHost>", adds: ["one record per platform HTTPRoute hostname,", "pointing at the Gateway load balancer address"] },
      { name: "cert-manager", detail: "adhar-letsencrypt-dns", adds: ["DNS-01 challenge in the same zone;", "issues the wildcard *.<defaultHost>"] },
      { name: "Secret adhar-cert", detail: "adhar-system", adds: ["the certificate adhar-gateway terminates TLS with"], tone: "accent" },
    ]}
  />
);

/* Each rung removes one layer; the first one that works names the broken layer. */
const AccessDebugLadder = () => (
  <Ladder
    label="The debugging ladder for an unreachable service. First request the public URL. Then bypass DNS by resolving the hostname to the load balancer address yourself. Then bypass the edge by port-forwarding the Service. Then bypass the Service by port-forwarding the pod. Finally read the pod's logs and events. The first rung that succeeds shows that the layer it bypassed is the broken one."
    heading={["step", "what the result tells you"]}
    width={800}
    boxW={250}
    caption="Climb in order. Each rung removes one layer from the request path."
    rungs={[
      { name: "1. the public URL", detail: "curl -sk https://<svc>.<host>", adds: ["000: the Gateway is not Programmed.", "A TLS error: the Gateway is fine, the certificate is not."], tone: "primary" },
      { name: "2. bypass DNS", detail: "curl --resolve … <LB-IP>", adds: ["works: the fault is DNS only"] },
      { name: "3. bypass the edge", detail: "port-forward svc/<name>", adds: ["works: the fault is the Gateway, route or certificate"] },
      { name: "4. bypass the Service", detail: "port-forward pod/<pod>", adds: ["works when step 3 did not: Service selector or endpoints"] },
      { name: "5. read the pod", detail: "logs · describe", adds: ["what remains is the application itself"], tone: "accent" },
    ]}
  />
);

/* Browserless access for scripts. */
const AccessToken = () => (
  <Flow
    label="Token access for scripts: adhar auth login performs an OIDC login against the adhar-cli client in the Keycloak realm adhar; adhar auth token prints the bearer token on stdout; a script sends it in the Authorization header; oauth2-proxy in bearer mode validates it and forwards the request to the service."
    caption="adhar auth token prints the token and nothing else, so it is safe in $(...)."
    nodes={[
      { title: "adhar auth login", lines: ["OIDC login"], tone: "primary" },
      { title: "Keycloak", lines: ["realm adhar", "client adhar-cli"] },
      { title: "adhar auth token", lines: ["bearer token", "on stdout"] },
      { title: "oauth2-proxy", lines: ["bearer mode"] },
      { title: "service API", lines: ["<service>.", "<defaultHost>"], tone: "accent" },
    ]}
    edges={[{}, { label: "issues" }, { label: "Authorization" }, { label: "forwards" }]}
  />
);

export const rw_guides_b: Record<string, ComponentType> = {
  "ngb-backup-validation": BackupValidation,
  "ngb-fleet-two-apis": FleetTwoApis,
  "ngb-cluster-provisioning": ClusterProvisioning,
  "ngb-fleet-telemetry": FleetTelemetry,
  "ngb-fleet-upgrade-waves": FleetUpgradeWaves,
  "ngb-upgrade-phases": UpgradePhases,
  "ngb-upgrade-resync": UpgradeResync,
  "ngb-preview-overrides": PreviewOverrides,
  "ngb-preview-guardrails": PreviewGuardrails,
  "ngb-access-domain": AccessDomain,
  "ngb-access-dns-tls": AccessDnsTls,
  "ngb-access-debug-ladder": AccessDebugLadder,
  "ngb-access-token": AccessToken,
};
