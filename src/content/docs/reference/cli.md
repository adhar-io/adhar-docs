---
title: "CLI Reference"
section: "Reference"
order: 1
path: "/docs/reference/cli"
---

# CLI Reference

The `adhar` binary creates the platform, converges it, and inspects or drives everything running on it. This page lists every command group by task, with a synopsis, the key flags and their defaults, and one example each. For the final word on any flag, run `adhar <command> --help`.

> **Note:** The platform's package definitions (the *stack*) are built into the binary, so every command works from any directory. The built-in stack is read-only: to change it, run `adhar stack export <dir>` and set `ADHAR_STACK_DIR` to that directory. See [Installation](/docs/getting-started/installation) for the full resolution order.

## At a glance

| | |
|---|---|
| **Aliases** | `adhar`, `a`, `ad` |
| **Config file** | `-f/--file`, else `./config.yaml`, `~/.adhar/config.yaml`, `~/config.yaml` |
| **Stack** | Built into the binary. Override with `-p` (`up`), `--stack-dir` (`stack`, `upgrade`) or `ADHAR_STACK_DIR`; inside a source checkout, `./platform/stack` is used |
| **Cluster** | `--kubeconfig`, else `$KUBECONFIG`, else `~/.kube/config` |
| **Structured output** | `-o json` / `-o yaml` on inspection commands |
| **Exit code** | `0` on success, `1` on failure (the error is printed once, to stderr) |

## Command map

`adhar --help` groups commands by who uses them. This page follows the same grouping.

```diagram
npb-cli-map
```

