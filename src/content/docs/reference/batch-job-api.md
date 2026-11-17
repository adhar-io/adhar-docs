---
title: "BatchJob API Reference"
section: "Reference"
order: 3
path: "/docs/reference/batch-job-api"
---

# BatchJob API Reference

This page lists every field, status condition, composed object, alert, policy and `adhar batch` command of the `BatchJob` resource. Use it when you write or debug a `BatchJob` by hand. [Batch Jobs](/docs/core-concepts/batch) explains the model.

## At a glance

| | |
|---|---|
| **Group / version / kind** | `platform.adhar.io` / `v1alpha1` / `BatchJob` |
| **Plural** | `batchjobs`: `kubectl get batchjobs.platform.adhar.io` |
| **Scope** | Namespaced, and only in an environment namespace |
| **Definition** | XRD `batchjobs.platform.adhar.io` (Crossplane v2) |
| **Composition** | `batchjob-kubernetes` (default; labels `feature: batchjob`, `provider: kubernetes`), a pipeline of `function-go-templating` and `function-auto-ready` |
| **Printer columns** | `Schedule` (`.spec.parameters.schedule.cron`), `Scheduler` (`.status.scheduler`), `Last-Success` (`.status.lastSuccessfulTime`), `Held` (`.status.held.reason`) |
| **Required** | `spec.parameters.job`, `spec.parameters.image`, `spec.parameters.database.secretRef` |
| **Since** | v0.1.68 |

## A complete example

This scheduled job imports a file every night at 01:30 Singapore time. Leave out `schedule` for a job that only runs when somebody starts it.

```yaml
apiVersion: platform.adhar.io/v1alpha1
kind: BatchJob
metadata:
  name: importer
  namespace: dev                          # an environment namespace decides org, team, project, environment
spec:
  parameters:
    displayName: Nightly importer
    job: importJob                        # the Spring Batch job's bean name
    image: harbor-core.adhar-system.svc.cluster.local/library/importer:1.0.0
    schedule:
      cron: "30 1 * * *"
      timeZone: Asia/Singapore
    parameters:
      - name: businessDate
        type: date
        source: schedule                  # derived from the scheduled time, in timeZone
      - name: source
        default: inbound/records.csv
        pattern: "^[a-zA-Z0-9/._-]+$"
      - name: dryRun
        type: boolean
        identifying: false                # not part of the run's identity
        default: "false"
    resources:
      cpu: "1"
      memory: 1536Mi
    database:
      secretRef: importer-db-app          # CNPG's Secret for the application's Database
    envFrom:
      - secretRef: { name: importer-inbound-bucket }
    sla:
      maxDuration: 3h
```

## spec.parameters

### Identity and image

| Field | Type | Default | Description |
|---|---|---|---|
| `displayName` | string | the object's name | The name people read in the Console |
| `application` | string, a DNS label of at most 63 characters | the object's name | The application the job belongs to. It is stamped as `adhar.io/application` on every run, so verification, dashboards and cost attribution find it. Set it when one application owns several BatchJobs |
| `job` | string, matching `^[A-Za-z][A-Za-z0-9_.-]*$`, at most 128 characters | — | **Required.** The Spring Batch job's bean name, passed to the run as `ADHAR_BATCH_JOB` |
| `image` | string | — | **Required.** The application image. Kargo pins it to a digest in `deploy/envs/<env>` |
| `imagePullSecrets` | list of strings | `[harbor-dockercfg]` | The run pod's pull secrets. An empty list names none |
| `serviceAccountName` | string | the composed `<name>-batch` | Run under an existing ServiceAccount instead. It is still bound to the job's Role |
| `mode` | `single` or `partitioned` | `single` | `single` runs the job in one pod. `partitioned` runs one manager and `workers` workers that share its partitions through the JobRepository database. `status:in-progress` |
| `workers` | integer, `1`–`64` | `4` | The worker pods of a partitioned run, besides its manager. Ignored in single mode |
| `gridSize` | integer, `1`–`1024` | 4 × `workers` | How many partitions the manager splits a partitioned run into |
| `scheduler` | `auto`, `kubernetes` or `volcano` | `auto` | `kubernetes` is plain Kubernetes. `auto` runs on Volcano where it is installed and the team's queue is open, and on plain Kubernetes otherwise. `volcano` insists: without Volcano or the queue, the job reports `PrerequisitesReady=False` and its schedule is suspended |

