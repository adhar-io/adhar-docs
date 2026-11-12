---
title: "Batch Jobs"
section: "Core Concepts"
order: 6
path: "/docs/core-concepts/batch"
---

# Batch Jobs

A **BatchJob** runs a Spring Batch job on the platform, on a schedule or when somebody starts it. Each attempt at a job instance is one Kubernetes `Job`. When an attempt fails, Spring Batch picks up again from its last commit instead of starting over.

You declare the job in Git. The platform turns it into a schedule, a template every manual run is created from, the permissions the run needs, and its alerts. Operators then run, restart and hold the job from the Console, without a commit.

This page explains how batch jobs work and why they behave as they do:

- the resource, and where a job runs
- scheduled and on-demand runs, and holding a job
- what a run looks like from the inside: retries, deadlines, exit codes and the runner contract
- capacity, delivery, the Console, security and observability

It is for developers deciding whether a batch job fits their workload, and for platform engineers who run the engine behind it. The [BatchJob API reference](/docs/reference/batch-job-api) lists every field, condition and composed object.

## At a glance

| | |
|---|---|
| **The resource** | `BatchJob` in `platform.adhar.io/v1alpha1`: a namespaced Crossplane composite resource, rendered by the composition `batchjob-kubernetes` |
| **What runs it** | Native Kubernetes `Job`s and `CronJob`s on the default scheduler. Volcano ships as an opt-in package but does not run batch jobs yet |
| **Workload** | Spring Batch on the JVM. Spring Batch keeps its JobRepository in a PostgreSQL database you provide |
| **Started by** | A cron schedule (`schedule.cron`), or a person through the Console. A job without a schedule is on demand |
| **One run** | One pod, no parallelism. Up to 2 retries, a 6-hour hard stop and a 2-minute grace period by default |
| **Delivery** | An `Application` of type `batch` whose `deploy/envs/<env>` overlays hold the BatchJob. Argo CD syncs it and Kargo promotes its image dev → test → prod |
| **Where you manage it** | Console → **Develop → Batch**; `kubectl get batchjobs.platform.adhar.io` |
| **Profiles** | The `core/adhar-batch` package is on in every profile. It supplies the priority classes, roles, policies and dashboard that BatchJobs depend on |

## When to use a BatchJob

A BatchJob, a [Function](/docs/core-concepts/functions) and a service all run your container from Git through the same build and promotion chain. They differ in what the platform assumes about the work.

| Choose a **BatchJob** when | Choose something else when |
|---|---|
| The work is a Spring Batch job: read, process and write in chunks, and record progress | The work is an HTTP handler or an event consumer: use a [Function](/docs/core-concepts/functions) |
| A run takes minutes to hours | Each piece of work finishes within ten minutes: a Function's cron trigger is lighter |
| A failed run must restart from where it stopped, not from the beginning | The work is safe to repeat from scratch |
| It runs a few times a day or less | It runs every few minutes. Every run pays a JVM start, about 154 seconds on a busy node |
| Operators need to run, restart and hold it without a commit | Nobody needs to intervene between deployments |

A schedule that fires more often than every ten minutes is accepted, but the job's status says it would be better as a Function or embedded in a service.

## The model

You declare a `BatchJob`. The composition `batchjob-kubernetes` renders it into these objects, in the BatchJob's own namespace:

| Object | Purpose | When |
|---|---|---|
| ServiceAccount `<name>-batch` | The identity a run pod uses | Unless `serviceAccountName` names an existing one |
| Role and RoleBinding `<name>-batch` | Lets the run read its own Job and pods, and nothing else | Always |
| ConfigMap `<name>-run` | The **run template**: the exact `Job` every manual run is created from, plus the job's declared parameters | Always |
| CronJob `<name>` | Starts runs on the schedule, from the same Job as the run template | With `schedule` |
| PrometheusRule `<name>-batch` | The job's alerts | Unless `alerts.enabled: false` |

