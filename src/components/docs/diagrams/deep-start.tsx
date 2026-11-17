import type { ComponentType } from "react";
import {
  Box, Caption, C, Flow, Frame, GroupBox, Ladder, Split,
} from "@/components/docs/diagram-kit";

/** Diagrams owned by the deep-start pages. Every key is prefixed "ds-". */

/* ---------------- control plane: one XRD, many Compositions ---------------- */

const FANOUT = [
  { name: "database-local-cnpg", labels: "provider=local · engine=postgresql", pick: true },
  { name: "database-local-valkey", labels: "provider=local · engine=valkey" },
  { name: "database-local-redis", labels: "provider=local · engine=redis" },
  { name: "database-aws-rds-postgresql", labels: "provider=aws · engine=postgresql" },
  { name: "database-gcp-cloudsql", labels: "provider=gcp · engine=postgresql" },
  { name: "database-azure-sql", labels: "provider=azure · engine=mssql" },
];

function CompositionFanout() {
  const bx = 476;
  const bw = 262;
  const bh = 40;
  const top = 16;
  const step = 50;
  const mid = top + (FANOUT.length * step - (step - bh)) / 2;
  return (
    <Frame width={750} height={360}
      label="One Database XRD is implemented by six Compositions. The request's spec.crossplane.compositionSelector labels pick exactly one: provider=local with engine=postgresql selects database-local-cnpg, provider=aws selects RDS, provider=gcp selects Cloud SQL, and so on.">
      <Box x={8} y={mid - 40} w={190} h={80} title="Database" tone="primary"
        lines={["team namespace", "selector: feature,", "provider, engine"]} />
      <line x1={198} y1={mid} x2={236} y2={mid} stroke={C.primary} strokeWidth={1.5}
        markerEnd="url(#dk-arrow-primary)" />
      <Box x={240} y={mid - 36} w={196} h={72} title="XRD"
        lines={["databases.", "platform.adhar.io"]} />
      {FANOUT.map((f, i) => {
        const y = top + i * step;
        return (
          <g key={f.name}>
            <line x1={436} y1={mid} x2={bx - 6} y2={y + bh / 2}
              stroke={f.pick ? C.primary : C.line} strokeWidth={f.pick ? 1.75 : 1.25}
              strokeDasharray={f.pick ? undefined : "4 4"}
              markerEnd={f.pick ? "url(#dk-arrow-primary)" : "url(#dk-arrow)"} />
            <Box x={bx} y={y} w={bw} h={bh} title={f.name} titleSize={11.5}
              lines={[f.labels]} tone={f.pick ? "accent" : "plain"} />
          </g>
        );
      })}
      <Caption x={8} y={top + FANOUT.length * step + 12}>
        Labels on the request, labels on each Composition: the one whose labels all match is used.
      </Caption>
      <Caption x={8} y={top + FANOUT.length * step + 28}>
        provider=local is the XRD default, so a bare request never reaches for a cloud with no credentials.
      </Caption>
    </Frame>
  );
}

/* ---------------- control plane: what one request composes ---------------- */

function ComposedTree() {
  return (
    <Frame width={740} height={330}
      label="The worked request: Database payments-db in team-payments composes a CNPG Cluster named payments-db, a ScheduledBackup named payments-db-daily and a CNPG Database named payments-db-payments-audit. The CNPG operator, not Crossplane, then publishes the connection Secret payments-db-app.">
      <GroupBox x={8} y={8} w={724} h={262} label="namespace team-payments" />
      <Box x={262} y={36} w={216} h={56} title="Database/payments-db" tone="primary"
        lines={["platform.adhar.io/v1alpha1"]} />
      <Caption x={490} y={60} size={10.5}>you apply this (XR)</Caption>

      {[
        { x: 24, title: "Cluster/payments-db", lines: ["postgresql.cnpg.io", "2 instances · PITR"] },
        { x: 264, title: "ScheduledBackup", lines: ["payments-db-daily", "0 30 1 * * *"] },
        { x: 504, title: "Database (CNPG)", lines: ["payments-db-", "payments-audit"] },
      ].map((b, i) => (
        <g key={i}>
          <line x1={370} y1={92} x2={b.x + 106} y2={136} stroke={C.strong}
            strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
          <Box x={b.x} y={140} w={212} h={64} title={b.title} lines={b.lines} />
        </g>
      ))}
      <Caption x={300} y={124} size={10}>composed by function-go-templating</Caption>

      <Box x={24} y={222} w={212} h={40} title="Secret/payments-db-app" tone="accent" />
      <line x1={130} y1={204} x2={130} y2={220} stroke={C.line} strokeWidth={1.5}
        strokeDasharray="4 4" markerEnd="url(#dk-arrow)" />
      <Caption x={250} y={240} size={10.5}>written by the CNPG operator, read by</Caption>
      <Caption x={250} y={254} size={10.5}>adhar application bind (envFrom)</Caption>

      <Caption x={8} y={292}>
        Readiness: function-auto-ready marks the XR Ready once every composed object is ready.
      </Caption>
      <Caption x={8} y={308}>
        The ScheduledBackup and extra Database are annotated ready, because neither reports a Ready condition.
      </Caption>
    </Frame>
  );
}

/* ---------------- architecture: the AdharPlatform reconcile loop ---------------- */

