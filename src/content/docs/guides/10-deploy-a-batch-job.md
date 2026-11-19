---
title: "Deploy a Batch Job"
section: "Guides"
order: 10
path: "/docs/guides/deploy-a-batch-job"
---

# Deploy a Batch Job

This guide takes a Spring Batch job from the template to a scheduled run in prod. You create the job, run it by hand in dev, give it a business deadline and a smoke run, promote it, and backfill a week of dates. It takes the default project `adhar` and a local platform; on a cloud platform only the host name changes.

For the model behind each step, see [Batch Jobs](/docs/core-concepts/batch). For every field and command, see the [BatchJob API reference](/docs/reference/batch-job-api).

## What you'll build

A job called `importer` that reads input in chunks, transforms each item and writes it out, with its JobRepository in its own PostgreSQL database:

```diagram
nsv-batch-guide
```

## Prerequisites

- **A running platform** from the [Quick Start](/docs/getting-started/quick-start). Check: `adhar get status` shows the platform Ready.
- **Batch, CI and promotion packages:** `adhar-batch`, `tekton`, `adhar-supply-chain`, `harbor`, `kargo`, `argo-rollout` and `cert-manager`. All are on in both profiles. Check: `adhar stack status adhar-batch` and `adhar stack status kargo`.
- **Permission to create from templates** in the Console, or the `adhar` CLI signed in (`adhar auth whoami`).
- **`git`** on your machine, and Gitea credentials to clone the repository: `adhar get secrets -p gitea`.

## Step 1 — Create the job

**In the Console**, open **Create**, pick **Spring Batch Job (Adhar Kit)** and fill in:

| Field | Value |
|---|---|
| Name | `importer` |
| Execution model | `cron` |
| Cron schedule | `30 1 * * *` |
| Time zone | `Asia/Singapore` |
| Maximum run duration | `180` minutes |

**Or from the CLI:**

```bash
adhar application deploy importer --template springboot-batch-service \
  --param batchMode=cron --param schedule="30 1 * * *" --param timeZone=Asia/Singapore --wait
```

The template creates the repository `adhar/importer` in Gitea, registers an `Application` of type `batch` and triggers the first build.

**Check:**

```bash
kubectl -n adhar-system get applications.platform.adhar.io importer    # READY True
```

## Step 2 — Look at what you got

```text
importer/
├── src/main/java/io/adhar/service/
│   └── BatchConfiguration.java       # the job: a partitioned, chunk-oriented step
├── src/test/java/io/adhar/service/
│   ├── BatchJobContractTest.java     # the code and batchjob.yaml declare the same parameters
│   └── EnterpriseJobIT.java          # the whole job against a Testcontainers PostgreSQL
└── deploy/
    ├── base/
    │   ├── batchjob.yaml             # the BatchJob: job, image, schedule, parameters, SLA
    │   ├── database.yaml             # its PostgreSQL, which also holds the JobRepository
    │   └── kustomizeconfig.yaml      # lets Kargo pin the image into the BatchJob
    └── envs/
        ├── dev/                      # schedule suspended: runs only when you start one
        ├── test/                     # the real schedule
        └── prod/                     # adds priority: critical
```

The BatchJob declares two parameters, and they are the run's identity:

| Parameter | Type | Where it comes from |
|---|---|---|
| `businessDate` | `date` | The scheduled time, in `Asia/Singapore` (`source: schedule`). Give it yourself on a manual run |
| `source` | `string` | `file` (the default), `database` or `list`: where the run reads from |

