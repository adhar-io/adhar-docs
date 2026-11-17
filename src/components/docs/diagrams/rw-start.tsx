import type { ComponentType } from "react";
import { Flow, Ladder, Pipeline, Split } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "nst-". */

/* ---------------- overview: imperative bootstrap, then GitOps ---------------- */
const BootstrapHandoff = () => (
  <Flow
    label="How adhar up builds a platform. The adhar binary, which carries the platform stack, installs a small foundation: Cilium and the Gateway, ArgoCD and Gitea. It seeds the stack into Gitea. One ArgoCD ApplicationSet reads that repository and creates an Application per enabled package. From then on ArgoCD and Crossplane reconcile the platform from Git."
    caption="The CLI installs only until Git exists. After the seed, Git is the source of truth."
    gap={40}
    nodes={[
      { title: "adhar up", lines: ["one binary,", "stack built in"], tone: "primary" },
      { title: "Foundation", lines: ["Cilium · Gateway", "ArgoCD · Gitea"] },
      { title: "Gitea", lines: ["holds the stack"] },
      { title: "ApplicationSet", lines: ["one Application per", "enabled package"] },
      { title: "Platform", lines: ["reconciled from Git", "by ArgoCD + Crossplane"], tone: "accent" },
    ]}
    edges={[{ label: "installs" }, { label: "seeds" }, { label: "read by" }, { label: "syncs", tone: "primary" }]}
  />
);

/* ---------------- overview: a self-service request ---------------- */
const SelfService = () => (
  <Flow
    label="A self-service request. A developer applies a Database object in their own namespace. Crossplane selects a composition and builds a PostgreSQL instance with scheduled backups. The connection details are written to a Secret in the same namespace, which the application reads."
    caption="No ticket and no per-request approval. Platform quotas and policies still apply."
    gap={40}
    nodes={[
      { title: "Database", lines: ["you apply it", "in your namespace"], tone: "primary" },
      { title: "Crossplane", lines: ["selects a", "composition"] },
      { title: "PostgreSQL", lines: ["instance +", "scheduled backups"] },
      { title: "Secret", lines: ["connection", "details"], tone: "accent" },
      { title: "Your app", lines: ["reads the Secret"] },
    ]}
    edges={[{ label: "request" }, { label: "composes" }, { label: "publishes" }, { label: "bound to" }]}
  />
);

/* ---------------- quick start: the nine stages of a local adhar up ---------------- */
const UpStages = () => (
  <Ladder
    label="The nine stages of a local adhar up. The CLI creates the Kind cluster, installs the platform CRDs and sets up networking. The AdharPlatform controller then installs Cilium and the Gateway, ArgoCD and Gitea, seeds the GitOps repositories, installs Crossplane, and drives the GitOps sync until the enabled packages are Synced and Healthy."
    heading={["stage", "what it does"]}
    caption="Stages 1–3 run in the CLI; from stage 4 the AdharPlatform controller does the work. After stage 7, Git is in charge."
    width={760}
    boxW={200}
    rungs={[
      { name: "1. Kind cluster", detail: "CLI", tone: "primary",
        adds: ["Creates the node `adhar` with Kind's CNI and kube-proxy disabled;", "host ports 8443/8080 map to the Gateway's 30443/30080"] },
      { name: "2. Platform CRDs", detail: "CLI",
        adds: ["Installs AdharPlatform, GitRepository and CustomPackage"] },
      { name: "3. Networking", detail: "CLI",
        adds: ["CoreDNS rewrite and the self-signed platform certificate"] },
      { name: "4. Cilium & Gateway", detail: "controller",
        adds: ["eBPF CNI and the Cilium Gateway API implementation,", "from manifests built into the binary"] },
      { name: "5. ArgoCD", detail: "controller",
        adds: ["The GitOps engine"] },
      { name: "6. Gitea", detail: "controller",
        adds: ["The in-cluster Git server"] },
      { name: "7. GitOps repos", detail: "controller", tone: "accent",
        adds: ["Seeds packages, environments and templates into Gitea,", "then applies the ApplicationSet"] },
      { name: "8. Crossplane", detail: "controller",
        adds: ["Control plane and providers"] },
      { name: "9. GitOps sync", detail: "ArgoCD", tone: "primary",
        adds: ["ArgoCD syncs every enabled package;", "the CLI counts n/m apps Synced + Healthy"] },
    ]}
  />
);

