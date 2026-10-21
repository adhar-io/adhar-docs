---
title: "CLI Reference"
section: "Reference"
order: 1
path: "/docs/reference/cli"
---

# CLI Reference

The `adhar` binary controls the whole platform. **One command creates the cluster, one converges it, and the rest inspect or drive what is running.**

This page maps every command group, with a working example of each. It ends with workflows that combine them. It is for anyone who types `adhar`: platform engineers, developers and operators. For the final word on any flag, run `adhar <command> --help`.

> **Run platform-lifecycle commands from a clone of the Adhar repository.** `adhar up`, `adhar stack` and `adhar upgrade` read and edit the platform stack in `platform/stack/`, relative to your working directory. Run them from the clone's root, or point them elsewhere with `-p` (on `up`) or `--stack-dir` (on `stack` and `upgrade`).

## At a glance

| | |
|---|---|
| **Aliases** | `adhar`, `a`, `ad` |
| **Config file** | `-f/--file`, else `./config.yaml`, `~/.adhar/config.yaml`, `~/config.yaml` |
| **Stack directory** | `./platform/stack` (run from the Adhar repository root) |
| **Cluster** | `--kubeconfig`, else `$KUBECONFIG`, else `~/.kube/config` |
| **Structured output** | `-o json` / `-o yaml` on inspection commands |
| **Exit code** | `0` on success, `1` on failure (error printed once, to stderr) |

## Command map

`adhar --help` groups commands by who uses them. The map below follows that grouping exactly. Most people start with the highlighted commands.

```diagram
do-cli-map
```

| Persona | Commands | Typical first command |
|---|---|---|
| **Develop** — build, ship and self-serve | `ai` `application` `bucket` `cache` `database` `environment` `gitops` `pipeline` `project` `routes` `storage` | `adhar application deploy` |
| **Observe** — health, logs, metrics, traces | `events` `get` `health` `logs` `metrics` `network` `traces` | `adhar get status` |
| **Operate** — day-2 operations | `backup` `cluster` `restore` `scale` `upgrade` | `adhar upgrade --diff-only` |
| **Administer** — lifecycle and governance | `auth` `compliance` `config` `controller` `cost` `down` `fleet` `policy` `secrets` `security` `stack` `up` `webhook` | `adhar up` |
| **Utilities** — tooling | `completion` `dev` `help` `push` `version` | `adhar push` |

## How the CLI finds its config and cluster

Before it does anything, every command finds two things:

- a **config file**, which says which providers and environments exist
- a **kubeconfig**, which says which cluster to talk to

Most surprises happen when one of these points somewhere you did not expect.

**Config.** If you pass `-f`/`--file`, the CLI uses that exact path. Otherwise it looks for `config.yaml` in the working directory, then in `~/.adhar/`, then in your home directory. If it finds nothing, it falls back to a Kind-only default. That is why a cloud command with no `--file` sees no cloud clusters. The result is validated before anything runs.

**Cluster.** The CLI tries `--kubeconfig`, then `$KUBECONFIG`, then `~/.kube/config`. After `adhar up`, the right context is usually already current:

- **Local (Kind).** Kind writes the context `kind-adhar` and makes it current.
- **Cloud.** `adhar up` saves the cluster's kubeconfig to `~/.adhar/clusters/<cluster>/kubeconfig` and merges it into your default kubeconfig. The context is `adhar` for the default cluster name, or `adhar-<name>` if you passed `--name`.

Check before you act:

```bash
kubectl config current-context      # kind-adhar locally; adhar (or adhar-<name>) on a cloud
adhar get status                    # proves the CLI can reach the platform
```

## Global flags

| Flag | Default | Effect |
|---|---|---|
| `-v, --verbose` | `false` | Verbose output |
| `--debug` | `false` | Debug mode (raises the log level on `up`) |
| `--log-level <level>` | `info` | Logger verbosity |
| `--kubeconfig <path>` | — | Kubeconfig for platform requests |
| `--no-color` | `false` | Disable colour (so does `NO_COLOR`) |
| `--colored-logs` | `true` | Colourise log lines |
| `--theme <auto\|dark\|light>` | `auto` | Markdown rendering theme |
| `--no-header` / `--no-footer` | `false` | Hide banner / sign-off |

## Administer: platform lifecycle

