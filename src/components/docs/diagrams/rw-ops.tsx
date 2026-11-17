import type { ComponentType } from "react";
import { Flow, Ladder, Split } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "nop-". */

/* Customization: which mechanism carries which kind of change. */
const ChangeRoutes = () => (
  <Ladder
    label="Which mechanism carries each kind of customization. Turning a package on or off: adhar stack enable or disable, then adhar upgrade. Retuning a package: edit values.yaml, re-render, adhar upgrade. A new platform package: a package directory plus an entry in the ApplicationSet and the environment config. Team applications: a CustomPackage. A golden path: a scaffolder template in adhar-templates. A self-service API: an XRD and a Composition. A new cloud: the Provider interface."
    heading={["you want to", "you change"]}
    width={800}
    boxW={236}
    caption="Only the last row needs Go. Everything else is declarative and lands through Git."
    rungs={[
      { name: "switch a package", detail: "on or off", adds: ["adhar stack enable | disable <pkg>, then adhar upgrade"], tone: "primary" },
      { name: "retune a package", detail: "replicas, flags, versions", adds: ["values.yaml → generate-manifests.sh → adhar upgrade"] },
      { name: "add a platform package", detail: "your own capability", adds: ["a package directory + adhar-package.yaml,", "an entry in the ApplicationSet and the environment config"] },
      { name: "deploy team apps", detail: "workloads, not platform", adds: ["a CustomPackage, delivered through the in-cluster Gitea"] },
      { name: "add a golden path", detail: "a new starting point", adds: ["a scaffolder template in the adhar-templates source repository"] },
      { name: "add a self-service API", detail: "infrastructure on request", adds: ["an XRD + one Composition per implementation (Crossplane)"] },
      { name: "add a cloud provider", detail: "a new place to run", adds: ["the Provider interface, registered in the factory"], tone: "accent" },
    ]}
  />
);

/* Customization: what adhar stack enable does, and when the cluster changes. */
const StackEnable = () => (
  <Flow
    label="Enabling a package: adhar stack enable checks conflicts and dependencies, then edits the profile's ApplicationSet and its mirrored environment config in your checkout. You review the diff. adhar upgrade applies the ApplicationSet and pushes the stack to the in-cluster Gitea. The ApplicationSet generator selects entries labelled enabled true and creates one ArgoCD Application per package, which syncs the workload into adhar-system."
    caption="Nothing reaches the cluster until adhar upgrade. Disabling runs the same path and prunes the workload."
    nodes={[
      { title: "adhar stack enable", lines: ["checks conflicts", "and dependencies"], tone: "primary" },
      { title: "your checkout", lines: ["ApplicationSet +", "environment config"] },
      { title: "adhar upgrade", lines: ["applies the appset,", "pushes the stack"] },
      { title: "ApplicationSet", lines: ["selects", 'enabled: "true"'] },
      { title: "Application", lines: ["one per package,", "synced to adhar-system"], tone: "accent" },
    ]}
    edges={[{ label: "edits" }, { label: "review diff" }, {}, { label: "generates" }]}
    gap={34}
  />
);

/* Observability: how a workload cluster's telemetry reaches the hub. */
const FleetTelemetry = () => (
  <Flow
    label="Fleet telemetry: on a workload cluster, Alloy is the only observability component. It reads the hub endpoints and its own cluster name from the observability-hub ConfigMap and ships metrics, logs and traces to the management cluster's Gateway. Each ingestion route sits behind a Keycloak oauth2-proxy that requires a bearer token from the mimir, loki or tempo client. The stores keep the data with a cluster label, and Grafana queries the whole fleet from one place."
    caption="Spokes keep no telemetry stores. Every sample carries the spoke's HUB_CLUSTER_NAME."
    nodes={[
      { title: "Alloy (spoke)", lines: ["reads HUB_* from", "observability-hub"], tone: "primary" },
      { title: "hub Gateway", lines: ["mimir. loki. tempo.", "<host>"] },
      { title: "oauth2-proxy", lines: ["Keycloak bearer", "token required"] },
      { title: "Mimir · Loki · Tempo", lines: ["management cluster", "cluster=<spoke>"] },
      { title: "Grafana", lines: ["one query,", "every cluster"], tone: "accent" },
    ]}
    edges={[{ label: "HTTPS" }, {}, {}, { label: "reads" }]}
    gap={34}
  />
);

