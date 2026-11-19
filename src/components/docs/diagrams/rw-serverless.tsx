import type { ComponentType } from "react";
import { Flow, Ladder, Pipeline } from "@/components/docs/diagram-kit";

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

/* Every way a run starts: the trigger, who starts it, and the run's name. */
const BatchRunPaths = () => (
  <Ladder
    label="The eight triggers of a batch run. schedule: the CronJob fires on schedule.cron. manual: a person uses Run now in the Console or adhar batch run; the run is named <job>-<hash8> after its identifying parameters. restart: adhar batch restart creates <run>-r<n> with the same identity. backfill: adhar batch backfill creates one run per business date, each named for its identity, released at most --parallel at a time. dependency: the batch observer starts a run once every job in dependsOn has succeeded for a business date. workflow: an Argo Workflows step, adhar-batch-steps/run, starts the run as adhar batch run would. smoke: Kargo's verification in a test environment runs <job>-smoke-<sha7 of the image digest>. ops: adhar batch recover, abandon and dlq --replay start <job>-ops-<verb>-<executionId>. Every run except a scheduled one is created from the run template and checked against it by Kyverno."
    heading={["trigger", "started by → run name"]}
    width={820}
    boxW={190}
    caption="Every run is the same Job from the same template. The name is the identity, so asking twice never runs twice."
    rungs={[
      { name: "schedule", detail: "the CronJob", adds: ["fires on schedule.cron in schedule.timeZone → named by the CronJob"], tone: "primary" },
      { name: "manual", detail: "a person", adds: ["Run now, or adhar batch run → <job>-<hash8>"] },
      { name: "restart", detail: "a person", adds: ["adhar batch restart <run> → <run>-r<n>, same identity"] },
      { name: "backfill", detail: "a person", adds: ["adhar batch backfill, one per business date → <job>-<hash8>"] },
      { name: "dependency", detail: "the batch observer", adds: ["every dependsOn job succeeded for the date → <job>-<hash8>"] },
      { name: "workflow", detail: "an Argo Workflows step", adds: ["adhar-batch-steps/run → <job>-<hash8>"] },
      { name: "smoke", detail: "Kargo, in test", adds: ["spec.parameters.smoke → <job>-smoke-<sha7 of the digest>"] },
      { name: "ops", detail: "a person", adds: ["recover, abandon, dlq --replay → <job>-ops-<verb>-<executionId>"], tone: "accent" },
    ]}
  />
);

/* A nightly chain: one business date flows through a schedule, a dependency and a deadline. */
const BatchBusinessDate = () => (
  <Flow
    label="A nightly chain keyed on one business date. At 01:30 Singapore time the extract job's CronJob fires, and its businessDate parameter is derived from the slot, 2026-11-03. When extract succeeds, the batch observer sees that every job in load's dependsOn has a succeeded run for that date and starts load once, with trigger dependency and the same businessDate. Load has sla.finishBy 06:00: the observer predicts its end from the p90 of its last 20 runs and emits deadline.endangered before 06:00 if the forecast passes it, and deadline.missed if 06:00 passes with no success."
    caption="The business date is the chain's key: it names every run, and dependsOn waits on it."
    nodes={[
      { title: "01:30 slot", lines: ["businessDate", "2026-11-03"], tone: "primary" },
      { title: "extract", lines: ["trigger schedule", "succeeds"] },
      { title: "batch observer", lines: ["every dependsOn job", "succeeded for the date"] },
      { title: "load", lines: ["trigger dependency", "same businessDate"] },
      { title: "finishBy 06:00", lines: ["endangered: forecast", "missed: no success"], tone: "accent" },
    ]}
    edges={[{ label: "starts" }, { label: "reports" }, { label: "starts" }, { label: "checked by" }]}
    gap={34}
  />
);