const ReconcileLoop = () => (
  <Ladder
    label="One pass of the AdharPlatform reconciler: fetch the resource and adopt its build customization, short-circuit to convergence if already deployed, install the foundation if ArgoCD, the Gateway or Gitea is not available, start Crossplane core early, apply the platform stack and ApplicationSet, reconcile the Crossplane control plane, then requeue or exit."
    heading={["gate", "what the pass does"]}
    caption="Every failure records a reason and requeues in 5 s; a healthy pass requeues in 15 s (or exits, when run from the CLI)."
    width={740}
    boxW={232}
    rungs={[
      { name: "Get AdharPlatform", detail: "adhar-system/adhar", tone: "primary",
        adds: ["adopt spec.buildCustomization (host, port, protocol)", "when the process started without one"] },
      { name: "Already converged?", detail: "ExitOnSync + controlPlaneApplied",
        adds: ["CLI-run controller only: skip to driving the", "Applications to Synced + Healthy, then exit"] },
      { name: "Foundation", detail: "ArgoCD/Gateway/Gitea up?",
        adds: ["if not: Gateway API CRDs → Cilium → Gateway →", "ArgoCD → Gitea, applied with Server-Side Apply"] },
      { name: "Crossplane core (early)", detail: "best effort",
        adds: ["start the pull now; the decisive apply comes later"] },
      { name: "Platform stack", detail: "only when the CLI has the stack", tone: "accent",
        adds: ["seed Gitea once (RepositoriesCreated), then apply Argo", "CD repo auth + the ApplicationSets on EVERY pass"] },
      { name: "Crossplane", detail: "Available · ControlPlaneApplied",
        adds: ["install core, wait, apply the control plane in order;", "after the ApplicationSet, so apps never wait on it"] },
      { name: "Requeue or exit", detail: "15 s · 5 s on error",
        adds: ["watch mode keeps nudging stuck Applications;", "run from the CLI, it exits once converged"] },
    ]}
  />
);

/* ---------------- configuration: the line the file draws ---------------- */

const ConfigBoundary = () => (
  <Split
    label="What config.yaml decides versus what the platform stack in Git decides. The file holds cluster shape and is read once by the CLI; the stack holds platform content and is reconciled continuously by Argo CD."
    caption="Change the left with adhar up -f; change the right with adhar stack and adhar upgrade."
    left={{
      heading: "config.yaml — read by the CLI",
      tone: "primary",
      items: [
        "Which provider and region",
        "Node size, count, Kubernetes version",
        "Autoscaler floor and ceiling",
        "Host, ACME e-mail, DNS provider, HA mode",
        "Read once, at adhar up / adhar down",
      ],
    }}
    right={{
      heading: "platform stack — reconciled by Argo CD",
      tone: "accent",
      items: [
        "Which packages are enabled",
        "Each package's values and manifests",
        "Environments and golden-path templates",
        "XRDs and Compositions (embedded)",
        "Re-applied continuously; drift is reverted",
      ],
    }}
  />
);

/* ---------------- first service: binding a backing service ---------------- */

const BindFlow = () => (
  <Flow
    label="Binding a database to an application: adhar database create applies a Database, the control plane composes a CNPG Cluster, the CNPG operator writes the Secret orders-db-app, adhar application bind adds it as envFrom on the app's first container, and the Deployment rolls."
    caption="Locally the Secret is <name>-app; the cloud compositions write <name>-db instead — pass --secret."
    nodes={[
      { title: "Database", lines: ["orders-db"], tone: "primary" },
      { title: "CNPG Cluster", lines: ["composed"] },
      { title: "Secret", lines: ["orders-db-app"], tone: "accent" },
      { title: "Deployment", lines: ["envFrom → roll"], tone: "primary" },
    ]}
    edges={[
      { label: "compose" },
      { label: "operator writes" },
      { label: "application bind", tone: "primary" },
    ]}
  />
);

/* ---------------- platform services: the two profiles ---------------- */

const Profiles = () => (
  <Split
    label="The two ApplicationSet profiles. adhar-appset-local.yaml, chosen for Kind, enables a curated core sized for one node. adhar-appset-production.yaml, chosen for every cloud and on-prem provider, enables most of the catalogue. Every package is wired in both; only the enabled flag differs."
    caption="Live numbers: adhar stack list --enabled. The local core must stay a subset of production."
    left={{
      heading: "local — adhar-appset-local.yaml",
      tone: "primary",
      items: [
        "Chosen when provider is kind (or unset)",
        "Console, Keycloak, CNPG, Valkey, RustFS",
        "Tekton, buildpack, Harbor, supply chain",
        "kube-prometheus, metrics-server, Headlamp",
        "Kyverno, External Secrets",
      ],
      note: "Sized so one Kind node is not OOM-killed",
    }}
    right={{
      heading: "production — adhar-appset-production.yaml",
      tone: "accent",
      items: [
        "Chosen for every cloud and on-prem target",
        "Everything local, plus OpenBao, cert-manager",
        "Loki, Tempo, Mimir, Alloy, OpenCost, OnCall",
        "Kargo, Argo Rollouts, previews, Velero",
        "Data and AI services: Kafka, Trino, adhar-ai",
      ],
      note: "Disabled entries carry their reason inline",
    }}
  />
);

export const deep_start: Record<string, ComponentType> = {
  "ds-composition-fanout": CompositionFanout,
  "ds-composed-tree": ComposedTree,
  "ds-reconcile-loop": ReconcileLoop,
  "ds-config-boundary": ConfigBoundary,
  "ds-bind-flow": BindFlow,
  "ds-profiles": Profiles,
};