/* ---------------- quick start: changing the platform through Git ---------------- */
const ChangeLoop = () => (
  <Pipeline
    label="Changing the platform the GitOps way: adhar stack enable edits the stack files in your exported copy, adhar upgrade --diff-only previews the change without touching the cluster, adhar upgrade pushes the stack to the in-cluster Gitea, ArgoCD syncs it, and adhar stack status confirms the package is Synced and Healthy."
    caption="Run adhar stack export and set ADHAR_STACK_DIR once, before the first edit."
    stages={[
      { name: "Edit", detail: "stack enable <pkg>", guarantee: "stack files only,\nnothing pushed", tone: "primary" },
      { name: "Preview", detail: "upgrade --diff-only", guarantee: "changes nothing" },
      { name: "Converge", detail: "adhar upgrade", guarantee: "pushes the stack\nto Gitea" },
      { name: "Sync", detail: "ArgoCD", guarantee: "cluster made to\nmatch Git" },
      { name: "Verify", detail: "stack status <pkg>", guarantee: "Synced + Healthy", tone: "accent" },
    ]}
  />
);

/* ---------------- installation: two kinds of host ---------------- */
const InstallPaths = () => (
  <Split
    label="Preparing a host for Adhar. On a laptop you need a container engine whose daemon answers, at least 8 GB of memory given to the engine and 20 GB of free disk, and the adhar CLI; adhar up needs no config file. On a cloud you need credentials in the environment, a DNS zone delegated to the provider before you start, enough quota, a config file and a clean dry run before adhar up -f."
    caption="Both paths end in the same command and the same platform."
    left={{
      heading: "Laptop — Kind",
      tone: "primary",
      items: [
        "A container engine that answers (docker info)",
        "8 GB+ given to the engine, 20 GB+ free disk",
        "The adhar CLI — nothing else",
        "adhar up — no config file",
        "The first run pulls about 10 GB of images",
      ],
      note: "URLs: https://<service>.adhar.localtest.me:8443",
    }}
    right={{
      heading: "Cloud or your own hosts",
      tone: "accent",
      items: [
        "Credentials in the environment, never the file",
        "A DNS zone delegated to the provider, first",
        "Quota for instances, vCPU, LBs and volumes",
        "A config file, validated and dry-run",
        "adhar up -f <file> --env <name>",
      ],
      note: "URLs: https://<service>.<your-domain>",
    }}
  />
);

/* ---------------- installation: preparing a cloud account ---------------- */
const CloudPrep = () => (
  <Pipeline
    label="Preparing a cloud install, in order: export credentials as environment variables, delegate a DNS zone to the cloud, check quota, write and validate the config file, run adhar up with --dry-run, then provision with adhar up -f and verify."
    caption="Each step blocks the next. Only the last one creates anything."
    stages={[
      { name: "Credentials", detail: "env variables", guarantee: "never in\nthe config file", tone: "primary" },
      { name: "DNS zone", detail: "delegated", guarantee: "must exist before\nyou provision" },
      { name: "Quota", detail: "raised", guarantee: "dry run does\nnot check it" },
      { name: "Config file", detail: "config validate", guarantee: "describes the\ncluster only" },
      { name: "Dry run", detail: "up --dry-run", guarantee: "creates nothing" },
      { name: "Provision", detail: "up -f … --env …", guarantee: "then verify DNS\nand TLS", tone: "accent" },
    ]}
  />
);

/* ---------------- configuration: one merged list, two readers ---------------- */
const ClusterConfigReaders = () => (
  <Split
    label="When a template and an environment both set the same clusterConfig key, the merged list holds both entries, template first. The provisioner walks the whole list and the last match wins, so the cluster is built with the environment's value. The adhar-cluster-spec ConfigMap, which the in-cluster autoscaler reads, takes the first match, so it records the template's value."
    caption="Merged list: [nodeSize=s-2vcpu-4gb (template), nodeSize=s-8vcpu-16gb (environment)]"
    left={{
      heading: "Provisioner — last match wins",
      tone: "primary",
      items: [
        "Builds the cluster spec",
        "Walks the whole list in order",
        "Ignores case and separators in key names",
        "Result: s-8vcpu-16gb (the environment)",
      ],
    }}
    right={{
      heading: "adhar-cluster-spec — first match wins",
      tone: "accent",
      items: [
        "ConfigMap the in-cluster autoscaler reads",
        "Takes the first entry for the key",
        "Matches the exact spelling only",
        "Result: s-2vcpu-4gb (the template)",
      ],
    }}
  />
);