/* What the batch observer reads and what it produces. */
const BatchObserver = () => (
  <Ladder
    label="The batch observer runs in the platform's long-running controller manager. It watches every run (Jobs and Volcano Jobs labelled adhar.io/workload=batch), their pods' termination summaries and the BatchJobs. It has four duties: it publishes each run transition as an adhar.batch CloudEvent on the event bus, which keeps 90 days; it starts the runs dependsOn asks for, deciding from Kubernetes objects rather than the bus; it forecasts each run's end against sla.finishBy and exposes two deadline gauges; and it records what it has said in ConfigMap <batchjob>-observer so each transition is published once, across restarts."
    heading={["duty", "what it does"]}
    width={820}
    boxW={190}
    caption="Events are advisory: a bus outage drops them, but never changes what runs. dependsOn never reads the bus."
    rungs={[
      { name: "Events", detail: "adhar.batch topic", adds: ["each run transition as a CloudEvent, kept 90 days;", "read by adhar batch history and dlq"], tone: "primary" },
      { name: "Dependencies", detail: "dependsOn", adds: ["starts a dependency run once its upstream jobs succeeded;", "decided from cluster objects, so it works without the bus"] },
      { name: "Deadlines", detail: "sla.finishBy", adds: ["forecast = start + p90 of the last 20 runs;", "deadline.endangered before, deadline.missed after; two gauges"] },
      { name: "Record", detail: "<batchjob>-observer", adds: ["what has been published, written first:", "each transition is said once, never twice"], tone: "accent" },
    ]}
  />
);

