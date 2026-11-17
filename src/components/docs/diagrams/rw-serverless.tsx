import type { ComponentType } from "react";
import { Flow, Ladder, Pipeline, Split } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "nsv-". */

/* How a Function's pod count moves between zero and maxScale. */
const FunctionScaling = () => (
  <Flow
    label="Scale-to-zero lifecycle of a Function. An idle function with minScale 0 runs no pods. When a request arrives, Knative's activator holds it and asks the autoscaler for a pod. Once the pod is ready the request is forwarded. Under load the autoscaler adds pods to keep each near targetConcurrency in-flight requests, up to maxScale. After the 60-second stable window plus a 30-second grace period without traffic, the last pod is removed."
    caption="A request that arrives at zero is held, not dropped. The wait for the first pod is the cold start."
    nodes={[
      { title: "Idle", lines: ["0 pods", "minScale: 0"], tone: "primary" },
      { title: "activator", lines: ["holds the request", "asks for a pod"] },
      { title: "First pod", lines: ["ready: request", "forwarded"] },
      { title: "Under load", lines: ["100 in flight per pod", "up to maxScale"], tone: "accent" },
      { title: "Quiet", lines: ["60 s window", "+ 30 s grace"] },
    ]}
    edges={[{ label: "request" }, { label: "cold start" }, { label: "more traffic" }, { label: "traffic stops" }]}
  />
);

/* The path the Deploy a Function guide follows. */
const FunctionGuide = () => (
  <Pipeline
    label="What the Deploy a Function guide builds: you create the function thumbnails from the Go template in the Console; every push runs app-ci, which builds, tests, scans and signs the image; Kargo promotes the signed digest into dev, where you call the function, load it and add triggers; the same digest moves to test automatically after verification; prod takes it only through a Release."
    caption="One signed image digest runs in every environment. You edit only the handler and deploy/."
    stages={[
      { name: "Create", detail: "Console template", guarantee: "repository +\nApplication (function)", tone: "primary" },
      { name: "Build", detail: "app-ci on push", guarantee: "tested, scanned,\nsigned image" },
      { name: "dev", detail: "Kargo + Argo CD", guarantee: "call it, scale it,\nadd triggers" },
      { name: "test", detail: "automatic", guarantee: "same digest,\nverified again" },
      { name: "prod", detail: "Release", guarantee: "manual approval,\nminScale 1", tone: "accent" },
    ]}
  />
);

/* A BatchJob is composed into a schedule and a run template; each attempt is one Job. */
const BatchModel = () => (
  <Flow
    label="A BatchJob in platform.adhar.io/v1alpha1, declared in Git in an environment namespace, is rendered by the batchjob-kubernetes composition into a CronJob (when it has a schedule) and a run template, the ConfigMap <name>-run. The schedule or a person creates a Kubernetes Job from that same template, one Job per attempt at a job instance. The Job's pod runs your Spring Batch application, which records its progress in the JobRepository in your PostgreSQL database, so a restart resumes from the last commit."
    caption="You write the BatchJob. Every run, scheduled or manual, is created from the same template."
    nodes={[
      { title: "BatchJob", lines: ["platform.adhar.io/v1alpha1", "in an environment namespace"], tone: "primary" },
      { title: "batchjob-kubernetes", lines: ["Crossplane composition"] },
      { title: "CronJob + run template", lines: ["<name>", "ConfigMap <name>-run"] },
      { title: "Job", lines: ["one per attempt"] },
      { title: "Pod", lines: ["your Spring Batch", "application"], tone: "accent" },
      { title: "JobRepository", lines: ["your PostgreSQL", "schema batch"] },
    ]}
    edges={[{ label: "renders" }, { label: "composes" }, { label: "starts" }, { label: "runs" }, { label: "commits" }]}
    gap={36}
  />
);

/* The two ways a run starts, and what guards each. */
const BatchRunPaths = () => (
  <Split
    label="Two ways a batch run starts. Scheduled: the CronJob fires on schedule.cron in schedule.timeZone, skips a fire that is later than startingDeadlineSeconds or that would overlap a running one, names the run itself and marks it with trigger schedule. Manual: a person uses Run now in the Console or adhar batch run; the Job is created from the run template ConfigMap, named <job>-<hash8> after its identifying parameters so the same identity never runs twice, checked against the template by the Kyverno policy adhar-batch-run-integrity, and marked with trigger manual."
    caption="Both paths create the same Job from the same template: same image, resources and command."
    left={{
      heading: "Scheduled run",
      tone: "primary",
      items: [
        "CronJob fires on schedule.cron, in timeZone",
        "Skipped if later than startingDeadlineSeconds",
        "Skipped while a run is active (Forbid)",
        "Suspended by a hold or schedule.suspend",
        "ADHAR_BATCH_TRIGGER=schedule",
      ],
    }}
    right={{
      heading: "Manual run",
      tone: "accent",
      items: [
        "Run now in the Console, or adhar batch run",
        "Job created from ConfigMap <name>-run",
        "Named <job>-<hash8>: same identity runs once",
        "Kyverno refuses a run that differs from it",
        "ADHAR_BATCH_TRIGGER=manual",
      ],
    }}
  />
);

/* What happens inside one run, and how its exit code decides the outcome. */
const BatchRunLifecycle = () => (
  <Ladder
    label="Lifecycle of one batch run. The Job creates one pod. The runner in your image reads ADHAR_BATCH_JOB and ADHAR_BATCH_PARAMS and starts the Spring Batch job. Spring Batch processes chunks and commits progress to the JobRepository. The process exits with a code. Exit 0 completes the Job. Exit 1 or 5, or a kill, replaces the pod up to retry.backoffLimit times and the new pod resumes from the last commit. Exit 2, 3, 4, 6 or 7 fails the Job at once. A run that passes timeouts.activeDeadlineSeconds is stopped. The finished Job is removed after history.ttlSecondsAfterFinished."
    heading={["stage", "what happens"]}
    width={800}
    boxW={240}
    caption="Kubernetes only replaces the pod. Spring Batch decides where the work resumes."
    rungs={[
      { name: "Job created", detail: "by the CronJob or a person", adds: ["One pod, restartPolicy Never, priority class adhar-batch"], tone: "primary" },
      { name: "Runner starts", detail: "ADHAR_BATCH_JOB, _PARAMS", adds: ["Reads the job name and parameters from the environment,", "connects to the JobRepository"] },
      { name: "Chunks commit", detail: "read, process, write", adds: ["Progress is recorded after every chunk;", "SIGTERM lets the current chunk finish, then records STOPPED"] },
      { name: "Process exits", detail: "exit code", adds: ["0 succeeds · 1, 5 or a kill is retried · 2, 3, 4, 6, 7 fail at once", "A pod lost to a node drain is replaced without using a retry"] },
      { name: "Retry or finish", detail: "retry.backoffLimit (2)", adds: ["A replacement pod resumes from the last commit;", "activeDeadlineSeconds is the hard stop for the whole run"], tone: "accent" },
    ]}
  />
);

export const rw_serverless: Record<string, ComponentType> = {
  "nsv-function-scaling": FunctionScaling,
  "nsv-function-guide": FunctionGuide,
  "nsv-batch-model": BatchModel,
  "nsv-batch-run-paths": BatchRunPaths,
  "nsv-batch-run-lifecycle": BatchRunLifecycle,
};