The composition writes the outcome back to the BatchJob. `status.message` is a one-line summary, such as `scheduled "30 1 * * *" in Asia/Singapore` or `on demand`. `status.lastScheduleTime`, `status.lastSuccessfulTime` and `status.activeRuns` come from the CronJob. The conditions `PrerequisitesReady`, `TemplateReady`, `ScheduleReady`, `Held` and `Placement` explain anything that is not right. They are listed in the [reference](/docs/reference/batch-job-api#conditions).

**The BatchJob's health is never a run's health.** Argo CD reports the BatchJob Healthy once it is Ready, even while a run is failing, and a held job stays Healthy. Failed runs show up in the [alerts](#observability), in the Console and in Kargo's verification instead.

## Where a batch job runs

**A batch job must live in an environment namespace of its project.** A Project creates one namespace per environment, labelled with its organisation, team, project and environment. A BatchJob takes those four values from the labels. If `spec.parameters` sets one that disagrees, the label wins and the `Placement` condition says so.

Unlike a Function, a BatchJob anywhere else is refused, so its runs always count against the project's quota. The composition refuses:

- a namespace without the `adhar.io/environment` label
- `adhar-system`
- a name longer than 40 characters, because the CronJob and every run add a suffix to it

The default project `adhar` has the environment namespaces `dev`, `test` and `prod`. One `deploy/base` BatchJob serves all three: each overlay places it in a different namespace.

## Scheduled and on-demand jobs

**A job with `schedule` runs by itself.** The schedule is a five-field cron expression, read in `schedule.timeZone` (default `UTC`):

```yaml
schedule:
  cron: "30 1 * * *"
  timeZone: Asia/Singapore
```

- **A missed fire is skipped** if it is more than `startingDeadlineSeconds` late (default one hour), for example while the cluster was down. The `BatchScheduleMissed` alert reports it.
- **Runs do not overlap.** `concurrencyPolicy` defaults to `Forbid`, so a fire is skipped while the previous run is still going. `Allow` lets them overlap. `Replace` is refused, because it would stop a healthy run every time the next fire arrives.
- **`schedule.suspend` pauses the schedule from Git.** Use it for an environment that should not run on its own, such as dev. To pause a job without a commit, [hold](#holding-a-job) it instead.

**A job without `schedule` runs only when somebody starts it.** It gets no CronJob, and its `ScheduleReady` condition reads `OnDemand`.

### Starting a run by hand

Every manual run is created from the run template, the ConfigMap `<name>-run`. Its `template.yaml` holds the complete `Job`, and its `parameters.json` holds the declared parameters with every default filled in.

**In the Console**, open **Develop → Batch**, pick the job and choose **Run now**. The run form is built from the declared parameters. It checks types, patterns and allowed values before anything starts, and it refuses parameter names that look like secrets.

The Console names a run after its identifying parameters: the job's name, then the first eight hex characters of a SHA-256 of those parameters. Starting the same job with the same identifying parameters again therefore finds the existing run instead of creating a second one. **Restart** creates a fresh attempt of a finished run as `<run>-r<n>`, up to `r99`.

**Without the Console**, create the Job from the template yourself. A Kyverno policy, `adhar-batch-run-integrity`, refuses any run that differs from the template, except in:

- its name
- its `adhar.io/batch-trigger` label
- the environment variables `ADHAR_BATCH_PARAMS`, `ADHAR_BATCH_TRIGGER`, `ADHAR_BATCH_RESTART_OF`, `ADHAR_BATCH_COMMAND` and `ADHAR_BATCH_EXECUTION_ID`

So you cannot change the image, the resources or the command of one run. Change the BatchJob in Git instead.

```bash
kubectl -n dev get configmap reconciler-run -o jsonpath='{.data.template\.yaml}' \
  | yq '.metadata.name = "reconciler-manual-1"
        | (.spec.template.spec.containers[0].env[] | select(.name == "ADHAR_BATCH_PARAMS")).value
            = "{\"businessDate\":\"2026-11-03\"}"' \
  | kubectl -n dev create -f -
```

Nothing checks the parameters on this path before the run starts, so the job itself has to reject bad input. In prod, a Job created by a person must name a BatchJob through the `adhar.io/batch-job` label, which the template already carries.

### Parameters and a run's identity

`spec.parameters.parameters` declares the job's parameters: their type (`string`, `long`, `double`, `boolean`, `date` or `datetime`), whether they are required, a default, a pattern and a list of allowed values.

- **`identifying`** (default `true`) makes a parameter part of the Spring Batch JobInstance, and of the run's name in the Console. Mark parameters such as `dryRun` as `identifying: false`, so they do not create a separate instance.
- **`source: schedule`** derives the value from the scheduled time in the job's time zone, which is how a nightly job gets its business date. The default, `input`, takes the value from whoever starts the run.
- **`sensitive: true`** masks the value in logs, events and the run's termination summary. Credentials never travel as parameters: read them from a Secret through `envFrom`.

## Holding a job

A **hold** stops a job from starting new runs without a commit, for a freeze, an incident or a migration. It is the annotation `adhar.io/batch-hold`, whose value is the reason:

```bash
kubectl -n prod annotate batchjobs.platform.adhar.io importer adhar.io/batch-hold="quarter-end freeze"
kubectl -n prod annotate batchjobs.platform.adhar.io importer adhar.io/batch-hold-     # release it
```

In the Console, **Hold** and **Release** do the same, and a reason is required.

- A hold suspends the CronJob. A run already in progress carries on.
- The job reports `Held=True` with reason `OnHold`, and `status.held` records the reason and when the hold began.
- A Kyverno policy, `adhar-batch-hold-only`, lets people change only this annotation on a BatchJob. Everything else about the job comes from Git, through Argo CD.
- An empty value is still a hold. Its reason reads `no reason given`.

## Inside a run

### Retries, deadlines and stopping

| Setting | Default | What it does |
|---|---|---|
| `retry.backoffLimit` | `2` | How many times Kubernetes replaces a failed pod. Each new pod restarts the job from its last commit |
| `timeouts.activeDeadlineSeconds` | `21600` (6 h) | The hard stop for one run, whatever it is doing |
| `timeouts.terminationGracePeriodSeconds` | `120` | How long a stopping run has to finish its chunk and record `STOPPED`. Must be shorter than the deadline |
| `history.ttlSecondsAfterFinished` | `604800` (7 days) | How long a finished run's `Job` object, and so its record in the Console, is kept |

Not every failure is retried. The exit code says whether trying again could help:

| Exit code | Meaning | Retried |
|---|---|---|
| `0` | Completed, or there was nothing to do | — |
| `1` | The JVM failed before the run started | Yes |
| `2` | Invalid request, such as a bad parameter | No |
| `3` | Failed, and retrying will not help | No |
| `4` | Stopped on request | No |
| `5` | Failed, and a retry may succeed | Yes |
| `6` | Abandoned | No |
| `7` | The JobRepository's state is unknown | No |
| `137`, `143` | Killed, or stopped by SIGTERM | Yes |

**A run moved off a draining node is not counted as a failure.** A pod evicted by a disruption is replaced without using up a retry.

### The runner contract

The platform does not ship a batch framework. Your application reads its instructions from the environment and reports its outcome through its exit code. A run pod receives:

| Variable | Contents |
|---|---|
| `ADHAR_BATCH_JOB` | The Spring Batch job's bean name, from `spec.parameters.job` |
| `ADHAR_BATCH_NAME` | The BatchJob's name |
| `ADHAR_BATCH_PARAMS` | The run's parameters as a JSON object. `{}` for a scheduled run |
| `ADHAR_BATCH_TRIGGER` | `schedule` or `manual` |
| `ADHAR_BATCH_TIME_ZONE` | The schedule's time zone |
| `ADHAR_BATCH_REPOSITORY_SCHEMA` | The database schema of the JobRepository tables, default `batch` |
| `ADHAR_BATCH_SHUTDOWN_TIMEOUT` | How long to wind down after SIGTERM: the grace period minus 30 seconds, at least 10 seconds |
| `ADHAR_BATCH_K8S_JOB`, `ADHAR_BATCH_ACTOR` | The Kubernetes Job's name, and the user who started the run |
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | The JobRepository database, from the keys `jdbc-uri`, `username` and `password` of `database.secretRef` |
| `OTEL_*` | OpenTelemetry export to the platform's Alloy collector |

These names belong to the runner. Setting any of them, or anything starting with `ADHAR_BATCH_`, in `env` is refused.

### Sizing

A run pod requests 1 CPU and 1536Mi of memory by default, with no CPU limit. **The memory request always equals the limit**, because the run the kernel kills under memory pressure is the overcommitted one. Below 1Gi, a Spring Batch JVM does not start reliably.

The JVM's fixed regions are trimmed by default, to 50 threads and a 64M code cache, leaving more of the limit for the heap. Change them under `jvm`, and add options with `jvm.options`.

## Capacity and priority

Batch work never pushes anything else aside.

- **Priority.** Runs use the PriorityClass `adhar-batch`, below ordinary workloads. `priority: critical` uses `adhar-batch-critical`, in prod only. Neither class preempts anything.
- **Draining nodes.** With `disruption: avoid` (the default), the platform's node autoscaler will not drain a node a run is on. `disruption: allow` lets it drain the node, which stops the run gracefully and restarts it from its last commit.
- **Buying nodes.** A pending run does not make the node autoscaler add a node unless the job sets `scaleUp: true`, which only prod accepts. A dev or test backlog waits for capacity instead. Batch runs that may not buy nodes are also left out of the autoscaler's utilisation check for scaling up.

## Delivery

A batch job is delivered like any other application:

1. An `Application` with `type: batch` points at your repository.
2. The repository's `deploy/envs/<env>` overlays hold the BatchJob, one per environment.
3. Kargo promotes the image dev → test → prod, and Argo CD syncs each overlay.

Kargo pins the promoted image into `spec/parameters/image`. Kustomize only knows where to write it if the overlay's kustomize configuration names that path. Until a template provides it, add it yourself:

```yaml
# kustomizeconfig.yaml, listed under `configurations:` in the overlay's kustomization.yaml
images:
  - path: spec/parameters/image
    group: platform.adhar.io
    kind: BatchJob
```

Before Kargo promotes a batch application onward, it verifies three things across the settle window. The BatchJob's Argo CD Application must be Healthy. No run started in the window may have failed. No run pod may have been killed for running out of memory. Batch applications skip the test-tier resilience gate (load and chaos testing) that services go through.

Each batch application gets the `batch-jvm` Grafana dashboard: runs, JVM metrics, resources, logs and traces.

## In the Console

**Develop → Batch** lists every batch job the signed-in user can see, grouped by application. The page is available to the roles platform-admin, platform-engineer and developer. If the cluster does not serve BatchJobs, it says that Batch is not available.

- **Jobs** shows each job's schedule, next run, last run, last success and SLA, with totals for running, failed, held and SLA-breached jobs. A batch application whose BatchJob is not deployed yet appears as *not deployed yet*.
- **Runs** shows each run's status, trigger, actor, business date, attempts, duration and exit code.
- A job's drawer has its overview, parameters, run history against `sla.maxDuration`, alerts, delivery and configuration. A run's drawer has its termination summary, pods and logs, events and CPU and memory use.

Every action runs as the signed-in user, and the Console hides an action that the user's permissions would refuse:

| Action | What it does | Permission needed |
|---|---|---|
| **Run now** | Creates a run from `<name>-run` | create `jobs`, get `configmaps` |
| **Restart** | Creates `<run>-r<n>` | create `jobs`, get `configmaps` |
| **Stop** / **Resume** | Suspends or resumes the run's Job | patch `jobs` |
| **Hold** / **Release** | Sets or removes `adhar.io/batch-hold` | patch `batchjobs` |
| **Logs** | Reads the run pod's logs | get `pods/log` |

## Security

**Roles.** The `core/adhar-batch` package adds three ClusterRoles:

| ClusterRole | Grants | Bound to |
|---|---|---|
| `adhar-batch-view` | Read BatchJobs and Volcano jobs | Aggregated into `view`, `edit` and `admin` |
| `adhar-batch-edit` | Patch BatchJobs (so, hold them) and create Volcano jobs | Aggregated into `edit` and `admin` |
| `adhar-batch-operator` | Read and patch BatchJobs, create, patch and delete Jobs, read logs and run templates | The team, in each prod environment |

In a prod environment, the Environment binds `adhar-batch-operator` to the team's group, so the team can run and hold its jobs there. Set `batchOperations: none` on the Project or the Environment to withhold it.

**Policies.** Kyverno enforces the batch rules:

| Policy | Mode | Rule |
|---|---|---|
| `adhar-batch-run-integrity` | Enforce | A run created by a person must match the job's run template |
| `adhar-batch-prod-jobs-name-a-batchjob` | Enforce | In prod, a Job created by a person must name a BatchJob |
| `adhar-batch-actor` | Mutate | Stamps the creating user on the run, as `adhar.io/batch-actor` |
| `adhar-batch-critical-prod-only` | Enforce | `adhar-batch-critical` and `scaleUp` only in prod |
| `adhar-batch-hold-only` | Enforce | People may change only the hold annotation on a BatchJob |
| `adhar-batch-pod-standards` | Audit | Memory request equals limit, `restartPolicy: Never`, a batch priority class, no PVC, a deadline and a TTL |

**If Kyverno is down, manual runs stop but scheduled runs do not.** The run-integrity policy fails closed for runs created by people. It does not apply to runs the CronJob controller creates.

**Run pods** run as non-root, with privilege escalation off, every capability dropped and the default seccomp profile. `/tmp` is a size-limited `emptyDir`, and no persistent volume is mounted.

## Observability

**Alerts.** Each job gets its own PrometheusRule. Severity follows `alerts.severity`: by default, critical in prod and warning elsewhere.

| Alert | Fires when |
|---|---|
| `BatchRunFailed` | The latest run failed. It resolves when a newer run exists |
| `BatchRunTooLong` | A run has been going longer than `sla.maxDuration` (by default, the deadline) |
| `BatchRunStuckPending` | A run pod has been Pending for 15 minutes |
| `BatchRunOOMKilled` | A run pod was killed for running out of memory in the last 24 hours |
| `BatchScheduleMissed` | A scheduled fire is more than 10 minutes late, the schedule is not suspended, and nothing is running |
| `BatchNoRecentSuccess` | The last success is older than `alerts.staleAfter` (default `26h`). Set it above the job's cadence |

The last two exist only for scheduled jobs.

**Dashboards.** The Grafana **Batch** dashboard, in the **Delivery** folder, shows active, failed and pending runs and suspended schedules across the platform. It is built from kube-state-metrics, so it works in every profile. Each batch application also has its own `batch-jvm` dashboard.

**Telemetry.** Runs export metrics and traces over OTLP to Alloy, and their logs go to Loki like every other pod's.

## The engines

| Package | Profiles | Role |
|---|---|---|
| `core/adhar-batch` | On everywhere | The priority classes, roles, policies and dashboard BatchJobs need. Without it, a BatchJob reports `PrerequisitesReady=False` and its schedule is suspended |
| `core/volcano` (v1.16.0) | Off everywhere, alpha | A batch scheduler with queues and gang scheduling. **Enabling it changes nothing for BatchJobs yet**: they do not use it until a later phase |
| `application/argo-workflows` (v4.1.6) | On in production, off in local and gitops | A workflow engine. Today it runs the platform's own maintenance tasks, and its UI is for platform staff only. Workflows for teams are still to come |

> **The `Pipeline` API no longer runs on Argo Workflows.** The `pipeline-argo-workflows` composition was removed in v0.1.68, so Pipelines run on Tekton only. A `Pipeline` that selected the Argo Workflows composition must move to `pipeline-tekton`.

## Limits

| Not provided | What to do instead |
|---|---|
| A template that creates a batch job | Write the BatchJob into your repository's `deploy/envs/<env>` overlays, with the [kustomize configuration above](#delivery) |
| `adhar batch` commands | The Console, or `kubectl` as shown above |
| More than one pod per run, or a Volcano queue | One pod per run, on the default scheduler |
| Changing a run's image or resources without a commit | Change the BatchJob in Git |
| A run history beyond the Job's TTL | Spring Batch's JobRepository keeps the full history. Raise `history.ttlSecondsAfterFinished` to keep runs visible longer |
| A NetworkPolicy, bucket or storage per job | Reach buckets and other services through `envFrom` Secrets |
| Calendars, `dependsOn`, `finishBy` | Not yet. The schema refuses these fields rather than ignoring them |

## Next steps

- **[BatchJob API reference](/docs/reference/batch-job-api)** — every field, condition, composed object, alert and policy
- **[Functions](/docs/core-concepts/functions)** — for short, event-driven work
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages and Releases in depth
- **[Observability](/docs/operations/observability)** — logs, metrics and traces
