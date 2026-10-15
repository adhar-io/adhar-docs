import type { ComponentType } from "react";
import {
  Box, C, Caption, Flow, Frame, GroupBox, Ladder, Pipeline,
} from "@/components/docs/diagram-kit";

/** Diagrams owned by the howto-b pages. Every key is prefixed "hb-". */

/* ------------------------------------------------------------------ *
 * Backup and Restore
 * ------------------------------------------------------------------ */

/* Three producers feed one bucket, which production repoints off-cluster. */
function BackupCoverage() {
  const arrow = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.strong} strokeWidth={1.5}
      markerEnd="url(#dk-arrow)" />
  );
  return (
    <Frame
      width={790}
      height={292}
      label="Velero schedules, opt-in Velero file backup and CloudNativePG WAL archiving all write to the adhar-backups bucket, under velero/ and cnpg/<cluster>/ prefixes. In production that bucket is repointed at off-cluster object storage."
    >
      <Box x={8} y={24} w={262} h={62} title="Velero Schedules"
        lines={["adhar-platform-daily  02:00", "adhar-cluster-weekly  Sun 03:00"]} />
      <Box x={8} y={100} w={262} h={62} title="Velero file backup"
        lines={["opt-in per pod volume", "(Gitea's data volume ships opted in)"]} />
      <Box x={8} y={176} w={262} h={62} title="CloudNativePG"
        lines={["WAL archived continuously", "base backup daily 01:30 UTC"]} />

      {arrow(272, 55, 336, 110)}
      {arrow(272, 131, 336, 131)}
      {arrow(272, 207, 336, 152)}

      <Box x={340} y={70} w={232} h={122} title="adhar-backups" tone="primary"
        lines={["velero/   objects + files", "cnpg/<cluster>/  base + WAL", "", "default: in-cluster RustFS"]} />

      <line x1={576} y1={131} x2={608} y2={131} stroke={C.strong} strokeWidth={1.5}
        strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Box x={612} y={92} w={170} h={78} title="off-cluster store" tone="accent"
        lines={["S3 / Spaces / GCS", "(production)"]} />
      <Caption x={697} y={188} anchor="middle">repoint BSL + barman</Caption>
      <Caption x={697} y={202} anchor="middle">destinationPath</Caption>

      <Caption x={8} y={266}>
        Not in the bucket on purpose: Git content (the source of truth) and Crossplane state
      </Caption>
      <Caption x={8} y={282}>
        (managed resources reconverge from the XRs in Git).
      </Caption>
    </Frame>
  );
}

const RestoreDrill = () => (
  <Pipeline
    label="A namespace restore drill: back up the namespace, restore it into a scratch namespace with namespaceMapping, verify objects and data there, then delete the scratch namespace."
    caption="The live namespace is never touched — the drill proves the backup without risking what it protects."
    stages={[
      { name: "1 · back up", detail: "Backup, one namespace", guarantee: "phase Completed" },
      { name: "2 · restore aside", detail: "namespaceMapping", guarantee: "live objects untouched" },
      { name: "3 · verify", detail: "orders-drill", guarantee: "objects + data present", tone: "primary" },
      { name: "4 · clean up", detail: "delete orders-drill", guarantee: "nothing left behind", tone: "accent" },
    ]}
  />
);

const CnpgRecovery = () => (
  <Flow
    label="A CloudNativePG database archives WAL and base backups to the bucket; a new cluster with bootstrap.recovery replays them to the latest WAL or to a recoveryTarget time."
    caption="Recover into a NEW cluster name; the original keeps running until you choose to cut over."
    nodes={[
      { title: "payments-db", lines: ["running cluster", "WAL + daily base"] },
      { title: "adhar-backups", lines: ["cnpg/payments-db/"], tone: "primary" },
      { title: "payments-db-restore", lines: ["bootstrap.recovery", "optional recoveryTarget"], tone: "accent" },
    ]}
    edges={[{ label: "archive" }, { label: "replay" }]}
  />
);

/* ------------------------------------------------------------------ *
 * Run a Multi-Cluster Fleet
 * ------------------------------------------------------------------ */