| Command | What it does | Key flags |
|---|---|---|
| `up` | Create or converge the platform (local Kind by default) | see below |
| `down` | Tear down an environment and its resources | `-f/--file`, `--env`, `--force`, `--name`, `--purge-image-cache`, `--purge-orphaned-volumes` |
| `config` | Scaffold, validate, view and edit `config.yaml` | `create`, `validate`, `view`, `get`, `set`, `export`, `list-templates` |
| `stack` | Turn platform packages on and off, and see their state | see below |
| `controller` | Run the controller manager (what the in-cluster Deployment runs) | `--platform-name`, `--leader-elect`, `--namespace` |

`adhar up` flags:

```bash
-f, --file <cfg>        # provision from a config file (cloud / production)
    --env <name>        # target ONE environment (always pass this with -f)
    --recreate          # DESTRUCTIVE: delete the existing cluster first
    --port <n>          # HTTPS host port (default 8443); HTTP derives as n − 363; a busy port moves to the next free one
    --host <name>       # platform host name (default adhar.localtest.me)
    --kube-version <v>  # Kubernetes version, any provider (default v1.37.0)
    --ha                # render the local foundation in HA mode
    --name <name>       # cluster name (default adhar); `adhar down --name` must match
-d, --dry-run           # preview without applying
    --dev-password      # set ArgoCD and Gitea admin passwords to `developer`
    --in-cluster        # install the controller manager for ongoing reconciliation
    --apps-timeout <d>  # how long to drive apps to Synced+Healthy (default 15m)
    --extra-ports <m>   # e.g. '22:32222,9090:39090'
    --kind-config <path> # custom Kind configuration file or URL
-p, --package <dir>     # platform stack directory (default platform/stack)
-v, --verbose           # per-stage logs instead of the compact checklist
```

`adhar up` is idempotent and status-gated. If you re-run it without `--recreate`, it resumes from the pending phase.

**Config, end to end:**

```bash
adhar config create --provider gcp --region us-central1 --name config.yaml
adhar config validate config.yaml
adhar config view                          # the loaded configuration
adhar config set enableHAMode true         # edits globalSettings.enableHAMode
adhar config get enableHAMode              # true
adhar config export --resolve -o resolved.yaml   # templates merged into each environment
```

**Tear down:**

```bash
adhar down                                           # the local Kind platform
adhar down -f config.yaml --env dev                  # one cloud environment
adhar down -f config.yaml --env dev --purge-orphaned-volumes
```

**Platform packages (`stack`):**

| Command | What it does |
|---|---|
| `stack list` | The catalogue: declared versus live state (`--category`, `--enabled`, `--problems`) |
| `stack status [pkg]` | How converged the platform is, or one package's state |
| `stack describe <pkg>` | Marketplace contract, live state, dependencies |
| `stack enable <pkg>...` | Turn packages on — edits the ApplicationSet and environment config (`-y`). Enabling locally also enables in production |
| `stack disable <pkg>...` | Turn packages off; ArgoCD then **uninstalls** them |
| `stack conflicts` | Mutual-exclusion rules, and any the profile violates |
| `stack sync [pkg]...` | Ask ArgoCD to re-compare now instead of at the next resync |
| `stack verify` | Record verification state from live health (`--write`) |

```bash
adhar stack list --problems                # only packages that are not healthy
adhar stack describe keycloak              # contract, dependencies, live state
adhar stack enable loki --profile production
```

`stack` edits the profile it detects from the cluster. To override that, pass `--profile local|production`. Add `--json` to make any subcommand machine-readable. `stack` only edits files: nothing reaches the cluster until you run `adhar upgrade`.

## Operate: day-2

| Command | What it does | Key flags |
|---|---|---|
| `upgrade` | Converge the foundation, diff and force-push the stack to Gitea, re-sync. Run from the repository root | `--diff-only`, `-y/--yes`, `--skip-foundation`, `--stack-dir`, `--name` |
| `upgrade split-planes` | Move apps off a dual-role cluster onto a data plane (dry-run unless `--execute`) | `--execute`, `--name` |
| `cluster` | Create, scale, upgrade and inspect provider clusters | `-f/--file`, `-p/--provider` |
| `scale` | Scale a Deployment or StatefulSet, or attach an autoscaler | `-d`, `-r`, `-s`, `--min`, `--max`, `--cpu` |
| `backup` / `restore` | Velero backups, schedules and restores | `--include-namespaces`, `--ttl`, `--from-backup` |

**Upgrade:**

```bash
adhar upgrade --diff-only        # what would change; touches nothing
adhar upgrade                    # interactive
adhar upgrade --yes              # CI
adhar upgrade split-planes       # print the migration plan
```

**Clusters:**