/* The smoke run gate between test and prod. */
const BatchSmokeGate = () => (
  <Pipeline
    label="The smoke gate for a batch application. A push builds and signs an image. Kargo promotes the digest into dev, then into test. When the BatchJob sets spec.parameters.smoke, Kargo's verification in test runs adhar batch run --smoke, which starts <job>-smoke-<first 7 hex of the image digest> with the smoke parameters and waits for it. Only a build whose smoke run succeeded is verified in test and can be promoted to prod by a Release. Verifying the same build again finds its existing run."
    caption="A build whose smoke run fails never reaches prod. The same build verified twice reuses its run."
    stages={[
      { name: "Build", detail: "app-ci", guarantee: "signed image\ndigest", tone: "primary" },
      { name: "dev", detail: "Kargo", guarantee: "on demand:\nschedule suspended" },
      { name: "test", detail: "Kargo", guarantee: "the real cron\n+ verification" },
      { name: "smoke run", detail: "<job>-smoke-<sha7>", guarantee: "smoke.parameters,\nmust exit 0" },
      { name: "prod", detail: "Release", guarantee: "only verified\nFreight", tone: "accent" },
    ]}
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

/* What adhar-kit-batch's runner does in one run pod, in order. */
const KitBatchRunner = () => (
  <Ladder
    label="The adhar-kit-batch runner in a Kubernetes run pod. It first checks that the JobRepository is JDBC, else exits 2. It resolves the run context from the environment and the downward API, and the job named by ADHAR_BATCH_JOB, else exits 2. It resolves parameters from ADHAR_BATCH_PARAMS, then the schedule, then declared defaults, and validates them against @AdharBatchJob, else exits 2. It then looks at the last execution of that identity: none, FAILED or STOPPED starts or restarts the job; COMPLETED exits 0 as skipped; ABANDONED exits 6; an execution still STARTED is recovered when its owner is dead, waited for while its owner terminates, or skipped as a duplicate. While the job runs, its lease is renewed and SIGTERM stops it at a chunk boundary. Afterwards it maps the outcome to an exit code and writes the termination summary."
    heading={["stage", "what the runner does"]}
    width={820}
    boxW={170}
    caption="Kubernetes replaces the pod; the runner decides whether this pod starts, resumes, skips or refuses the work."
    rungs={[
      { name: "Guard", detail: "JobRepository", adds: ["a JDBC JobRepository, never resourceless → else exit 2"], tone: "primary" },
      { name: "Resolve", detail: "job + parameters", adds: ["ADHAR_BATCH_JOB; ADHAR_BATCH_PARAMS > schedule > defaults,", "validated against @AdharBatchJob → else exit 2"] },
      { name: "Decide", detail: "last execution", adds: ["none / FAILED / STOPPED → start or restart · COMPLETED → exit 0 skipped", "ABANDONED → exit 6 · STARTED → recover, wait, or skip duplicate"] },
      { name: "Run", detail: "chunks", adds: ["lease renewed while it runs; SIGTERM stops at the next chunk boundary"] },
      { name: "Report", detail: "exit code", adds: ["exit code from the outcome; one-line JSON termination summary"], tone: "accent" },
    ]}
  />
);

/* How the kit wraps a Spring Batch job. */
const KitBatchLayers = () => (
  <Ladder
    label="The parts of adhar-kit-batch around a Spring Batch job. You write the job, its steps and its readers, processors and writers. The kit adds: @AdharBatchJob and @JobParam to declare parameters; AdharSteps and FaultTolerance to build chunk steps with retry, skip and dead letters; restart-safe readers and writers for JDBC, PostgreSQL upserts, files and S3; remote partitioning over a JDBC channel; a JobRepository in your own PostgreSQL schema with Flyway migrations; the Kubernetes runner and exit codes; and an embedded scheduler with simple and Quartz engines for jobs that run inside a service."
    heading={["layer", "what the kit gives you"]}
    width={820}
    boxW={170}
    caption="Plain Spring Batch underneath: the kit adds the contract with the platform and the parts every job rewrites."
    rungs={[
      { name: "Declare", detail: "annotations", adds: ["@AdharBatchJob, @JobParam: the parameters a run accepts and its identity"], tone: "primary" },
      { name: "Build", detail: "steps", adds: ["AdharSteps, FaultTolerance: chunk steps with retry, skip and dead letters"] },
      { name: "Read / write", detail: "builders", adds: ["keyset paging, PostgreSQL upsert, CSV, JSON Lines, S3 objects"] },
      { name: "Scale", detail: "partitioning", adds: ["RemotePartitioning, SqlKeyRangePartitioner: a manager and workers"] },
      { name: "Persist", detail: "JobRepository", adds: ["your PostgreSQL, schema batch, Flyway-migrated; dead-letter table"] },
      { name: "Run", detail: "runtime", adds: ["Kubernetes runner and exit codes, or the embedded simple / Quartz scheduler"], tone: "accent" },
    ]}
  />
);

/* The path the Deploy a Batch Job guide follows. */
const BatchGuide = () => (
  <Pipeline
    label="What the Deploy a Batch Job guide builds. You create the importer job from the Spring Batch Job template; it gets a repository, a PostgreSQL database and a BatchJob per environment. Every push runs app-ci, which builds, tests (including the contract test between the code and the BatchJob), scans and signs the image. Kargo promotes the digest into dev, where the schedule is suspended and you start runs by hand. The same digest moves to test automatically, where the real schedule runs and the smoke run must pass. Prod takes it only through a Release, with priority critical."
    caption="One signed image digest in every environment. You edit the job's code and deploy/; the platform does the rest."
    stages={[
      { name: "Create", detail: "Spring Batch Job", guarantee: "repository, database,\nBatchJob per env", tone: "primary" },
      { name: "Build", detail: "app-ci on push", guarantee: "contract test,\nsigned image" },
      { name: "dev", detail: "on demand", guarantee: "run, inspect,\nrestart by hand" },
      { name: "test", detail: "automatic", guarantee: "real schedule\n+ smoke run" },
      { name: "prod", detail: "Release", guarantee: "approved Freight,\npriority critical", tone: "accent" },
    ]}
  />
);

export const rw_serverless: Record<string, ComponentType> = {
  "nsv-batch-guide": BatchGuide,
  "nsv-kit-batch-runner": KitBatchRunner,
  "nsv-kit-batch-layers": KitBatchLayers,
  "nsv-function-scaling": FunctionScaling,
  "nsv-function-guide": FunctionGuide,
  "nsv-batch-model": BatchModel,
  "nsv-batch-run-paths": BatchRunPaths,
  "nsv-batch-run-lifecycle": BatchRunLifecycle,
  "nsv-batch-business-date": BatchBusinessDate,
  "nsv-batch-observer": BatchObserver,
  "nsv-batch-smoke-gate": BatchSmokeGate,
};
