import type { ComponentType } from "react";
import {
  Box, Caption, C, Flow, Frame, GroupBox, Ladder, Pipeline, Stack,
} from "@/components/docs/diagram-kit";

/** Diagrams owned by the howto-a pages. Every key is prefixed "ha-". */

/* ------------------------------------------------------------------ *
 * Guide — Deploy a Database-Backed Service
 * ------------------------------------------------------------------ */

const DbBinding = () => (
  <Flow
    label="A Database request in the team namespace is composed by database-local-cnpg into a CloudNativePG Cluster. CNPG generates the orders-db-app Secret, and the application's Deployment reads it through secretKeyRef."
    caption="Only the Database and the Deployment are yours to write; everything between them is composed or generated."
    nodes={[
      { title: "Database", lines: ["orders-db", "platform.adhar.io"], tone: "primary" },
      { title: "Composition", lines: ["database-local-cnpg", "provider: local"] },
      { title: "CNPG Cluster", lines: ["orders-db", "Service orders-db-rw"] },
      { title: "Secret", lines: ["orders-db-app", "uri · host · password"], tone: "accent" },
      { title: "Deployment", lines: ["orders", "env: secretKeyRef"], tone: "primary" },
    ]}
    edges={[
      { label: "selects" },
      { label: "renders" },
      { label: "generates" },
      { label: "read by", tone: "primary" },
    ]}
  />
);