function FleetTopology() {
  const rows = [
    { y: 40, title: "Gitea + ArgoCD", line: "Git is desired state; ArgoCD syncs it" },
    { y: 104, title: "Crossplane", line: "Cluster XR → DOKS / EKS / GKE / AKS" },
    { y: 168, title: "DataPlane controller", line: "registers, wires the hub, joins mesh" },
  ];
  return (
    <Frame
      width={800}
      height={352}
      label="The management cluster runs Gitea and ArgoCD, Crossplane, the DataPlane controller and the Mimir, Loki and Tempo observability hub. Workload clusters run only the thin agent profile and your applications. ArgoCD syncs every plane, Crossplane provisions cloud clusters, and every plane ships telemetry back to the hub."
    >
      <GroupBox x={8} y={8} w={384} h={316} label="management cluster — control plane" />
      {rows.map((r) => (
        <Box key={r.title} x={26} y={r.y} w={348} h={52} title={r.title} lines={[r.line]} />
      ))}
      <Box x={26} y={232} w={348} h={52} title="Mimir · Loki · Tempo" tone="primary"
        lines={["the observability hub (stores, Grafana)"]} />

      <GroupBox x={500} y={8} w={292} h={150} label="workload cluster (adopted)" />
      <Box x={516} y={40} w={260} h={102} title="thin profile"
        lines={["kyverno + policies, alloy", "external-secrets, metrics-server", "+ your applications"]} />

      <GroupBox x={500} y={174} w={292} h={150} label="workload cluster (Cluster XR)" />
      <Box x={516} y={206} w={260} h={102} title="thin profile"
        lines={["kyverno + policies, alloy", "external-secrets, metrics-server", "+ your applications"]} />

      {/* ArgoCD syncs the planes */}
      <line x1={376} y1={66} x2={512} y2={66} stroke={C.primary} strokeWidth={1.5}
        markerEnd="url(#dk-arrow-primary)" />
      <Caption x={444} y={58} anchor="middle" color={C.primary} weight={600}>sync</Caption>

      {/* Crossplane provisions the cloud cluster */}
      <path d="M 376 130 L 466 130 L 466 226 L 512 226" fill="none" stroke={C.strong}
        strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
      <Caption x={421} y={122} anchor="middle">provision</Caption>

      {/* Telemetry flows back to the hub */}
      <path d="M 512 290 L 436 290 L 436 258 L 378 258" fill="none" stroke={C.strong}
        strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={474} y={306} anchor="middle">telemetry</Caption>

      <Caption x={8} y={344}>
        Every plane is synced by ArgoCD and ships telemetry to the hub; only Cluster-XR planes are built by Crossplane.
      </Caption>
    </Frame>
  );
}

