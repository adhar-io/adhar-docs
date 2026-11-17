---
title: "Batch Jobs"
section: "Core Concepts"
order: 6
path: "/docs/core-concepts/batch"
---

# Batch Jobs

A **BatchJob** runs a Spring Batch job on the platform, on a schedule or when somebody starts it. Each attempt at a job instance is one Kubernetes `Job`. When an attempt fails, Spring Batch resumes from its last commit instead of starting over.

You declare the job in Git. The platform turns it into a schedule, a template that every run is created from, the permissions a run needs, and its alerts. Operators then run, stop, restart and hold the job from the Console or `adhar batch`, without a commit.

This page explains the model, for developers deciding whether a batch job fits their workload and for platform engineers who run the engine behind it. For every field, condition and command, see the [BatchJob API reference](/docs/reference/batch-job-api).

> **Status:** single-pod jobs on plain Kubernetes are `status:complete`. Partitioned jobs and the Volcano scheduler are `status:in-progress`: the API accepts them, and Volcano is off in every profile. See [Scheduler](#scheduler).

## At a glance

| | |
|---|---|
| **The resource** | `BatchJob` in `platform.adhar.io/v1alpha1`: a namespaced Crossplane composite resource, rendered by the composition `batchjob-kubernetes` |
| **What runs it** | Kubernetes `Job`s and `CronJob`s on the default scheduler. Volcano is an opt-in alternative |
| **Workload** | Spring Batch on the JVM. Spring Batch keeps its JobRepository in a PostgreSQL database you provide |
| **Started by** | A cron schedule (`schedule.cron`), or a person through the Console or `adhar batch run`. A job without a schedule is on demand |
| **One run** | One pod by default. Up to 2 retries, a hard stop after `21600` seconds and a 120-second grace period |
| **Templates** | **Spring Batch Job** (`springboot-batch-service`) in the Console's Create flow |
| **Delivery** | An `Application` of type `batch` whose `deploy/envs/<env>` overlays hold the BatchJob. Argo CD syncs it and Kargo promotes its image dev → test → prod |
| **Where you manage it** | Console → **Develop → Batch**; `adhar batch`; `kubectl get batchjobs.platform.adhar.io` |
| **Profiles** | The `core/adhar-batch` package is on in every profile. It supplies the priority classes, roles, policies and dashboard that BatchJobs depend on |

## When to use a BatchJob

A BatchJob, a [Function](/docs/core-concepts/functions) and a service all run your container from Git through the same build and promotion chain. They differ in what the platform assumes about the work.

| Choose a **BatchJob** when | Choose something else when |
|---|---|
| The work is a Spring Batch job: read, process and write in chunks, and record progress | The work is an HTTP handler or an event consumer: use a [Function](/docs/core-concepts/functions) |
| A run is long | Each piece of work finishes within a Function's 600-second timeout: a Function's cron trigger is lighter |
| A failed run must restart from where it stopped, not from the beginning | The work is safe to repeat from scratch |
| It runs a few times a day or less | It runs every few minutes. Every run pays a JVM start |
| Operators need to run, stop, restart and hold it without a commit | Nobody needs to intervene between deployments |

A schedule that fires more often than every ten minutes is accepted, but the `Placement` condition notes that the work would be better as a Function or inside a service.

## How it works

You declare a `BatchJob`. The composition `batchjob-kubernetes` renders it into a schedule and a **run template**, and every run is a `Job` created from that template:

```diagram
nsv-batch-model
```

The composition creates these objects in the BatchJob's own namespace:

| Object | Purpose | When |
|---|---|---|
| ServiceAccount `<name>-batch` | The identity a run pod uses | Unless `serviceAccountName` names an existing one |
| Role and RoleBinding `<name>-batch` | Lets the run read its own Job and pods, and nothing else | Always |
| ConfigMap `<name>-run` | The run template: the exact `Job` every manual run is created from, plus the job's declared parameters | Always |
| CronJob `<name>` | Starts runs on the schedule, from the same Job as the run template | With `schedule` |
| PrometheusRule `<name>-batch` | The job's alerts | Unless `alerts.enabled: false` |

There is no batch server and no shared credential store. Every operation is a Kubernetes API call made as you, under your own permissions.

The composition writes the outcome back to the BatchJob. `status.message` is a one-line summary, such as `scheduled "30 1 * * *" in Asia/Singapore` or `on demand`. Conditions such as `PrerequisitesReady`, `TemplateReady`, `ScheduleReady`, `Held` and `Placement` explain anything that is not right. The [reference](/docs/reference/batch-job-api#conditions) lists every reason.

**The BatchJob's health is never a run's health.** Argo CD reports the BatchJob Healthy once it is Ready, even while a run is failing, and a held job stays Healthy. Failed runs show up in the [alerts](#observability), in the Console and in Kargo's verification instead.

## Where a batch job runs

**A batch job must live in an environment namespace of its project.** A Project creates one namespace per environment, labelled with its organisation, team, project and environment. A BatchJob takes those four values from the labels. If `spec.parameters` sets one that disagrees, the label wins and the `Placement` condition says so.

Unlike a Function, a BatchJob anywhere else is refused, so its runs always count against the project's quota. The composition refuses:

- a namespace without the `adhar.io/environment` label
- `adhar-system`
- a name longer than 40 characters, because the CronJob and every run add a suffix to it

The default project `adhar` has the environment namespaces `dev`, `test` and `prod`. One `deploy/base` BatchJob serves all three: each overlay places it in a different namespace.

## Scheduled and on-demand runs

A run starts in one of two ways. Both create the same Job:

```diagram
nsv-batch-run-paths
```

**A job with `schedule` runs by itself.** The schedule is a five-field cron expression, read in `schedule.timeZone` (default `UTC`):

```yaml
schedule:
  cron: "30 1 * * *"
  timeZone: Asia/Singapore
```

- **A missed fire is skipped** if it is more than `startingDeadlineSeconds` late (default `3600`), for example while the cluster was down. The `BatchScheduleMissed` alert reports it.
- **Runs do not overlap.** `concurrencyPolicy` defaults to `Forbid`, so a fire is skipped while the previous run is still going. `Allow` lets them overlap. `Replace` is refused, because it would stop a healthy run every time the next fire arrives.
- **`schedule.suspend` pauses the schedule from Git.** Use it for an environment that should not run on its own, such as dev. To pause a job without a commit, [hold](#holding-a-job) it instead.

**A job without `schedule` runs only when somebody starts it.** It gets no CronJob, and its `ScheduleReady` condition reads `OnDemand`.

### Starting a run by hand

Every manual run is created from the run template, the ConfigMap `<name>-run`. Its `template.yaml` holds the complete `Job`, and its `parameters.json` holds the declared parameters with every default filled in.

**In the Console**, open **Develop → Batch**, pick the job and choose **Run now**. The run form is built from the declared parameters. It checks types, patterns and allowed values before anything starts, and it refuses parameter names that look like secrets.

**From the CLI**, `adhar batch run` applies the same checks:

```bash
adhar batch run importer --env prod -p businessDate=2026-11-03 --wait --follow
```

**The run's name is the duplicate guard.** A manual run is named `<job>-<hash8>`, where `hash8` is the first eight hex characters of a SHA-256 of its identifying parameters. Starting the same job with the same identifying parameters again finds the existing run instead of creating a second one.

**With `kubectl`**, create the Job from the template yourself:

```bash
kubectl -n dev get configmap reconciler-run -o jsonpath='{.data.template\.yaml}' \
  | yq '.metadata.name = "reconciler-manual-1"
        | (.spec.template.spec.containers[0].env[] | select(.name == "ADHAR_BATCH_PARAMS")).value
            = "{\"businessDate\":\"2026-11-03\"}"' \
  | kubectl -n dev create -f -
```

Nothing checks the parameters on this path before the run starts, so the job itself has to reject bad input.

**A run cannot differ from the template.** The Kyverno policy `adhar-batch-run-integrity` refuses a run created by a person unless it matches the template in everything except:

- its name
- its `adhar.io/batch-trigger` label
- the environment variables `ADHAR_BATCH_PARAMS`, `ADHAR_BATCH_TRIGGER`, `ADHAR_BATCH_RESTART_OF`, `ADHAR_BATCH_COMMAND` and `ADHAR_BATCH_EXECUTION_ID`

So nobody can change the image, the resources or the command of one run. Change the BatchJob in Git instead. In prod, a Job created by a person must also name a BatchJob through the `adhar.io/batch-job` label, which the template already carries.

### Parameters and a run's identity

`spec.parameters.parameters` declares the job's parameters: their type, whether they are required, a default, a pattern and a list of allowed values. Three settings change how a run behaves:

- **`identifying`** (default `true`) makes a parameter part of the Spring Batch JobInstance, and of the run's name. Mark parameters such as `dryRun` as `identifying: false`, so they do not create a separate instance.
- **`source: schedule`** derives the value from the scheduled time in the job's time zone, which is how a nightly job gets its business date. The default, `input`, takes the value from whoever starts the run.
- **`sensitive: true`** masks the value in logs, events and the run's termination summary. Credentials never travel as parameters: read them from a Secret through `envFrom`.

## Operating a job

Each operation is one change to a Kubernetes object. The Console and `adhar batch` send the same change, behind the same permission check.

| Operation | CLI | What happens |
|---|---|---|
| Run now | `adhar batch run <job>` | A `Job` is created from `<name>-run`, named for its identifying parameters |
| Stop | `adhar batch stop <run>` | The run's Job is suspended. The run finishes its current chunk and records `STOPPED` |
| Resume | `adhar batch resume <run>` | The Job is unsuspended. The run continues from its last commit |
| Restart | `adhar batch restart <run>` | A failed run gets a new attempt, `<run>-r<n>`, with the same identifying parameters. Spring Batch re-executes only the steps that did not complete. A run restarts at most 99 times |
| Hold / Release | `adhar batch hold <job> --reason <why>` / `adhar batch release <job>` | The annotation `adhar.io/batch-hold` is set or removed, which suspends or resumes the schedule |

### Holding a job

A **hold** stops a job from starting new runs without a commit, for a freeze, an incident or a migration. It is the annotation `adhar.io/batch-hold`, whose value is the reason:

```bash
adhar batch hold importer --env prod --reason "quarter-end freeze"
adhar batch release importer --env prod
```

`kubectl annotate batchjobs.platform.adhar.io importer adhar.io/batch-hold="<reason>"` does the same, and so do **Hold** and **Release** in the Console.

- A hold suspends the CronJob. A run already in progress carries on.
- The job reports `Held=True` with reason `OnHold`, and `status.held` records the reason and when the hold began.
- Argo CD does not revert a hold, because the annotation is not in Git.
- The Kyverno policy `adhar-batch-hold-only` lets people change only this annotation on a BatchJob. Everything else about the job comes from Git.

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
| `history.ttlSecondsAfterFinished` | `604800` | How long a finished run's `Job` object, and so its record in the Console, is kept |

Not every failure is retried. The run's exit code says whether trying again could help:

- **Retried:** `1` (the JVM failed before the run started), `5` (failed, and a retry may succeed), and a kill (`137`, `143`).
- **Failed at once:** `2` (invalid request), `3` (failed, and retrying will not help), `4` (stopped on request), `6` (abandoned) and `7` (the JobRepository's state is unknown).
- **Not counted:** a pod evicted from a draining node is replaced without using up a retry.

The [reference](/docs/reference/batch-job-api#exit-codes) has the full table.

### The runner contract

The platform does not ship a batch framework. Your application reads its instructions from the environment and reports its outcome through its exit code. The variables that matter most:

| Variable | Contents |
|---|---|
| `ADHAR_BATCH_JOB` | The Spring Batch job's bean name, from `spec.parameters.job` |
| `ADHAR_BATCH_PARAMS` | The run's parameters as a JSON object. `{}` for a scheduled run |
| `ADHAR_BATCH_TRIGGER` | `schedule` or `manual` |
| `ADHAR_BATCH_TIME_ZONE` | The schedule's time zone |
| `ADHAR_BATCH_SHUTDOWN_TIMEOUT` | How long to wind down after SIGTERM: the grace period minus 30 seconds, at least 10 seconds |
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | The JobRepository database, from the keys `jdbc-uri`, `username` and `password` of `database.secretRef` |

These names belong to the runner. Setting any of them, or anything starting with `ADHAR_BATCH_`, in `env` is refused. The [reference](/docs/reference/batch-job-api#the-run-pod) lists the whole environment.

When it exits, the runner writes a one-line JSON **termination summary** to `/dev/termination-log` and to stdout: the job, instance and execution ids, the status, exit code, trigger, business date and item counts. The Console and `adhar batch runs` show it.

### Sizing

A run pod requests 1 CPU and 1536Mi of memory by default.

- **The memory request always equals the limit**, because the run the kernel kills under memory pressure is the overcommitted one. Below 1Gi, a Spring Batch JVM does not start reliably.
- **The CPU limit equals the CPU request** unless you set `resources.cpuLimit`, which may not be lower than the request.
- **The JVM's fixed regions are trimmed** to 50 threads and a 64M code cache, leaving more of the limit for the heap. Change them under `jvm`, and add options with `jvm.options`.

## Capacity and priority

Batch work never pushes a service aside.

- **Priority.** Runs use the PriorityClass `adhar-batch`, below ordinary workloads. `priority: critical` uses `adhar-batch-critical`, in prod only. Neither class preempts anything.
- **Draining nodes.** With `disruption: avoid` (the default), the platform's node autoscaler will not drain a node a run is on. `disruption: allow` lets it drain the node, which stops the run gracefully and restarts it from its last commit.
- **Buying nodes.** A pending run does not make the node autoscaler add a node unless the job sets `scaleUp: true`, which only prod accepts. A dev or test backlog waits for capacity instead.

## Scheduler

`scheduler` chooses what places a run's pods:

| `scheduler` | Behaviour |
|---|---|
| `auto` (default) | Runs on Volcano where it is installed and your team's queue is open. Runs on plain Kubernetes otherwise |
| `kubernetes` | Always plain Kubernetes |
| `volcano` | Requires Volcano. Without it, the job reports `PrerequisitesReady=False` and its schedule stays suspended |

**Volcano is off in every profile, so `auto` resolves to plain Kubernetes today.** `status.scheduler` shows what a job resolved to.

### Volcano and partitioned jobs

> **Status:** `status:in-progress` — the API accepts these settings. Volcano stays off until a platform engineer enables it.

A platform engineer enables Volcano by turning on the `volcano` and `adhar-batch-volcano` packages together. Every BatchJob on `scheduler: auto` then moves onto Volcano at its next reconcile, with no edit to the job.

**Queues.** Each team gets three queues under the root `adhar-batch`, one per tier: `<organisation>-<team>-dev`, `-test` and `-prod`. A run uses the queue of its namespace's tier, and Kyverno refuses any other. Dev and test queues have no guaranteed share. The prod queue has one, so a prod run can take capacity back from dev or test runs, which stop at their next chunk boundary and resume later. The `QueueFits` condition warns when a run does not fit its queue.

**Partitioned jobs.** `mode: partitioned` runs one manager and `workers` worker pods that share the job's partitions through the JobRepository database:

| | Plain Kubernetes | Volcano |
|---|---|---|
| `mode: single` | A `Job` | The same `Job`, placed by Volcano in your queue |
| `mode: partitioned` | An Indexed `Job`: index 0 is the manager, the rest are workers | A Volcano Job whose manager and workers start all together or not at all (a *gang*) |
| PriorityClass | `adhar-batch` / `adhar-batch-critical` | `adhar-batch-volcano` / `adhar-batch-volcano-critical` |
| Stop / Resume | The Job is suspended or unsuspended | A Volcano `AbortJob` or `ResumeJob` command |

A partitioned job whose pods together need more than the namespace's quota is refused when it is declared, not when it runs. On Volcano, batch runs can preempt each other, but never a service.

## Delivery

A batch job is delivered like any other application:

1. Create it from the **Spring Batch Job** template (`springboot-batch-service`) in the Console. The template writes the job, its tests and a `deploy/` tree, and registers an `Application` with `type: batch`.
2. The repository's `deploy/envs/<env>` overlays place the BatchJob in each environment. The template's dev overlay suspends the schedule, so a dev run starts only when a person starts it.
3. Kargo promotes the image dev → test → prod, and Argo CD syncs each overlay.

Kargo pins the promoted image into `spec/parameters/image`. Kustomize only knows where to write it because the template's `deploy/base/kustomizeconfig.yaml` names that path. If you write the BatchJob by hand, add it yourself:

```yaml
# kustomizeconfig.yaml, listed under `configurations:` in the kustomization
images:
  - path: spec/parameters/image
    group: platform.adhar.io
    kind: BatchJob
```

**Verification passes on silence and fails on evidence.** Before Kargo promotes a batch application onward, the BatchJob's Argo CD Application must be Healthy, no run that started during verification may have failed, and no run pod may have been killed for running out of memory. A window with no run at all passes. Batch applications skip the test-tier resilience gate (load and chaos testing) that services go through.

## In the Console

**Develop → Batch** lists every batch job the signed-in user can see, grouped by application. The page is available to the roles platform-admin, platform-engineer and developer. If the cluster does not serve BatchJobs, it says that Batch is not available.

- **Jobs** shows each job's schedule, next run, last run, last success and SLA, with totals for running, failed, held and SLA-breached jobs. A batch application whose BatchJob is not deployed yet appears as *not deployed yet*.
- **Runs** shows each run's status, trigger, actor, business date, attempts, duration and exit code.
- **Queues** shows each team's Volcano queues. The tab appears only on a cluster that runs Volcano.
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
- **Roles.** `adhar-batch-view` and `adhar-batch-edit` are aggregated into the built-in `view`, `edit` and `admin` roles. In each prod environment, the Environment binds `adhar-batch-operator` to the team's group, so the team can run and hold its jobs there. Set `batchOperations: none` on the Project or the Environment to withhold it.
- **If Kyverno is down, manual runs stop but scheduled runs do not.** The run-integrity policy fails closed for runs created by people. It does not apply to runs the CronJob controller creates.
- **Run pods** run as non-root, with privilege escalation off, every capability dropped and the default seccomp profile. `/tmp` is a size-limited `emptyDir`, and no persistent volume is mounted.

> **Warning:** A `Bucket`'s connection Secret holds the object store's root credential. A run that mounts it through `envFrom` can read and write every bucket on the platform. Use a bucket for one team only.

The [reference](/docs/reference/batch-job-api#permissions) lists every role's verbs and every policy.

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

**Dashboards.** The Grafana **Batch** dashboard, in the **Delivery** folder, shows active, failed and pending runs and suspended schedules across the platform. It is built from kube-state-metrics, so it works in every profile. Each batch application also has its own `batch-jvm` dashboard: runs, JVM metrics, resources, logs and traces.

**Telemetry.** Runs push metrics and traces over OTLP to Alloy, so a run shorter than a scrape interval is still measured. Their logs go to Loki like every other pod's.

## Packages

| Package | Profiles | Role |
|---|---|---|
| `core/adhar-batch` | On everywhere | The priority classes, roles, policies and dashboard BatchJobs need. Without it, a BatchJob reports `PrerequisitesReady=False` and its schedule is suspended |
| `core/volcano` (v1.16.0) and `core/adhar-batch-volcano` | Off everywhere, opt-in | The Volcano scheduler, and the queue policies that go with it. Enable both together |
| `application/argo-workflows` (v4.1.6) | On in production, off in local and gitops | A workflow engine. It runs the platform's own maintenance tasks, and its UI is for platform staff only. It does not run BatchJobs |

> **Note:** The `Pipeline` API runs on Tekton only. The `pipeline-argo-workflows` composition was removed in v0.1.68, so a `Pipeline` that selected it must move to `pipeline-tekton`.

## Limits

| Not provided | What to do instead |
|---|---|
| Changing a run's image or resources without a commit | Change the BatchJob in Git |
| A run history beyond the Job's TTL | Spring Batch's JobRepository keeps the full history. Raise `history.ttlSecondsAfterFinished` to keep runs visible longer |
| A NetworkPolicy, bucket or storage per job | Reach buckets and other services through `envFrom` Secrets |
| Jobs that run inside a long-running service, on sub-minute or business-hours schedules | `status:planned`. Use a BatchJob for anything that fires every ten minutes or less often |
| Calendars, `dependsOn`, `finishBy`, retention | `status:planned`. The schema refuses these fields rather than ignoring them |

## Next steps

- **[BatchJob API reference](/docs/reference/batch-job-api)** — every field, condition, composed object, alert, policy and `adhar batch` command
- **[Functions](/docs/core-concepts/functions)** — for short, event-driven work
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages and Releases in depth
- **[Observability](/docs/operations/observability)** — logs, metrics and traces