const DbGuideSteps = () => (
  <Pipeline
    label="The guide in six stages: create a namespace, request the database, scaffold the service, bind the credentials in Git, verify end to end, tear down."
    caption="Every stage ends with a check; do not move on until it passes."
    stages={[
      { name: "namespace", detail: "kubectl", guarantee: "a home for\nboth halves" },
      { name: "Database", detail: "XR applied", guarantee: "READY=True,\nSecret exists", tone: "primary" },
      { name: "scaffold", detail: "golden path", guarantee: "repo in Gitea,\nArgoCD app" },
      { name: "bind", detail: "git commit", guarantee: "env from\nthe Secret", tone: "primary" },
      { name: "verify", detail: "psql + curl", guarantee: "app talks\nto Postgres" },
      { name: "teardown", detail: "delete", guarantee: "nothing\norphaned", tone: "muted" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Guide — Promote Across Environments
 * ------------------------------------------------------------------ */

const PromotionChain = () => (
  <Pipeline
    label="A push to main runs app-ci, which publishes a signed image to Harbor. The Kargo Warehouse turns it into Freight. The project's Stages dev and test promote automatically; Stage prod promotes only through a Release. Each Stage renders its environment to the stage/<env> branch that ArgoCD syncs."
    caption="One build, one digest — the same artifact moves from dev to prod. Each promotion renders a new commit on that environment's stage branch."
    stages={[
      { name: "app-ci", detail: "build·scan·sign", guarantee: "signed image\nin Harbor" },
      { name: "Warehouse", detail: "Kargo", guarantee: "Freight =\nimage digest", tone: "primary" },
      { name: "dev", detail: "Stage · auto", guarantee: "renders\nstage/dev" },
      { name: "test", detail: "Stage · auto", guarantee: "after dev\nis Healthy" },
      { name: "prod", detail: "Stage · manual", guarantee: "a Release\nobject", tone: "accent" },
    ]}
  />
);

const PromotionSteps = () => (
  <Ladder
    width={760}
    label="What one Kargo promotion does: check out main and the environment's stage branch, pin the image digest in the environment's overlay, clear the stage branch, render the overlay into it, commit, push to stage/<env>, then wait for ArgoCD to sync that commit and report Healthy."
    heading={["promotion step", "what it changes"]}
    caption="A promotion is a commit on stage/<env>. Kargo never writes to the cluster, and the digest edit never reaches main."
    rungs={[
      { name: "git-clone", detail: "main → ./src · stage/<env> → ./out", adds: ["Checks out the source and the environment's rendered branch"] },
      {
        name: "kustomize-set-image",
        detail: "deploy/envs/<env>",
        tone: "primary",
        adds: ["Pins the image by digest in Kargo's working copy only", "the artifact cosign signed"],
      },
      { name: "git-clear", detail: "./out", adds: ["Empties the rendered branch's working tree"] },
      { name: "kustomize-build", detail: "→ ./out/manifests.yaml", adds: ["Renders the overlay into one manifest file"] },
      { name: "git-commit", detail: "promote(<env>): <app> sha256:…", adds: ["One commit per promotion — your audit trail"] },
      { name: "git-push", detail: "targetBranch: stage/<env>", adds: ["The commit lands; nothing has deployed yet"] },
      {
        name: "argocd-update",
        detail: "<project>-<app>-<env>",
        tone: "accent",
        adds: ["Waits for ArgoCD to sync that exact commit", "and for the Rollout to report Healthy"],
      },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Guide — Onboard a Team
 * ------------------------------------------------------------------ */

const TeamObjects = () => (
  <Stack
    label="The tenancy hierarchy for a new team: the Organisation adhar, a Team named payments, a Project named payments, and the three environments the Project composes — each a namespace with quota, network policy and the team's access."
    sideLabel="composes"
    caption="You create the Team and the Project. The environments are composed for you, one per entry."
    layers={[
      { id: "Org", name: "Organisation adhar", items: "seeded by adhar up · Gitea organisation adhar" },
      { id: "Team", name: "Team payments", items: "Keycloak group ws-team-payments · Gitea team payments", tone: "primary" },
      { id: "Proj", name: "Project payments", items: "namespace payments · AppProject · Kargo Project · quota", tone: "primary" },
      { id: "Env", name: "payments-dev · payments-test · payments-prod", items: "admin · admin · view   (ResourceQuota, LimitRange, default-deny ingress)", tone: "accent" },
    ]}
  />
);

const TeamAccess = () => (
  <Frame
    width={760}
    height={300}
    label="How a person gets access: membership of the Keycloak group ws-team-payments puts groups in their token; the API server prefixes it to oidc:ws-team-payments; RoleBindings composed by the Project and its Environments grant admin in payments, payments-dev and payments-test, and view in payments-prod."
  >
    <Box x={8} y={40} w={150} h={58} title="Keycloak" lines={["ws-team-payments"]} tone="primary" />
    <Box x={218} y={40} w={150} h={58} title="token" lines={["groups claim"]} />
    <Box x={428} y={40} w={150} h={58} title="kube-apiserver" lines={["prefix oidc:"]} />

    <line x1={158} y1={69} x2={212} y2={69} stroke={C.primary} strokeWidth={1.5}
      markerEnd="url(#dk-arrow-primary)" />
    <Caption x={185} y={60} anchor="middle" color={C.primary} weight={600}>login</Caption>
    <line x1={368} y1={69} x2={422} y2={69} stroke={C.strong} strokeWidth={1.5}
      markerEnd="url(#dk-arrow)" />
    <Caption x={395} y={60} anchor="middle">bearer</Caption>

    <GroupBox x={8} y={140} w={744} h={120} label="RoleBindings composed by Project + Environments (subject: Group oidc:ws-team-payments)" />
    <Box x={24} y={172} w={168} h={58} title="payments" lines={["admin"]} />
    <Box x={204} y={172} w={168} h={58} title="payments-dev" lines={["admin"]} />
    <Box x={384} y={172} w={168} h={58} title="payments-test" lines={["admin"]} />
    <Box x={564} y={172} w={172} h={58} title="payments-prod" lines={["view"]} tone="accent" />

    <path d="M 503 98 L 503 120 L 380 120 L 380 140" fill="none" stroke={C.strong}
      strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
    <Caption x={512} y={116}>RBAC match</Caption>
    <Caption x={8} y={286}>
      Nothing cluster-wide: the team reaches its own namespaces and no others. Production changes arrive through a Release.
    </Caption>
  </Frame>
);

/* ------------------------------------------------------------------ *
 * Guide — Manage Secrets End to End
 * ------------------------------------------------------------------ */

const SecretFlow = () => (
  <Flow
    label="A value is written to OpenBao's KV v2 mount under secret/tenants/payments-dev/. A SecretStore in the payments-dev namespace authenticates as ServiceAccount adhar-secrets with Kubernetes auth role tenant, whose policy reads only that namespace's path. An ExternalSecret committed to Git names the path; External Secrets materialises a Kubernetes Secret, which the pod reads as environment variables or a volume."
    caption="Git carries the SecretStore and ExternalSecret — pointers. The namespace in the login decides which path is readable."
    nodes={[
      { title: "OpenBao", lines: ["tenants/payments-dev/", "orders/config"], tone: "primary" },
      { title: "SecretStore", lines: ["in payments-dev", "role tenant", "SA adhar-secrets"] },
      { title: "ExternalSecret", lines: ["in Git", "refreshInterval"], tone: "accent" },
      { title: "Secret", lines: ["orders-config", "owned by ESO"] },
      { title: "Pod", lines: ["env / volume"], tone: "primary" },
    ]}
    edges={[
      { label: "read" },
      { label: "resolves" },
      { label: "writes" },
      { label: "mounted", tone: "primary" },
    ]}
  />
);

const SecretRotation = () => (
  <Ladder
    width={760}
    label="Rotating an OpenBao-backed secret: write a new version in OpenBao, let External Secrets refresh or force a sync, confirm the Kubernetes Secret changed, then restart the consumers, because a running process keeps the value it read at start-up."
    heading={["rotation step", "what actually changes"]}
    caption="Step 4 is the one people skip — environment variables are read once, at process start."
    rungs={[
      { name: "1. bao kv put", detail: "new version", tone: "primary", adds: ["OpenBao keeps the old version; KV v2 is versioned"] },
      { name: "2. ESO refresh", detail: "interval or force-sync", adds: ["refreshInterval elapses, or annotate force-sync"] },
      { name: "3. Secret updated", detail: "same name, new data", adds: ["Kubernetes Secret now holds the new value", "Running pods do not notice"] },
      { name: "4. rollout restart", detail: "consumers", tone: "accent", adds: ["New pods read the new value", "volume mounts update on their own; env vars never do"] },
    ]}
  />
);

export const howto_a = {
  "ha-db-binding": DbBinding,
  "ha-db-guide-steps": DbGuideSteps,
  "ha-promotion-chain": PromotionChain,
  "ha-promotion-steps": PromotionSteps,
  "ha-team-objects": TeamObjects,
  "ha-team-access": TeamAccess,
  "ha-secret-flow": SecretFlow,
  "ha-secret-rotation": SecretRotation,
} as Record<string, ComponentType>;