Volcano is off in every profile, so `auto` resolves to `kubernetes` unless a platform engineer enables the `volcano` and `adhar-batch-volcano` packages.

### Schedule

Leave `schedule` out for an on-demand job.

| Field | Type | Default | Description |
|---|---|---|---|
| `schedule.cron` | string, five fields | — | **Required when `schedule` is set.** When the job runs, read in `timeZone` |
| `schedule.timeZone` | string, an IANA zone | `UTC` | The time zone of the schedule and of the business date |
| `schedule.startingDeadlineSeconds` | integer, at least `60` | `3600` | A fire missed by longer than this is skipped, and `BatchScheduleMissed` says so |
| `schedule.concurrencyPolicy` | `Forbid` or `Allow` | `Forbid` | Whether runs may overlap. `Replace` is refused |
| `schedule.suspend` | boolean | `false` | Pauses the schedule from Git. To pause without a commit, use a [hold](#holds) |

### Job parameters

`parameters` is a list of at most 32 entries, keyed by `name`. It drives the Console's run form and the run's identity.

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string, matching `^[A-Za-z][A-Za-z0-9_.]*$`, at most 64 characters | — | **Required** |
| `type` | `string`, `long`, `double`, `boolean`, `date` or `datetime` | `string` | How the value is read |
| `identifying` | boolean | `true` | Whether the value is part of the JobInstance's identity and of the run's name |
| `required` | boolean | `false` | |
| `default` | string | — | The value used when none is given. Always a string; `type` says how it is read |
| `pattern` | string | — | A regular expression the value must match |
| `allowed` | list of strings | — | The only values accepted |
| `source` | `input` or `schedule` | `input` | `schedule` derives the value from the scheduled time in the job's time zone |
| `sensitive` | boolean | `false` | Masks the value in logs, events and the termination summary |
| `description` | string | — | Shown in the run form |

### Resources and JVM

| Field | Type | Default | Description |
|---|---|---|---|
| `resources.cpu` | quantity | `"1"` | The CPU request |
| `resources.memory` | quantity | `1536Mi` | The memory request **and** limit. Below 1Gi a Spring Batch JVM does not start reliably |
| `resources.cpuLimit` | quantity | the CPU request | The CPU limit of every run pod. A value below a CPU request is refused |
| `resources.workerCpu` | quantity | `resources.cpu` | A partitioned run's worker CPU request. `resources.cpu` then sizes the manager alone |
| `resources.workerMemory` | quantity | `resources.memory` | A partitioned run's worker memory, request and limit |
| `resources.tmpSize` | quantity | `1Gi` | The size limit of the `/tmp` `emptyDir` |
| `jvm.threads` | integer, at least `1` | `50` | `BPL_JVM_THREAD_COUNT` for the Paketo memory calculator |
| `jvm.codeCache` | string | `64M` | `-XX:ReservedCodeCacheSize` |
| `jvm.options` | string | — | Appended to `JAVA_TOOL_OPTIONS` |

### Retries, timeouts and history

| Field | Type | Default | Description |
|---|---|---|---|
| `retry.backoffLimit` | integer, `0`–`10` | `2` | How many times a failed pod is replaced on plain Kubernetes. See [Exit codes](#exit-codes) for what counts |
| `retry.maxRetry` | integer, `0`–`10` | `3` | How many times Volcano restarts a partitioned run's whole gang after a pod fails or is evicted |
| `timeouts.activeDeadlineSeconds` | integer, at least `300` | `21600` | The hard stop of one run |
| `timeouts.terminationGracePeriodSeconds` | integer, `30`–`900` | `120` | How long a stopping run has to finish its chunk. Must be shorter than `activeDeadlineSeconds` |
| `history.successfulJobsHistoryLimit` | integer, at least `0` | `3` | Successful scheduled runs the CronJob keeps |
| `history.failedJobsHistoryLimit` | integer, at least `0` | `3` | Failed scheduled runs the CronJob keeps |
| `history.ttlSecondsAfterFinished` | integer, at least `0` | `604800` | How long any finished run's `Job` stays, however it started |

### Capacity

| Field | Type | Default | Description |
|---|---|---|---|
| `priority` | `standard` or `critical` | `standard` | PriorityClass `adhar-batch`, or `adhar-batch-critical` in prod only. Neither preempts anything. A run on Volcano uses `adhar-batch-volcano` or `adhar-batch-volcano-critical`, with which Volcano preempts among batch runs only |
| `disruption` | `avoid` or `allow` | `avoid` | `avoid` keeps the node autoscaler from draining a node a run is on. `allow` lets it, which stops the run gracefully and restarts it from its last commit |
| `scaleUp` | boolean | `false` | Whether a run stuck for capacity may make the node autoscaler add a node. Prod only |

### Database and environment

| Field | Type | Default | Description |
|---|---|---|---|
| `database.secretRef` | string | — | **Required.** The Secret holding `jdbc-uri`, `username` and `password` for Spring Batch's JobRepository. Usually the CNPG application Secret of the application's own `Database` |
| `database.schema` | string, matching `^[a-z_][a-z0-9_]*$` | `batch` | The schema of the JobRepository's tables |
| `env` | map of strings | — | Extra environment variables. The runner's own names are refused: anything starting with `ADHAR_BATCH_`, and `ADHAR_ENVIRONMENT`, `POD_NAME`, `POD_UID`, `NODE_NAME`, `JOB_COMPLETION_INDEX` and `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` |
| `envFrom` | list | — | Secrets and ConfigMaps exposed as environment variables, as on any container |

### SLA and alerts

| Field | Type | Default | Description |
|---|---|---|---|
| `sla.maxDuration` | duration, such as `3h` or `90m` | `timeouts.activeDeadlineSeconds` | A run longer than this raises `BatchRunTooLong`. `activeDeadlineSeconds` stays the hard stop |
| `alerts.enabled` | boolean | `true` | `false` composes no PrometheusRule |
| `alerts.staleAfter` | duration | `26h` | `BatchNoRecentSuccess` fires when the last success is older than this. Set it above the job's cadence |
| `alerts.severity` | `auto`, `warning` or `critical` | `auto` | `auto` is critical in prod and warning elsewhere |

### Placement

| Field | Type | Description |
|---|---|---|
| `organisation`, `team`, `project` | string | Never needed. The namespace's labels decide, and a value that disagrees is reported on `Placement` |
| `environment` | `dev`, `test` or `prod` | The same |

### Fields not accepted yet

The schema is strict, so these `status:planned` fields are **refused, not ignored**: `schedule.calendar`, `sla.finishBy`, `sla.timeZone`, `dependsOn`, `retention` and `smoke`.

## Holds

The annotation `adhar.io/batch-hold` on the BatchJob holds it. Its value is the reason; an empty value reads `no reason given`. While it is set, the CronJob is suspended and `status.held` is present. Removing the annotation releases the hold. People may change only this annotation on a BatchJob; see [Policies](#policies). `adhar batch hold` and `adhar batch release` set and remove it.

## Status

| Field | Description |
|---|---|
| `scheduler` | The scheduler the job's runs resolved to: `kubernetes` or `volcano` |
| `queue` | The Volcano queue the runs are bound to, when they run on Volcano |
| `runTemplate` | The ConfigMap runs start from: `<name>-run` |
| `cronJob` | The CronJob, when the job has a schedule |
| `lastScheduleTime`, `lastSuccessfulTime` | From the CronJob |
| `activeRuns` | The names of the runs in progress, from the CronJob |
| `held.reason`, `held.since` | Present while the job is held. `since` is set once and kept |
| `message` | A one-line summary: `on demand`, `scheduled "<cron>" in <zone>`, `held: <reason>` or a missing prerequisite, followed by any notes |

### Conditions

Crossplane supplies `Synced` and `Ready`. The composition adds:

| Type | Status | Reason | Meaning |
|---|---|---|---|
| `PrerequisitesReady` | True | `Met` | The job's PriorityClass exists |
| | False | `PriorityClassMissing` | The `core/adhar-batch` package is not installed. The schedule is suspended until it is |
| | False | `SchedulerUnavailable` | `scheduler: volcano` was asked for, and Volcano is not installed |
| | False | `QueueUnavailable` | `scheduler: volcano` was asked for, and the team's queue is missing or closed |
| `TemplateReady` | True | `Published` | Runs start from `<name>-run` |
| | Unknown | `Creating` | The run template is not created yet |
| `ScheduleReady` | True | `OnDemand` | No schedule; the job runs when started |
| | True | `Scheduled` | The CronJob is running the schedule |
| | True | `Held` | Scheduled, but suspended by a hold |
| | True | `SuspendedInGit` | Scheduled, but `schedule.suspend` is set |
| | False | `PrerequisitesMissing` | Suspended because a prerequisite is missing |
| | False | `SwitchPending` | A change of scheduler waits for the run in progress |
| | Unknown | `Creating` | The CronJob is not created yet |
| `Held` | True | `OnHold` | `held: <reason>` |
| | False | `NotHeld` | |
| `QueueFits` | True | `NativeScheduler` | The job runs on plain Kubernetes, which has no queues |
| | True | `Fits` | The run fits its Volcano queue |
| | False | `LeafQueueUnavailable` | The team's queue is missing, closed or another team's. On `scheduler: auto` the job runs on plain Kubernetes until it is fixed |
| | False | `ExceedsCapability` | A run asks for more than the queue's whole capability. Volcano never admits it |
| | False | `ExceedsDeserved` | A prod run asks for more than the queue's guaranteed share. It starts only on idle capacity |
| `SchedulerSwitch` | True | `Settled` | The schedule matches the resolved scheduler |
| | False | `WaitingForRuns` | A partitioned job's change of scheduler waits for the run in progress. Hold the job first to keep another run from starting |
| `Placement` | True | `EnvironmentNamespace` | The namespace decided the placement, as expected |
| | True | `ParameterOverridden` | A placement parameter disagreed with the namespace and was ignored |

`QueueFits` is a warning: Argo CD does not read it.

`Placement`'s message reads `environment <env> of project <project> (team <team>, organisation <org>)`, followed by any notes, such as a warning that the schedule fires more often than every ten minutes.

### In Argo CD

| Health | When |
|---|---|
| Progressing | No conditions yet |
| Degraded | `Synced=False` with `ReconcileError`, or `PrerequisitesReady=False` |
| Healthy | `Ready=True`, including while the job is held |

A failed run never makes the BatchJob, or its Application, unhealthy.

## Composed objects

Everything is created in the BatchJob's namespace.

| Object | Name | When | Contents |
|---|---|---|---|
| ServiceAccount | `<name>-batch` | `serviceAccountName` unset | — |
| Role | `<name>-batch` | Always | `get` on `jobs` (`batch` and `batch.volcano.sh`) and on `pods` |
| RoleBinding | `<name>-batch` | Always | The Role, bound to the run's ServiceAccount |
| ConfigMap | `<name>-run` | Always | The run template, below |
| CronJob | `<name>` | With `schedule` | `schedule`, `timeZone`, `startingDeadlineSeconds`, `concurrencyPolicy`, the history limits, and `suspend` when the schedule is suspended in Git, the job is held or a prerequisite is missing. Its job template is the run template's Job, with the trigger `schedule`. A partitioned job on Volcano gets a `batch.volcano.sh/v1alpha1` CronJob instead |
| PrometheusRule | `<name>-batch` | `alerts.enabled` | The [alerts](#alerts) |

### The run template

The ConfigMap `<name>-run` holds:

| Key | Contents |
|---|---|
| `template.yaml` | The complete run object, with no name and the trigger `manual` |
| `parameters.json` | The declared parameters, with every default written out |
| `kind` | `Job` for `mode: single`. For `mode: partitioned`, `IndexedJob` on plain Kubernetes or `VolcanoJob` on Volcano |
| `naming` | `v1`: the Console names a run `<name>-` and the first eight hex characters of a SHA-256 of the identifying parameters' canonical JSON |

A run created from it may change only its name, its `adhar.io/batch-trigger` label, and the environment variables `ADHAR_BATCH_PARAMS`, `ADHAR_BATCH_TRIGGER`, `ADHAR_BATCH_RESTART_OF`, `ADHAR_BATCH_COMMAND` and `ADHAR_BATCH_EXECUTION_ID`.

### The run Job

For `mode: single`:

| Field | Value |
|---|---|
| `parallelism`, `completions` | `1` |
| `backoffLimit` | `retry.backoffLimit` |
| `activeDeadlineSeconds` | `timeouts.activeDeadlineSeconds` |
| `ttlSecondsAfterFinished` | `history.ttlSecondsAfterFinished` |
| `podReplacementPolicy` | `Failed` |
| `podFailurePolicy` | `Ignore` when the pod has the condition `DisruptionTarget`; `FailJob` when the `batch` container exits `2`, `3`, `4`, `6` or `7` |

A partitioned run on plain Kubernetes is an Indexed Job with `completions` and `parallelism` of `workers` + 1. Index 0 is the manager, and the run ends when it succeeds. On Volcano it is a Volcano Job with the tasks `manager` (1 pod) and `worker` (`workers` pods) and `minAvailable` of `workers` + 1, so all of its pods start together or none do.

### The run pod

| Field | Value |
|---|---|
| `restartPolicy` | `Never` |
| `schedulerName` | `default-scheduler`, or `volcano` |
| `priorityClassName` | `adhar-batch` or `adhar-batch-critical`. On Volcano, `adhar-batch-volcano` or `adhar-batch-volcano-critical` |
| `terminationGracePeriodSeconds` | `timeouts.terminationGracePeriodSeconds` |
| `enableServiceLinks` | `false` |
| `securityContext` | `runAsNonRoot: true`, `seccompProfile: RuntimeDefault` |
| Volumes | `tmp`, an `emptyDir` limited to `resources.tmpSize`, mounted at `/tmp` |
| Annotations | `adhar.io/batch-actor` (filled in by Kyverno); `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` with `disruption: avoid` |
| Container `batch` | `allowPrivilegeEscalation: false`, every capability dropped. Requests `resources.cpu` and `resources.memory`. Limits `resources.memory`, and `resources.cpuLimit` or else the CPU request |

The container's environment:

| Variable | Value |
|---|---|
| `ADHAR_BATCH_JOB` | `job` |
| `ADHAR_BATCH_NAME` | The BatchJob's name |
| `ADHAR_BATCH_ROLE` | `single`. In a partitioned run: `indexed` on plain Kubernetes, `manager` or `worker` on Volcano |
| `ADHAR_BATCH_PARTITION_TRANSPORT`, `_GRIDSIZE`, `_TIMEOUT` | Partitioned runs only: `jdbc`, `gridSize`, and the deadline less 300 seconds (or half the deadline, when that is longer) |
| `ADHAR_BATCH_TRIGGER` | `schedule` or `manual` |
| `ADHAR_BATCH_PARAMS` | `{}`, replaced with the run's parameters on a manual run |
| `ADHAR_BATCH_TIME_ZONE` | `schedule.timeZone` |
| `ADHAR_BATCH_REPOSITORY_SCHEMA` | `database.schema` |
| `ADHAR_BATCH_SHUTDOWN_TIMEOUT` | The grace period minus 30 seconds, at least 10 seconds: `90s` by default |
| `ADHAR_BATCH_K8S_JOB` | The Job's name, from the label `batch.kubernetes.io/job-name` |
| `ADHAR_BATCH_ACTOR` | The user who created the run, from the annotation `adhar.io/batch-actor` |
| `POD_NAME`, `POD_UID`, `NODE_NAME` | From the downward API |
| `ADHAR_ENVIRONMENT` | The environment |
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | The keys `jdbc-uri`, `username` and `password` of `database.secretRef` |
| `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` | The job's identity |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://alloy.adhar-system.svc.cluster.local:4318`, with `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` and `OTEL_METRICS_EXPORTER=otlp` |
| `BPL_JVM_THREAD_COUNT` | `jvm.threads` |
| `JAVA_TOOL_OPTIONS` | `-XX:ReservedCodeCacheSize=<jvm.codeCache>`, then `jvm.options` |

Entries in `env` override the `OTEL_*`, `BPL_*` and `JAVA_TOOL_OPTIONS` defaults. `OTEL_RESOURCE_ATTRIBUTES` is merged instead: the platform's attributes are appended to yours.

### Labels

Every composed object carries:

| Label | Value |
|---|---|
| `app.kubernetes.io/name` | The BatchJob's name |
| `adhar.io/organisation`, `adhar.io/team`, `adhar.io/project`, `adhar.io/environment` | From the namespace |
| `adhar.io/application` | `application`, or the BatchJob's name |
| `adhar.io/plane` | `workload` |
| `adhar.io/workload` | `batch` |
| `adhar.io/batch-job` | The BatchJob's name |

Runs and their pods also carry `adhar.io/batch-role` (the value of `ADHAR_BATCH_ROLE`), `adhar.io/batch-trigger` (`schedule` or `manual`), `adhar.io/component: app`, and `adhar.io/scale-up: "true"` when `scaleUp` is set.

## Exit codes

| Code | Meaning | Counts toward `backoffLimit` |
|---|---|---|
| `0` | Completed, or there was nothing to do | — |
| `1` | The JVM failed before the run started | Yes |
| `2` | Invalid request | No: the run fails at once |
| `3` | Failed, and retrying will not help | No: the run fails at once |
| `4` | Stopped on request | No: the run fails at once |
| `5` | Failed, and a retry may succeed | Yes |
| `6` | Abandoned | No: the run fails at once |
| `7` | The JobRepository's state is unknown | No: the run fails at once |
| `137` | Killed | Yes |
| `143` | Stopped by SIGTERM | Yes |

A pod lost to a disruption, such as a node drain, does not count either way: it is replaced.

When it exits, the runner writes a one-line JSON termination summary to `/dev/termination-log` and stdout. Treat every field in it as optional.

## Validation

These fail the render. The BatchJob reports `Synced=False` with the message shown.

| Refused | Message |
|---|---|
| A name that is not a DNS-1035 label of at most 40 characters | `BatchJob name … must be a DNS-1035 label of at most 40 characters` |
| A BatchJob in `adhar-system` | `a BatchJob may not live in adhar-system: runs belong in an environment namespace of their project, inside its quota` |
| A namespace without the `adhar.io/environment` label | `namespace … is not an environment namespace` |
| `priority: critical` outside prod | `priority critical is for prod only` |
| `scaleUp: true` outside prod | `… a dev or test backlog never buys a node` |
| `schedule.concurrencyPolicy: Replace` | `… is refused: it would SIGTERM a healthy run whenever the next fire arrives; use Forbid or Allow` |
| A grace period not shorter than the deadline | `timeouts.terminationGracePeriodSeconds … must be shorter than timeouts.activeDeadlineSeconds …` |
| An empty `job`, `image` or `database.secretRef` | `parameters.job, parameters.image and parameters.database.secretRef must all be set` |
| A runner-owned name in `env` | `env … is owned by the runner's contract` |
| `resources.cpuLimit` below a CPU request | The message names both values |
| `mode: partitioned` whose pods together exceed the namespace's ResourceQuota `<namespace>-quota` | The message names every quota key that is over |

The API server also enforces the schema's types, patterns and ranges, and refuses the [fields that are not accepted yet](#fields-not-accepted-yet).

## Alerts

The PrometheusRule `<name>-batch` labels each alert with `severity`, `team`, `adhar_batch_job`, `adhar_application` and `adhar_environment`.

| Alert | Fires when | For | Scheduled jobs only |
|---|---|---|---|
| `BatchRunFailed` | The latest run failed. It resolves when a newer run exists | 1m | |
| `BatchRunTooLong` | A run is older than `sla.maxDuration` | — | |
| `BatchRunStuckPending` | A run pod is Pending | 15m | |
| `BatchRunOOMKilled` | A run pod under 24 hours old was OOM-killed | — | |
| `BatchScheduleMissed` | A fire is more than 600 seconds late, the CronJob is not suspended, and nothing is running | — | Yes |
| `BatchNoRecentSuccess` | The last success is older than `alerts.staleAfter`, and the CronJob is not suspended | — | Yes |

The alerts read run labels from kube-state-metrics, which the platform's `kube-prometheus` package is configured to export.

A partitioned job on Volcano also gets `BatchGangQueueRejected` (its queue has not admitted the run for 30m) and `BatchGangPending` (admitted, but the cluster has had no room for all of its pods for 30m). It gets no `BatchScheduleMissed`.

The `core/adhar-batch` package adds two platform-wide alerts: `BatchRunAdmittedUnchecked` (the API server admitted a run without asking the run-integrity policy) and `BatchRunIntegrityUnenforced` (Kyverno's admission controller is gone).

## Permissions

| ClusterRole | Verbs | Bound to |
|---|---|---|
| `adhar-batch-view` | get, list, watch `batchjobs`; Volcano `jobs`, `cronjobs` and `podgroups` | Aggregated into `view`, `edit`, `admin` |
| `adhar-batch-edit` | patch `batchjobs`; create, delete, patch Volcano `jobs`; create Volcano `commands` | Aggregated into `edit`, `admin` |
| `adhar-batch-operator` | get, list, watch, patch `batchjobs`; get, list, watch, create, delete, patch `batch` `jobs`; get `pods/log` and `configmaps`; create Volcano `jobs` and `commands`; read Volcano `cronjobs` and `podgroups` | RoleBinding `<env>-team-batch-operator` to the group `oidc:ws-team-<org>.<team>`, in each prod environment |

`batchOperations` on a `Project` or an `Environment` (`team` by default, or `none`) decides whether a prod environment gets the operator binding.

### Policies

| Policy | Mode | Rule |
|---|---|---|
| `adhar-batch-run-integrity` | Enforce, fails closed | A `batch/v1` Job labelled `adhar.io/batch-job` and created by anyone but the CronJob controller must match `<batch-job>-run`, apart from the fields a run may change. An image pinned to a digest is accepted |
| `adhar-batch-prod-jobs-name-a-batchjob` | Enforce | In prod, a Job a person creates must carry `adhar.io/batch-job`. Cluster admins are exempt |
| `adhar-batch-actor` | Mutate | Writes the creating user into `adhar.io/batch-actor` on the Job and its pod template |
| `adhar-batch-critical-prod-only` | Enforce | `adhar-batch-critical`, `adhar-batch-volcano-critical` and `adhar.io/scale-up: "true"` only in prod namespaces |
| `adhar-batch-volcano-classes` | Enforce | The two Volcano priority classes only on pods that name `schedulerName: volcano` |
| `adhar-batch-hold-only` | Enforce | Anyone but Argo CD and Crossplane may change only `adhar.io/batch-hold` on a BatchJob |
| `adhar-batch-pod-standards` | Audit | Memory request equals limit, `restartPolicy: Never`, a batch PriorityClass, no PVC, a deadline and a TTL |

The `adhar-batch-volcano` package adds the Volcano halves, where Volcano is enabled:

| Policy | Mode | Rule |
|---|---|---|
| `adhar-batch-queue-default` | Mutate | Puts a Volcano run on its namespace's queue, `<organisation>-<team>-<tier>` |
| `adhar-batch-queue-binding` | Enforce, fails closed | Denies any other queue, another team's queue, and any Volcano Job plugin but `env` |
| `adhar-batch-run-integrity-volcano` | Enforce, fails closed | A Volcano Job labelled `adhar.io/batch-job` and created by a person must match the run template in every task |
| `adhar-batch-volcano-prod-jobs-name-a-batchjob` | Enforce | In prod, a Volcano Job a person creates must name a BatchJob |
| `adhar-batch-volcano-prod-only` | Enforce | `adhar.io/scale-up: "true"` and `adhar-batch-volcano-critical` only in prod namespaces |
| `adhar-batch-volcano-pod-standards` | Audit | Holds Volcano runs to the pod standards |

## Command line

`adhar batch` (aliases `batchjob`, `batchjobs`) runs and operates batch jobs. Every command acts as you, on the same objects the Console uses.

| Command | What it does | Flags |
|---|---|---|
| `list` (alias `ls`) | Lists BatchJobs: `NAME`, `APPLICATION`, `SCHEDULE`, `NEXT RUN`, `LAST RUN`, `LAST SUCCESS`, `HELD`, `STATUS` | `-A/--all-namespaces` |
| `describe <job>` | Shows a job's definition, parameters, schedule, conditions and last runs | |
| `run <job>` | Starts a run from the run template, named `<job>-<hash8>` for its identifying parameters. An existing run of that name is shown instead | `-p/--param key=value` (repeatable), `--wait`, `--follow` (implies `--wait`), `--timeout` (default: `activeDeadlineSeconds` plus ten minutes) |
| `runs <job>` | Lists a job's runs with trigger, actor, business date and exit code | `--status` (`pending`, `running`, `stopping`, `stopped`, `succeeded`, `failed`), `--limit` (default `20`, `0` for all) |
| `logs <run>` | Prints the run's pod logs | `-f/--follow`, `--role` (`manager`, `worker`), `--index` |
| `stop <run>` | Stops a run at its next chunk boundary | |
| `resume <run>` | Resumes a stopped run from its last commit | |
| `restart <run>` | Restarts a failed run as `<run>-r<n>` with the same identifying parameters | |
| `hold <job>` | Holds a job's schedule without a commit | `--reason` (required) |
| `release <job>` | Releases a held job's schedule | |
| `queues` | Lists the Volcano queues with their share and usage | `--team <org>-<team>` |
| `schedules` | Lists the schedules that services report for jobs they run in-process. In-service jobs are `status:planned` | `-A/--all-namespaces` |

Persistent flags:

| Flag | Default | Meaning |
|---|---|---|
| `-n/--namespace` | The `dev` environment's namespace | The job's namespace |
| `--env` | — | The environment (`dev`, `test`, `prod`) whose namespace to use, resolved from the Project. Do not combine it with `-n` |
| `--project` | `adhar` | The Project whose environments `--env` names |
| `-o/--output` | `table` | `table`, `json` or `yaml` |

With `--wait`, `adhar batch run` exits with the run's exit code, and with `4` for a stopped run.

```bash
adhar batch list --env prod
adhar batch run importer --env prod -p businessDate=2026-11-03 --wait --follow
adhar batch runs importer --env prod --status failed
adhar batch logs importer-09932cb3 --env prod -f
adhar batch restart importer-09932cb3 --env prod
adhar batch hold importer --env prod --reason "quarter-end freeze"
```

`kubectl` reads the same objects:

```bash
kubectl get batchjobs.platform.adhar.io -A                     # SCHEDULE, SCHEDULER, LAST-SUCCESS, HELD
kubectl -n prod describe batchjobs.platform.adhar.io importer  # status and conditions
kubectl -n prod get jobs -l adhar.io/batch-job=importer        # its runs
```

[Starting a run by hand](/docs/core-concepts/batch#starting-a-run-by-hand) shows how to create a run from the template with `kubectl`.

## Next steps

- **[Batch Jobs](/docs/core-concepts/batch)** — the model behind these fields
- **[Functions](/docs/core-concepts/functions)** — for short, event-driven work
- **[Control Plane](/docs/core-concepts/control-plane)** — how XRDs and Compositions work
