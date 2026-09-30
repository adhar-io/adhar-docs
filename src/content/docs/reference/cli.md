---
title: "CLI Reference"
section: "Reference"
order: 1
path: "/docs/reference/cli"
---

# CLI Reference

The `adhar` binary is the platform's whole control surface: **one command creates the cluster, one converges it, and the rest inspect or drive what is running**. `adhar --help` groups commands by persona — Develop, Observe, Operate, Administer, Utilities — and `adhar <command> --help` is authoritative for flags.

## At a glance

| | |
|---|---|
| **Aliases** | `adhar`, `a`, `ad` |
| **Config file** | `-f/--file`, else `./config.yaml`, `~/.adhar/`, `~` |
| **Environment** | `ADHAR_`-prefixed variables override config values |
| **Cluster** | `--kubeconfig`, else `$KUBECONFIG`, else `~/.kube/config` |
| **Structured output** | `-o json` / `-o yaml` on inspection commands |
| **Exit code** | `0` on success, `1` on failure (error printed once, to stderr) |

## Command map

```text
  DEVELOP     project  application  push  dev  pipeline  gitops
              routes  database  bucket  cache  storage  environment  ai
  OBSERVE     get  health  logs  metrics  traces  network
  OPERATE     cluster  scale  backup  restore  upgrade
  ADMINISTER  up  down  stack  config  secrets  auth  policy
              security  compliance  cost  fleet  webhook  controller
  UTILITIES   help  version
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

## Config file resolution

With `-f`/`--file` that exact path is used; without it the CLI looks for `config.yaml` in the working directory, then `~/.adhar/`, then `~`. If nothing is found and no providers are configured, it falls back to a Kind-only default — which is why a cloud command with no `--file` silently sees no clusters. Variables prefixed `ADHAR_` override file values, and the result is validated against `config.schema.json` before anything runs.

## Platform lifecycle

| Command | What it does | Key flags |
|---|---|---|
| `up` | Create or converge the platform (local Kind by default) | see below |
| `upgrade` | Converge the foundation, diff and re-push the stack | `--diff-only`, `-y/--yes`, `--skip-foundation`, `--stack-dir`, `--name` |
| `upgrade split-planes` | Split a dual-role cluster into control and data planes | — |
| `down` | Tear down an environment and its resources | `-f/--file`, `--env`, `--force`, `--purge-image-cache`, `--purge-orphaned-volumes` |
| `controller` | Run the controller manager (in-cluster mode) | `--platform-name`, `--leader-elect` |

`adhar up` flags:

```bash
-f, --file <cfg>        # provision from a config file (cloud / production)
    --env <name>        # target ONE environment (always pass this with -f)
    --recreate          # DESTRUCTIVE: delete the existing cluster first
    --port <n>          # HTTPS host port (default 8443); HTTP derives as n − 363
    --host <name>       # platform host name (default adhar.localtest.me)
    --kube-version <v>  # Kubernetes version, any provider (default v1.37.0)
    --ha                # render the foundation in HA mode
-d, --dry-run           # preview without applying
    --dev-password      # set ArgoCD and Gitea admin passwords to `developer`
    --in-cluster        # install the controller manager for ongoing reconciliation
    --apps-timeout <d>  # how long to drive apps to Synced+Healthy (default 15m)
    --extra-ports <m>   # e.g. '22:32222,9090:39090'
    --kind-config <path> # custom Kind configuration file or URL
