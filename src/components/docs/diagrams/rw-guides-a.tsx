import type { ComponentType } from "react";
import { Flow, Pipeline, Split } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "nga-". */

/* ------------------------------------------------------------------ *
 * Guide — Deploy a Database-Backed Service
 * ------------------------------------------------------------------ */

const BindVsCommit = () => (
  <Split
    width={760}
    label="Two ways to give an orders Deployment you maintain yourself the orders-db-app Secret. adhar application bind patches the live Deployment with envFrom on its first container and leaves Git unchanged. Committing secretKeyRef entries to manifests/deployment.yaml records the wiring in Git, and ArgoCD applies and keeps it."
    caption="Both read the same generated Secret. Only the commit survives the next sync and the next reader."
    left={{
      heading: "adhar application bind",
      tone: "plain",
      items: [
        "Patches the live Deployment",
        "envFrom on the first container",
        "Every Secret key, under its own name",
        "Git does not record the change",
      ],
      note: "Use for a quick experiment.",
    }}
    right={{
      heading: "Commit secretKeyRef",
      tone: "primary",
      items: [
        "Edits manifests/deployment.yaml",
        "Named keys, in the container you choose",
        "Rename keys to what your code reads",
        "ArgoCD applies it and keeps it",
      ],
      note: "Use for anything that lasts.",
    }}
  />
);

/* ------------------------------------------------------------------ *
 * Guide — Promote Across Environments
 * ------------------------------------------------------------------ */

const PromotionObjects = () => (
  <Split
    width={760}
    label="Which object creates what for promotion. The Project creates, once per project, the environments and their namespaces, the Kargo Project and its ProjectConfig promotion policy, and the shared Stages dev, test and prod. Each Application creates one ArgoCD Application per environment that syncs the stage/<env> branch, one Kargo Warehouse that watches the application's image, and a Job that seeds the stage branches."
    caption="Stages belong to the project; every application in it is promoted through the same three."
    left={{
      heading: "Project — once per project",
      tone: "primary",
      items: [
        "Environments dev · test · prod + namespaces",
        "Kargo Project in namespace <project>",
        "ProjectConfig: dev, test auto · prod manual",
        "Stages dev → test → prod",
      ],
      note: "Decides where, who and in what order.",
    }}
    right={{
      heading: "Application — once per app",
      tone: "accent",
      items: [
        "ArgoCD app <project>-<app>-<env> per env",
        "Each syncs branch stage/<env>",
        "Warehouse <app>: commit-SHA image tags",
        "Job that seeds stage/<env> from main",
      ],
      note: "Decides what gets promoted.",
    }}
  />
);

