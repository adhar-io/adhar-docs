---
title: "BatchJob API Reference"
section: "Reference"
order: 3
path: "/docs/reference/batch-job-api"
---

# BatchJob API Reference

This page is the complete reference for the `BatchJob` resource. It lists:

- every field, with its type, default and limits
- every status field and condition reason
- every object the composition creates, and the run pod it describes
- every check that refuses a BatchJob
- the alerts, roles and policies that come with it

It is for anyone writing or debugging a `BatchJob` by hand. [Batch Jobs](/docs/core-concepts/batch) explains the model and what has shipped so far.

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
| `scheduler` | `auto`, `kubernetes` or `volcano` | `auto` | `auto` and `kubernetes` run on the native path. `volcano` is refused with `PrerequisitesReady=False` until Volcano support ships |

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
| `resources.cpuLimit` | quantity | unset | Unset means no CPU limit |
| `resources.tmpSize` | quantity | `1Gi` | The size limit of the `/tmp` `emptyDir` |
| `jvm.threads` | integer, at least `1` | `50` | `BPL_JVM_THREAD_COUNT` for the Paketo memory calculator |
| `jvm.codeCache` | string | `64M` | `-XX:ReservedCodeCacheSize` |
| `jvm.options` | string | — | Appended to `JAVA_TOOL_OPTIONS` |

### Retries, timeouts and history