/* ---------------- configuration: from a file to a cluster ---------------- */
const ConfigWorkflow = () => (
  <Pipeline
    label="From nothing to a provisioned cluster: adhar config create scaffolds a file, adhar config validate checks it, adhar config view shows what it resolves to, adhar up --dry-run previews the environment, adhar up -f with --env provisions it, and the adhar-cluster-spec ConfigMap confirms the cluster matches the file."
    caption="The first four steps create nothing in your cloud account."
    stages={[
      { name: "Scaffold", detail: "config create", guarantee: "a starting point\nto edit", tone: "primary" },
      { name: "Validate", detail: "config validate", guarantee: "schema and\nprovider rules" },
      { name: "Resolve", detail: "config view", guarantee: "the merged\nresult" },
      { name: "Dry run", detail: "up --dry-run", guarantee: "creates nothing" },
      { name: "Provision", detail: "up -f … --env …", guarantee: "builds the\ncluster" },
      { name: "Verify", detail: "cluster-spec", guarantee: "cluster matches\nthe file", tone: "accent" },
    ]}
  />
);

/* ---------------- first service: template to URL ---------------- */
const FirstService = () => (
  <Flow
    label="What this page builds. adhar application deploy scaffolds a golden-path template into a new Gitea repository, adhar/hello, and registers an Application. The scaffold commit is a push, so the app-ci pipeline builds, scans and signs an image. Kargo promotes that image into the dev environment, where ArgoCD syncs it and the service answers at hello.dev.adhar.localtest.me."
    caption="One command declares the repository and the Application. The platform does the rest from Git."
    gap={40}
    nodes={[
      { title: "Template", lines: ["go-web-service"], tone: "primary" },
      { title: "Gitea repo", lines: ["adhar/hello", "source + deploy/"] },
      { title: "app-ci", lines: ["build · scan", "sign → Harbor"] },
      { title: "Kargo", lines: ["promotes the", "signed image"] },
      { title: "dev", lines: ["ArgoCD syncs", "hello.dev.<host>"], tone: "accent" },
    ]}
    edges={[{ label: "scaffold" }, { label: "push" }, { label: "image" }, { label: "GitOps", tone: "primary" }]}
  />
);

/* ---------------- first service: what one Application composes ---------------- */
const AppEnvironments = () => (
  <Ladder
    label="What one Application composes. The Application hello lives in adhar-system and belongs to the project adhar. The application-multienv composition creates a Kargo Warehouse named hello that watches the image repository, and one ArgoCD Application per project environment: adhar-hello-dev, adhar-hello-test and adhar-hello-prod, each syncing deploy/envs/<environment> into that environment's namespace. Dev and test are promoted automatically; prod is promoted only by a Release."
    heading={["object", "what it does"]}
    caption="Environments belong to the project, so every application in it shares the same dev → test → prod chain."
    width={760}
    boxW={236}
    rungs={[
      { name: "Application hello", detail: "adhar-system · project adhar", tone: "primary",
        adds: ["The one object you declare.", "The application-multienv composition creates the rest"] },
      { name: "Warehouse hello", detail: "Kargo",
        adds: ["Watches the image repository for new builds"] },
      { name: "adhar-hello-dev", detail: "deploy/envs/dev → ns dev",
        adds: ["ArgoCD Application. Every new build is promoted here automatically"] },
      { name: "adhar-hello-test", detail: "deploy/envs/test → ns test",
        adds: ["ArgoCD Application. Promoted automatically after dev"] },
      { name: "adhar-hello-prod", detail: "deploy/envs/prod → ns prod", tone: "accent",
        adds: ["ArgoCD Application. Never promoted automatically:", "production changes arrive through a Release"] },
    ]}
  />
);

export const rw_start: Record<string, ComponentType> = {
  "nst-bootstrap-handoff": BootstrapHandoff,
  "nst-self-service": SelfService,
  "nst-up-stages": UpStages,
  "nst-change-loop": ChangeLoop,
  "nst-install-paths": InstallPaths,
  "nst-cloud-prep": CloudPrep,
  "nst-clusterconfig-readers": ClusterConfigReaders,
  "nst-config-workflow": ConfigWorkflow,
  "nst-first-service": FirstService,
  "nst-app-environments": AppEnvironments,
};
