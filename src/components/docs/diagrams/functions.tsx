import type { ComponentType } from "react";
import { Flow, Ladder } from "@/components/docs/diagram-kit";

/** Diagrams for the Functions pages. Every key is prefixed "fn-". */

/* A Function is composed into a cluster-local Knative Service, its edge and its event sources. */
const FunctionModel = () => (
  <Flow
    label="A Function in platform.adhar.io/v1alpha1 is rendered by the function-local-knative composition into a cluster-local Knative Service, the public edge that publishes it on the platform Gateway, and one event source per trigger. Each change creates a new Knative Revision, whose pods the autoscaler runs between minScale and maxScale."
    caption="You write the Function. Crossplane writes everything to its right; Knative runs it."
    nodes={[
      { title: "Function", lines: ["platform.adhar.io/v1alpha1", "in an environment namespace"], tone: "primary" },
      { title: "function-local-knative", lines: ["Crossplane composition"] },
      { title: "Knative Service", lines: ["cluster-local", "+ edge + event sources"] },
      { title: "Revision", lines: ["immutable, one per change"] },
      { title: "Pods", lines: ["minScale … maxScale", "0 when idle"], tone: "accent" },
    ]}
    edges={[{ label: "renders" }, { label: "composes" }, { label: "creates" }, { label: "autoscales" }]}
  />
);

/* The path a public request takes from the Gateway to the handler. */
const FunctionRequestPath = () => (
  <Flow
    label="A public request reaches the platform Gateway, which terminates TLS. The function's HTTPRoute sends it to Kourier, Knative's ingress, which runs only inside the cluster. Kourier resolves the DomainMapping to the Knative Service. When the function is scaled to zero, the activator holds the request until a pod is ready; then the pod's queue-proxy hands it to your code on $PORT."
    caption="TLS ends at the Gateway. Knative itself publishes nothing outside the cluster."
    nodes={[
      { title: "adhar-gateway", lines: ["TLS · <name>.<env>.<domain>"], tone: "primary" },
      { title: "HTTPRoute", lines: ["<name>, timeout + 15 s"] },
      { title: "Kourier", lines: ["knative-serving", "ClusterIP"] },
      { title: "DomainMapping", lines: ["<host> → Service"] },
      { title: "activator", lines: ["holds requests", "while scaled to zero"] },
      { title: "your code", lines: ["queue-proxy → $PORT"], tone: "accent" },
    ]}
    edges={[{}, {}, {}, {}, {}]}
    gap={30}
  />
);

/* Each trigger type maps to the object that delivers events to the function. */
const FunctionTriggers = () => (
  <Ladder
    label="Trigger mapping: HTTP is always served. A cron trigger becomes a Knative PingSource; a cloudevent trigger becomes a Knative Trigger on a Broker in the namespace; a topic trigger becomes a Dapr Subscription delivered through the function's own Dapr sidecar, which keeps at least one pod running; a bucket trigger is accepted but not implemented."
    heading={["trigger", "composed into"]}
    width={800}
    boxW={268}
    caption="Every event arrives at your handler as an HTTP POST, to the trigger's path (default /)."
    rungs={[
      { name: "http (always on)", detail: "public or cluster visibility", adds: ["Knative Service; HTTPRoute + DomainMapping when public"], tone: "primary" },
      { name: "cron", detail: "schedule · timezone · data", adds: ["Knative PingSource, sink = the Service"] },
      { name: "cloudevent", detail: "filter: {type, source, …}", adds: ["Knative Trigger on the namespace Broker", "(Broker default, created when absent)"] },
      { name: "topic", detail: "pubsub · topic · deadLetterTopic", adds: ["Dapr Subscription through the function's sidecar;", "minScale is raised to 1"] },
      { name: "bucket", detail: "accepted, not implemented", adds: ["nothing composed: TriggersReady False/Unsupported"], tone: "accent" },
    ]}
  />
);

/* From template to prod: the delivery chain every application uses. */
const FunctionDelivery = () => (
  <Ladder
    label="Function delivery: the Console scaffolds a repository and an Application of type function. Every push runs app-ci, which builds, tests, scans and signs the image. Kargo pins the signed digest into deploy/envs/dev and renders it to the branch stage/dev, which Argo CD syncs. The Function is verified in dev by what Knative reports, promoted to test automatically, verified again, and reaches prod only through a Release."
    heading={["step", "result"]}
    width={800}
    boxW={240}
    rungs={[
      { name: "Create from a template", detail: "Console → Create New", adds: ["Gitea repo + Application (type: function)", "+ catalog Component and API"], tone: "primary" },
      { name: "git push", detail: "app-ci", adds: ["build (buildpacks) · test · scan · sign", "library/<name>:<sha> in Harbor → Kargo Freight"] },
      { name: "Kargo → dev", detail: "deploy/envs/dev → stage/dev", adds: ["digest pinned, overlay rendered;", "Argo CD syncs the Function into dev"] },
      { name: "verify", detail: "AnalysisTemplate dev-health", adds: ["function healthy · pods ready ·", "no restarts · activator 5xx rate"] },
      { name: "test", detail: "promoted automatically", adds: ["the same digest, verified again"] },
      { name: "prod", detail: "a Release", adds: ["manual approval; only Freight verified in test"], tone: "accent" },
    ]}
  />
);

export const functions: Record<string, ComponentType> = {
  "fn-model": FunctionModel,
  "fn-request-path": FunctionRequestPath,
  "fn-triggers": FunctionTriggers,
  "fn-delivery": FunctionDelivery,
};