const ReleaseFlow = () => (
  <Flow
    label="How a Release reaches production. You create a Release in adhar-system naming the project, application, environment and Freight. Its composition runs the Job release-<name> as ServiceAccount adhar-release in the project namespace. The Job creates a Kargo Promotion against the project's prod Stage. Kargo renders the prod overlay and commits it to the stage/prod branch, and ArgoCD syncs that commit into the prod namespace."
    caption="A Release is the reviewable record of one promotion. A rollback is another Release that names older Freight."
    nodes={[
      { title: "Release", lines: ["adhar-system", "freight + reason"], tone: "primary" },
      { title: "Job", lines: ["release-<name>", "SA adhar-release"] },
      { title: "Promotion", lines: ["Kargo", "Stage prod"], tone: "accent" },
      { title: "stage/prod", lines: ["rendered commit", "digest pinned"] },
      { title: "ArgoCD", lines: ["syncs", "<project>-prod"], tone: "primary" },
    ]}
    edges={[
      { label: "composes" },
      { label: "creates" },
      { label: "commits" },
      { label: "applied by", tone: "primary" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Guide — Onboard a Team
 * ------------------------------------------------------------------ */

const OnboardSteps = () => (
  <Pipeline
    label="Onboarding a team in seven stages: create the Keycloak group and add members, declare the Team, set the team's quota allowance, create the Project, prove the access boundary by impersonation, give the team its tools, and have the new engineer sign in with kubectl through OIDC."
    caption="Identity lives in Keycloak; everything the team is granted is composed from the Team and the Project."
    stages={[
      { name: "group", detail: "Keycloak", guarantee: "ws-team-adhar\n.payments" },
      { name: "Team", detail: "XR applied", guarantee: "Gitea team,\nexpected group", tone: "primary" },
      { name: "allowance", detail: "ConfigMap", guarantee: "ceiling across\nprojects" },
      { name: "Project", detail: "XR applied", guarantee: "namespaces,\nRBAC, quota", tone: "primary" },
      { name: "prove", detail: "can-i --as", guarantee: "own namespaces\nonly" },
      { name: "tools", detail: "Console · Gitea", guarantee: "repo access\ngranted" },
      { name: "first day", detail: "OIDC kubectl", guarantee: "signs in as\nthemselves", tone: "accent" },
    ]}
  />
);

const QuotaCeiling = () => (
  <Flow
    label="How the team quota ceiling is enforced. Creating or updating a Project calls the adhar-tenant-quotas validating webhook. The webhook sums cpuQuota, memoryQuota and podQuota across every Project of the same team, compares the totals and the project count with the team's entry in the adhar-tenant-quotas ConfigMap, or the default entry, and admits or denies the Project."
    caption="The per-namespace ResourceQuota caps one namespace; this ceiling caps the team across all its projects."
    nodes={[
      { title: "Project", lines: ["create / update", "cpu · memory · pods"], tone: "primary" },
      { title: "Webhook", lines: ["adhar-tenant-quotas", "sums the team's Projects"] },
      { title: "Allowance", lines: ["ConfigMap entry", "<team> or default"], tone: "accent" },
      { title: "Decision", lines: ["within: admit", "over: deny"], tone: "primary" },
    ]}
    edges={[
      { label: "admission" },
      { label: "compares" },
      { label: "returns", tone: "primary" },
    ]}
  />
);

/* ------------------------------------------------------------------ *
 * Guide — Manage Secrets End to End
 * ------------------------------------------------------------------ */

const SecretBoundary = () => (
  <Split
    width={760}
    label="Two kinds of secret store. The platform's ClusterSecretStores vault, platform, keycloak, argocd and gitea can reach every path or every platform Secret, so they serve only platform namespaces (adhar-system, plus adhar-environments for gitea) and refuse ExternalSecrets from tenant namespaces. A tenant's own namespaced SecretStore logs in to OpenBao as ServiceAccount adhar-secrets with role tenant and can read only secret/tenants/<its namespace>/, because OpenBao takes the namespace from the verified token."
    caption="The namespace is the unit of trust: a store reads only the path named after the namespace it lives in."
    left={{
      heading: "Platform stores — ClusterSecretStore",
      tone: "plain",
      items: [
        "vault · platform · keycloak · argocd · gitea",
        "vault uses role external-secrets",
        "Reach every OpenBao path",
        "Serve platform namespaces only",
      ],
      note: "An ExternalSecret from a tenant namespace is refused.",
    }}
    right={{
      heading: "Your store — SecretStore",
      tone: "primary",
      items: [
        "Lives in your namespace, in Git",
        "Logs in as ServiceAccount adhar-secrets",
        "Role tenant, policy tenant-secrets",
        "Reads secret/tenants/<namespace>/ only",
      ],
      note: "OpenBao takes the namespace from the verified token.",
    }}
  />
);

export const rw_guides_a: Record<string, ComponentType> = {
  "nga-bind-vs-commit": BindVsCommit,
  "nga-promotion-objects": PromotionObjects,
  "nga-release-flow": ReleaseFlow,
  "nga-onboard-steps": OnboardSteps,
  "nga-quota-ceiling": QuotaCeiling,
  "nga-secret-boundary": SecretBoundary,
};
