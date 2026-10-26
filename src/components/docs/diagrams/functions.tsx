import type { ComponentType } from "react";
import { Flow, Ladder } from "@/components/docs/diagram-kit";

/** Diagrams for the Functions pages. Every key is prefixed "fn-". */

/* A Function claim is composed into a Knative Service whose revisions scale 0..maxScale. */
const FunctionModel = () => (
  <Flow
    label="A Function in platform.adhar.io/v1alpha1 selects the composition labelled feature: function. Crossplane composes a Knative Service, plus an event source for non-HTTP triggers. Each change creates a new Knative Revision, whose pods the Knative autoscaler runs between minScale and maxScale."
    caption="You write the Function. Crossplane writes everything to its right."
    nodes={[
      { title: "Function", lines: ["platform.adhar.io/v1alpha1", "runtime · trigger · scale"], tone: "primary" },
      { title: "Composition", lines: ["feature: function"] },
      { title: "Knative Service", lines: ["serving.knative.dev/v1", "+ event source if not http"] },
      { title: "Revision", lines: ["immutable, one per change"] },
      { title: "Pods", lines: ["minScale … maxScale", "0 when idle"], tone: "accent" },
    ]}
    edges={[{ label: "selects" }, { label: "composes" }, { label: "creates" }, { label: "autoscales" }]}
  />
);

/* Each trigger value maps to the Knative object that delivers events to the function. */
const FunctionTriggers = () => (
  <Ladder
    label="Trigger mapping: http exposes the Knative Service on a route; cloudevent subscribes a Knative Trigger to the platform Broker filtered by event type; topic attaches a KafkaSource; bucket turns object-created notifications into CloudEvents; cron adds a PingSource on the schedule. Every non-HTTP trigger delivers a CloudEvent as an HTTP POST to the same handler."
    heading={["trigger", "composed into"]}
    width={780}
    boxW={256}
    caption="One handler contract for every trigger: events arrive as CloudEvents over HTTP POST."
    rungs={[
      { name: "http", detail: "eventSource: \"\"", adds: ["Knative Service with an external route", "https://<name>.<namespace>.<domain>"], tone: "primary" },
      { name: "cloudevent", detail: "io.adhar.<domain>.<object>.<verb>", adds: ["Knative Trigger on the platform Broker,", "filtered on the CloudEvent type"] },
      { name: "topic", detail: "kafka://<topic> · topic://<Topic>", adds: ["KafkaSource on the topic, sink = the Service"] },
      { name: "bucket", detail: "bucket://<bucket>/<prefix>*", adds: ["object-created notifications from the bucket,", "delivered as CloudEvents"] },
      { name: "cron", detail: "\"*/15 * * * *\"", adds: ["PingSource on the schedule (UTC)"], tone: "accent" },
    ]}
  />
);

/* From scaffold to running revision: the same paved road every service uses. */
const FunctionDelivery = () => (
  <Ladder
    label="Function delivery: the template scaffolds a Gitea repository and an Argo CD Application; every push runs the app-ci Tekton pipeline, which builds the image with buildpacks, scans, signs and pushes it to Harbor, then writes the commit SHA tag back into deploy/function.yaml; Argo CD syncs the Function, Crossplane composes the Knative Service, and Knative rolls out a new Revision."
    heading={["step", "result"]}
    width={800}
    boxW={230}
    rungs={[
      { name: "scaffold", detail: "template function-<lang>-service", adds: ["Gitea repo adhar/<name> + Argo CD Application", "on deploy/ + catalog entry"], tone: "primary" },
      { name: "git push", detail: "Gitea webhook", adds: ["Tekton app-ci PipelineRun starts"] },
      { name: "app-ci builds", detail: "buildpacks → Harbor", adds: ["test · gitleaks · Trivy · SBOM · cosign sign", "library/<name>:<sha> and :latest"] },
      { name: "writeback", detail: "deploy/function.yaml", adds: ["image tag rewritten to the commit SHA"] },
      { name: "Argo CD syncs", detail: "the Function", adds: ["Crossplane composes the Knative Service"] },
      { name: "Knative rolls out", detail: "new Revision", adds: ["traffic shifts once the Revision is Ready;", "old Revisions scale to zero"], tone: "accent" },
    ]}
  />
);

export const functions: Record<string, ComponentType> = {
  "fn-model": FunctionModel,
  "fn-triggers": FunctionTriggers,
  "fn-delivery": FunctionDelivery,
};
