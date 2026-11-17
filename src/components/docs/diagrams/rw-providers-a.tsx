import type { ComponentType } from "react";
import { Flow, Ladder } from "@/components/docs/diagram-kit";

/** New diagrams from the docs rewrite. Every key is prefixed "npa-". */

/* Overview: the provider is the only cloud-aware part of the path from config to platform. */
const ProviderBoundary = () => (
  <Flow
    label="Where the provider sits: config.yaml names a provider; the provider authenticates, runs preflight and creates or adopts a cluster; the platform bootstrap then installs Cilium, the Gateway, ArgoCD, Gitea and Crossplane; and ArgoCD syncs the package catalogue. Only the provider step differs between clouds."
    caption="Only the provider step knows which cloud you are on. Everything to its right is identical everywhere."
    nodes={[
      { title: "config.yaml", lines: ["provider: <key>", "clusterMode"] },
      { title: "Provider", lines: ["authenticate · preflight", "create or adopt a cluster"], tone: "primary" },
      { title: "Cluster", lines: ["compute · managed", "· provided"] },
      { title: "Platform bootstrap", lines: ["Cilium · Gateway · ArgoCD", "Gitea · Crossplane"], tone: "accent" },
      { title: "GitOps sync", lines: ["the package catalogue"], tone: "accent" },
    ]}
    edges={[{ label: "selects" }, { label: "builds" }, { label: "kubeconfig" }, { label: "seeds" }]}
  />
);

/* Kind: how an image pull travels through the pull-through cache. */
const KindImageCache = () => (
  <Flow
    label="An image pull on the Kind node: containerd consults its certs.d mirror for the image's registry, which points at the matching adhar-registry-cache container on the kind network. The cache serves the image from the shared adhar-registry-cache volume, or fetches it from the upstream registry and keeps it. If the cache is down, containerd pulls from the upstream registry directly."
    caption="A cache that is down is skipped: containerd falls back to the upstream registry."
    nodes={[
      { title: "Kind node", lines: ["containerd", "certs.d mirrors"], tone: "primary" },
      { title: "adhar-registry-cache-<host>", lines: ["registry:3.0.0, one per registry", "volume adhar-registry-cache"] },
      { title: "upstream registry", lines: ["docker.io, quay.io,", "ghcr.io, …"], tone: "muted" },
    ]}
    edges={[{ label: "pull" }, { label: "on a miss", dashed: true }]}
  />
);

/* DigitalOcean: what one `adhar up` does, in order. */
const DigitalOceanSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The DigitalOcean provisioning sequence in compute mode: preflight; VPC, firewall and SSH key; droplets created and prepared in parallel; kubeadm init and join with kube-proxy skipped; the DigitalOcean cloud-controller-manager and CSI driver installed over SSH; the platform bootstrap; and the GitOps sync of the package catalogue."
    caption="The CLI runs the first five stages. The in-cluster AdharPlatform controller drives the last two."
    rungs={[
      {
        name: "preflight",
        detail: "token, API access",
        tone: "primary",
        adds: ["lists Kubernetes clusters and VPCs to prove the token works", "✖ any fail → stop; nothing was created"],
      },
      { name: "VPC", detail: "firewall · SSH key", adds: ["a matching VPC is reused; a per-cluster ed25519 key is generated"] },
      {
        name: "droplets",
        detail: "prepared in parallel",
        adds: ["containerd, pinned kubeadm stream, swap off,", "Cilium images pre-pulled"],
      },
      {
        name: "kubeadm init / join",
        detail: "kube-proxy skipped",
        adds: ["Cilium replaces kube-proxy; nodes stay NotReady until it arrives"],
      },
      {
        name: "DO CCM + CSI",
        detail: "installed over SSH",
        adds: ["the cluster is serving; kubeconfig fetched over SSH"],
      },
      {
        name: "platform bootstrap",
        adds: ["Gateway API CRDs → Cilium → Gateway → ArgoCD → Gitea → Crossplane →", "seed platform/stack into Gitea"],
      },
      {
        name: "GitOps sync",
        detail: "ArgoCD",
        tone: "accent",
        adds: ["packages converge to Synced + Healthy; the autoscaler adds workers"],
      },
    ]}
  />
);