```bash
adhar cluster create prod --provider gcp --region us-central1 --worker-replicas 3
adhar cluster list --file config.yaml          # --file is REQUIRED for cloud clusters
adhar cluster status prod -f config.yaml
adhar cluster scale prod --workers 5 -p digitalocean -f config.yaml
adhar cluster upgrade prod --version 1.37.2 -p digitalocean -f config.yaml
adhar cluster kubeconfig prod --print-only > kubeconfig
adhar cluster debug prod                       # inspect the instance
adhar cluster investigate prod -f config.yaml  # connectivity
adhar cluster delete prod --file config.yaml   # asks first; --force skips the prompt
```

**Workload scaling:**

```bash
adhar scale up -d orders-api -r 3 -s team-payments
adhar scale auto -d orders-api --min 2 --max 6 --cpu 70 -s team-payments
adhar scale status -s team-payments
```

**Backup and restore:**

```bash
adhar backup create pre-upgrade --include-namespaces adhar-system --ttl 168h
adhar backup list
adhar backup status pre-upgrade
adhar backup schedule list                     # the shipped daily and weekly schedules (Velero: production profile)
adhar restore selective --from-backup pre-upgrade --include-namespaces team-payments
adhar restore status <restore-name>
adhar restore full --from-backup pre-upgrade --dry-run
```

## Observe: health, logs, metrics and traces

| Command | What it does | Key flags |
|---|---|---|
| `get status` | `AdharPlatform` conditions and package health | `-w/--watch`, `--events`, `--service-details` |
| `get applications` (`apps`) | Your own applications and their environments — not the platform's packages (use `stack list` for those) | `-n`, `-A`, `-l`, `--endpoints`, `--workloads` |
| `get all` | Comprehensive overview | `--detailed`, `--summary` |
| `get secrets` | Platform credentials | `-p/--provider <name>`, `-a/--all`, `-d/--debug` |
| `get cluster` / `environments` / `dataplanes` / `agents` | Cluster, namespace, data-plane and agent state | `--detailed`, `--quotas` |
| `health` | Health checks (`check`, `report`, `history`) | `-c`, `-w`, `-e <fmt>` |
| `logs` | Platform logs (`search`, `stream`, `export`) | `-f`, `-c`, `-n`, `-s`, `-l`, `--since` |
| `metrics` / `traces` | Rules, alerts, dashboards; trace search and analysis | `--prometheus-url`, `--tempo-url`, `-q` |
| `network` | `diagnose`, `connectivity`, `traffic`, `policy` | `-n`, `-s` |
| `events` | The platform event stream (`list`, `tail`, `topics`) | `--domain`, `--type`, `--since` |

`adhar get` takes `-o table|json|yaml`, `-n <namespace>` and `-A` on every subcommand.

```bash
adhar get status --watch                       # live conditions while a sync runs
adhar get apps -A --endpoints                  # every one of your apps, with its URLs
adhar get secrets -p argocd                    # one credential set
adhar health check --all
adhar health report -f html -o health.html
adhar logs --namespace checkout --search timeout --lines 200
adhar network diagnose                         # CNI status and network resources
adhar network connectivity --from frontend --to orders-api -n team-payments
adhar events list --since 1h --domain delivery
adhar events tail --domain platform            # follow new events
```

`adhar metrics` and `adhar traces` default to service URLs that do not exist on an Adhar cluster. Port-forward the service and pass its URL. Tempo is on in the production profile only:

```bash
kubectl -n adhar-system port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 &
adhar metrics list --query 'up{job="checkout"}' --prometheus-url http://localhost:9090

kubectl -n adhar-system port-forward svc/tempo 3200:3200 &
adhar traces search --service checkout --tags 'http.status_code=500' \
  --tempo-url http://localhost:3200
```

## Develop: build, ship and self-serve

| Command | What it does | Key flags |
|---|---|---|
| `application deploy <name>` | Deploy from a template, repo or file | `-t/--template`, `-r/--repo`, `-f/--file`, `--path`, `--param k=v`, `-w/--wait`, `--timeout` (10m), `--env`, `--project` (default `adhar`), `--dest-namespace` |
| `application list` | List applications | `-A`, `-l`, `--show-labels` |
| `application status <name>` | Application status | `-d/--detailed` |
| `application scale <name>` | Scale a Deployment | `-r/--replicas` (required) |
| `application restart <name>` | Rolling restart | — |
| `application bind <name> <svc>` | Mount a backing service's connection Secret | `--secret` |
| `application delete <name>` | Delete an application | `-f/--force` |
| `application templates [t]` | List the golden-path templates, or describe one | — |
| `push <name>` | Scaffold a service from source, `cf push`-style (see below) | `--git-url` (required), `--subpath`, `--wait` |
| `dev [name]` | Inner loop: sync the working tree to a dev namespace | `--port`, `--local-port`, `--no-forward`, `--keep`, `--debounce` |

