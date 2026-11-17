import type { ComponentType } from "react";
import { Flow, Ladder } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "npe-". */

/* The five properties of a platform, each mapped to the Adhar feature that provides it. */
const PlatformProperties = () => (
  <Ladder
    label="The five properties that make something a platform, and the Adhar feature behind each: an interface (the adhar CLI, the Console and namespaced Kubernetes APIs), self-service (Crossplane composes each request with no ticket), opinionated defaults (golden-path templates and profiles), operation (packages reconciled by Argo CD and upgraded with adhar upgrade), and an exit (everything generated is ordinary Kubernetes and Git)."
    heading={["a platform has", "in Adhar"]}
    width={800}
    boxW={240}
    caption="Take one row away and you have shared tooling, not a platform."
    rungs={[
      { name: "an interface", detail: "stable, defined", adds: ["adhar CLI · Adhar Console ·", "namespaced Kubernetes APIs"], tone: "primary" },
      { name: "self-service", detail: "no human in the loop", adds: ["Crossplane composes a Database, Cache", "or Bucket from one request"] },
      { name: "opinionated defaults", detail: "one supported route", adds: ["golden-path templates; local and", "production profiles"] },
      { name: "operation", detail: "versioned, upgradable", adds: ["packages reconciled by Argo CD;", "adhar upgrade"] },
      { name: "an exit", detail: "leaving is allowed", adds: ["generated output is ordinary", "Kubernetes and Git"], tone: "accent" },
    ]}
  />
);

/* DevOps, SRE and platform engineering each answer a different question. */
const ThreeDisciplines = () => (
  <Ladder
    label="Three disciplines that work together. DevOps asks how to stop throwing software over a wall and supplies the principles: shared ownership, automation and fast feedback. SRE asks how reliable a service should be and supplies SLOs, error budgets and toil reduction. Platform engineering asks how to make end-to-end ownership affordable for every team and supplies a self-service product with one supported route to production."
    heading={["discipline", "the question it answers, and what it supplies"]}
    width={800}
    boxW={220}
    caption="An organisation can practise all three at once; a large one usually has to."
    rungs={[
      { name: "DevOps", detail: "principles", adds: ["How do we stop throwing software over a wall?", "shared ownership · automation · fast feedback"] },
      { name: "SRE", detail: "reliability discipline", adds: ["How reliable should this be, and at what cost?", "SLOs · error budgets · toil reduction"] },
      { name: "Platform engineering", detail: "foundation", adds: ["How does every team afford end-to-end ownership?", "a self-service product · one supported route"], tone: "primary" },
    ]}
  />
);

/* An Adhar golden path from template to a running, reconciled service. */
const GoldenPathFlow = () => (
  <Flow
    label="An Adhar golden path: a template from the adhar-templates collection is rendered by adhar application deploy or the Console into the application's own Gitea repository. Every push runs the app-ci pipeline, which builds, scans and signs the image and pushes it to Harbor. Argo CD syncs the manifests from Git and keeps them in sync, and the service runs with an HTTPRoute, a ServiceMonitor and the cluster's Kyverno policies already applied."
    caption="The template is day 0. Everything to its right is the platform, and it keeps working after the scaffold."
    nodes={[
      { title: "Template", lines: ["adhar-templates", "CLI or Console"], tone: "primary" },
      { title: "Gitea repo", lines: ["owned by the team"] },
      { title: "app-ci", lines: ["build · scan · sign", "push to Harbor"] },
      { title: "Argo CD", lines: ["sync from Git", "self-heal on"] },
      { title: "Running service", lines: ["HTTPRoute · ServiceMonitor", "Kyverno policies"], tone: "accent" },
    ]}
    edges={[{ label: "renders" }, { label: "git push" }, { label: "writes back" }, { label: "deploys" }]}
  />
);