```

`adhar up` is idempotent and status-gated: re-running it without `--recreate` resumes from the pending phase.

## Inspect and observe

| Command | What it does | Key flags |
|---|---|---|
| `get status` | `AdharPlatform` conditions and package health | `-w/--watch`, `--events`, `--service-details` |
| `get apps` | Workload readiness (ArgoCD applications) | `-n`, `-A`, `-l`, `--include-system` |
| `get all` | Comprehensive overview | `--detailed` |
| `get secrets` | Platform credentials | `-p <package>`, `-a/--all`, `-d/--debug` |
| `get cluster` / `environments` / `dataplanes` | Cluster and namespace state | `--detailed`, `--quotas` |
| `health` | Health checks (`check`, `report`, `history`) | `-c`, `-w`, `-e <fmt>` |
| `logs` | Platform logs (`search`, `stream`, `export`) | `-f`, `-c`, `-n`, `-l`, `--since` |
| `metrics` / `traces` | Rules, alerts, dashboards; trace search and analysis | `--format`, `-o` |
| `network` | `diagnose`, `connectivity`, `traffic`, `policy` | `-s`, `-n`, `-d` |

`adhar get` takes `-o table|json|yaml`, `-n <namespace>` and `-A` on every subcommand.

## Platform packages (stack)

| Command | What it does |
|---|---|
| `stack list` | The catalogue: declared versus live state (`--category`, `--enabled`, `--problems`) |
| `stack status [pkg]` | How converged the platform is, or one package's state |
| `stack describe <pkg>` | Marketplace contract, live state, dependencies |
| `stack enable <pkg>...` | Turn packages on — edits the appset and env config (`-y`) |
| `stack disable <pkg>...` | Turn packages off; ArgoCD then **uninstalls** them |
| `stack conflicts` | Mutual-exclusion rules, and any the profile violates |
| `stack sync [pkg]...` | Ask ArgoCD to re-compare now instead of at the next resync |
| `stack verify` | Record verification state from live health (`--write`) |

## Clusters, environments and fleet

```bash
adhar cluster create prod --provider gcp --region us-central1 --worker-replicas 3
adhar cluster list --file config.yaml          # --file is REQUIRED
adhar cluster status prod -f config.yaml
adhar cluster scale prod --workers 5 -p digitalocean -f config.yaml
adhar cluster upgrade prod --version 1.37.2 -p digitalocean -f config.yaml
adhar cluster kubeconfig prod --print-only > kubeconfig
adhar cluster debug prod                       # inspect the instance
adhar cluster investigate prod                 # connectivity
adhar cluster delete prod --file config.yaml   # note: -f here means --force

adhar environment create dev --provider digitalocean --region blr1 --tier dev
adhar environment list
adhar environment switch dev --context adhar-dev
adhar environment config dev --cpu 8 --memory 16Gi --pods 60
adhar environment backup dev --ttl 720h0m0s

adhar fleet list                               # every registered workload cluster
adhar fleet drift                              # planes that differ from the hub
adhar fleet upgrade                            # roll a version across the fleet in waves
```

## Applications and source

| Command | What it does | Key flags |
|---|---|---|
| `application deploy <name>` | Deploy from a template, repo or file | `-t/--template`, `-r/--repo`, `--path`, `--param k=v`, `-w/--wait`, `--timeout`, `--project`, `--dest-namespace` |
| `application list` | List applications | `-A`, `-l`, `--show-labels` |
| `application status <name>` | Application status | `-d/--detailed` |
| `application scale <name>` | Scale a Deployment | `-r/--replicas` (required) |
| `application restart <name>` | Rolling restart | — |
| `application bind <name> <svc>` | Mount a backing service's connection Secret | `--secret` |
| `application delete <name>` | Delete an application | `-f/--force` |
| `application templates` | List the platform's templates | — |
| `push <name>` | Build and deploy from source, `cf push`-style | `--git-url` (required), `--subpath`, `--wait` |
| `dev [name]` | Inner loop: sync the working tree to a dev namespace | `--port`, `--local-port`, `--no-forward`, `--keep`, `--debounce` |

Templates for `--template`: `basic-git`, `microservice`, `frontend`. Both `push` and `adhar routes new` drive the Tekton supply chain: buildpacks → Trivy → Cosign → Harbor → GitOps. `application` aliases to `apps` and `app`.

## Self-service infrastructure

```bash
adhar database create --name orders --engine postgresql --size 20Gi
adhar database list && adhar database status orders && adhar database health
adhar database backup --name orders --method barmanObjectStore
adhar database restore --name orders --backup <backup> --target orders-restored
adhar database migrate --name orders --action up --path /migrations

