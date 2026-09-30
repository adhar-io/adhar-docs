---
title: "Kubernetes"
section: "Modules"
order: 30
path: "/adhar-kit/modules/kubernetes"
---

# Kubernetes

`adhar-kit-kubernetes` lets a service read and act on its own cluster through the Fabric8 client: pod introspection, service discovery, ConfigMap and Secret access with live watches, leader election, HPA reconciliation, deployment and ingress management, and a readiness-gated graceful shutdown. It exists because **a service that knows nothing about Kubernetes ends up fighting it** — restarting to pick up a ConfigMap change, running a nightly job once per replica, or dropping in-flight requests the moment a pod is terminated.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-kubernetes` |
| Built on | Fabric8 `io.fabric8:kubernetes-client` 7.3.1, `spring-cloud-starter-kubernetes-client-all`, optional Spring Boot Actuator |
| Entry points | `KubernetesClient`, `KubernetesFacade` (via `adhar.getKubernetes()`), `KubernetesUtils` |
| Annotations | `@LeaderElected`, `@KubernetesConfigMap`, `@KubernetesSecret`, `@KubernetesAutoScale`, `@KubernetesResource` — all **class-level** |
| Use it when | Your service runs in-cluster and needs to observe or steer its own deployment |
| Needs | A ServiceAccount with RBAC for the resources you touch |

## How it works

The module separates two things most Kubernetes integrations conflate: reading the *environment* and calling the *API server*.

Environment facts come from the downward API through `KubernetesUtils` — `isRunningInKubernetes()`, `getPodName()`, `getNamespace()`, `getPodIp()`, `getNodeName()`, `getServiceAccountName()`. These are static, need no credentials, and work everywhere. Live API access goes through `KubernetesClient`, a Fabric8 wrapper, and everything built on it.

```text
     env / downward API                    API server
     (no credentials)                      (ServiceAccount + RBAC)
            |                                    |
     KubernetesUtils                       KubernetesClient  <-- you supply this bean
            |                                    |
            |               +--------------------+-------------------+
            |               |          |             |               |
            |        CachedServiceDiscovery  DeploymentService  IngressService
            |               |          HorizontalPodAutoscalerService
            |               |          ResourceMonitoringService
            |               |
     GracefulShutdownHandler|          ConfigMapReloadService --> ConfigMapChangedEvent
            |               |          SecretWatchService     --> SecretChangedEvent
            v               v          LeaderElectionService  --> Lease contention
     KubernetesReadinessHealthIndicator / KubernetesLivenessHealthIndicator
```

**The Fabric8-backed `KubernetesClient` is deliberately not auto-created.** Constructing it eagerly fails outside a cluster, so `KubernetesAutoConfiguration` expects your application to supply the bean when live API access is required. Everything gated on `@ConditionalOnBean(KubernetesClient.class)` — the cached discovery decorator among them — stays dormant until you do. That is the design that lets the module load harmlessly on a laptop.

What the auto-configuration *does* register, all with `@ConditionalOnMissingBean` so you can override any of it:

- `GracefulShutdownHandler` — a `SmartLifecycle` readiness gate. On shutdown it flips `isReady()` to false and keeps serving for `pre-stop-drain-seconds` so load balancers can drain in-flight requests before the process exits.
- `CachedServiceDiscovery` — a TTL cache in front of `discoverServices(labelSelector)`, with `refresh`, `invalidate`, and `discoverServicesUncached` escape hatches.
- `KubernetesReadinessHealthIndicator` and `KubernetesLivenessHealthIndicator`, when Actuator is present.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-kubernetes</artifactId>
    <version>0.1.0</version>
</dependency>
```

The Fabric8 client comes in transitively at version 7.3.1. Spring Boot Actuator is optional — without it the health indicators are not registered.

Wire the probe indicators into the standard probe groups:

```yaml
management:
  endpoint:
    health:
      group:
        readiness: { include: "readinessState,kubernetesReadiness" }
        liveness:  { include: "livenessState,kubernetesLiveness" }
```

## Key APIs

**`KubernetesClient`** — `getCurrentPodInfo()`, `discoverServices(labelSelector)`, `getConfigMap(name[, namespace])`, `getSecret(name[, namespace])`, `createOrUpdateConfigMap(name, data)`, `getPod(name)`, `listPods(labelSelector)`, `getNamespace()`, `close()`.

