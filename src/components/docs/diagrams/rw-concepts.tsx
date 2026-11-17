import type { ComponentType } from "react";
import { Flow, Ladder, Split } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "ncc-". */

/* ---------------- architecture: the two-phase bootstrap ---------------- */
const Bootstrap = () => (
  <Ladder
    label="The two-phase bootstrap. Phase 1 is imperative: adhar up creates the cluster and the AdharPlatform resource, then the controller installs the foundation from manifests embedded in the binary — Gateway API CRDs, Cilium, the Cilium Gateway, ArgoCD and Gitea — seeds the Git repositories and applies the ApplicationSets. That is the handoff: in phase 2 ArgoCD syncs every enabled package from the in-cluster Gitea and keeps it reconciled. The same controller applies the Crossplane control plane after the ApplicationSets, so package delivery never waits for it."
    heading={["step", "what happens"]}
    caption="Phase 1 runs once per adhar up and is safe to re-run. Phase 2 never stops."
    width={780}
    boxW={236}
    rungs={[
      { name: "1 · Cluster", detail: "adhar up → provider", tone: "primary",
        adds: ["create the cluster, install the Adhar CRDs,", "write the AdharPlatform resource"] },
      { name: "1 · Foundation", detail: "embedded manifests, SSA",
        adds: ["Gateway API CRDs → Cilium → Cilium Gateway →", "(CNPG in HA mode) → ArgoCD → Gitea"] },
      { name: "1 · Seed Git", detail: "once, in Gitea",
        adds: ["adhar/packages and adhar/environments from the", "stack; adhar/adhar-templates as a pull mirror"] },
      { name: "1 · ApplicationSets", detail: "the handoff", tone: "accent",
        adds: ["ArgoCD repo credentials + the profile's", "ApplicationSet, re-applied on every pass"] },
      { name: "2 · GitOps", detail: "ArgoCD, continuous", tone: "primary",
        adds: ["one Application per enabled package, synced from", "Gitea with prune and self-heal"] },
      { name: "Crossplane control plane", detail: "after the ApplicationSets",
        adds: ["core, then XRDs, Compositions, Functions and", "provider configs — packages never wait on it"] },
    ]}
  />
);

/* ---------------- architecture + platform services: Git to cluster ---------------- */
const GitOpsPath = () => (
  <Flow
    label="The GitOps write path. You change the platform stack, a directory of pre-rendered package manifests. adhar upgrade shows the diff and pushes the stack to the adhar/packages repository in the in-cluster Gitea. The ApplicationSet keeps one list element per package and generates an ArgoCD Application for each element whose enabled label is the string true. ArgoCD syncs each Application into the adhar-system namespace with prune and self-heal, so disabling a package uninstalls it and a manual edit to the cluster is reverted."
    caption="Git is the only write path. An edit made directly on the cluster is reverted by self-heal."
    nodes={[
      { title: "platform stack", lines: ["packages + ApplicationSet", "(you edit here)"], tone: "primary" },
      { title: "Gitea", lines: ["adhar/packages", "in-cluster Git"] },
      { title: "ApplicationSet", lines: ["one element per package", 'selector: enabled="true"'] },
      { title: "Application", lines: ["one per enabled", "package"] },
      { title: "adhar-system", lines: ["workloads", "prune + self-heal"], tone: "accent" },
    ]}
    edges={[
      { label: "adhar upgrade", tone: "primary" },
      { label: "reads" },
      { label: "generates" },
      { label: "syncs" },
    ]}
    gap={64}
  />
);

/* ---------------- architecture: control plane vs data plane ---------------- */
const Planes = () => (
  <Split
    label="Control plane versus data plane. The control plane is the management cluster: it runs GitOps with ArgoCD and Gitea, Crossplane, Keycloak, the secrets root on OpenBao with External Secrets, the observability hub with Grafana, Mimir, Loki and Tempo, the Harbor registry, and the fleet controllers. A data plane is a workload cluster: it runs your applications plus a thin agent profile of metrics-server, Kyverno and its policies, Alloy collectors and an External Secrets agent. The control plane's ArgoCD deploys to every data plane, and telemetry flows back to the hub."
    caption="A fresh platform is one cluster with both roles. adhar upgrade split-planes separates them."
    width={760}
    left={{
      heading: "Control plane — management cluster",
      tone: "primary",
      items: [
        "GitOps: ArgoCD + Gitea",
        "Infrastructure APIs: Crossplane",
        "Identity: Keycloak",
        "Secrets root: OpenBao + External Secrets",
        "Observability hub: Grafana, Mimir, Loki, Tempo",
        "Registry: Harbor · fleet controllers",
      ],
      note: "Deploys to every data plane through ArgoCD",
    }}
    right={{
      heading: "Data plane — workload cluster",
      tone: "accent",
      items: [
        "Your applications",
        "metrics-server",
        "Kyverno + its policies",
        "Alloy collectors → the hub",
        "External Secrets agent",
        "Managed by a DataPlane resource",
      ],
      note: "Agents come from the workload ApplicationSet",
    }}
  />
);