adhar cache create sessions --engine valkey --replicas 2
adhar cache connection sessions           # host, port and URI publication
adhar bucket create uploads --size 100Gi --versioning
adhar bucket credentials uploads
adhar storage create && adhar storage list && adhar storage snapshot

adhar application bind my-app orders      # inject the connection Secret
```

## GitOps, auth and governance

```bash
adhar gitops status [-a <app>]
adhar gitops sync -a <app> [--prune] [--revision <rev>]
adhar gitops rollback -a <app> --revision <rev>
adhar gitops repo && adhar gitops workflow

adhar auth login <user> [--insecure]
adhar auth whoami                         # identity and group membership
adhar auth token                          # bearer token on stdout, nothing else
adhar auth token decode                   # the current token's claims
adhar auth user|group|role|session|mfa|provider ...

adhar policy list|status|apply|validate|export|delete
adhar compliance [--failures-only] && adhar compliance export -o report.md
adhar security scan|vulnerabilities|policies|incidents
adhar secrets list|get|create|encrypt|rotate|audit
adhar cost [breakdown]                    # showback per namespace
adhar backup create|list|status|verify|schedule
adhar restore full|database|selective|verify
adhar webhook list|create|test|monitor|security
```

## AI layer

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
adhar ai mcp list && adhar ai mcp call <tool> --arg k=v
```

Persistent flags: `-n/--namespace` (default `adhar-system`), `--model`, `--endpoint`, `--timeout` (3m), `--insecure`, `--json`. Agentic commands add `--autonomy`, `--max-steps`, `--quiet`, `--mcp`, `--yes`.

## Common workflows

**Stand up a cloud environment.**

```bash
adhar config create --provider gcp --region us-central1 --name config.yaml
adhar config validate config.yaml
adhar up -f config.yaml --env production --dry-run
adhar up -f config.yaml --env production
adhar get status && adhar get secrets -p argocd
```

**Turn a package on.**

```bash
adhar stack conflicts
adhar stack enable harbor
adhar upgrade --diff-only
adhar upgrade --yes
adhar get apps -o json | jq -r '.[] | select(.status | contains("Not Ready")) | .name'
```

**Ship from source, with a database.**

```bash
adhar push orders-api --git-url https://github.com/acme/orders --wait
adhar database create --name orders --engine postgresql
adhar application bind orders-api orders
adhar application status orders-api --detailed
adhar routes show --name orders-api
```

**Triage an unhealthy platform.**

```bash
adhar get status && adhar get apps
adhar ai diagnose keycloak
adhar gitops sync -a keycloak
adhar logs --component keycloak --lines 200
```

## Scripting and exit codes

Diagnostics go to stderr and the payload to stdout, so `-o json` and `adhar auth token` are pipe-safe: the banner and footer are suppressed automatically.

```bash
adhar get status -o json | jq -r '.OverallStatus'
TOKEN=$(adhar auth token) && curl -H "Authorization: Bearer $TOKEN" https://…
adhar get status >/dev/null 2>&1 || echo "platform unhealthy"   # exit 1 on failure
adhar version --short
```

> Three flag traps. Pass `--env <name>` with `-f`, or **every** environment in the file is provisioned. `adhar cluster list/status/scale/upgrade` need `--file`, or they report "No clusters found". And on `cluster delete`, `-f` is `--force` — spell out `--file`.

## See also

- [Quick Start](/docs/getting-started/quick-start) — a guided first run.
- [Customization](/docs/operations/customization) — `stack` and `upgrade` in context.
- [Accessing the Platform](/docs/operations/accessing-the-platform) — URLs and credentials.
- [Troubleshooting](/docs/reference/troubleshooting) — unexpected command output.