**`KubernetesFacade`** (`adhar.getKubernetes()`) — a convenience layer returning plain values: `getConfigMapValue(cm, key)`, `getSecretValue(secret, key)`, `scaleDeployment(name, replicas)`, `restartDeployment(name)`, `getDeploymentInfo(name)`, `listServices(selector)`, `getCurrentPodInfo()`, `getCurrentNamespace()`, and `isInKubernetes()`.

**Services**, each constructed with a `KubernetesClient`:

- `DeploymentService` — `scaleDeployment`, `restartDeployment`, `pauseDeployment` / `resumeDeployment`, `rollbackDeployment`, `updateImage(name, container, image)`, `isDeploymentReady`, `getReplicaSets`.
- `HorizontalPodAutoscalerService` — `reconcile(deploymentName[, namespace], KubernetesAutoScale)` builds and applies an HPA from the annotation's values; `buildHorizontalPodAutoscaler`, `getHorizontalPodAutoscaler`, and `delete` round it out.
- `IngressService`, `NamespaceService`, `ResourceMonitoringService` (`getPodMetrics`, `getPodsExceedingThresholds(cpu, memory)`, `getResourceQuota`).
- `LeaderElectionService` — constructed with a lock name, namespace, and the lease durations; `start()`, `stop()`, `isLeader()`, `getIdentity()`, plus `onStartedLeading(Runnable)` / `onStoppedLeading(Runnable)` callbacks.
- `ConfigMapReloadService` and `SecretWatchService` — `watch(name, namespace)`, `stopWatching`, `isWatching`, `getActiveWatchCount`. Each publishes `ConfigMapChangedEvent` / `SecretChangedEvent` carrying a `ChangeType`.

## Worked example — minimal

```java
import com.adhar.kit.kubernetes.client.KubernetesClient;
import com.adhar.kit.kubernetes.model.PodInfo;
import com.adhar.kit.kubernetes.model.ServiceInfo;

@Service
public class OrderService {
    private final KubernetesClient k8s;
    public OrderService(KubernetesClient k8s) { this.k8s = k8s; }

    public void process() {
        PodInfo pod = k8s.getCurrentPodInfo();
        List<ServiceInfo> payment = k8s.discoverServices("app=payment-service");
        Map<String, String> config = k8s.getConfigMap("app-config");
    }
}
```

You must define the `KubernetesClient` bean yourself, for the reason above:

```java
@Configuration
@ConditionalOnProperty("adhar.kubernetes.enabled")
public class K8sClientConfig {
    @Bean
    KubernetesClient kubernetesClient(KubernetesProperties properties) {
        return new KubernetesClient(properties);
    }
}
```

## Worked example — leader election and live config reload

`@LeaderElected` is a **type-level** annotation. `LeaderElectedBeanPostProcessor` discovers annotated beans during context refresh and, as a `SmartLifecycle`, starts one `LeaderElectionService` per candidate when the context starts. Leases are contended in the cluster, so exactly one replica leads at a time.

```java
import com.adhar.kit.kubernetes.annotation.LeaderElected;
import com.adhar.kit.kubernetes.event.ConfigMapChangedEvent;
import com.adhar.kit.kubernetes.spring.LeaderElectionAware;

@Component
@LeaderElected(lockName = "cleanup-leader", leaseDuration = 15000,
               renewDeadline = 10000, retryPeriod = 2000)
public class CleanupJob implements LeaderElectionAware {

    private volatile boolean leading = false;

    @Override public void onStartedLeading() { leading = true; }
    @Override public void onStoppedLeading() { leading = false; }

    @Scheduled(cron = "0 0 3 * * *")
    public void runNightlyCleanup() {
        if (!leading) return;          // only the elected replica proceeds
        repository.purgeExpired();
    }

    @EventListener
    public void onConfigChanged(ConfigMapChangedEvent event) {
        log.info("ConfigMap {} {}", event.getName(), event.getChangeType());
        settings.reload();             // no pod restart needed
    }
}
```

> **Leader election is off by default.** `adhar.kubernetes.leader-election.enabled` defaults to `false`; candidates are discovered but no election starts. This is deliberate, so an application does not begin contending for Leases — and needing RBAC on `coordination.k8s.io/leases` — merely by adding the annotation. Turn it on explicitly.

