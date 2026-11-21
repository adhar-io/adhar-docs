---
title: "Batch Jobs"
section: "Core Concepts"
order: 6
path: "/docs/core-concepts/batch"
---

# Batch Jobs

A **BatchJob** runs a Spring Batch job on the platform: on a schedule, after other jobs, from a workflow, or when somebody starts it. Each attempt at a job instance is one Kubernetes `Job`, and a failed attempt resumes from its last commit instead of starting over.

You declare the job in Git. The platform turns it into a schedule, a template that every run is created from, the permissions a run needs, and its alerts. Operators run, stop, restart, backfill and hold it from the Console or `adhar batch`, without a commit.

This page explains the model. To build one step by step, follow [Deploy a Batch Job](/docs/guides/deploy-a-batch-job). For every field, condition, event and command, see the [BatchJob API reference](/docs/reference/batch-job-api).

> **Status:** `status:complete` — scheduled and on-demand runs, holds, restarts and backfill; `dependsOn` chains, `sla.finishBy` deadlines and business calendars; the smoke-run gate and workflow steps; execution repair, dead-letter replay and JobRepository retention; Volcano queues, partitioned and chunked runs, and batch node pools; a job's bucket and lineage; `adhar.batch` events and the run-summary archive; and in-service jobs on the kit's Quartz engine.

## At a glance