Templates come from the `adhar/adhar-templates` repository in the platform's Gitea. It mirrors `github.com/adhar-io/adhar-templates`, and the Console's Create wizard offers the same collection. To see the names on your platform, run `adhar application templates` instead of relying on a list here. `application` has the aliases `apps` and `app`. Its `-n/--namespace` defaults to `dev`.

```bash
adhar application templates                                # what --template accepts
adhar application deploy my-app --template <template> --path manifests --param port=8080 --wait
adhar push orders-api --git-url https://github.com/acme/orders --wait
adhar dev orders-api --port 8080                           # live-sync this directory
```

`push` and `adhar routes new` run the Tekton `new-service` pipeline. Today it creates a Deployment and Service in `adhar-system` that run `harbor…/library/<name>:latest`; it does not build the image itself. The full build → scan → sign → registry → GitOps write-back chain is the `app-ci` pipeline. See [Your First Service](/docs/getting-started/first-service#what-adhar-push-does-today).

**Projects, pipelines and routes:**

```bash
adhar project create --name payments --org acme --team payments --tier dev   # tier: dev, test or prod
adhar pipeline create --name orders-ci --type build -s payments
adhar pipeline run --name orders-ci -s payments
adhar pipeline status --name orders-ci -s payments
adhar routes new --name orders-api --git-url https://github.com/acme/orders --wait
adhar routes list -s payments
adhar routes show --name orders-api
adhar routes test --name orders-api
```

**Self-service infrastructure:**

```bash
adhar database create --name orders --engine postgresql --version 16 --size 20Gi   # --version is required; namespace defaults to default
adhar database list && adhar database status orders && adhar database health
adhar database backup --name orders --method barmanObjectStore
adhar database restore --name orders --backup <backup> --target orders-restored
adhar database migrate --name orders --action up --path /migrations

adhar cache create sessions --engine valkey --replicas 2   # cache and bucket default to adhar-system; pass -n
adhar cache connection sessions           # host, port and URI publication
adhar bucket create uploads --size 100Gi --versioning
adhar bucket credentials uploads
adhar storage create --name scratch --size 10Gi -s payments
adhar storage list -s payments

adhar application bind my-app orders      # inject the connection Secret
```

**Environments and GitOps:**

```bash
adhar environment create dev --provider digitalocean --region blr1 --tier dev   # tier: dev, test or prod
adhar environment list
adhar environment switch dev --context adhar-dev
adhar environment config dev --cpu 8 --memory 16Gi --pods 60
adhar environment backup dev --ttl 720h0m0s

adhar gitops status -a orders-api
adhar gitops sync -a orders-api --prune
adhar gitops rollback -a orders-api --revision <rev>
adhar gitops repo
```

**AI layer.** Adhar AI (`adhar-ai`, `agentgateway`, `k8sgpt`) is on in the production profile and off locally. Turn it on locally with `adhar stack enable adhar-ai agentgateway`, then give it a model key with `adhar ai key set`.

```bash
adhar ai status                       # what is installed, keyed and reachable
adhar ai models                       # what --model may be set to
adhar ai ask "why is keycloak not ready?" [--raw] [--no-context]
adhar ai chat                         # interactive
adhar ai agent "…"                    # tool-calling loop over read-only tools
adhar ai diagnose <package>           # agentic triage: pods, logs, events
adhar ai explain deployment/adhar-console
adhar ai tools && adhar ai autonomy && adhar ai budget
adhar ai key set --provider anthropic # prompted, never echoed
adhar ai mcp list
```

Persistent flags: `-n/--namespace` (default `adhar-system`), `--model`, `--endpoint`, `--timeout` (3m), `--insecure`, `--json`. Agentic commands also take `--autonomy`, `--max-steps`, `--quiet`, `--mcp`, `--yes`.

## Administer: identity, policy and governance

```bash
adhar auth login alice --insecure          # --insecure only for the local self-signed cert
adhar auth whoami                          # identity and group membership
adhar auth token                           # bearer token on stdout, nothing else
adhar auth logout

adhar policy list
adhar policy validate my-policy.yaml --client
adhar policy apply my-policy.yaml --mode audit
adhar policy status                        # pass/fail/warn per PolicyReport
adhar compliance --failures-only
adhar compliance export -o posture.md      # or .json — the auditor artifact

adhar security vulnerabilities --severity high --limit 20
adhar security policies
adhar secrets list --external              # ExternalSecrets and their sync state
adhar secrets get -n myapp-config -s payments          # keys only; --reveal to decode
adhar secrets audit

adhar cost                                 # spend per namespace, against budgets
adhar cost breakdown                       # CPU versus memory

adhar fleet list                           # every registered workload cluster
adhar fleet drift                          # planes that differ from the hub
adhar fleet upgrade --to-version v1.37.2 --canary 1 --dry-run

adhar webhook list
```

## Utilities

```bash
adhar version --short
adhar completion zsh > "${fpath[1]}/_adhar"     # or bash, fish, powershell
adhar help upgrade
```

## Common workflows

**Stand up a cloud environment.**

```bash
adhar config create --provider gcp --region us-central1 --name config.yaml
adhar config validate config.yaml
adhar up -f config.yaml --env prod --dry-run
adhar up -f config.yaml --env prod
adhar get status && adhar get secrets -p argocd
```

**Turn a package on** (from the repository root).

```bash
adhar stack conflicts
adhar stack enable loki
adhar upgrade --diff-only
adhar upgrade --yes
adhar stack list --problems          # empty once everything is Synced and Healthy
```

**Ship a service with a database.**

```bash
kubectl create namespace payments
adhar application deploy orders-api --template <template> -n payments --path manifests --project default --wait
adhar database create --name orders --engine postgresql --version 16 --namespace payments
adhar application bind orders-api orders -n payments
adhar application status orders-api -n payments --detailed
```

**Triage an unhealthy platform.**

```bash
adhar get status && adhar stack status
adhar stack list --problems
adhar ai diagnose keycloak
adhar gitops sync -a keycloak
adhar logs --component keycloak --lines 200
```

## Scripting and exit codes

With machine-readable output (`-o json`, `-o yaml`, and `adhar auth token`), diagnostics go to stderr and only the payload goes to stdout, with no banner. So these are safe to pipe. Errors are printed once, to stderr, and the exit code is `1`.

```bash
adhar get status -o json | jq -r '.OverallStatus'
TOKEN=$(adhar auth token) && curl -H "Authorization: Bearer $TOKEN" https://…
adhar get status >/dev/null 2>&1 || echo "platform unhealthy"   # exit 1 on failure
adhar version --short
```

## Flag traps

| Trap | What happens | Do this instead |
|---|---|---|
| `adhar up -f config.yaml` with no `--env` | **Every** environment in the file is acted on; each `isolation: cluster` environment gets its own cluster | Always pass `--env <name>` with `-f` |
| `adhar up`, `stack` or `upgrade` outside the repository | `platform stack directory not found` | Run from the Adhar clone's root, or pass `-p` / `--stack-dir` |
| `adhar get apps` is empty on a fresh platform | It lists *your* applications, not platform packages | `adhar stack list` for packages |
| `adhar cluster list/status/scale/upgrade` with no `--file` | The default config has no cloud provider, so it reports "No clusters found" | Pass `--file config.yaml` |
| `-f` means different things | On `up`, `down`, `cluster`, `config` and `application deploy` it is `--file`; on `application delete`, `database delete` and `environment delete` it is `--force`; on `logs` it is `--follow`; on `metrics`, `traces`, `gitops`, `secrets`, `scale`, `storage`, `network`, `pipeline`, `routes` and `webhook` it is `--output` | Spell out long flags in scripts |
| `-n` means different things | On `database` and `secrets` it is `--name`; on `application`, `get`, `cache`, `bucket` and `ai` it is `--namespace`; on `storage`, `scale`, `pipeline` and `routes` the namespace flag is `-s` | Spell out `--namespace` |
| `--tier staging` | The CLI help lists `staging`, but Project and Environment tiers are `dev`, `test` and `prod` only | Use `dev`, `test` or `prod` |
| `-p` on `get secrets` | It is `--provider` (a credential set such as `argocd`), not a package path | `adhar get secrets -p argocd` |
| `adhar metrics` / `adhar traces` return nothing | Their default URLs point at services that do not exist on Adhar | Port-forward and pass `--prometheus-url` / `--tempo-url` |
| `adhar up --ha` against a cloud config | The cloud path reads `enableHAMode` from the config | Set `globalSettings.enableHAMode: true` |

## See also

- [Quick Start](/docs/getting-started/quick-start) — a guided first run.
- [Customization](/docs/operations/customization) — `stack` and `upgrade` in context.
- [Accessing the Platform](/docs/operations/accessing-the-platform) — URLs and credentials.
- [Troubleshooting](/docs/reference/troubleshooting) — unexpected command output.