/* ---------------- control plane: how a request becomes infrastructure ---------------- */
const SelfService = () => (
  <Flow
    label="How a self-service request becomes infrastructure. You create a composite resource, for example a Database, in your team namespace. The Kubernetes API server checks RBAC and validates it against the schema in the XRD. Crossplane matches the labels in spec.crossplane.compositionSelector to one Composition, or uses the XRD's default. The Composition runs a pipeline of functions that renders the composed resources: native objects such as a CloudNativePG Cluster, or managed resources that a provider turns into cloud API calls. Crossplane keeps reconciling them, and the credentials land in a Secret in the same namespace."
    caption="You write the first box. Crossplane produces everything to its right and keeps it reconciled."
    nodes={[
      { title: "XR", lines: ["kind: Database", "team namespace"], tone: "primary" },
      { title: "XRD", lines: ["RBAC + schema", "default Composition"] },
      { title: "Composition", lines: ["chosen by", "selector labels"] },
      { title: "function pipeline", lines: ["go-templating / KCL", "→ auto-ready"] },
      { title: "composed resources", lines: ["CNPG Cluster, RDS, …", "+ connection Secret"], tone: "accent" },
    ]}
    edges={[{ label: "apply", tone: "primary" }, { label: "selects" }, { label: "runs" }, { label: "renders" }]}
    gap={58}
  />
);

/* ---------------- control plane: install order ---------------- */
const CpInstallOrder = () => (
  <Ladder
    label="Control-plane install order: Crossplane core, then the composition RBAC, the XRDs, the Compositions, the composition Functions, the provider-kubernetes and provider-helm packages, their ClusterProviderConfigs, the day-2 Operations, and finally, on a cloud only, the active cloud family's providers and its ClusterProviderConfig. The whole sequence is gated on status.crossplane.controlPlaneApplied and retried until every step applies."
    heading={["step", "why it is here"]}
    caption="Gated on AdharPlatform status.crossplane.controlPlaneApplied; retried every pass until all of it applies."
    width={780}
    boxW={236}
    rungs={[
      { name: "Crossplane core", detail: "install.yaml / install-ha.yaml", tone: "primary",
        adds: ["started early so its image pull overlaps repo", "seeding; the controller waits for the Deployment"] },
      { name: "Composition RBAC", detail: "rbac/local-compose-rbac.yaml",
        adds: ["lets Crossplane create the objects Compositions", "render; without it local requests are forbidden"] },
      { name: "XRDs", detail: "configuration/xrd/",
        adds: ["the API types must exist before anything", "references them"] },
      { name: "Compositions", detail: "compositions/<domain>/",
        adds: ["one file per implementation, applied recursively"] },
      { name: "Functions", detail: "functions/functions.yaml",
        adds: ["kcl · go-templating · patch-and-transform ·", "auto-ready · python"] },
      { name: "Provider packages", detail: "provider-kubernetes · helm",
        adds: ["their CRDs register after the packages install"] },
      { name: "ClusterProviderConfigs", detail: "strict", tone: "accent",
        adds: ["kubernetes-provider · helm-provider; an empty", "list is an error, and the step retries"] },
      { name: "Operations", detail: "ops.crossplane.io",
        adds: ["CronOperation / WatchOperation for day-2 work"] },
      { name: "Active cloud only", detail: "provider family + default",
        adds: ["skipped on Kind; one cloud's providers, never all"] },
    ]}
  />
);

/* ---------------- control plane: imperative vs declarative provisioning ---------------- */
const TwoPaths = () => (
  <Split
    label="Two provisioning paths. The imperative path is a Go provider interface used by the CLI to create the management cluster and run cluster operations against it. The declarative path is the Crossplane control plane running on that cluster, which serves self-service infrastructure, including further clusters through the Cluster API, as ordinary Kubernetes objects."
    caption="A control plane cannot create the cluster it runs on, so the first cluster is imperative."
    width={740}
    left={{
      heading: "Imperative — the CLI",
      tone: "primary",
      items: [
        "Go provider interface",
        "aws · azure · gcp · digitalocean · civo",
        "kind · custom",
        "Creates the management cluster",
        "Cluster operations from adhar",
      ],
      note: "Runs on your machine",
    }}
    right={{
      heading: "Declarative — Crossplane",
      tone: "accent",
      items: [
        "XRDs + Compositions",
        "Requests are namespaced objects",
        "Databases, buckets, queues, …",
        "Further clusters: the Cluster API",
        "Reconciled continuously",
      ],
      note: "Runs on the management cluster",
    }}
  />
);

/* ---------------- platform services: enabling a package ---------------- */
const EnablePackage = () => (
  <Flow
    label="Enabling a package. adhar stack enable flips the package's enabled flag in the profile's ApplicationSet file and in the mirrored environment config, and changes nothing else. You review the change with git diff and adhar upgrade --diff-only. adhar upgrade then pushes the stack to Gitea and re-applies the ApplicationSet, which generates the package's ArgoCD Application. ArgoCD syncs it into adhar-system until it reports Synced and Healthy."
    caption="enable and disable only edit files. Nothing reaches the cluster until adhar upgrade."
    nodes={[
      { title: "adhar stack enable", lines: ["ApplicationSet file", "+ environment config"], tone: "primary" },
      { title: "review", lines: ["git diff", "adhar upgrade --diff-only"] },
      { title: "adhar upgrade", lines: ["push stack to Gitea", "re-apply ApplicationSet"] },
      { title: "Application", lines: ["generated for", "the package"] },
      { title: "Synced + Healthy", lines: ["workloads in", "adhar-system"], tone: "accent" },
    ]}
    edges={[{ label: "edits files" }, { label: "confirm" }, { label: "generates" }, { label: "ArgoCD syncs" }]}
    gap={62}
  />
);

export const rw_concepts: Record<string, ComponentType> = {
  "ncc-bootstrap": Bootstrap,
  "ncc-gitops-path": GitOpsPath,
  "ncc-planes": Planes,
  "ncc-self-service": SelfService,
  "ncc-cp-install-order": CpInstallOrder,
  "ncc-two-paths": TwoPaths,
  "ncc-enable-package": EnablePackage,
};
