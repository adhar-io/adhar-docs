---
title: "CLI Reference"
section: "Reference"
order: 1
path: "/docs/reference/cli"
---

# CLI Reference

The `adhar` CLI drives the whole platform. Run `adhar --help` for the full command list and `adhar <command> --help` for any command's flags. Inspection commands accept `-o json` / `-o yaml` for scripting.

## Platform lifecycle

```bash
adhar up                     # create or converge the platform (local Kind by default)
adhar up -f config.yaml      # cloud / production, from a config file
adhar upgrade                # converge foundation, diff and re-push the stack
adhar down                   # tear down the local platform
adhar down -f config.yaml --env dev   # tear down a cloud environment
```

Key `adhar up` flags:

```bash
-f, --file <cfg>        # provision from a config file
--env <name>            # target one environment (always pass this with -f)
--recreate              # DESTRUCTIVE: delete the existing cluster first
--port <n>              # HTTPS host port (default 8443); HTTP derives as n − 363
--host <name>           # platform host name (default adhar.localtest.me)
--kube-version <v>      # Kubernetes version, any provider (default v1.37.0)
--ha                    # render the foundation in HA mode
-d, --dry-run           # preview without applying
--dev-password          # set ArgoCD and Gitea admin passwords to `developer`
```

`adhar upgrade` flags: `--diff-only` (show the stack diff, change nothing), `-y` (non-interactive), `--skip-foundation` (only diff and sync the stack).

## Inspect & get

```bash
adhar get status             # AdharPlatform conditions + per-package health
adhar get apps               # workload readiness (ArgoCD applications)
adhar get all                # comprehensive overview
adhar get secrets [-p svc]   # credentials (argocd | gitea | keycloak | harbor | vault | ...)
adhar get dataplanes         # workload clusters registered with the control plane
adhar health                 # platform health checks
```

Every `get` command supports structured output:

```bash
adhar get status -o json | jq -r '.OverallStatus'
adhar get apps -o json | jq -r '.[] | select(.status | contains("Not Ready")) | .name'
```

## Authentication

```bash
adhar auth login             # OIDC login (Keycloak)
adhar auth whoami            # identity + group membership
adhar auth token             # print an OIDC token for scripting
```

## Applications

```bash
adhar application deploy <name> --template <t>            # from a Gitea template
adhar application deploy <name> --repo <url> [--path p]   # from a repo
adhar application list [-A]
adhar application status <name> [--detailed]
adhar application scale <name> --replicas 3
adhar application restart <name>
adhar application bind <name> <service>                   # mount a backing service's Secret
adhar application delete <name> [--force]
```

Templates for `--template`: `basic-git`, `microservice`, `frontend`.

## Ship from source

```bash
adhar push <name> --git-url <url> [--subpath dir] [--wait]   # build → sign → scan → deploy
adhar dev [name] --port 8080                                 # inner-loop dev against the platform
```

Both drive the Tekton supply chain: build with buildpacks → scan with Trivy → sign with Cosign → push to Harbor → deploy through GitOps.

## Self-service infrastructure

```bash
adhar database create --name orders --engine postgresql
adhar cache create sessions --replicas 2       # Valkey/Redis
adhar bucket create uploads                    # S3 object storage
adhar application bind my-app orders           # inject the connection Secret
```

## Platform packages (stack)

```bash
adhar stack list             # the catalogue: enabled or not
adhar stack status           # how converged the platform is
adhar stack describe <pkg>   # contract, live state, dependencies
adhar stack enable <pkg>     # edit the stack (then: adhar upgrade)
adhar stack disable <pkg>
adhar stack conflicts        # packages that must not both be on
```

## Clusters & environments

```bash
adhar cluster create <name> --provider gcp --region us-central1 --worker-replicas 3
adhar cluster list --file config.yaml          # --file is REQUIRED
adhar cluster scale <name> --workers 5 -p <provider> -f config.yaml
adhar cluster upgrade <name> --version 1.37.2 -p <provider> -f config.yaml
adhar cluster kubeconfig <name> --print-only > kubeconfig
adhar cluster delete <name> --file config.yaml   # note: -f means --force here

adhar environment create dev --provider digitalocean --region blr1 --tier dev
adhar environment list
adhar environment switch dev
```

## GitOps

```bash
adhar gitops status
adhar gitops sync -a <app> [--prune]
adhar gitops rollback -a <app> --revision <rev>
```

## AI layer

```bash
adhar ai status                       # gateway, models, runtime, autonomy, session
adhar ai models                       # what --model may be set to
adhar ai ask "why is keycloak not ready?"
adhar ai chat                         # interactive
adhar ai agent "…"                    # tool-calling loop
adhar ai diagnose <package>           # agentic triage: pods, logs, events
adhar ai key set --provider anthropic # seed a provider key (prompted, never echoed)
```

Flags include `--autonomy <stage>`, `--model`, `--endpoint`, `--mcp`, `--no-context`.

## Scripting tips

```bash
TOKEN=$(adhar auth token) && curl -H "Authorization: Bearer $TOKEN" https://…
adhar get status -o json 2>/dev/null      # payload alone (banner goes to stderr)
```

> Two flag traps: always pass `--env <name>` with `-f` (else *all* environments are provisioned), and `adhar cluster list/scale/upgrade` require `--file` — on `cluster delete`, `-f` means `--force`, so spell out `--file`.

See [Getting Started](/docs/getting-started/quick-start) for guided workflows and [Troubleshooting](/docs/reference/troubleshooting) when something breaks.
