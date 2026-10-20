import {
  Target,
  PenTool,
  Code,
  Rocket,
  Search,
  Compass,
  GitBranch,
  Boxes,
  KeyRound,
  LockKeyhole,
  Activity,
  ShieldCheck,
  LayoutDashboard,
  Cloud,
  Download,
  MessageSquare,
} from "lucide-react";

// Landing-page copy. Every claim here should be checkable against the docs or
// the platform repo — no invented metrics, customers or compliance badges.

/**
 * The 6 D's — Adhar's lifecycle model (see /docs/core-concepts/ds-framework).
 * Each stage names the question it answers and the artifacts it hands on.
 */
export const features = [
  {
    icon: Target,
    title: "Define",
    question: "What are we building, and who owns it?",
    description:
      "Ownership is a real object, not a wiki page: a catalog entry plus a Project with its team, quota and tier.",
    details: ["Catalog entry", "Project", "API contract"],
  },
  {
    icon: PenTool,
    title: "Design",
    question: "How will it be built, and within what limits?",
    description:
      "Platform engineers write the rules once — infrastructure APIs, policies and quotas — and every team inherits them.",
    details: ["Crossplane XRDs & Compositions", "Kyverno policies", "Quotas"],
  },
  {
    icon: Code,
    title: "Develop",
    question: "Does the code work against the real platform?",
    description:
      "Teams start from golden-path templates and test on the same platform they ship to, with a preview environment for every pull request.",
    details: ["Golden-path templates", "Tests", "Preview environment"],
  },
  {
    icon: Rocket,
    title: "Deliver",
    question: "How does a commit become production, safely?",
    description:
      "A commit is built, scanned and signed, then promoted by GitOps. The cluster only admits images it can verify.",
    details: ["Signed image", "ArgoCD Application", "Promotion"],
  },
  {
    icon: Search,
    title: "Discover",
    question: "What is it actually doing in production?",
    description:
      "Metrics, logs and traces arrive with no per-service setup, next to cost data and production-readiness scorecards.",
    details: ["Metrics, logs & traces", "Cost", "Scorecards"],
  },
  {
    icon: Compass,
    title: "Decide",
    question: "What should we do next, and why?",
    description:
      "What you learn in production shapes budgets and the roadmap, and feeds the next Define. The six stages form a loop.",
    details: ["Budgets", "Roadmap changes", "Input for the next Define"],
  },
];

/** What ships out of the box (mirrors the docs overview table). */
export const capabilities = [
  {
    icon: GitBranch,
    title: "GitOps delivery",
    description:
      "ArgoCD reconciles the cluster against an in-cluster Gitea repository. A Git commit is the only way to change the platform.",
    stats: "ArgoCD · Gitea",
    highlight: true,
  },
  {
    icon: Boxes,
    title: "Self-service infrastructure",
    description:
      "Developers request databases, caches and buckets as ordinary Kubernetes resources — no ticket, no waiting.",
    stats: "Crossplane v2",
  },
  {
    icon: KeyRound,
    title: "Single sign-on",
    description:
      "One identity for every platform service and the Kubernetes API, through OIDC.",
    stats: "Keycloak",
  },
  {
    icon: LockKeyhole,
    title: "Secrets, never in Git",
    description:
      "Secrets live in a Vault-compatible store and sync into workloads only where they are needed.",
    stats: "OpenBao · External Secrets",
  },
  {
    icon: ShieldCheck,
    title: "Signed supply chain",
    description:
      "Every image is built, scanned and signed before it is stored, and the cluster refuses to run anything unsigned.",
    stats: "Tekton · Buildpacks · Trivy · Cosign · Harbor · Kyverno",
  },
  {
    icon: Activity,
    title: "Observability built in",
    description:
      "Metrics, logs, traces and network flows are collected for every service, with no per-service setup.",
    stats: "Grafana · Loki · Tempo · Mimir · Prometheus · Hubble",
  },
  {
    icon: LayoutDashboard,
    title: "Developer console",
    description:
      "A Backstage-based portal with the service catalog, golden-path templates, scorecards and a cloud shell.",
    stats: "Adhar Console · Backstage",
  },
  {
    icon: Cloud,
    title: "Runs where you do",
    description:
      "The same platform on a laptop, on AWS, Azure, GCP, DigitalOcean or Civo, or on your own hosts.",
    stats: "Kind · public clouds · on-prem",
  },
];