/* The paved road as Adhar builds it: which component adds which guarantee. */
const AdharRoad = () => (
  <Ladder
    label="The paved road in Adhar, stage by stage. A push to Gitea triggers the Tekton app-ci pipeline. It builds the image with Cloud Native Buildpacks, runs tests, gitleaks, Trivy and a Syft SBOM, signs the digest with Cosign and pushes it to Harbor, then writes the new version back to Git. Kyverno verifies the signature at admission. Argo CD syncs the change and Argo Rollouts shifts traffic in steps. Kargo promotes the same artifact to the next environment, and production waits for approval. Prometheus and Grafana provide telemetry without per-service setup, and the production profile adds Loki, Tempo and Mimir."
    heading={["stage", "Adhar component and what it does"]}
    width={800}
    boxW={220}
    caption="No stage is a person. Each one either runs or refuses."
    rungs={[
      { name: "commit", detail: "git push to Gitea", adds: ["a webhook starts the Tekton app-ci pipeline"], tone: "primary" },
      { name: "build", detail: "Cloud Native Buildpacks", adds: ["the platform owns the base image, not a", "Dockerfile in every repository"] },
      { name: "scan", detail: "tests · gitleaks · Trivy · Syft", adds: ["source and image scanned; an SBOM is attached"] },
      { name: "sign and store", detail: "Cosign → Harbor", adds: ["the digest is signed by the pipeline,", "then written back to Git"] },
      { name: "admit", detail: "Kyverno", adds: ["unsigned Harbor library/* images are", "rejected in workload namespaces"], tone: "accent" },
      { name: "roll out", detail: "Argo CD · Argo Rollouts", adds: ["synced from Git; traffic shifts in steps"] },
      { name: "promote", detail: "Kargo", adds: ["the same artifact moves on;", "production waits for approval"] },
      { name: "observe", detail: "Prometheus · Grafana", adds: ["telemetry without per-service setup; Loki,", "Tempo and Mimir in the production profile"] },
    ]}
  />
);

/* Audit before enforce, as two Adhar policy packs. */
const AuditThenEnforce = () => (
  <Flow
    label="Audit before enforce with Adhar's supply-chain policy packs: enable the audit pack, read the Kyverno PolicyReports it produces, fix the common violations in the golden path so teams become compliant by upgrading, then enable the enforce pack, which rejects what the audit pack only reported."
    caption="The same three policies ship twice. Only the action differs."
    nodes={[
      { title: "Audit pack", lines: ["violations recorded", "nothing blocked"], tone: "primary" },
      { title: "PolicyReports", lines: ["what the fleet", "really looks like"] },
      { title: "Fix at the source", lines: ["golden path, pipeline", "or the rule itself"] },
      { title: "Enforce pack", lines: ["violations rejected", "at admission"], tone: "accent" },
    ]}
    edges={[{ label: "produces" }, { label: "shows" }, { label: "then enable" }]}
  />
);

/* The product loop a platform team runs. */
const ProductLoop = () => (
  <Flow
    label="The platform product loop: discover what slows teams down through interviews and support themes, decide what to build and what not to build on a published roadmap, ship the capability with docs, a version and release notes, then measure voluntary adoption and churn. What the measurement shows feeds the next round of discovery."
    caption="The loop repeats. Adoption and churn from one round are the research for the next."
    nodes={[
      { title: "Discover", lines: ["interviews", "support themes"], tone: "primary" },
      { title: "Decide", lines: ["published roadmap", "including the no's"] },
      { title: "Ship", lines: ["docs · version", "release notes"] },
      { title: "Measure", lines: ["voluntary adoption", "and churn"], tone: "accent" },
    ]}
    edges={[{}, {}, {}]}
  />
);

/* Four families of measurement and where Adhar supplies the data. */
const MeasurementFamilies = () => (
  <Ladder
    label="Four families of platform measurement and where the data comes from in Adhar. Delivery uses the four DORA metrics, read from pipeline runs, Argo CD syncs and Kargo promotions. Developer experience uses SPACE dimensions and flow measures, which come from surveys and wait times. Adoption is a funnel ending in production services on the paved road, with scorecards grading each service's production-readiness. Qualitative signal comes from surveys, office hours and support themes, which no tool collects for you."
    heading={["family", "what to read, and where it comes from"]}
    width={800}
    boxW={220}
    caption="Read all four together. Any one alone can be improved by making another worse."
    rungs={[
      { name: "Delivery", detail: "DORA", adds: ["frequency · lead time · failure rate · recovery", "from pipeline runs, syncs and promotions"], tone: "primary" },
      { name: "Experience", detail: "SPACE", adds: ["satisfaction, flow, waiting time", "from surveys and build or environment waits"] },
      { name: "Adoption", detail: "funnel", adds: ["awareness → first use → repeat → production", "scorecards grade each service's production-readiness"] },
      { name: "Qualitative", detail: "why it changed", adds: ["surveys · office hours · support themes", "collected by people, not by a tool"], tone: "accent" },
    ]}
  />
);

export const rw_pe: Record<string, ComponentType> = {
  "npe-platform-properties": PlatformProperties,
  "npe-three-disciplines": ThreeDisciplines,
  "npe-golden-path-flow": GoldenPathFlow,
  "npe-adhar-road": AdharRoad,
  "npe-audit-then-enforce": AuditThenEnforce,
  "npe-product-loop": ProductLoop,
  "npe-measurement-families": MeasurementFamilies,
};