`BatchConfiguration.java` declares the same two on `@AdharBatchJob`. `BatchJobContractTest` fails the build if they ever disagree. See [the kit's Batch module](/adhar-kit/modules/batch).

## Step 3 — Watch the first build reach dev

Every push runs `app-ci`: it builds the image, runs the tests (the contract test among them), scans and signs it. Kargo then promotes the signed digest into `dev`, and Argo CD syncs `deploy/envs/dev`.

```bash
tkn -n adhar-system pipelinerun list | grep importer           # the build, with the Tekton CLI
kubectl -n dev get batchjobs.platform.adhar.io importer         # READY True
adhar batch describe importer                                   # dev is the default namespace
```

**Check:** `describe` shows the schedule `30 1 * * *` in `Asia/Singapore`, the two parameters, and the conditions `TemplateReady=True` and `ScheduleReady=True` with reason `SuspendedInGit`: dev never runs on its own.

## Step 4 — Run it in dev

Start a run for one business date and follow it:

```bash
adhar batch run importer -p businessDate=2026-11-03 --wait --follow
```

The run is named `importer-<hash8>` after its identifying parameters. `--wait` exits with the run's exit code.

**Check:**

```bash
adhar batch runs importer          # one run: succeeded, trigger manual, exit 0
```

Now ask for the same date again:

```bash
adhar batch run importer -p businessDate=2026-11-03 --wait
```

**Check:** the CLI finds the existing run instead of starting a second one. The name is the identity: the same parameters never run twice. A different `businessDate`, or `-p source=list`, is a different run.

## Step 5 — Operate it

Try each operation once. The Console's **Develop → Batch** page has the same actions, behind the same permissions.

```bash
adhar batch logs importer-<hash8>                       # the run's pod logs
adhar batch hold importer --reason "trying holds"       # suspend the schedule without a commit
adhar batch describe importer                           # Held=True, with the reason
adhar batch release importer
```

When a run fails, fix the cause and restart it. The restart is `<run>-r1`, with the same identity, and Spring Batch re-runs only the steps that did not complete:

```bash
adhar batch runs importer --status failed
adhar batch restart importer-<hash8> --wait
```

**Check:** `adhar batch runs importer` lists the restart with trigger `restart`.

## Step 6 — Add a deadline and a smoke run

Clone the repository and edit `deploy/base/batchjob.yaml`. Add a business deadline, and the parameters of the run that must pass in test before a build can reach prod:

```yaml
spec:
  parameters:
    # …
    sla:
      maxDuration: 180m
      finishBy: "06:00"             # the business deadline, in the schedule's time zone
    smoke:
      parameters:
        businessDate: "2026-01-02"
        source: list                # a small, fixed input
```

Commit and push:

```bash
git clone https://gitea.adhar.localtest.me:8443/adhar/importer.git && cd importer   # https://gitea.<host> on a cloud
# edit deploy/base/batchjob.yaml
git commit -am "Add a deadline and a smoke run" && git push
```

**Check:** once the new build reaches dev, `adhar batch describe importer` shows `finishBy 06:00` and the smoke parameters. Neither changes how dev runs.

## Step 7 — Promote to test and prod

**Test** takes the new digest automatically once dev is verified. Because the BatchJob sets `smoke`, test's verification runs `importer-smoke-<sha7>` and waits for it:

```bash
adhar batch runs importer --env test     # importer-smoke-<sha7>, trigger smoke, exit 0
adhar batch list --env test              # the real schedule, not suspended
```

**Check:** the smoke run succeeded, and the build is verified in test. A build whose smoke run fails stops here and never reaches prod.

**Prod** takes a build only through a `Release` naming the verified Freight. Find the Freight and create the Release as [Promote Across Environments](/docs/guides/promote-across-environments) shows, with `application: importer` and `environment: prod`.

**Check:**

```bash
adhar batch describe importer --env prod     # scheduled, priority critical
```

From now on the job runs every night at 01:30 Singapore time. The batch observer warns before 06:00 if a run is forecast to miss its deadline (`BatchDeadlineEndangered`), and alerts if it does (`BatchDeadlineMissed`).

## Step 8 — Backfill a week

The feed for the first week of November arrived late. Run one job per date, two at a time:

```bash
adhar batch backfill importer --env test --from 2026-11-01 --to 2026-11-07 --parallel 2 --wait
```

**Check:** `adhar batch runs importer --env test` lists seven runs, trigger `backfill`, one per date. Running the same backfill again starts nothing for a date that succeeded or is still running, and restarts a date that failed as its next `-r<n>`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The build fails in `BatchJobContractTest` | `@AdharBatchJob` and `deploy/base/batchjob.yaml` declare different parameters | Change both together; the failure lists every difference |
| `kubectl get batchjobs` shows `SYNCED False` | The composition refused the definition | Read the message: `kubectl -n dev describe batchjobs.platform.adhar.io importer`. The [reference](/docs/reference/batch-job-api#validation) lists every refusal |
| `PrerequisitesReady=False`, `PriorityClassMissing` | `adhar-batch` is not installed | `adhar stack status adhar-batch` |
| A run exits `2` | Invalid request: a parameter failed validation, or the job name is unknown | `adhar batch logs <run>` names the parameter. A scheduled run needs its `businessDate` to resolve from the schedule |
| A manual run is refused at admission | The run differs from the run template | Start runs with `adhar batch run` or the Console, never by editing a Job |
| A run stays `pending` | The environment's quota or the cluster has no room | `kubectl -n dev describe resourcequota`; `BatchRunStuckPending` fires after 15 minutes |
| The smoke run never appears in test | `smoke` is not set on the BatchJob, or the new image has not reached the run template yet | `adhar batch describe importer --env test`; verification waits until the template carries the new image |
| `adhar batch history` returns nothing | No event bus: Kafka is on in the production profile only | Use `adhar batch runs`, which reads the cluster |

## Clean up

```bash
adhar application delete importer
```

This deletes the Application claim; Crossplane and Argo CD then remove what it composed in every environment, BatchJobs included.

## Next steps

- **[Batch Jobs](/docs/core-concepts/batch)** — dependencies between jobs, calendars, events and Volcano
- **[The kit's Batch module](/adhar-kit/modules/batch)** — writing steps, fault tolerance, readers, writers and partitioning
- **[BatchJob API reference](/docs/reference/batch-job-api)** — every field, condition and command
- **[Promote Across Environments](/docs/guides/promote-across-environments)** — Freight, Stages and Releases in depth