export const pricingPlans = [
  {
    name: "Open Source",
    subtitle: "Self-hosted",
    price: "Free",
    description:
      "The whole platform, free to run wherever you like. Every feature is included — nothing held back.",
    features: [
      "All 100+ packages and every platform feature",
      "Run it on your laptop, any supported cloud or your own hosts",
      "Full source code, Apache 2.0",
      "Unlimited projects and teams",
      "Community support on GitHub",
    ],
    cta: "Read the quick start",
    to: "/docs/getting-started/quick-start",
    icon: Download,
    popular: true,
    highlight: "APACHE 2.0",
  },
  {
    name: "Adhar Cloud",
    subtitle: "Hosted SaaS",
    price: "Coming soon",
    description:
      "The same open-source platform, hosted and run for you. For teams who would rather build products than operate infrastructure.",
    features: [
      "The same platform and features as Open Source",
      "We run the clusters and apply upgrades",
      "No infrastructure for your team to operate",
      "Move to self-hosting at any time — it's the same platform",
    ],
    cta: "Join the waitlist",
    to: "/contact",
    icon: Cloud,
    popular: false,
    highlight: "",
  },
  {
    name: "Get help",
    subtitle: "Adopting Adhar",
    price: "Talk to us",
    description:
      "Rolling Adhar out across a larger organisation? Tell us what you're planning and we'll talk it through.",
    features: [
      "Questions about architecture and rollout",
      "Running Adhar on-prem or in your own cloud accounts",
      "Ideas for what Adhar should support next",
    ],
    cta: "Contact us",
    to: "/contact",
    icon: MessageSquare,
    popular: false,
    highlight: "",
  },
];

export const faqs = [
  {
    question: "What is Adhar?",
    answer:
      "Adhar is an open-source Internal Developer Platform. It assembles 100+ curated open-source packages — GitOps, self-service infrastructure, SSO, secrets, a signed supply chain, observability and a developer console — and wires them together into one platform. You run it yourself, or soon, let us host it with Adhar Cloud.",
  },
  {
    question: "How long does it take to get a running platform?",
    answer:
      "About ten minutes on a laptop, with a single adhar up. On a supported cloud it's the same command; the time depends mostly on how quickly the provider creates machines.",
  },
  {
    question: "What do I need to try it locally?",
    answer:
      "A container engine — Docker, Podman, nerdctl or Finch — with at least 8 GB of RAM, 4 CPU cores and 20 GB of free disk given to it. 16 GB of RAM is more comfortable. You don't need kubectl to install, though you'll want it for exploring.",
  },
  {
    question: "Where can I run it?",
    answer:
      "Locally on Kind; on AWS, Azure, GCP, DigitalOcean or Civo; or on your own hosts. Local and production run the same controllers, GitOps flow and package model — only the sizing differs.",
  },
  {
    question: "How do developers get a database or a cache?",
    answer:
      "They apply a small Kubernetes resource in their own namespace, or run a CLI command such as adhar database create. Crossplane provisions it within the platform's quotas and puts the connection details in a Secret. No ticket and no manual approval.",
  },
  {
    question: "How do I change or upgrade the platform?",
    answer:
      "Commit to the platform repository, then run adhar upgrade. ArgoCD reconciles the cluster against Git about once a minute, so manual kubectl edits to managed objects are reverted. Git is the single source of truth.",
  },
  {
    question: "Is it really free? What is the licence?",
    answer:
      "Yes. Adhar is Apache 2.0 throughout. Every feature is in the open-source release — no proprietary tier and nothing held back. Adhar Cloud, when it launches, is that same platform, hosted for you.",
  },
  {
    question: "Is Adhar production-ready?",
    answer:
      "Adhar is at v0.1.x and in active development. The local and single-cluster production paths are verified end to end. Each provider page in the docs says how far that cloud has been verified, so check yours before you rely on it.",
  },
];