/* Observability: the route an alert takes from a rule to a person. */
const AlertRouting = () => (
  <Flow
    label="Alert routing: a PrometheusRule in any namespace is picked up by Prometheus, which evaluates it. Firing alerts go to Alertmanager, which groups them by namespace and alert name and applies severity inhibition, then delivers them over an authenticated webhook to the Console's Notification Center. The Watchdog heartbeat is routed to null. Grafana OnCall is installed in production but receives nothing until you add a receiver for it."
    caption="Grafana OnCall is not on this path by default: add an integration and an Alertmanager receiver to page through it."
    nodes={[
      { title: "PrometheusRule", lines: ["any namespace,", "no extra label"], tone: "primary" },
      { title: "Prometheus", lines: ["evaluates expr", "and for:"] },
      { title: "Alertmanager", lines: ["groups by namespace", "+ alertname, inhibits"] },
      { title: "Notification Center", lines: ["Console,", "authenticated webhook"], tone: "accent" },
    ]}
    edges={[{ label: "discovered" }, { label: "fires" }, { label: "webhook" }]}
  />
);

/* Production: how the enableHAMode flag reaches every consumer. */
const HaFlag = () => (
  <Flow
    label="How HA mode propagates: globalSettings.enableHAMode in config.yaml is copied by adhar up onto the AdharPlatform resource as spec.buildCustomization.enableHAMode. The foundation reconcilers read that field and apply install-ha.yaml for ArgoCD, Gitea and Crossplane, installing the CNPG operator first. The stack templates read the same flag at seed time, and adhar upgrade reads it again so an upgrade keeps the variant."
    caption="One field on the AdharPlatform resource drives the foundation, the stack templates and every later upgrade."
    nodes={[
      { title: "config.yaml", lines: ["globalSettings.", "enableHAMode: true"], tone: "primary" },
      { title: "AdharPlatform", lines: ["spec.buildCustomization.", "enableHAMode"] },
      { title: "foundation", lines: ["install-ha.yaml:", "ArgoCD, Gitea, Crossplane"] },
      { title: "stack templates", lines: ["keycloak-db:", "2 instances"], tone: "accent" },
    ]}
    edges={[{ label: "adhar up" }, { label: "reconcilers read" }, { label: "seed reads" }]}
  />
);

/* Production: what the node autoscaler does in each direction, and what stops it. */
const Autoscaler = () => (
  <Split
    width={820}
    label="The node autoscaler in both directions. Scale up: triggered by pods pending for capacity, including the exceed max volume count message, or by sustained high utilization; it creates a cloud instance and joins it with kubeadm at the running control plane's version; it never exceeds maxWorkers. Scale down: triggered by an idle cluster; it removes at most one node per scaleDownDelay window, never a node hosting a pod with a ReadWriteOnce volume, drains the node and deletes its instance; it never goes below minWorkers."
    caption="The reason for the last decision is on the AdharPlatform: .status.autoscaling.lastReason."
    left={{
      heading: "Scale up",
      tone: "primary",
      items: [
        "Trigger: pods Pending for capacity, or high utilization",
        "“exceed max volume count” counts as capacity",
        "Creates a cloud instance, joins it with kubeadm",
        "Uses the running control plane's Kubernetes version",
        "Stops at maxWorkers (default 5)",
      ],
      note: "compute mode only; refused on provided clusters",
    }}
    right={{
      heading: "Scale down",
      tone: "accent",
      items: [
        "Trigger: the cluster is idle",
        "At most one node per scaleDownDelay (default 10m)",
        "Skips a node whose pod has a ReadWriteOnce volume",
        "Drains the node, then deletes its instance",
        "Stops at minWorkers (default 1)",
      ],
      note: "a recent move in either direction also blocks it",
    }}
  />
);