| Field | Type | Default | Description |
|---|---|---|---|
| `retry.backoffLimit` | integer, `0`–`10` | `2` | How many times a failed pod is replaced. See [Exit codes](#exit-codes) for what counts |
| `timeouts.activeDeadlineSeconds` | integer, at least `300` | `21600` | The hard stop of one run |
| `timeouts.terminationGracePeriodSeconds` | integer, `30`–`900` | `120` | How long a stopping run has to finish its chunk. Must be shorter than `activeDeadlineSeconds` |
| `history.successfulJobsHistoryLimit` | integer, at least `0` | `3` | Successful scheduled runs the CronJob keeps |
| `history.failedJobsHistoryLimit` | integer, at least `0` | `3` | Failed scheduled runs the CronJob keeps |
| `history.ttlSecondsAfterFinished` | integer, at least `0` | `604800` | How long any finished run's `Job` stays, however it started |

### Capacity

| Field | Type | Default | Description |
|---|---|---|---|
| `priority` | `standard` or `critical` | `standard` | PriorityClass `adhar-batch`, or `adhar-batch-critical` in prod only. Neither preempts anything |
| `disruption` | `avoid` or `allow` | `avoid` | `avoid` keeps the node autoscaler from draining a node a run is on. `allow` lets it, which stops the run gracefully and restarts it from its last commit |
| `scaleUp` | boolean | `false` | Whether a run stuck for capacity may make the node autoscaler add a node. Prod only |

### Database and environment

| Field | Type | Default | Description |
|---|---|---|---|
| `database.secretRef` | string | — | **Required.** The Secret holding `jdbc-uri`, `username` and `password` for Spring Batch's JobRepository. Usually the CNPG application Secret of the application's own `Database` |
| `database.schema` | string, matching `^[a-z_][a-z0-9_]*$` | `batch` | The schema of the JobRepository's tables |
| `env` | map of strings | — | Extra environment variables. The runner's own names are refused: anything starting with `ADHAR_BATCH_`, and `ADHAR_ENVIRONMENT`, `POD_NAME`, `POD_UID`, `NODE_NAME` and `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` |
| `envFrom` | list | — | Secrets and ConfigMaps exposed as environment variables, as on any container |

### SLA and alerts

| Field | Type | Default | Description |
|---|---|---|---|
| `sla.maxDuration` | duration, such as `3h` or `90m` | the deadline | A run longer than this raises `BatchRunTooLong`. `activeDeadlineSeconds` stays the hard stop |
| `alerts.enabled` | boolean | `true` | `false` composes no PrometheusRule |
| `alerts.staleAfter` | duration | `26h` | `BatchNoRecentSuccess` fires when the last success is older than this. Set it above the job's cadence |
| `alerts.severity` | `auto`, `warning` or `critical` | `auto` | `auto` is critical in prod and warning elsewhere |

### Placement

| Field | Type | Description |
|---|---|---|
| `organisation`, `team`, `project` | string | Never needed. The namespace's labels decide, and a value that disagrees is reported on `Placement` |
| `environment` | `dev`, `test` or `prod` | The same |

### Fields not accepted yet

The schema is strict, so these later-phase fields are **refused, not ignored**: `mode`, `workers`, `gridSize`, `resources.workerCpu`, `resources.workerMemory`, `retry.maxRetry`, `schedule.calendar`, `sla.finishBy`, `sla.timeZone`, `dependsOn`, `retention` and `smoke`.

## Holds

The annotation `adhar.io/batch-hold` on the BatchJob holds it. Its value is the reason; an empty value reads `no reason given`. While it is set, the CronJob is suspended and `status.held` is present. Removing the annotation releases the hold. People may change only this annotation on a BatchJob; see [Policies](#policies).

## Status

| Field | Description |
|---|---|
| `scheduler` | The scheduler the job's runs resolved to. Always `kubernetes` in this release |
| `queue` | The Volcano queue. Not set in this release |
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
| | False | `SchedulerUnavailable` | `scheduler: volcano` was asked for |
| `TemplateReady` | True | `Published` | Runs start from `<name>-run` |
| | Unknown | `Creating` | The run template is not created yet |
| `ScheduleReady` | True | `OnDemand` | No schedule; the job runs when started |
| | True | `Scheduled` | The CronJob is running the schedule |
| | True | `Held` | Scheduled, but suspended by a hold |
| | True | `SuspendedInGit` | Scheduled, but `schedule.suspend` is set |
| | False | `PrerequisitesMissing` | Suspended because a prerequisite is missing |
| | Unknown | `Creating` | The CronJob is not created yet |
| `Held` | True | `OnHold` | `held: <reason>` |
| | False | `NotHeld` | |
| `Placement` | True | `EnvironmentNamespace` | The namespace decided the placement, as expected |
| | True | `ParameterOverridden` | A placement parameter disagreed with the namespace and was ignored |

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
| CronJob | `<name>` | With `schedule` | `schedule`, `timeZone`, `startingDeadlineSeconds`, `concurrencyPolicy`, the history limits, and `suspend` when the schedule is suspended in Git, the job is held or a prerequisite is missing. Its job template is the run template's Job, with the trigger `schedule` |
| PrometheusRule | `<name>-batch` | `alerts.enabled` | The [alerts](#alerts) |

### The run template

The ConfigMap `<name>-run` holds:

| Key | Contents |
|---|---|
| `template.yaml` | A complete `batch/v1` Job with no name and the trigger `manual` |
| `parameters.json` | The declared parameters, with every default written out |
| `kind` | `Job` |
| `naming` | `v1`: the Console names a run `<name>-` and the first eight hex characters of a SHA-256 of the identifying parameters' canonical JSON |

A run created from it may change only its name, its `adhar.io/batch-trigger` label, and the environment variables `ADHAR_BATCH_PARAMS`, `ADHAR_BATCH_TRIGGER`, `ADHAR_BATCH_RESTART_OF`, `ADHAR_BATCH_COMMAND` and `ADHAR_BATCH_EXECUTION_ID`.

### The run Job

| Field | Value |
|---|---|
| `parallelism`, `completions` | `1` |
| `backoffLimit` | `retry.backoffLimit` |
| `activeDeadlineSeconds` | `timeouts.activeDeadlineSeconds` |
| `ttlSecondsAfterFinished` | `history.ttlSecondsAfterFinished` |
| `podReplacementPolicy` | `Failed` |
| `podFailurePolicy` | `Ignore` when the pod has the condition `DisruptionTarget`; `FailJob` when the `batch` container exits `2`, `3`, `4`, `6` or `7` |

### The run pod

| Field | Value |
|---|---|
| `restartPolicy` | `Never` |
| `schedulerName` | `default-scheduler` |
| `priorityClassName` | `adhar-batch`, or `adhar-batch-critical` |
| `terminationGracePeriodSeconds` | `timeouts.terminationGracePeriodSeconds` |
| `enableServiceLinks` | `false` |
| `securityContext` | `runAsNonRoot: true`, `seccompProfile: RuntimeDefault` |
| Volumes | `tmp`, an `emptyDir` limited to `resources.tmpSize`, mounted at `/tmp` |
| Annotations | `adhar.io/batch-actor` (filled in by Kyverno); `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` with `disruption: avoid` |
| Container `batch` | `allowPrivilegeEscalation: false`, every capability dropped. Requests `resources.cpu` and `resources.memory`; limits `resources.memory`, and `resources.cpuLimit` when set |

The container's environment:

| Variable | Value |
|---|---|
| `ADHAR_BATCH_JOB` | `job` |
| `ADHAR_BATCH_NAME` | The BatchJob's name |
| `ADHAR_BATCH_ROLE` | `single` |
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

Entries in `env` override the `OTEL_*`, `BPL_*` and `JAVA_TOOL_OPTIONS` defaults.

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

Runs and their pods also carry `adhar.io/batch-role: single`, `adhar.io/batch-trigger` (`schedule` or `manual`), and `adhar.io/scale-up: "true"` when `scaleUp` is set.

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
| `adhar-batch-critical-prod-only` | Enforce | `adhar-batch-critical` and `adhar.io/scale-up: "true"` only in prod namespaces |
| `adhar-batch-hold-only` | Enforce | Anyone but Argo CD and Crossplane may change only `adhar.io/batch-hold` on a BatchJob |
| `adhar-batch-pod-standards` | Audit | Memory request equals limit, `restartPolicy: Never`, a batch PriorityClass, no PVC, a deadline and a TTL |

## Command line

There is no `adhar batch` command yet. Use `kubectl`:

```bash
kubectl get batchjobs.platform.adhar.io -A                     # SCHEDULE, SCHEDULER, LAST-SUCCESS, HELD
kubectl -n prod describe batchjobs.platform.adhar.io importer  # status and conditions
kubectl -n prod get jobs -l adhar.io/batch-job=importer        # its runs
kubectl -n prod annotate batchjobs.platform.adhar.io importer adhar.io/batch-hold="quarter-end freeze"
```

[Starting a run by hand](/docs/core-concepts/batch#starting-a-run-by-hand) shows how to create a run from the template.

## See also

- **[Batch Jobs](/docs/core-concepts/batch)** — the model behind these fields, and what has shipped
- **[Functions](/docs/core-concepts/functions)** — for short, event-driven work
- **[Control Plane](/docs/core-concepts/control-plane)** — how XRDs and Compositions work