| | |
|---|---|
| **The resource** | `BatchJob` in `platform.adhar.io/v1alpha1`: a namespaced Crossplane composite resource, rendered by the composition `batchjob-kubernetes` |
| **What runs it** | Kubernetes `Job`s and `CronJob`s, placed by Volcano in the production profile and by the default scheduler locally |
| **Workload** | Spring Batch on the JVM, built with adhar-kit. Spring Batch keeps its JobRepository in a PostgreSQL database you provide |
| **Started by** | A cron schedule, a person, a backfill, the jobs it depends on, a workflow step, or the smoke gate in test. See [Starting runs](#starting-runs) |
| **One run** | One pod by default. Up to 2 retries, a hard stop after `21600` seconds and a 120-second grace period |
| **Templates** | **Spring Batch Job** (`springboot-batch-service`) and **Spring Batch Partitioned Job** (`springboot-batch-partitioned`) in the Console's Create flow |
| **Delivery** | An `Application` of type `batch`. Argo CD syncs its `deploy/envs/<env>` overlays and Kargo promotes its image dev → test → prod |
| **Where you manage it** | Console → **Develop → Batch**; `adhar batch`; `kubectl get batchjobs.platform.adhar.io` |
| **Profiles** | `core/adhar-batch` is on in every profile. It supplies the priority classes, roles, policies, calendars and dashboard that BatchJobs depend on |

## When to use a BatchJob

A BatchJob, a [Function](/docs/core-concepts/functions) and a service all run your container from Git through the same build and promotion chain. They differ in what the platform assumes about the work.

| Choose a **BatchJob** when | Choose something else when |
|---|---|
| The work is a Spring Batch job: read, process and write in chunks, and record progress | The work is an HTTP handler or an event consumer: use a [Function](/docs/core-concepts/functions) |
| A run is long, or must restart from where it stopped | Each piece of work is short and safe to repeat: a Function's cron trigger is lighter |
| It runs every 10 minutes or less often | It runs every few seconds or follows business hours: run it [inside a service on Quartz](#in-service-jobs-on-quartz) |
| Operators need to run, stop, restart, backfill and hold it without a commit | Nobody needs to intervene between deployments |

A schedule that fires more often than every 10 minutes is accepted, but every run pays a JVM start, and the `Placement` condition suggests a Function or an in-service job instead.

## How it works

You declare a `BatchJob`. The composition renders it into a schedule and a **run template**, and every run is a `Job` created from that template:

```diagram
nsv-batch-model
```

The composition creates these objects in the BatchJob's namespace:

| Object | Purpose | When |
|---|---|---|
| ServiceAccount `<name>-batch` | The identity a run pod uses | Unless `serviceAccountName` names an existing one |
| Role and RoleBinding `<name>-batch` | Lets the run read its own Job and pods, and nothing else | Always |
| ConfigMap `<name>-run` | The run template: the exact `Job` every non-scheduled run is created from, plus the declared parameters | Always |
| CronJob `<name>` | Starts runs on the schedule, from the same Job | With `schedule` |
| ConfigMap `<name>-calendar` | A copy of the business calendar, mounted into every run | With `schedule.calendar` |
| PrometheusRule `<name>-batch` | The job's alerts | Unless `alerts.enabled: false` |

There is no batch server and no shared credential store. Every operation is a Kubernetes API call made as you, under your own permissions.

The **batch observer**, part of the platform's controller manager, watches every run. It publishes what happens to them as events, starts the runs that `dependsOn` asks for and keeps the `finishBy` deadline. See [Events and history](#events-and-history).

The composition writes the outcome back to the BatchJob. `status.message` is a one-line summary, such as `scheduled "30 1 * * *" in Asia/Singapore` or `on demand`. The conditions `PrerequisitesReady`, `TemplateReady`, `ScheduleReady`, `Held` and `Placement` explain anything that is not right; the [reference](/docs/reference/batch-job-api#conditions) lists every reason.

**The BatchJob's health is never a run's health.** Argo CD reports the BatchJob Healthy once it is Ready, even while a run is failing, and a held job stays Healthy. Failed runs show up in the [alerts](#observability), the Console and Kargo's verification instead.

## Where a batch job runs

**A batch job must live in an environment namespace of its project.** A Project creates one namespace per environment, labelled with its organisation, team, project and environment, and a BatchJob takes those four values from the labels. If `spec.parameters` sets one that disagrees, the label wins and the `Placement` condition says so.

So every run counts against its environment's quota: 4 CPU, 8 GiB and 20 pods by default, set by `cpuQuota`, `memoryQuota` and `podQuota` on the Environment. The composition refuses:

- a namespace without the `adhar.io/environment` label, and `adhar-system`
- a name longer than 40 characters, because the CronJob and every run add a suffix to it

The default project `adhar` has the environment namespaces `dev`, `test` and `prod`. One `deploy/base` BatchJob serves all three: each overlay places it in a different namespace.

## Starting runs

Every run is created from the same template, so it has the same image, resources and command. What differs is who starts it, recorded as its **trigger**:

```diagram
nsv-batch-run-paths
```

**The run's name is its identity.** A run started from the template is named `<job>-<hash8>`, where `hash8` is the first eight hex characters of a SHA-256 of its identifying parameters. Asking for the same identity again finds the existing run instead of starting a second one. Backfill, dependency and workflow runs follow the same rule, so a chain or a backfill that is retried never runs a date twice.

### On a schedule

A job with `schedule` runs by itself. The schedule is a five-field cron expression, read in `schedule.timeZone` (default `UTC`):

```yaml
schedule:
  cron: "30 1 * * *"
  timeZone: Asia/Singapore
```

- **A missed fire is skipped** if it is more than `startingDeadlineSeconds` late (default `3600`), for example while the cluster was down. `BatchScheduleMissed` reports it.
- **Runs do not overlap.** `concurrencyPolicy` defaults to `Forbid`, so a fire is skipped while the previous run is still going. `Allow` lets them overlap. `Replace` is refused, because it would stop a healthy run every time the next fire arrives.
- **`schedule.suspend` pauses the schedule from Git.** Use it for an environment that should not run on its own, such as dev. To pause a job without a commit, [hold](#holding-a-job) it instead.

A job without `schedule` gets no CronJob, and its `ScheduleReady` condition reads `OnDemand`.

### By hand

**In the Console**, open **Develop → Batch**, pick the job and choose **Run now**. The form is built from the declared parameters. It checks types, patterns and allowed values before anything starts, and refuses parameter names that look like secrets.

**From the CLI**, `adhar batch run` applies the same checks:

```bash
adhar batch run importer --env prod -p businessDate=2026-11-03 --wait --follow
```

**With `kubectl`**, create the Job from the template yourself. Nothing checks the parameters on this path, so the job itself has to reject bad input:

```bash
kubectl -n dev get configmap reconciler-run -o jsonpath='{.data.template\.yaml}' \
  | yq '.metadata.name = "reconciler-manual-1"
        | (.spec.template.spec.containers[0].env[] | select(.name == "ADHAR_BATCH_PARAMS")).value
            = "{\"businessDate\":\"2026-11-03\"}"' \
  | kubectl -n dev create -f -
```

**A run cannot differ from the template.** The Kyverno policy `adhar-batch-run-integrity` refuses any run not created by the CronJob unless it matches the template in everything except its name, its trigger label and the environment variables `ADHAR_BATCH_PARAMS`, `ADHAR_BATCH_TRIGGER`, `ADHAR_BATCH_RESTART_OF`, `ADHAR_BATCH_COMMAND` and `ADHAR_BATCH_EXECUTION_ID`. Nobody can change one run's image, resources or command: change the BatchJob in Git instead.

### Backfill

`adhar batch backfill` runs a job once per business date in a range, for a feed that arrived late or a job that was added after the fact:

```bash
adhar batch backfill importer --env prod --from 2026-11-01 --to 2026-11-07 --parallel 2 --wait
```

- Each date is its own run, named for its identity, so running the same backfill again starts nothing twice.
- On plain Kubernetes, every date's Job is created suspended and released in date order, never more than `--parallel` (default `1`) at a time. If the command is interrupted, the rest stay suspended; run it again to release them. On Volcano, the job's queue decides how many start.
- The Console's **Backfill** action on a job does the same, with a date range and a parallelism.
- Each date goes into the job's `businessDate` parameter (or the first date parameter its schedule supplies); `-p` sets the others. A job with neither is refused. A backfill covers at most 366 dates.

### Parameters and a run's identity

`spec.parameters.parameters` declares the job's parameters: their type, whether they are required, a default, a pattern and allowed values. Three settings change how a run behaves:

- **`identifying`** (default `true`) makes a parameter part of the Spring Batch JobInstance and of the run's name. Mark parameters such as `dryRun` as `identifying: false`, so they do not create a separate instance.
- **`source: schedule`** derives the value from the scheduled time in the job's time zone, which is how a nightly job gets its business date. The default, `input`, takes the value from whoever starts the run.
- **`sensitive: true`** masks the value in logs, events and the termination summary. Credentials never travel as parameters: read them from a Secret through `envFrom`.

## Business dates: calendars, dependencies and deadlines

Nightly batch work is organised around a **business date**: the date a run is for, not the date it happens to run. Three settings build on it:

```diagram
nsv-batch-business-date
```

### Dependencies

`dependsOn` lists jobs that must succeed first. Once every one of them has a succeeded run for a business date, the batch observer starts this job once for that date, with trigger `dependency`:

```yaml
dependsOn:
  - batchJob: extract              # same namespace unless `namespace` is set
  - batchJob: fx-rates
    sameBusinessDate: false        # wait only for its latest run to have succeeded
```

- The dependent job must declare a `businessDate` parameter (or a schedule-supplied `date`), because the date is the dependency run's identity. A job that depends on itself is refused.
- The decision is made from the run objects in the cluster, not from the event bus, so it works with the bus off and through a bus outage.
- A dependency run that a full quota refuses is retried with backoff, for up to 26 hours, until it starts.
- A job lists up to 16 dependencies, in its own namespace or another.

> **Note:** The batch observer runs in the platform's long-running controller manager. Cloud and on-prem platforms always have it. On Kind, start the platform with `adhar up --in-cluster`, or `dependsOn` and `finishBy` have nothing to act on them.

### Deadlines

`sla.finishBy` is the time of day, in `sla.timeZone` (default: the schedule's zone, or UTC), by which a run must have succeeded:

```yaml
sla:
  maxDuration: 3h                  # BatchRunTooLong past this
  finishBy: "06:00"                # the business deadline
```

The observer forecasts each run's end as its start (or the slot) plus the p90 of the job's last 20 durations. If the forecast passes `finishBy`, it publishes `deadline.endangered` **before** the deadline, while there is still time to act. If `finishBy` passes with no success for that business date, it publishes `deadline.missed`. The `BatchDeadlineEndangered` and `BatchDeadlineMissed` alerts follow the same signals.

### Business calendars

`schedule.calendar` names a business calendar. On a day that is not a business day, a `schedule`, `dependency` or `backfill` run exits `0` as skipped, with reason `calendar`. A manual run always runs.

A calendar is a ConfigMap labelled `adhar.io/batch-calendar: "true"` with a `calendar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sg-business
  namespace: prod
  labels:
    adhar.io/batch-calendar: "true"
data:
  calendar.yaml: |
    name: sg-business
    timeZone: Asia/Singapore        # optional; the job's schedule.timeZone otherwise
    weekendDays: [SATURDAY, SUNDAY]
    holidays: [2026-12-25, 2027-01-01]
    businessDays: [2026-12-19]      # a working Saturday
```

The composition looks for the calendar in the job's namespace first, then in `adhar-system`, which ships `weekdays` (Saturday and Sunday off, no holidays). It copies the one it finds into `<name>-calendar` and mounts it into every run. A calendar that cannot be found reports `PrerequisitesReady=False` with reason `CalendarUnresolvable`, and suspends the schedule.

## Operating a job

Each operation is one change to a Kubernetes object. The Console and `adhar batch` send the same change, behind the same permission check.

| Operation | CLI | What happens |
|---|---|---|
| Run now | `adhar batch run <job>` | A `Job` is created from `<name>-run`, named for its identifying parameters |
| Stop | `adhar batch stop <run>` | The Job is suspended. The run finishes its current chunk and records `STOPPED` |
| Resume | `adhar batch resume <run>` | The Job is unsuspended. The run continues from its last commit |
| Restart | `adhar batch restart <run>` | A failed run gets a new attempt, `<run>-r<n>`, with the same identity. Spring Batch re-executes only the steps that did not complete. At most 99 restarts |
| Backfill | `adhar batch backfill <job>` | One run per business date in a range. See [Backfill](#backfill) |
| Hold / Release | `adhar batch hold <job> --reason <why>` / `release <job>` | The annotation `adhar.io/batch-hold` is set or removed, which suspends or resumes the schedule |

### Holding a job

A **hold** stops a job from starting new runs without a commit, for a freeze, an incident or a migration. It is the annotation `adhar.io/batch-hold`, whose value is the reason:

```bash
adhar batch hold importer --env prod --reason "quarter-end freeze"
adhar batch release importer --env prod
```

- A hold suspends the CronJob. A run already in progress carries on.
- The job reports `Held=True`, and `status.held` records the reason and when the hold began.
- Argo CD does not revert a hold, because the annotation is not in Git. The Kyverno policy `adhar-batch-hold-only` lets people change only this annotation on a BatchJob.

### Repairing an execution

Some repairs act on a Spring Batch execution in the job's own JobRepository, which no platform component reads. The CLI never touches the database. It starts an **ops Job** from the deployed run template, named `<job>-ops-<verb>-<executionId>`, and the runner does the work with the job's own credentials:

| Command | Use it when |
|---|---|
| `adhar batch recover <run>` | An execution is left `STARTED` by a pod that died, so the job cannot run again |
| `adhar batch abandon <run>` | You want to give up on an execution, so its identity can be run anew |
| `adhar batch dlq <job> --replay` | Items were dead-lettered and the cause is fixed: re-process only that execution's unreplayed items |

`adhar batch dlq <job>` without `--replay` lists the dead-lettered counts per execution, from the runs' termination summaries and the `adhar.batch` events.

## Inside a run

```diagram
nsv-batch-run-lifecycle
```

### Retries, deadlines and stopping

| Setting | Default | What it does |
|---|---|---|
| `retry.backoffLimit` | `2` | How many times Kubernetes replaces a failed pod. Each new pod restarts the job from its last commit |
| `timeouts.activeDeadlineSeconds` | `21600` | The hard stop for one run, whatever it is doing |
| `timeouts.terminationGracePeriodSeconds` | `120` | How long a stopping run has to finish its chunk and record `STOPPED`. Must be shorter than the deadline |
| `history.ttlSecondsAfterFinished` | `604800` | How long a finished run's `Job`, and so its record in the Console, is kept |

The exit code says whether trying again could help:

- **Retried:** `1` (the JVM failed before the run started), `5` (failed, and a retry may succeed), and a kill (`137`, `143`).
- **Failed at once:** `2` (invalid request), `3` (failed, and retrying will not help), `4` (stopped on request), `6` (abandoned) and `7` (the JobRepository's state is unknown).
- **Not counted:** a pod evicted from a draining node is replaced without using up a retry.

`0` covers both a completed run and a skipped one (already complete, a duplicate, or not a business day). The [reference](/docs/reference/batch-job-api#exit-codes) has the full table.

### The runner contract

The kit's runner reads its instructions from the environment and reports its outcome through its exit code. The variables that matter most:

| Variable | Contents |
|---|---|
| `ADHAR_BATCH_JOB` | The Spring Batch job's bean name, from `spec.parameters.job` |
| `ADHAR_BATCH_PARAMS` | The run's parameters as a JSON object. `{}` for a scheduled run |
| `ADHAR_BATCH_TRIGGER` | `schedule`, `manual`, `restart`, `backfill`, `dependency`, `workflow`, `smoke` or `ops` |
| `ADHAR_BATCH_TIME_ZONE` | The schedule's time zone |
| `ADHAR_BATCH_CALENDAR` | The mounted business calendar, with `schedule.calendar` |
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | The JobRepository database, from the keys `jdbc-uri`, `username` and `password` of `database.secretRef` |

These names belong to the runner. Setting any of them, or anything starting with `ADHAR_BATCH_`, in `env` is refused. The [reference](/docs/reference/batch-job-api#the-run-pod) lists the whole environment.

When it exits, the runner writes a one-line JSON **termination summary** to `/dev/termination-log` and stdout: the job, instance and execution ids, status, exit code, outcome and reason, trigger, business date, item counts (read, written, skipped, dead-lettered) and steps. The Console, `adhar batch runs` and the batch observer read it.

### Sizing

A run pod requests 1 CPU and 1536Mi of memory by default.

- **The memory request always equals the limit**, because the run the kernel kills under memory pressure is the overcommitted one. Below 1Gi, a Spring Batch JVM does not start reliably.
- **The CPU limit equals the CPU request** unless you set `resources.cpuLimit`, which may not be lower than the request.
- **The JVM's fixed regions are trimmed** to 50 threads and a 64M code cache, leaving more of the limit for the heap. Change them under `jvm`, and add options with `jvm.options`.

### Retention

The JobRepository grows with every run. `retention` tells the runner what to delete after a completed run: metadata older than `days` (default `90`), keeping the newest `keepLast` job instances (default `30`) and always the newest restartable `FAILED` or `STOPPED` one, so a restart still has something to resume.

## Capacity and priority

Batch work never pushes a service aside.

- **Priority.** Runs use the PriorityClass `adhar-batch`, below ordinary workloads. `priority: critical` uses `adhar-batch-critical`, in prod only. Neither class preempts anything.
- **Draining nodes.** With `disruption: avoid` (the default), the node autoscaler will not drain a node a run is on. `disruption: allow` lets it, which stops the run gracefully and restarts it from its last commit.
- **Buying nodes.** A pending run does not make the node autoscaler add a node unless the job sets `scaleUp: true`, which only prod accepts. A dev or test backlog waits for capacity instead.

## Scheduler

`scheduler` chooses what places a run's pods:

| `scheduler` | Behaviour |
|---|---|
| `auto` (default) | Volcano where it is installed and your team's queue is open; plain Kubernetes otherwise |
| `kubernetes` | Always plain Kubernetes |
| `volcano` | Requires Volcano. Without it, the job reports `PrerequisitesReady=False` and its schedule stays suspended |

**Volcano is on in the production profile and off locally**, so `auto` resolves to Volcano on a cloud or on-prem platform and to plain Kubernetes on Kind. `status.scheduler` shows what a job resolved to.

### Volcano and partitioned jobs

The `volcano` and `adhar-batch-volcano` packages are on together in the production profile. Locally, enable both with `adhar stack enable volcano adhar-batch-volcano`; every BatchJob on `scheduler: auto` then moves onto Volcano at its next reconcile, with no edit to the job. Disabling them moves it back.

**The Volcano Dashboard**, at `https://volcano.<host>`, shows every queue, Volcano job, PodGroup and pod. It is read-only, and only `platform-admin` can sign in, because it lists pods in every namespace. Teams see their own queues in the Console instead.

**Queues.** Each team gets three queues under the root `adhar-batch`, one per tier: `<organisation>-<team>-dev`, `-test` and `-prod`. A run uses the queue of its namespace's tier, and Kyverno refuses any other. Dev and test queues have no guaranteed share. The prod queue has one, so a prod run can take capacity back from dev or test runs, which stop at their next chunk boundary and resume later. The `QueueFits` condition warns when a run does not fit its queue.

**Partitioned jobs.** `mode: partitioned` runs one manager and `workers` worker pods (default `2`) that share the job's partitions through the JobRepository. Two workers keep a default run (3 CPU, 3 × 1536Mi) inside an environment's default quota; raise `workers` and the Environment's quota together for a larger run.

| | Plain Kubernetes | Volcano |
|---|---|---|
| `mode: single` | A `Job` | The same `Job`, placed by Volcano in your queue |
| `mode: partitioned` | An Indexed `Job`: index 0 is the manager, the rest are workers | A Volcano Job whose manager and workers start all together or not at all (a *gang*) |
| PriorityClass | `adhar-batch` / `adhar-batch-critical` | `adhar-batch-volcano` / `adhar-batch-volcano-critical` |
| Stop / Resume | The Job is suspended or unsuspended | A Volcano `AbortJob` or `ResumeJob` command |

A partitioned job whose pods together need more than the namespace's quota is refused when it is declared, not when it runs. On Volcano, batch runs can preempt each other, but never a service.

## Scaling and data

### A batch node pool

A cluster can give batch a node group of its own, so a nightly backlog never squeezes the platform's pods. Declare it per environment in the platform's `config.yaml`:

```yaml
environments:
  prod:
    batchPool:
      machineType: c6i.2xlarge   # empty: the provider's worker size
      minNodes: 1                # at least 1
      maxNodes: 4
    autoscaling:
      enabled: true              # the pool is autoscaled only when this is on
```

- **Pool nodes** carry the label `adhar.io/node-pool: batch` and the taint `adhar.io/batch=true:NoSchedule`, so nothing else lands there.
- **Runs move there with no change.** While a pool node exists, the Kyverno policy `adhar-batch-node-pool` gives every run pod the toleration and a *preferred* affinity for the pool. When the pool is full, runs still use a general worker.
- **The autoscaler grows the pool, never the general workers**, for a waiting run that may buy nodes (`scaleUp: true`, prod only), and retires idle pool nodes down to `minNodes`. Its view is `status.autoscaling.batchPool` on the `AdharPlatform`. The floor is one node, because a run admitted while no pool node exists carries no toleration.
- **Where it applies.** `batchPool` is refused on `kind` and `custom`, which build no node groups, and on `clusterMode: provided`. On a provided cluster, label and taint the nodes yourself (`adhar.io/node-pool=batch`, `adhar.io/batch=true:NoSchedule`): runs are placed there all the same, but nothing grows or shrinks those nodes.

### A job's bucket

Name a `Bucket` in the job's namespace instead of wiring its Secret yourself:

```yaml
spec:
  parameters:
    job: importJob
    image: harbor-core.adhar-system.svc.cluster.local/library/importer:1.4.0
    database: { secretRef: importer-db-app }
    bucket: inbound          # a Bucket in this namespace
```

Every run pod, in every role and however it started, gets `ADHAR_S3_ENDPOINT`, `ADHAR_S3_REGION` and `ADHAR_S3_BUCKET` from the Bucket's Secret `<bucket>-bucket`, and `ADHAR_S3_ACCESS_KEY` and `ADHAR_S3_SECRET_KEY` from `<job>-s3`, which the composition projects for it. The kit turns the five into Spring Cloud AWS settings, so the job's [S3 readers and writers](/adhar-kit/modules/batch#read-and-write) need no configuration; anything the application sets under `spring.cloud.aws.*` still wins.

A Bucket that does not exist suspends the schedule with `PrerequisitesReady=False` (`BucketUnavailable`). An `env` entry starting `ADHAR_S3_` beside `bucket` is refused, and a run that points one of the variables at another Secret is refused by run integrity.

### Remote chunking

Partitioning splits the *input*, and each worker reads its own share. Some inputs cannot be split that way: one file, one stream, one query with no key to range over. For those, `mode: chunked` keeps one reader, the manager, and spreads the *processing and writing* over `workers` pods. The manager sends chunks over a RabbitMQ queue, and the workers process and write each chunk and answer on a second queue:

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: Queue                      # one per direction, in the job's namespace
metadata: { name: importer-chunks }
---
apiVersion: platform.adhar.io/v1alpha1
kind: Queue
metadata: { name: importer-replies }
---
apiVersion: platform.adhar.io/v1alpha1
kind: BatchJob
metadata: { name: importer }
spec:
  parameters:
    mode: chunked
    workers: 2                   # besides the manager
    chunking:
      requestQueue: importer-chunks
      replyQueue: importer-replies
```

- **The shape is the partitioned one:** one manager plus `workers` pods, a gang on Volcano and an Indexed `Job` without it, with the same quota check when it is declared. `gridSize` does not apply and is refused.
- **The queues must exist and differ.** A missing `Queue` reports `PrerequisitesReady=False` (`ChunkQueueUnavailable`) and suspends the schedule. One queue for both directions is refused, because a worker would read its own replies as chunks.
- **Restart is the kit's.** A chunk that was sent and never answered is processed again from the manager's last commit, so writers must be idempotent, as they already must be for a restart.
- `adhar batch list` and `describe` show the mode with its workers and queues.

### Lineage

`lineage.enabled: true` gives every run pod the OpenLineage client's variables, pointed at the platform's OpenMetadata: `OPENLINEAGE_URL`, `OPENLINEAGE_ENDPOINT`, `OPENLINEAGE_NAMESPACE` (`adhar/<organisation>/<team>[/<project>]/<environment>`) and, from `lineage.credentialsSecretRef`, `OPENLINEAGE_API_KEY`. Set `lineage.url` to send it to another receiver. Lineage works in every mode and is advisory: a receiver that is down never fails a run.

## Delivery

A batch job is delivered like any other application:

1. Create it from the **Spring Batch Job** or **Spring Batch Partitioned Job** template in the Console. The template writes the job, its tests and a `deploy/` tree, and registers an `Application` with `type: batch`.
2. The `deploy/envs/<env>` overlays place the BatchJob in each environment. Dev runs on demand (its schedule is suspended), test runs the real schedule, and prod adds `priority: critical`.
3. Kargo promotes the image dev → test → prod, and Argo CD syncs each overlay.

Kargo pins the promoted image into `spec/parameters/image`. Kustomize knows where to write it because the template's `deploy/base/kustomizeconfig.yaml` names that path. If you write the BatchJob by hand, add it yourself:

```yaml
# kustomizeconfig.yaml, listed under `configurations:` in the kustomization
images:
  - path: spec/parameters/image
    group: platform.adhar.io
    kind: BatchJob
```

**Verification passes on silence and fails on evidence.** Before Kargo promotes a batch application onward, its BatchJob must be Healthy, no run that started during verification may have failed, and no run pod may have been killed for running out of memory. A window with no run at all passes.

### The smoke gate

Silence proves little for a job that runs once a night. Set `smoke` and every build must prove itself in test before it can reach prod:

```yaml
smoke:
  parameters:
    businessDate: "2026-01-02"
    source: inbound/sample.csv
```

```diagram
nsv-batch-smoke-gate
```

In each test-tier environment, Kargo's verification runs `<job>-smoke-<sha7>`, where `sha7` is the first seven hex characters of the image digest, with the smoke parameters and their declared defaults. A build whose smoke run fails is never verified, so it never reaches prod. Verifying the same build again finds its run instead of starting another.

## Running from a workflow

An Argo Workflows step can start a BatchJob run and wait for it, through the platform's `ClusterWorkflowTemplate` `adhar-batch-steps`:

```yaml
- name: import
  templateRef: { name: adhar-batch-steps, template: run, clusterScope: true }
  arguments:
    parameters:
      - { name: batchJob, value: importer }
      - { name: parameters, value: '{"businessDate": "2026-11-03"}' }
```

The step is `adhar batch run <job> --wait`, so it behaves exactly as the CLI does: a run of that identity that completed passes without re-running, one still running is waited for, and a failed one is restarted as the next `-r<n>`. The step's exit code is the run's. The run is labelled with trigger `workflow` and runs as the workflow's ServiceAccount, which Kyverno records as its actor. `argo-workflows` is on in the production profile.

## In-service jobs on Quartz

Some jobs belong inside a long-running service rather than in a pod of their own: they run every few seconds, follow business hours, or must carry on on another replica when one dies. For those, adhar-kit's embedded scheduler has a second engine, `quartz`, configured in the service's `application.yaml`:

```yaml
adhar:
  batch:
    scheduler:
      enabled: true
      engine: quartz                 # simple | quartz
      time-zone: Asia/Singapore
    quartz:
      misfire: latest                # skip | latest | all (at most max-catch-up slots)
      triggers:
        importJob:
          - name: nightly
            kind: cron               # cron | interval | daily
            expression: "0 30 1 ? * *"   # Quartz syntax, seconds first
```

- **Exactly once across replicas.** Quartz keeps its triggers in the service's own PostgreSQL, in the `batch` schema beside the JobRepository. Every replica runs the scheduler, and each slot fires once.
- **Same identity as the platform.** A slot's business date is its nominal time in the trigger's zone, and a run is named by the same rule as a BatchJob run, so a slot that already completed is skipped.
- **Missed slots** follow `misfire`: `latest` (the default) runs the newest missed slot once, `all` runs each in order, and `skip` waits for the next.

An in-service run is not a Kubernetes object, so it has no Run now, Stop, Restart or Hold. A job that needs those belongs in a BatchJob. `adhar batch schedules` lists the schedules services report.

## Events and history

The **batch observer** turns what happens to runs into the platform's `adhar.batch` CloudEvents:

```diagram
nsv-batch-observer
```

| Event | When |
|---|---|
| `run.requested` | A run appeared with a trigger other than `schedule`; the event names who asked |
| `run.started`, `run.succeeded`, `run.failed`, `run.skipped` | The run's lifecycle. `skipped` replaces `succeeded` when the run had nothing to do |
| `run.stopped`, `run.resumed` | Each stop and resume. A backfill run still held back is queued, not stopped, so it publishes neither |
| `run.lost` | An attempt ended with no summary: OOM-killed, node lost or pod vanished |
| `schedule.held`, `schedule.released`, `schedule.missed` | Holds, and a cron slot that passed with no run |
| `deadline.endangered`, `deadline.missed` | The `finishBy` forecast and outcome |

Each type is prefixed `io.adhar.batch.`. Events are published once per transition and are advisory: a bus outage drops them but never changes what runs. The topic keeps 90 days, beyond the Jobs' own TTL:

```bash
adhar batch history importer --env prod --since 7d
```

The event bus is Kafka, on in the production profile. `dependsOn` never needs it.

### Run history beyond 90 days

When a run ends (succeeded, failed, skipped, or lost because it was deleted first), the batch observer also writes its final event to the platform's object store, in the `adhar-batch-archive` bucket:

```text
s3://adhar-batch-archive/<namespace>/<batchJob>/<businessDate>/<run>.json
```

- **What it keeps.** The same CloudEvent the bus carried: outcome, exit code, counts, execution, business date, trigger, actor and duration. Sensitive parameters, and any whose name reads as a credential, are masked. A run observed twice overwrites its own object, so the archive holds one answer per run.
- **Reading it.** `adhar batch history` reads the bus and the archive together, showing an event both hold once and marking archived rows `archive`. Without a bus, as on a local platform, the history is the archive alone. Reading the archive needs read access to `adhar-system/root-creds`; without it you get the bus's history and a note. `--archive=false` skips it, and `--archive-url` reads a store you reach yourself. The Console's **History** view offers **Last 12 months (archive)**.
- **Only the end of each run.** Requests, stops, holds, missed slots and deadlines stay on the bus only.
- **Advisory, and kept until you decide.** Archiving never delays a run or a reconcile; a failing store fires `BatchArchiveWritesFailing`. Nothing expires by default: add a lifecycle rule to the bucket in RustFS to set a retention.

## In the Console

**Develop → Batch** lists every batch job the signed-in user can see, grouped by application. The page is available to the roles platform-admin, platform-engineer and developer.

- **Jobs** shows each job's schedule, next run, last run, last success and SLA, with totals for running, failed, held and SLA-breached jobs.
- **Runs** shows each run's status, trigger, actor, business date, attempts, duration and exit code.
- **Queues** shows each team's Volcano queues. The tab appears only on a cluster that runs Volcano.
- **Backfill** on a job starts one run per business date in a range, as `adhar batch backfill` does.
- A job's drawer has its overview, parameters, run history against `sla.maxDuration`, alerts, delivery and configuration. A run's drawer has its termination summary, pods and logs, events and CPU and memory use.

Every action runs as the signed-in user, and the Console hides an action that the user's permissions would refuse:

| Action | Permission needed |
|---|---|
| **Run now**, **Restart** | create `jobs`, get `configmaps` |
| **Stop**, **Resume** | patch `jobs` |
| **Hold**, **Release** | patch `batchjobs` |
| **Logs** | get `pods/log` |

## Security

- **Operating a job can only run its deployed definition.** The run-integrity and hold-only policies mean a prod operator can run, stop and hold the job, but never run a different image or add environment variables.
- **Roles.** `adhar-batch-view` and `adhar-batch-edit` are aggregated into the built-in `view`, `edit` and `admin` roles. In each prod environment, the Environment binds `adhar-batch-operator` to the team's group. Set `batchOperations: none` on the Project or the Environment to withhold it.
- **Pod standards are enforced.** Every run must have its memory request equal to its limit, `restartPolicy: Never`, a batch PriorityClass, a deadline, a TTL and no persistent volume. A schedule that breaks them is refused when it is defined, not when it fires.
- **If Kyverno is down, manual runs stop but scheduled runs do not.** The run-integrity policy fails closed for runs created by people and tools. It does not apply to runs the CronJob controller creates.
- **Run pods** run as non-root, with privilege escalation off, every capability dropped and the default seccomp profile. `/tmp` is a size-limited `emptyDir`.

> **Warning:** A `Bucket`'s credential is the object store's root credential, whether a run gets it through `bucket` or `envFrom`. It can read and write every bucket on the platform. Likewise, a `Queue` hands its consumers the broker's admin credential. Use buckets and chunking queues for one team only.

The [reference](/docs/reference/batch-job-api#permissions) lists every role's verbs and every policy.

## Observability

**Alerts.** Each job gets its own PrometheusRule. Severity follows `alerts.severity`: by default, critical in prod and warning elsewhere.

| Alert | Fires when |
|---|---|
| `BatchRunFailed` | The latest run failed. It resolves when a newer run exists |
| `BatchRunTooLong` | A run has been going longer than `sla.maxDuration` (by default, the deadline) |
| `BatchRunStuckPending` | A run pod has been Pending for 15 minutes |
| `BatchRunOOMKilled` | A run pod was killed for running out of memory in the last 24 hours |
| `BatchScheduleMissed` | A scheduled fire is more than 10 minutes late, the schedule is not suspended, and nothing is running (scheduled jobs only) |
| `BatchNoRecentSuccess` | The last success is older than `alerts.staleAfter` (default `26h`; scheduled jobs only) |

Four more alerts read series that exist only in Mimir, so they are evaluated by the Mimir ruler in the production profile:

| Alert | Fires when |
|---|---|
| `BatchNoProgress` | A running run has committed nothing for 30 minutes: a step is stuck on a lock, a remote call or a full disk |
| `BatchDeadLetterGrowing` | A step keeps dead-lettering items for 15 minutes |
| `BatchDeadlineEndangered` | The forecast end of a business date's run passes `sla.finishBy` |
| `BatchDeadlineMissed` | `sla.finishBy` passed with no success for that business date |
| `BatchArchiveWritesFailing` | Run summaries have failed to reach the archive for 30 minutes; critical for prod's runs |

**Dashboards.** Grafana's **Delivery → Batch** dashboard shows active, failed and pending runs and suspended schedules across the platform, from kube-state-metrics, in every profile. Each batch application also has its own `batch-jvm` dashboard: runs, JVM metrics, resources, logs and traces.

**Cost.** OpenCost's allocation is attributed to each run, job and team. The **Observability → Cost** dashboard has a Batch row with spend by team.

**Telemetry.** Runs push metrics and traces over OTLP to Alloy, so a run shorter than a scrape interval is still measured. Their logs go to Loki like every other pod's.

## Packages

| Package | Profiles | Role |
|---|---|---|
| `core/adhar-batch` | On everywhere | The priority classes, roles, policies, the `weekdays` calendar and the dashboard. Without it, a BatchJob reports `PrerequisitesReady=False` and its schedule is suspended |
| `core/volcano` and `core/adhar-batch-volcano` | On in production | The Volcano scheduler and the queue policies that go with it. Enable or disable both together |
| `application/argo-workflows` | On in production | The workflow engine, with the `adhar-batch-steps` template that starts BatchJob runs |
| `data/kafka-operator` | On in production | The event bus behind `adhar.batch` events and `adhar batch history` |
| `data/rustfs` | On everywhere | The object store holding the `adhar-batch-archive` bucket and every job's `bucket` |

## Limits

| Not provided | What to do instead |
|---|---|
| Changing a run's image or resources without a commit | Change the BatchJob in Git |
| A NetworkPolicy or persistent storage per job | Reach other services through Secrets; use `bucket` for object storage |
| Iceberg and Parquet readers and writers, Karmada placement, Kueue | `status:planned` |

## Next steps

- **[Deploy a Batch Job](/docs/guides/deploy-a-batch-job)** — from the template to a scheduled run in prod, step by step
- **[BatchJob API reference](/docs/reference/batch-job-api)** — every field, condition, event, alert, policy and `adhar batch` command
- **[Functions](/docs/core-concepts/functions)** — for short, event-driven work
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages and Releases in depth
- **[Observability](/docs/operations/observability)** — logs, metrics and traces