`@KubernetesConfigMap` and `@KubernetesSecret` are handled by `KubernetesWatchBeanPostProcessor`; `@KubernetesAutoScale` by `AutoScaleBeanPostProcessor`, which derives the HPA target name from the annotated class name in kebab-case and reconciles it through `HorizontalPodAutoscalerService`. Like the `KubernetesClient` itself, these post-processors are not registered by the auto-configuration — declare the ones you want as beans.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.kubernetes.enabled` | Master switch | `true` |
| `adhar.kubernetes.namespace` | Namespace used for API calls | `default` |
| `adhar.kubernetes.master-url` | API server URL; auto-detected when unset | (none) |
| `adhar.kubernetes.api-version` | API version | `v1` |
| `adhar.kubernetes.discovery.enabled` | Service discovery | `true` |
| `adhar.kubernetes.discovery.all-namespaces` | Search beyond the configured namespace | `false` |
| `adhar.kubernetes.discovery.service-label` | Label key used to select services | `app` |
| `adhar.kubernetes.discovery.cache-enabled` | Register `CachedServiceDiscovery` | `true` |
| `adhar.kubernetes.discovery.cache-refresh-interval` | Cache TTL, ms; non-positive disables caching | `30000` |
| `adhar.kubernetes.config-map.name` / `.watch-enabled` / `.watch-interval` | ConfigMap watch | (none) / `true` / `10000` |
| `adhar.kubernetes.secret.name` / `.watch-enabled` / `.watch-interval` | Secret watch | (none) / `true` / `10000` |
| `adhar.kubernetes.leader-election.enabled` | Start elections for `@LeaderElected` beans | `false` |
| `adhar.kubernetes.leader-election.lock-name` | Lease name | `leader-election` |
| `adhar.kubernetes.leader-election.lease-duration` / `.renew-deadline` / `.retry-period` | Lease timings, ms | `15000` / `10000` / `2000` |
| `adhar.kubernetes.graceful-shutdown.enabled` | Register the readiness gate | `true` |
| `adhar.kubernetes.graceful-shutdown.pre-stop-drain-seconds` | Keep serving after readiness flips false | `5` |
| `adhar.kubernetes.probes.enabled` | Register the readiness/liveness indicators | `true` |

```yaml
adhar:
  kubernetes:
    enabled: true
    namespace: default
    discovery: { enabled: true, service-label: app, cache-refresh-interval: 30000 }
    config-map: { enabled: true, name: app-config, watch-enabled: true }
    leader-election: { enabled: true, lock-name: my-service-leader }
    graceful-shutdown: { pre-stop-drain-seconds: 5 }
```

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `NoSuchBeanDefinitionException: KubernetesClient` | The client is intentionally not auto-created | Declare the bean yourself, guarded by a profile or property |
| `CachedServiceDiscovery` is missing | Its `@ConditionalOnBean(KubernetesClient.class)` did not match | Same fix — define the client first |
| `@LeaderElected` never elects a leader | `adhar.kubernetes.leader-election.enabled` is `false` by default | Set it to `true`, and grant RBAC on Leases |
| `@LeaderElected` on a method does nothing | The annotation targets `TYPE` only | Move it to the class, and gate work with `isLeader()` or `LeaderElectionAware` |
| 403 from the API server | The pod's ServiceAccount lacks RBAC for the resource | Add a Role/RoleBinding for configmaps, secrets, deployments, or leases as required |
| No `ConfigMapChangedEvent` arrives | Nothing called `watch(name, namespace)` | Start the watch, or register `KubernetesWatchBeanPostProcessor` and annotate the class |
| Requests drop during a rolling update | No pre-stop drain, or the readiness indicator is not in the probe group | Keep graceful shutdown enabled and add `kubernetesReadiness` to the readiness group |
| Service discovery returns stale endpoints | Results are cached for the TTL | Call `invalidate(selector)`, `refresh(selector)`, or lower `cache-refresh-interval` |

This module is most useful when your service runs *on* the [Adhar Platform](/docs); locally it degrades gracefully because nothing that needs the API server is created eagerly.

## See also

- [Health](/adhar-kit/modules/health) — the health model the readiness and liveness indicators feed
- [Production](/docs/operations/production) — rollout, probes, and drain behaviour in practice
- [Config](/adhar-kit/modules/config) — configuration sources alongside ConfigMaps
- [Architecture](/docs/core-concepts/architecture) — how services sit in the platform