const ClusterProvisioning = () => (
  <Ladder
    label="Provisioning a workload cluster: a committed Cluster XR is composed by Crossplane into a DOKS cluster, its kubeconfig is published, an ArgoCD cluster Secret is created with the adhar.io labels, and the thin workload profile lands on it."
    heading={["what happens", "what you can observe"]}
    width={790}
    boxW={246}
    caption="Live-verified on DigitalOcean: apply → Ready in ~11 min, thin profile Healthy ~3 min later."
    rungs={[
      { name: "Cluster XR in Git", detail: "platform.adhar.io/v1alpha1", adds: ["kind Cluster, provider DIGITALOCEAN_DOKS,", "composition picked by the provider label"], tone: "primary" },
      { name: "Crossplane composes", detail: "cluster-digitalocean-doks", adds: ["DOKS Cluster + NodePool managed resources;", "the XR moves Pending → Provisioning → Available"] },
      { name: "kubeconfig published", detail: "<name>-kubeconfig", adds: ["Secret in adhar-system, re-rendered on every reconcile", "(DOKS credentials expire; this keeps them fresh)"] },
      { name: "ArgoCD registration", detail: "Secret cluster-<name>", adds: ["labels adhar.io/cluster, adhar.io/dataplane,", "adhar.io/dataplane-mode=composite"] },
      { name: "thin profile lands", detail: "adhar-workload-clusters", adds: ["one Application per agent, named <cluster>-<package>"], tone: "accent" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Upgrade the Platform
 * ------------------------------------------------------------------ */

const UpgradePhases = () => (
  <Ladder
    label="The upgrade sequence: pre-flight, a diff-only preview, phase one converging the foundation with server-side apply, phase two force-pushing the stack on confirmation, an expected OutOfSync storm, and finally every application Healthy and Synced."
    heading={["step", "what it does"]}
    width={800}
    boxW={256}
    rungs={[
      { name: "pre-flight", detail: "backup · health · staging", adds: ["fresh backup verified, every app Healthy/Synced,", "the same release already proven on staging"] },
      { name: "adhar upgrade --diff-only", detail: "changes nothing", adds: ["clones packages + environments from Gitea and", "diffs them against your local stack directory"], tone: "primary" },
      { name: "phase 1 · foundation", detail: "server-side apply", adds: ["gateway-api-crds → cilium → gateway → (cnpg, HA) →", "argocd → gitea → crossplane → controller-manager"] },
      { name: "phase 2 · stack", detail: "force-push on confirm", adds: ["pushes the stack, re-applies the ApplicationSet,", "requests an ArgoCD refresh"] },
      { name: "OutOfSync storm", detail: "~10 min (5–15)", adds: ["every app tracks the packages monorepo, so every", "app re-compares after any push — expected"] },
      { name: "Healthy / Synced", detail: "adhar get status", adds: ["judge health only after the storm drains"], tone: "accent" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Preview Environments
 * ------------------------------------------------------------------ */

const PreviewMatrix = () => (
  <Flow
    label="The preview ApplicationSet is a matrix: the Gitea scmProvider generator selects repositories whose default branch has preview/kustomization.yaml, the pullRequest generator selects their open pull requests labelled preview, and each pair becomes one Application."
    caption="One ApplicationSet for the whole adhar org — opting in is a file in the repo plus a label on the PR."
    nodes={[
      { title: "scmProvider", lines: ["repos in org adhar with", "preview/kustomization.yaml"] },
      { title: "pullRequest", lines: ["open PRs on each repo", "labelled preview"] },
      { title: "Application", lines: ["<repo>-pr-<number>"], tone: "accent" },
    ]}
    edges={[{ label: "× (matrix)" }, { label: "one per pair" }]}
  />
);

const PreviewLifecycle = () => (
  <Ladder
    label="Preview lifecycle: labelling a PR fires the Gitea webhook, Tekton app-ci builds the head SHA into Harbor, the ApplicationSet generator polls every 60 seconds and creates the Application, ArgoCD syncs the preview overlay into its own namespace with its own hostname, Kyverno stamps a quota and limit range, and closing the PR prunes everything."
    heading={["event", "result"]}
    width={800}
    boxW={238}
    rungs={[
      { name: "label PR preview", detail: "Gitea org webhook", adds: ["pull_request event → Tekton app-ci EventListener"], tone: "primary" },
      { name: "app-ci builds head", detail: "library/<repo>:<sha>", adds: ["image pushed to Harbor; no writeback to main"] },
      { name: "generator polls", detail: "requeueAfterSeconds: 60", adds: ["the matrix now yields this PR →", "Application <repo>-pr-<number> is created"] },
      { name: "ArgoCD syncs preview/", detail: "at the head SHA", adds: ["namespace preview-<repo>-<number>, image tag = SHA,", "HTTPRoute host <repo>-pr-<number>.<domain>"] },
      { name: "Kyverno stamps", detail: "preview-quota / -limits", adds: ["ResourceQuota + LimitRange on the namespace"] },
      { name: "close · merge · unlabel", detail: "finalizer cascade", adds: ["Application deleted; its resources and the", "namespace are pruned — no reaper job"], tone: "accent" },
    ]}
  />
);

export const howto_b: Record<string, ComponentType> = {
  "hb-backup-coverage": BackupCoverage,
  "hb-restore-drill": RestoreDrill,
  "hb-cnpg-recovery": CnpgRecovery,
  "hb-fleet-topology": FleetTopology,
  "hb-cluster-provisioning": ClusterProvisioning,
  "hb-upgrade-phases": UpgradePhases,
  "hb-preview-matrix": PreviewMatrix,
  "hb-preview-lifecycle": PreviewLifecycle,
};