/* Civo: the shipped managed-mode sequence. */
const CivoSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The Civo provisioning sequence in the shipped managed mode: preflight confirms the token; the quota check refuses a cluster that will not fit; Civo builds a k3s cluster with Cilium and without Traefik; Civo's own cloud-controller-manager and CSI driver come with it; the platform bootstrap leaves Civo's Cilium in place and installs the Gateway, ArgoCD, Gitea and Crossplane; and ArgoCD syncs the package catalogue."
    caption="Compute mode replaces the middle two stages with instances + kubeadm and a host-network Gateway."
    rungs={[
      { name: "preflight", detail: "token works", tone: "primary", adds: ["✖ fail → stop; nothing was created"] },
      {
        name: "quota check",
        detail: "GetQuota",
        adds: ["instances, CPU, RAM, disk, volumes, networks", "a shortfall stops the run and names each limit"],
      },
      {
        name: "Civo k3s cluster",
        detail: "clusterMode: managed",
        adds: ["created with Cilium as the CNI; Civo's default marketplace", "apps (Traefik) are not installed"],
      },
      {
        name: "Civo CCM + CSI",
        detail: "run by Civo",
        adds: ["a Civo load balancer for the Gateway; Civo volumes for adhar-block"],
      },
      {
        name: "platform bootstrap",
        adds: ["finds Cilium present and leaves it; then Gateway → ArgoCD →", "Gitea → Crossplane → seed platform/stack into Gitea"],
      },
      { name: "GitOps sync", detail: "ArgoCD", tone: "accent", adds: ["packages converge to Synced + Healthy"] },
    ]}
  />
);

/* Custom: how traffic reaches the platform when no cloud can supply a load balancer. */
const CustomTopology = () => (
  <Flow
    label="Custom provider topology: clients resolve the platform hostnames through a DNS zone, either one a dnsProvider manages or your own. The records point at every host's IP, or at an optional load balancer you run in front of the hosts. Each host runs Envoy on the host network, bound to ports 80 and 443, as the Cilium Gateway. The cluster is one control-plane host from masterIPs and the worker hosts from workerIPs, built with kubeadm over SSH."
    caption="No cloud load balancer exists here, so the Gateway binds :80/:443 on every host."
    nodes={[
      { title: "you / your users", lines: ["https://console.<defaultHost>"] },
      { title: "DNS", lines: ["dnsProvider zone,", "or records you manage"] },
      { title: "your load balancer", lines: ["optional", "80 / 443 → every host"], tone: "muted" },
      { title: "every host :80 / :443", lines: ["Envoy on the host network", "(Cilium Gateway)"], tone: "primary" },
      { title: "cluster", lines: ["masterIPs[0] + workerIPs", "kubeadm over SSH"], tone: "accent" },
    ]}
    edges={[{ label: "resolve" }, { label: "A records" }, { label: "forward", dashed: true }, { label: "routes" }]}
    gap={40}
  />
);

/* Custom: what one `adhar up` does on hosts you own. */
const CustomSequence = () => (
  <Ladder
    width={880}
    boxW={250}
    heading={["stage", "what happens"]}
    label="The custom provider sequence: SSH and root checks on every host; node preparation on each host in turn; kubeadm init on the one control-plane host with kube-proxy skipped; kubeadm join on each worker; the local-path provisioner installed as the default StorageClass; the platform bootstrap with a host-network Gateway; and the GitOps sync."
    caption="Every stage is safe to repeat: prepared hosts, an initialised control plane and joined workers are skipped."
    rungs={[
      {
        name: "SSH + root checks",
        detail: "every host, port 22",
        tone: "primary",
        adds: ["passphrase-less key; id -u must print 0 (root or passwordless sudo)"],
      },
      {
        name: "node prep",
        detail: "one host at a time",
        adds: ["containerd, pinned kubeadm stream, swap off, sysctls, resolver"],
      },
      {
        name: "kubeadm init",
        detail: "masterIPs[0]",
        adds: ["kube-proxy skipped; no CNI yet, so nodes stay NotReady"],
      },
      { name: "kubeadm join", detail: "workerIPs", adds: ["hosts already in the node list are skipped"] },
      {
        name: "storage",
        detail: "local-path provisioner",
        adds: ["StorageClass local-path, marked default; node-local, not replicated"],
      },
      {
        name: "platform bootstrap",
        adds: ["Cilium → host-network Gateway (:80/:443 on every host) →", "ArgoCD → Gitea → Crossplane → seed platform/stack"],
      },
      { name: "GitOps sync", detail: "ArgoCD", tone: "accent", adds: ["packages converge to Synced + Healthy"] },
    ]}
  />
);

export const rw_providers_a: Record<string, ComponentType> = {
  "npa-provider-boundary": ProviderBoundary,
  "npa-kind-image-cache": KindImageCache,
  "npa-digitalocean-sequence": DigitalOceanSequence,
  "npa-civo-sequence": CivoSequence,
  "npa-custom-topology": CustomTopology,
  "npa-custom-sequence": CustomSequence,
};