/* Security: which ClusterSecretStore reaches what, and which namespaces it serves. */
const SecretStores = () => (
  <Ladder
    label="The secret-store boundary. ClusterSecretStore vault reaches every OpenBao path and serves only adhar-system. The stores platform, keycloak and argocd reach Secrets in adhar-system and serve only adhar-system. The store gitea serves adhar-system and adhar-environments. platform-object-storage reaches only root-creds and platform-delivery reaches only gitea-ci-creds and harbor-push; both serve namespaces labelled adhar.io/plane workload or preview. A tenant's own namespaced SecretStore logs in with role tenant and reaches only secret/tenants/<namespace>."
    heading={["store", "reaches → serves"]}
    width={820}
    boxW={252}
    caption="Platform stores match namespaces by name or by the adhar.io/plane label; a tenant reads only its own path."
    rungs={[
      { name: "vault", detail: "ClusterSecretStore", adds: ["every OpenBao path, break-glass credentials included", "→ adhar-system only"], tone: "primary" },
      { name: "platform · keycloak · argocd", detail: "ClusterSecretStore", adds: ["Secrets in adhar-system", "→ adhar-system only"] },
      { name: "gitea", detail: "ClusterSecretStore", adds: ["Secrets in adhar-system", "→ adhar-system, adhar-environments"] },
      { name: "platform-object-storage", detail: "narrow ClusterSecretStore", adds: ["root-creds only (RBAC resourceNames)", "→ namespaces labelled adhar.io/plane: workload | preview"] },
      { name: "platform-delivery", detail: "narrow ClusterSecretStore", adds: ["gitea-ci-creds and harbor-push only", "→ namespaces labelled adhar.io/plane: workload | preview"] },
      { name: "openbao (your SecretStore)", detail: "SA adhar-secrets, role tenant", adds: ["secret/tenants/<namespace>/* only", "→ the namespace it lives in"], tone: "accent" },
    ]}
  />
);

/* Security: the admission checks an image and its pod pass, and where each applies. */
const AdmissionLayers = () => (
  <Ladder
    label="Admission checks in order of reach. verify-supply-chain-images, from the adhar-supply-chain package, is on in every profile and rejects unsigned images from Harbor's library project in workload namespaces. The adhar-supply-chain-policies packs, audit and enforce, are on in production only and add a registry allowlist, a no-latest rule and signature checks for workload namespaces. The Pod Security Baseline policies in adhar-kyverno-policies are on in production and ship in Audit mode. The CIS pack in adhar-policy-packs is off by default. The supply-chain policies exclude adhar-system."
    heading={["policy", "what it does · where it is on"]}
    width={820}
    boxW={266}
    caption="The supply-chain policies exclude adhar-system, so an Enforce flip cannot stop the platform itself."
    rungs={[
      { name: "verify-supply-chain-images", detail: "adhar-supply-chain", adds: ["Rejects unsigned Harbor library/* images in workload namespaces", "On in every profile"], tone: "primary" },
      { name: "adhar-supply-chain-policies", detail: "audit + enforce packs", adds: ["Registry allowlist, no :latest, signature checks", "On in production; opt-in locally"] },
      { name: "Pod Security Baseline", detail: "adhar-kyverno-policies", adds: ["Privileged mode, hostPath, host namespaces", "On in production, in Audit: you promote to Enforce"] },
      { name: "CIS pack", detail: "adhar-policy-packs", adds: ["Restricted-level controls", "Off by default"], tone: "accent" },
    ]}
  />
);

export const rw_ops: Record<string, ComponentType> = {
  "nop-change-routes": ChangeRoutes,
  "nop-stack-enable": StackEnable,
  "nop-fleet-telemetry": FleetTelemetry,
  "nop-alert-routing": AlertRouting,
  "nop-ha-flag": HaFlag,
  "nop-autoscaler": Autoscaler,
  "nop-secret-stores": SecretStores,
  "nop-admission-layers": AdmissionLayers,
};