| Group | For | Start with |
|---|---|---|
| [Administer](#administer-platform-lifecycle) | Creating, changing and removing the platform; governance | `adhar up` |
| [Operate](#operate-day-2) | Upgrades, clusters, scaling, backups | `adhar upgrade --diff-only` |
| [Observe](#observe-health-logs-metrics-and-traces) | Health, logs, metrics, traces | `adhar get status` |
| [Develop](#develop-build-ship-and-self-serve) | Shipping applications and self-service resources | `adhar application deploy` |
| [Utilities](#utilities) | Tooling | `adhar version` |

## How the CLI finds its config and cluster

Every command resolves two things before it acts. Most surprises happen when one of them points somewhere you did not expect.

| It needs | Resolution order | If nothing is found |
|---|---|---|
| A **config file**: which providers and environments exist | `-f/--file`, then `./config.yaml`, `~/.adhar/config.yaml`, `~/config.yaml` | A Kind-only default. That is why a cloud command with no `--file` sees no cloud clusters |
| A **kubeconfig**: which cluster to talk to | `--kubeconfig`, then `$KUBECONFIG`, then `~/.kube/config` | The command fails to reach the platform |

After `adhar up`, the right context is usually already current:

- **Local (Kind).** The context is `kind-adhar`.
- **Cloud.** `adhar up` saves the kubeconfig to `~/.adhar/clusters/<cluster>/kubeconfig` and merges it into your default kubeconfig. The context is `adhar` for the default cluster name, or `adhar-<name>` if you passed `--name`.

```bash
kubectl config current-context      # kind-adhar locally; adhar (or adhar-<name>) on a cloud
adhar get status                    # proves the CLI can reach the platform
```

## Global flags

| Flag | Default | Effect |
|---|---|---|
| `-v, --verbose` | `false` | Verbose output |
| `--debug` | `false` | Debug mode |
| `--log-level <level>` | `info` | `debug`, `info`, `warn`, `error` or `fatal` |
| `--kubeconfig <path>` | — | Kubeconfig for platform requests |
| `--no-color` | `false` | Disable colour (so does `NO_COLOR`) |
| `--colored-logs` | `true` | Colourise log lines |
| `--theme <auto\|dark\|light>` | `auto` | Markdown rendering theme |
| `--no-header` / `--no-footer` | `false` | Hide the banner / sign-off |

## Administer: platform lifecycle

### `adhar up`

Creates or converges the platform: a local Kind cluster by default, or a cloud environment with `-f`.

```text
adhar up [flags]
```

| Flag | Default | Effect |
|---|---|---|
| `-f, --file <path>` | — | Provision from a config file (cloud) |
| `--env <name>` | every environment in the file | Target one environment. Always pass it with `-f` |
| `--name <name>` | `adhar` | Cluster name. `adhar down --name` must match |
| `-d, --dry-run` | `false` | Preview without applying |
| `--recreate` | `false` | **Destructive:** delete the existing cluster first |
| `--kube-version <v>` | `v1.37.0` | Kubernetes version, on any provider |
| `--apps-timeout <duration>` | `15m` | How long the CLI keeps driving apps to Synced + Healthy. `0` exits once the foundation is ready |
| `--host <name>` | `adhar.localtest.me` | Platform host name (local) |
| `--port <n>` | `8443` | HTTPS host port (local). HTTP is `n − 363` (8443 → 8080). A busy port moves to the next free one |
| `--extra-ports <map>` | — | Extra host ports, for example `22:32222,9090:39090` |
| `--kind-config <path>` | — | Custom Kind configuration file or URL |
| `--ha` | `false` | Render the local foundation in HA mode. Cloud configs use `enableHAMode` instead |
| `--dev-password` | `false` | Set the ArgoCD and Gitea admin passwords to `developer` |
| `--in-cluster` | `false` | Install the controller manager for continuous reconciliation after the CLI exits |
| `--controller-image <image>` | `ghcr.io/adhar-io/adhar:<version>` | Image for that controller manager |
| `-p, --package <dir>` | — | Custom package locations. A platform stack directory here replaces the built-in stack |
| `-e, --package-custom-file <pkg:file>` | — | Package customization files, for example `argocd:/tmp/argocd.yaml` |
| `-v, --verbose` | `false` | Per-stage logs instead of the compact checklist |

```bash
adhar up                                   # local platform on Kind
adhar up -f config.yaml --env dev          # one cloud environment
```

`adhar up` is idempotent. Re-run it without `--recreate` and it resumes from the first unfinished phase.

### `adhar down`

Tears down an environment, then its block volumes.

```text
adhar down [flags]
```

| Flag | Default | Effect |
|---|---|---|
| `-f, --file <path>` | — | The config file describing the environment |
| `--env <name>` | every environment in the file | The environment to tear down |
| `--name <name>` | `adhar` | Cluster name; must match `adhar up --name` |
| `-y, --yes` / `--force` | `false` | Skip the confirmation prompt |
| `--keep-volumes` | `false` | Keep the cluster's block volumes and their data. Refused on AKS, which deletes its disks with the cluster |
| `--purge-orphaned-volumes` | `false` | Also delete unattached `pvc-*` volumes in the region that carry no other cluster's tag and no install id. Only safe when no other Kubernetes cluster uses that region |
| `--purge-image-cache` | `false` | Also remove the local Kind image-cache containers and volume |

```bash
adhar down                                           # the local Kind platform
adhar down -f config.yaml --env dev                  # one cloud environment, then its block volumes
```

How volumes are handled:

- Every block volume a cluster's CSI driver creates carries the cluster's install id, generated by `adhar up`. After the cluster is gone, `adhar down` lists exactly those volumes, asks, deletes them and confirms each deletion with the cloud. Re-running it finishes whatever is left.
- `--yes` never deletes volumes you chose to keep earlier, volumes from before install ids, or volumes of a cluster Adhar never saw deleted. Those need a confirmation typed at a terminal.
- A lookup that cannot be completed stops the teardown rather than reading as "already gone".
- A `clusterMode: provided` cluster loses nothing.

### `adhar config`

Scaffolds, validates, views and edits `config.yaml`. `-f/--file` selects the file on every subcommand.

| Command | What it does | Key flags |
|---|---|---|
| `config create` | Scaffold a new file | `-p/--provider` (default `kind`), `-r/--region`, `-n/--name` (output path, default `./config.yaml`), `-t/--template` (default `nonprod-defaults`), `--force` |
| `config validate [file]` | Validate a file | — |
| `config view` | Print the resolved configuration | `-o yaml\|json` (default `yaml`) |
| `config get [key]` / `config set [key] [value]` | Read or edit a `globalSettings` value | — |
| `config export` | Export the loaded configuration | `--resolve` (merge templates into each environment), `--format yaml\|json`, `-o/--output <file>` |
| `config list-templates` | List environment templates | — |

```bash
adhar config create --provider gcp --region us-central1 --name config.yaml
adhar config validate config.yaml
adhar config set enableHAMode true         # edits globalSettings.enableHAMode
adhar config export --resolve -o resolved.yaml
```

### `adhar stack`

Turns platform packages on and off, and shows their state. Aliases: `platform`, `packages`.

```diagram
npb-stack-change-flow
```

| Command | What it does | Key flags |
|---|---|---|
| `stack list` | The catalogue: declared versus live state | `--category <name>`, `--enabled`, `--problems` |
| `stack status [package]` | How converged the platform is, or one package's state | same as `list` |
| `stack describe <package>` | Marketplace contract, live state, dependencies | — |
| `stack enable <package>...` | Turn packages on: edits the ApplicationSet and environment config | `-y/--yes` |
| `stack disable <package>...` | Turn packages off; ArgoCD then **uninstalls** them | `-y/--yes` |
| `stack export <directory>` | Write the stack built into this binary to a directory you can edit | — |
| `stack conflicts` | Mutual-exclusion rules, and any the profile violates | — |
| `stack sync [package]...` | Ask ArgoCD to re-compare now instead of at the next resync | — |
| `stack verify` | Record each package's verification state from live health | `--write` |

Persistent flags: `--profile local|production` (default: detected from the cluster), `--stack-dir` (default: the built-in stack, or `./platform/stack` inside a source checkout), `-n/--namespace` (default `adhar-system`), `--json`.

```bash
adhar stack list --problems                # only packages that are not Synced and Healthy
adhar stack enable loki --profile production
```

`stack enable` and `stack disable` only edit files, so they need an editable stack. Nothing reaches the cluster until you run `adhar upgrade`.

```bash
adhar stack export ./stack             # write the built-in stack to a directory you can edit
export ADHAR_STACK_DIR=$PWD/stack      # adhar now reads and edits this copy
```

### `adhar controller`

Runs the controller manager. This is what the in-cluster Deployment runs; you rarely call it by hand.

| Flag | Default |
|---|---|
| `--platform-name` | `adhar` |
| `--namespace` | `adhar-system` |
| `--leader-elect` | `true` |
| `--health-probe-bind-address` | `:8081` |
| `--metrics-bind-address` | `0` (disabled) |
| `--stack-dir` | — |

## Operate: day-2

### `adhar upgrade`

Converges the foundation to this binary's manifests, shows the stack diff, pushes the stack to Gitea and re-syncs.

```text
adhar upgrade [flags]
adhar upgrade split-planes [--execute] [--name <data-plane>]
```

| Flag | Default | Effect |
|---|---|---|
| `--diff-only` | `false` | Show the stack diff and change nothing |
| `-y, --yes` | `false` | Apply without confirmation (CI) |
| `--skip-foundation` | `false` | Only diff and sync the stack |
| `--stack-dir <dir>` | the built-in stack | The platform stack directory to diff and push |
| `--name <name>` | `adhar` | The `AdharPlatform` resource. On a cloud cluster it is named after the environment |

```bash
adhar upgrade --diff-only && adhar upgrade --yes
```

`upgrade split-planes` moves a dual-role cluster to separate control and data planes. It prints the plan unless you pass `--execute`; `--name` (default `local`) names the data plane it creates.

### `adhar cluster`

Creates, scales, upgrades and inspects provider clusters. Pass `-f/--file` for any cloud cluster.

| Command | What it does | Key flags |
|---|---|---|
| `cluster create [name]` | Create a cluster | `-p/--provider` (default `kind`), `-r/--region`, `--version` (default `v1.37.0`), `--worker-replicas` (default: the provider's, 2 on every cloud), `--control-plane-replicas` (default `1`), `--instance-type`, `--control-plane-instance-type`, `-f/--file` |
| `cluster list` | List clusters | `-f/--file` |
| `cluster status [name]` | Cluster status | `-f/--file` |
| `cluster scale [name]` | Set the worker count | `--workers <n>`, `--node-group` (default `workers`), `-p/--provider`, `-f/--file` |
| `cluster upgrade [name]` | Upgrade Kubernetes | `--version <v>` (required), `-p/--provider`, `-f/--file` |
| `cluster kubeconfig [name]` | Fetch and merge the kubeconfig | `--print-only`, `-o/--output <file>`, `--set-current-context` |
| `cluster oidc [name]` | Make the API server trust the platform's Keycloak | `-p/--provider`, `-f/--file` |
| `cluster debug [name]` / `cluster investigate [name]` | Inspect the instance / its connectivity | `-f/--file` on `investigate` |
| `cluster delete [name]` | Delete a cluster | `--force`, `--purge-orphaned-volumes`, `-f/--file` |

```bash
adhar cluster scale adhar --workers 5 -p digitalocean -f config.yaml
```

### `adhar scale`

Scales a Deployment or StatefulSet, or attaches an autoscaler. Subcommands: `up`, `down`, `auto`, `status`, `optimize`.

Shared flags: `-d/--deployment`, `-r/--replicas`, `-s/--namespace`, `-t/--type` (`deployment`, `statefulset`, `hpa`), `-i/--timeout` (default `5m`). `scale auto` adds `--min` (default `1`), `--max` (default `5`) and `--cpu` (default `80`).

```bash
adhar scale auto -d orders-api --min 2 --max 6 --cpu 70 -s team-payments
```

### `adhar backup` and `adhar restore`

Velero backups, schedules and restores.

| Command | What it does | Key flags |
|---|---|---|
| `backup create [name]` | Create a backup | `--include-namespaces`, `-x/--exclude-namespaces`, `--ttl` (default `720h`), `--storage-location`, `-t/--type full\|selective` (default `full`) |
| `backup list` / `status [name]` / `verify [name]` | Inspect backups | `--detailed`, `-l/--limit`, `-s/--sort date\|name` on `list` |
| `backup delete [name]` | Delete backups | `-f/--force`, `-p/--pattern <glob>` |
| `backup schedule create [name]` | Create a Schedule | `-i/--interval hourly\|daily\|weekly\|monthly` (default `daily`), `-t/--time` (default `02:00`), `--cron` |
| `backup schedule list` / `enable` / `disable` / `delete` | Manage Schedules | — |
| `restore full [backup]` | Restore everything | `--from-backup`, `--name`, `--dry-run` |
| `restore selective [backup]` | Restore part of a backup | `--from-backup`, `--include-namespaces`, `--include-resources`, `--selector` |
| `restore database [backup]` | Restore one database namespace | `--from-backup`, `-n/--namespace` (required), `--selector` |
| `restore create` / `list` / `status [name]` / `verify [name]` / `config` | Create and inspect restores | `--from-backup` on `create` |

```bash
adhar backup create pre-upgrade --include-namespaces adhar-system --ttl 168h
adhar restore selective --from-backup pre-upgrade --include-namespaces team-payments
```

Velero is on in the production profile only.

## Observe: health, logs, metrics and traces

### `adhar get`

Reads platform state. Every subcommand takes `-o table|json|yaml`, `-n <namespace>` and `-A`.

| Command | What it shows | Key flags |
|---|---|---|
| `get status` | `AdharPlatform` conditions and package health | `-w/--watch`, `--events`, `--service-details` |
| `get applications` (`apps`) | Your own applications and their environments, not the platform's packages | `-l/--selector`, `--endpoints`, `--workloads`, `--resources` |
| `get all` | Overview of everything | `--detailed`, `--summary` (default) |
| `get secrets` | Platform credentials | `-p/--provider <name>` (`argocd`, `gitea`, `keycloak`, `harbor`, …), `-a/--all` |
| `get cluster [name]` | Cluster state | `-d/--detailed` |
| `get environments` (`envs`) | Environment namespaces | `--quotas`, `--policies`, `--resources` |
| `get dataplanes` (`dp`) / `get agents` | Registered data planes / AI agent workloads | — |

```bash
adhar get status --watch                   # live conditions while a sync runs
adhar get secrets -p argocd                # one credential set
```

### `adhar health`, `adhar logs`, `adhar events`, `adhar network`

| Command | What it does | Key flags |
|---|---|---|
| `health check` | Run health checks | `--all`, `-c/--component`, `-n/--namespace`, `-t/--timeout` (default `30s`) |
| `health report` | Write a health report | `-f/--format table\|json\|yaml\|html`, `-o/--output <file>` |
| `health history` | Health trend | `-d/--days` (default `30`), `-c/--component` |
| `logs` (`search [query]`, `stream`, `export`) | Platform logs | `-c/--component`, `-n/--namespace`, `-s/--search`, `-l/--lines` (default `100`), `-f/--follow`, `--level`, `--since`, `--until` |
| `events list` | Recent platform events | `--since <duration>`, `--domain` (`platform`, `cluster`, `tenancy`, `delivery`, `ai`), `--type`, `--subject`, `--limit` (default `200`), `-o table\|json` |
| `events tail` / `events topics` | Follow the stream / describe the topics | `--domain`, `--type`, `--subject` on `tail` |
| `network diagnose` | CNI status and network resources | `-n/--namespace` |
| `network connectivity` | Connectivity between two services | `-f/--from`, `-t/--to`, `-n/--namespace` |
| `network traffic` / `network policy` | Traffic-path status / list or manage NetworkPolicies | `-a/--action apply\|validate\|delete`, `-f/--file` on `policy` |

```bash
adhar health check --all
adhar logs --namespace checkout --search timeout --lines 200
adhar events list --since 1h --domain delivery
adhar network connectivity --from frontend --to orders-api -n team-payments
```

### `adhar metrics` and `adhar traces`

| Command | Subcommands | Key flags |
|---|---|---|
| `metrics` | `list`, `alert`, `dashboard`, `create`, `export` | `-q/--query <promql>` (default `up`), `--prometheus-url`, `--grafana-url` |
| `traces` | `list`, `search`, `analyze`, `export`, `config` | `-e/--service`, `--tags`, `-i/--trace <id>`, `-l/--limit` (default `20`), `--tempo-url` |

The default `--prometheus-url` and `--tempo-url` point at services that do not exist on an Adhar cluster. Port-forward the service and pass its URL. Tempo is on in the production profile only.

```bash
kubectl -n adhar-system port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 &
adhar metrics list --query 'up{job="checkout"}' --prometheus-url http://localhost:9090

kubectl -n adhar-system port-forward svc/tempo 3200:3200 &
adhar traces search --service checkout --tags 'http.status_code=500' \
  --tempo-url http://localhost:3200
```

## Develop: build, ship and self-serve

### `adhar application`

Deploys and manages your applications. Aliases: `apps`, `app`. `-n/--namespace` defaults to `dev`; without it, `status` and `delete` look in `adhar-system` first, then `dev`.

| Command | What it does | Key flags |
|---|---|---|
| `application deploy [name]` | Deploy from a template, repository or file | `-t/--template`, `-r/--repo`, `-f/--file`, `--path`, `--param key=value`, `--env` (default `dev`), `--project` (default `adhar`), `--dest-namespace`, `--version`, `-w/--wait`, `--timeout` (default `10m`) |
| `application list` | List applications | `-A`, `-l/--selector`, `--show-labels` |
| `application status [name]` | Application status | `-d/--detailed` |
| `application scale [name]` | Scale the Deployment named after the application | `-r/--replicas` |
| `application restart [name]` | Rolling restart of that Deployment | — |
| `application bind [name] [service]` | Add a backing service's connection Secret to that Deployment as `envFrom` | `--secret` (default `<service>-app`) |
| `application delete [name]` | Delete an application | `-f/--force` |
| `application templates [template]` | List the golden-path templates, or describe one | — |

```bash
adhar application templates                # what --template accepts
adhar application deploy my-app --template go-web-service --param port=8080 --wait
adhar application deploy my-app --repo https://github.com/org/repo --path manifests --dest-namespace my-team --project default --wait
```

`application deploy` takes exactly one source, and the source decides which flags apply:

| Flag | With `--template` | With `--repo` or `--file` |
|---|---|---|
| `--param key=value` | Sets a template parameter. Repeatable | Not used |
| `--env` | The environment in the scaffolded hostname. Default `dev` | Not used |
| `--project` | The platform Project the application is registered in. Default `adhar`; it must exist | The ArgoCD project. It must allow the destination namespace; the default `adhar` admits only `adhar`, `dev`, `test` and `prod` |
| `--path` | **Refused** unless the template renders `<path>/envs/`. Leave it off; the template declares its own path | The directory ArgoCD deploys |
| `-n/--namespace` | **Ignored**, with a warning. The `Application` is always created in `adhar-system` | The namespace of the `Application`. Default `dev` |
| `--dest-namespace`, `--dest-server` | **Ignored**, with a warning. The project's environments decide where the application runs | Where the workload runs. `--dest-namespace` defaults to `-n` |
| `--version` | **Ignored**, with a warning. The scaffold tracks `main` | The Git revision to deploy |
| `-w/--wait`, `--timeout` | Wait for the application to report healthy | Same |

A template deploy registers a multi-environment application: the platform composes one ArgoCD Application per environment of the project (`<project>-<name>-dev`, `-test`, `-prod`) and a Kargo Warehouse, and serves each environment at `<name>.<environment>.<host>`. A `--repo` deploy composes a single ArgoCD Application for the path you name.

Templates come from the `adhar/adhar-templates` repository in the platform's Gitea, the same collection the Console's Create wizard offers. Template services run as Argo Rollouts, so `scale`, `restart` and `bind`, which act on a Deployment, do not apply to them: change `deploy/` in the repository and push. See [Your First Service](/docs/getting-started/first-service).

### `adhar push`, `adhar routes` and `adhar dev`

| Command | What it does | Key flags |
|---|---|---|
| `push <name>` | Create the Deployment and Service for a service built by `app-ci` | `--git-url` (required), `--subpath`, `--wait` |
| `routes new` | The same, in the `routes` group | `--name` (required), `--git-url` (required), `--subpath`, `--wait` |
| `routes list` / `show` / `test` / `monitor` / `create` | Inspect and create Services and their routes | `-n/--name`, `-s/--namespace`, `-p/--port`, `-t/--type` |
| `dev [name]` | Inner loop: run your working tree in a dev namespace and re-sync on every save | `--port` (default `8080`), `--local-port`, `--no-forward`, `--keep`, `--debounce` (default `300ms`), `--image`, `--command`, `-n/--namespace` (default `dev-<name>`) |

```bash
adhar push orders-api --git-url https://github.com/acme/orders --wait
adhar dev orders-api --port 8080
```

`push` and `routes new` run the Tekton `new-service` pipeline. It creates a Deployment and Service that run the image `app-ci` built; it does not build the image. `--wait` waits for the pipeline run, not for the pod. See [Your First Service](/docs/getting-started/first-service#what-adhar-push-does-today). `routes` has the aliases `service`, `svc` and `route`.

### `adhar project` and `adhar pipeline`

| Command | What it does | Key flags |
|---|---|---|
| `project create` | Create a Project and its namespace | `--name`, `--org`, `--team` (all required), `--tier dev\|test\|prod` (default `dev`), `--cpu` (default `4`), `--memory` (default `8Gi`), `--pods` (default `30`), `--no-repo` |
| `pipeline create` | Create a pipeline | `-n/--name`, `-t/--type build\|deploy\|test\|release\|integration` (both required), `-s/--namespace` (default `default`) |
| `pipeline run` / `status` / `list` | Run and inspect pipelines | `-n/--name`, `-s/--namespace`, `-i/--timeout` (default `30m`) |
| `pipeline template list` | List pipeline templates | — |

```bash
adhar project create --name payments --org acme --team payments --tier dev
adhar pipeline run --name orders-ci -s payments
```

### `adhar database`, `adhar cache`, `adhar bucket` and `adhar storage`

Self-service infrastructure. Mind the namespace defaults: `database` uses `default`, `cache` and `bucket` use the platform namespace, and `storage` takes `-s`.

| Command | What it does | Key flags |
|---|---|---|
| `database create` | Request a database | `-n/--name`, `--engine` (`postgresql`, `mysql`, `mariadb`, `mongodb`, `redis`), `--version` (required), `--size`, `--namespace` |
| `database list` / `status [name]` / `health` / `delete [name]` | Inspect and delete | `-f/--force` on `delete` |
| `database backup` | Back up (CNPG) | `--method barmanObjectStore\|volumeSnapshot\|plugin` (default `barmanObjectStore`) |
| `database restore` | Restore into a new cluster | `-b/--backup`, `--target` (default `<name>-restored`), `--size` (default `1Gi`) |
| `database migrate` | Run schema migrations | `-a/--action up\|down\|status` (default `status`), `--path` (default `/migrations`), `--image` (default `migrate/migrate:4`), `--secret` |
| `cache create <name>` | Request a cache | `--engine valkey\|redis` (default `valkey`), `--replicas` |
| `cache list` / `status <name>` / `connection <name>` / `delete <name>` | Inspect; `connection` shows where host, port and URI are published | `-n/--namespace` |
| `bucket create <name>` | Request an S3 bucket | `--size`, `--versioning` |
| `bucket list` / `status <name>` / `credentials <name>` / `delete <name>` | Inspect; `credentials` shows where the endpoint and keys are published | `-n/--namespace` |
| `storage create` / `list` / `snapshot` / `monitor` / `optimize` | PersistentVolumeClaims and snapshots | `-n/--name`, `-z/--size`, `-c/--class`, `-s/--namespace` |

```bash
adhar database create --name orders --engine postgresql --version 16 --size 20Gi --namespace payments
adhar cache create sessions --engine valkey --replicas 2 -n payments
adhar bucket create uploads --size 100Gi --versioning -n payments
adhar application bind my-app orders -n payments      # inject the connection Secret into a Deployment
```

`database` has the alias `db`.

### `adhar function`

Runs an existing image as a scale-to-zero [Function](/docs/core-concepts/functions). Aliases: `fn`, `functions`. It creates no repository, build or promotion; for a function delivered dev → test → prod, create it from a function template in the Console.

| Command | What it does | Key flags |
|---|---|---|
| `function create <name>` | Create a Function | `--image` (required), `--runtime node20\|python312\|go122\|custom` (default `node20`), `--trigger http\|cloudevent\|topic\|bucket\|cron` (default `http`), `--event-source`, `--port` (default `8080`), `--min-scale` (default `0`), `--max-scale` (default `20`), `--target-concurrency` (default `100`), `--timeout` seconds (default `30`) |
| `function list` / `status <name>` / `delete <name>` | Inspect and delete | — |

`-n/--namespace` defaults to `adhar-system`. Pass an environment namespace such as `dev` so the function lands in that environment and is isolated by its network policy.

```bash
adhar function create echo -n dev --image <image> --min-scale 0 --max-scale 5 --timeout 60
```

Trigger lists, visibility, hostnames, `env` and Dapr have no flags; write the YAML and `kubectl apply` it. See the [Function API reference](/docs/reference/function-api#adhar-function).

### `adhar batch`

Runs and operates [batch jobs](/docs/core-concepts/batch). Aliases: `batchjob`, `batchjobs`.

| Command | What it does | Key flags |
|---|---|---|
| `batch list` / `describe <job>` | List BatchJobs / show one job's definition, schedule and last runs | `-A/--all-namespaces` on `list` |
| `batch run <job>` | Start a run, named for its identifying parameters | `-p/--param key=value`, `--wait`, `--follow`, `--smoke`, `--timeout` |
| `batch runs <job>` | List a job's runs | `--status`, `--limit` (default `20`) |
| `batch logs <run>` | Print a run's pod logs | `-f/--follow`, `--role manager\|worker`, `--index` |
| `batch stop <run>` / `resume <run>` / `restart <run>` | Stop at the next chunk boundary / resume from the last commit / restart a failed run as `<run>-r<n>` | — |
| `batch hold <job>` / `release <job>` | Hold or release a job's schedule | `--reason` (required on `hold`) |
| `batch backfill <job>` | Run once per business date in a range | `--from`, `--to` (`yyyy-mm-dd`), `--parallel` (default `1`), `-p/--param`, `--wait` |
| `batch history <job>` | Run history from the event stream | `--since`, `--limit` (default `200`) |
| `batch dlq <job>` | Dead-lettered items per execution | `--replay`, `--execution`, `--wait` |
| `batch recover <run>` / `abandon <run>` | Recover or abandon an execution left `STARTED` by a dead owner | `--execution`, `--wait` |
| `batch queues` / `schedules` | Volcano queues / schedules that services report | `--team <org>-<team>` on `queues`; `-A` on `schedules` |

Persistent flags: `-n/--namespace` (default: the `dev` environment), `--env dev|test|prod`, `--project` (default `adhar`), `-o table|json|yaml`.

```bash
adhar batch run importer --env prod -p businessDate=2026-11-03 --wait --follow
```

With `--wait`, `batch run` exits with the run's exit code. The [BatchJob API reference](/docs/reference/batch-job-api#command-line) covers each command in detail.

### `adhar environment` and `adhar gitops`

| Command | What it does | Key flags |
|---|---|---|
| `environment create [name]` | Create an environment namespace | `-p/--provider`, `-r/--region`, `--tier dev\|test\|prod` (default `dev`) |
| `environment list` / `switch [name]` / `delete [name]` | List, switch to (alias `use`) or delete | `--context` on `switch`; `-f/--force` on `delete` |
| `environment config [name]` | Show or set quotas | `--cpu`, `--memory`, `--pods`, `--network-policy` (default `true`) |
| `environment backup [name]` / `restore [name] [backup]` | Velero backup of one environment | `--ttl` (default `720h`), `--storage-location` |
| `gitops status` | ArgoCD application status | `-a/--app`, `-o` |
| `gitops sync [app]` | Sync one application, or all | `-a/--app`, `--prune`, `--revision` |
| `gitops rollback [app]` | Roll back to a revision | `-a/--app`, `--revision` (both required) |
| `gitops repo` / `workflow` / `resolve` | List repositories / workflows; resolve `adhar://` references in manifests | `--validate-only` on `resolve` |

```bash
adhar environment create dev --provider digitalocean --region blr1 --tier dev
adhar gitops sync -a orders-api --prune
```

`environment` has the aliases `env` and `envs`. The `gitops` namespace flag `-n` defaults to `adhar-system`.

### `adhar ai`

Asks, investigates and acts through the platform's AI layer. The AI packages (`adhar-ai`, `agentgateway`, `k8sgpt`) are on in the production profile and off locally; turn them on with `adhar stack enable adhar-ai agentgateway`, then set a model key.

| Command | What it does | Key flags |
|---|---|---|
| `ai status` / `models` / `tools` / `autonomy` / `budget` | What is installed and reachable, which models and tools exist, and the limits in force | — |
| `ai key set` / `key status` | Give the platform its model provider key (prompted, never echoed) | `--provider anthropic\|openai\|openrouter\|openai-compatible\|local` (default `anthropic`), `--model`, `--endpoint`, `--from-env` |
| `ai ask [question]` | One question, one answer | `--raw`, `--no-context` |
| `ai chat` | Interactive session | — |
| `ai agent [task]` | A tool-calling loop over read-only platform tools | `--autonomy read-only\|suggest\|approve-to-apply\|scoped`, `--max-steps`, `--mcp`, `--quiet`, `--yes` |
| `ai diagnose [app-or-namespace]` | Agentic triage: pods, logs, events | same as `agent` |
| `ai explain <kind/name>` | Explain a live resource and its state | same as `agent` |
| `ai mcp list` / `mcp call <tool>` | Inspect and call the federated MCP tools | `--arg key=value` on `call` |

Persistent flags: `-n/--namespace` (default `adhar-system`), `--model`, `--endpoint`, `--timeout` (default `3m`), `--insecure`, `--json`.

```bash
adhar ai diagnose keycloak
```

## Administer: identity, policy and governance

| Command | What it does | Key flags |
|---|---|---|
| `auth login [username]` / `logout` / `whoami` | Sign in to Keycloak; show your identity and groups | `--insecure` (local self-signed certificate only), `--password`, `--issuer`, `--client-id` (default `adhar-cli`) |
| `auth token` | Print the bearer token on stdout, nothing else | `--show` (masked summary); subcommands `create`, `decode`, `get`, `list`, `renew`, `revoke` |
| `auth user` / `group` / `role` / `session` / `provider` / `mfa` | Keycloak administration | `--admin-url`, `--admin-token`, `--realm` (default `adhar`) |
| `policy list` / `status` | List policies; pass, fail and warn per PolicyReport | `-o`, `-d/--detailed` on `list` |
| `policy validate [file]` | Validate a policy file | `--client` (parse only, no cluster dry-run) |
| `policy apply [file]` | Apply a policy through the control plane | `--mode audit\|enforce` (default `audit`), `--name`, `--dry-run` |
| `policy export` / `delete <name>` | Export ClusterPolicies to YAML / delete one | `-a/--all`, `-d/--dir` (default `./policies`), `--stdout`; `--xr` on `delete` |
| `compliance` (aliases `posture`, `audit`) | Control posture from the policy reports | `--failures-only`, `--max-evidence` (default `5`) |
| `compliance export` | Write the posture as an evidence artifact | `-o/--output` (default `compliance-report.md`), `--format markdown\|json` |
| `security scan` / `vulnerabilities` / `policies` / `incidents` | Image scan results, individual vulnerabilities, Kyverno policies, active incidents | `-s/--severity low\|medium\|high\|critical`, `-n/--namespace`, `--limit` (default `100`) on `vulnerabilities` |
| `secrets list` / `get` / `audit` | Secret metadata; `get` shows keys only | `--external` on `list`; `-n/--name`, `-s/--namespace`, `--reveal` on `get` |
| `secrets create` / `encrypt` / `rotate` | Create, store or rotate a secret | `--from-literal key=value`; `--provider`, `--schedule`, `--period-days` on `rotate` |
| `cost` (aliases `spend`, `showback`) / `cost breakdown` | Spend per namespace against budgets; CPU versus memory | `--all`, `--prometheus` |
| `fleet list` / `drift` | Registered workload clusters; planes whose Kubernetes version differs from the hub | `--selector`, `-n/--namespace` |
| `fleet upgrade` | Roll a Kubernetes version across the fleet in canary waves | `--to-version` (required), `--canary` (default `1`), `--batch-size`, `--wave-timeout` (default `20m`), `--rollback-on-failure`, `--dry-run`, `-y/--yes` |
| `webhook list` / `create` / `test` / `monitor` / `security` | Admission webhooks | `-n/--name`, `-s/--namespace`, `--resource` (default `pods`) on `create` |

```bash
adhar auth login alice --insecure          # --insecure only for the local self-signed certificate
adhar policy apply my-policy.yaml --mode audit
adhar compliance export -o posture.md
adhar security vulnerabilities --severity high --limit 20
adhar secrets get -n myapp-config -s payments
adhar fleet upgrade --to-version v1.37.2 --canary 1 --dry-run
```

## Utilities

| Command | What it does |
|---|---|
| `version` (aliases `v`, `ver`) | Print version information; `-s/--short` prints only the number |
| `completion <shell>` | Generate a completion script for `bash`, `zsh`, `fish` or `powershell` |
| `help [command]` | Help on any command |

```bash
adhar completion zsh > "${fpath[1]}/_adhar"
```

`push` and `dev` are also listed under Utilities by `adhar --help`; they are covered under [Develop](#adhar-push-adhar-routes-and-adhar-dev).

## Common workflows

**Stand up a cloud environment.**

```bash
adhar config create --provider gcp --region us-central1 --name config.yaml
adhar config validate config.yaml
adhar up -f config.yaml --env prod --dry-run
adhar up -f config.yaml --env prod
adhar get status && adhar get secrets -p argocd
```

**Turn a package on** (with an exported stack in `ADHAR_STACK_DIR`).

```bash
adhar stack conflicts
adhar stack enable loki
adhar upgrade --diff-only
adhar upgrade --yes
adhar stack list --problems          # empty once everything is Synced and Healthy
```

**Ship a service with a database.**

```bash
adhar application templates go-web-service            # confirm the template accepts withDatabase
adhar application deploy orders-api --template go-web-service --param withDatabase=true
adhar application status orders-api --detailed
```

The template declares the database in the repository, so every environment gets its own. To wire a `Database` into a Deployment you maintain yourself, see [Deploy a Database-Backed Service](/docs/guides/deploy-a-database-backed-service#alternative-your-own-manifests).

**Triage an unhealthy platform.**

```bash
adhar get status && adhar stack status
adhar stack list --problems
adhar ai diagnose keycloak
adhar gitops sync -a keycloak
adhar logs --component keycloak --lines 200
```

## Scripting and exit codes

With machine-readable output (`-o json`, `-o yaml` and `adhar auth token`), only the payload goes to stdout, with no banner; diagnostics go to stderr. These are safe to pipe. Errors are printed once, to stderr, and the exit code is `1`.

```bash
adhar get status -o json | jq -r '.OverallStatus'
TOKEN=$(adhar auth token) && curl -H "Authorization: Bearer $TOKEN" https://<host>/<path>
adhar get status >/dev/null 2>&1 || echo "platform unhealthy"
```

## Flag traps

| Trap | What happens | Do this instead |
|---|---|---|
| `adhar up -f config.yaml` with no `--env` | **Every** environment in the file is acted on; each `isolation: cluster` environment gets its own cluster | Always pass `--env <name>` with `-f` |
| `adhar stack enable` or `disable` with no editable stack | `the stack built into adhar is read-only` | Run `adhar stack export ./stack` and set `ADHAR_STACK_DIR` |
| `--stack-dir`, `-p` or `ADHAR_STACK_DIR` names the wrong directory | `… is not a platform stack directory (no packages/ inside)` | Fix the path, or unset it to use the built-in stack |
| `adhar get apps` is empty on a fresh platform | It lists *your* applications, not platform packages | `adhar stack list` for packages |
| `adhar cluster list/status/scale/upgrade` with no `--file` | The default config has no cloud provider, so it reports "No clusters found" | Pass `--file config.yaml` |
| `adhar upgrade` cannot find the platform on a cloud cluster | `--name` defaults to `adhar`, but the `AdharPlatform` is named after the environment | `adhar upgrade --name <env>` |
| `-f` means different things | `--file` on `up`, `down`, `cluster`, `config`, `policy` and `application deploy`; `--force` on `application delete`, `database delete`, `environment delete` and `backup delete`; `--follow` on `logs` and `batch logs`; `--output` on `metrics`, `traces`, `gitops`, `secrets`, `scale`, `storage`, `network`, `pipeline`, `routes` and `webhook` | Spell out long flags in scripts |
| `-n` means different things | `--name` on `database`, `secrets`, `storage`, `pipeline`, `routes` and `webhook`; `--namespace` on `application`, `get`, `cache`, `bucket`, `function`, `batch` and `ai`. Where `-n` is the name, the namespace flag is `-s` (or `--namespace` on `database`) | Spell out `--namespace` |
| `--tier staging` | The `environment config` help lists `staging`, but Project and Environment tiers are `dev`, `test` and `prod` only | Use `dev`, `test` or `prod` |
| `-p` on `get secrets` | It is `--provider` (a credential set such as `argocd`), not a package path | `adhar get secrets -p argocd` |
| `adhar metrics` / `adhar traces` return nothing | Their default URLs point at services that do not exist on Adhar | Port-forward and pass `--prometheus-url` / `--tempo-url` |
| `adhar up --ha` against a cloud config | The cloud path reads `enableHAMode` from the config | Set `globalSettings.enableHAMode: true` |

## Next steps

- [Quick Start](/docs/getting-started/quick-start) — a guided first run
- [Customization](/docs/operations/customization) — `stack` and `upgrade` in context
- [Accessing the Platform](/docs/operations/accessing-the-platform) — URLs and credentials
- [Troubleshooting](/docs/reference/troubleshooting) — when a command's output is not what you expect
