---
title: "Kubernetes"
section: "Modules"
order: 30
path: "/adhar-kit/modules/kubernetes"
---

# Kubernetes

`adhar-kit-kubernetes` lets a service read and act on its own cluster through the Fabric8 client: pod introspection, service discovery, ConfigMap and Secret access with live watches, leader election, HPA reconciliation, deployment and ingress management, and a readiness-gated graceful shutdown. It exists because **a service that knows nothing about Kubernetes ends up fighting it** — restarting to pick up a ConfigMap change, running a nightly job once per replica, or dropping in-flight requests the moment a pod is terminated.

## Read this first

> **`KubernetesClient` is deliberately NOT auto-created, and nothing tells you.** `KubernetesAutoConfiguration` registers exactly four things: `GracefulShutdownHandler`, `CachedServiceDiscovery`, and the two Actuator health indicators. The Fabric8-backed `com.adhar.kit.kubernetes.client.KubernetesClient` is not among them, because constructing it eagerly fails outside a cluster. Everything carrying `@ConditionalOnBean(KubernetesClient.class)` therefore **stays dormant and silently does nothing** — no exception, no warning, just an absent bean. `CachedServiceDiscovery` is the one in the module itself. Any `DeploymentService`, `IngressService`, `ResourceMonitoringService` or `HorizontalPodAutoscalerService` you wire is in the same position: each takes a `KubernetesClient` in its constructor, so none of them can exist until you declare that bean.
>
> If you add this module and nothing appears to happen, this is why. Declare the bean (see below), and check for the startup line `Configuring cached Kubernetes service discovery` to confirm it took effect.

That design is deliberate: it is what lets the module load harmlessly on a laptop, and it is why the graceful-shutdown gate and the probe indicators — the two things that matter in every environment — are the parts that *are* registered unconditionally.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-kubernetes` |
| Built on | Fabric8 `io.fabric8:kubernetes-client` 7.3.1 (transitive), `spring-cloud-starter-kubernetes-client-all`; optional Spring Boot Actuator |
| Entry points | `KubernetesClient`, `KubernetesFacade`, `KubernetesUtils` |
| Annotations | `@LeaderElected`, `@KubernetesConfigMap`, `@KubernetesSecret`, `@KubernetesAutoScale`, `@KubernetesResource` — all **class-level** |
| Use it when | Your service runs in-cluster and needs to observe or steer its own deployment |
| Needs | A ServiceAccount with RBAC for the resources you touch |

## How it works

The module separates two things most Kubernetes integrations conflate: reading the *environment* and calling the *API server*.

```diagram
kit-kubernetes-services
```

### Downward-API reads versus API-server calls

`KubernetesUtils` is static, credential-free and works anywhere. But it reads **environment variables**, and only two of them are set by Kubernetes for you:

| Method | Reads | Set automatically? |
| --- | --- | --- |
| `isRunningInKubernetes()` | `KUBERNETES_SERVICE_HOST` + `KUBERNETES_SERVICE_PORT` | Yes, by the kubelet |
| `getPodName()` | `HOSTNAME` | Yes, it is the pod name |
| `getNamespace()` | `POD_NAMESPACE`, **falling back to the literal string `default`** | **No** |
| `getPodIp()` | `POD_IP` | **No** |
| `getNodeName()` | `NODE_NAME` | **No** |
| `getServiceAccountName()` | `SERVICE_ACCOUNT` | **No** |

The last four must be injected with the downward API or they return `null` — and `getNamespace()` is worse than null, because it silently answers `default`. `LeaderElectionService` uses `getNamespace()` for its Lease when the annotation leaves the namespace blank, so a pod in `payments` will try to take a Lease in `default` and get a 403 it logs and swallows. Add this to every deployment that uses the module:

```yaml
env:
  - name: POD_NAMESPACE
    valueFrom: { fieldRef: { fieldPath: metadata.namespace } }
  - name: POD_IP
    valueFrom: { fieldRef: { fieldPath: status.podIP } }
  - name: NODE_NAME
    valueFrom: { fieldRef: { fieldPath: spec.nodeName } }
  - name: SERVICE_ACCOUNT
    valueFrom: { fieldRef: { fieldPath: spec.serviceAccountName } }
```

API-server calls go through `KubernetesClient`, which wraps a Fabric8 client built from `adhar.kubernetes.master-url` and `adhar.kubernetes.namespace`. **Its `getNamespace()` returns the configured property, which defaults to `default`** — so every ConfigMap, Secret, Pod and Service read targets the `default` namespace unless you set `adhar.kubernetes.namespace`. Set it from `POD_NAMESPACE`:

```yaml
adhar:
  kubernetes:
    namespace: ${POD_NAMESPACE:default}
```

Confusingly, two services bypass the `KubernetesClient` bean entirely. `LeaderElectionService` and `ConfigMapReloadService` / `SecretWatchService` each build their **own** Fabric8 client with a bare `KubernetesClientBuilder().build()` in their constructor, catching `Throwable` and degrading to a no-op if it fails. So leader election and watches work without the `KubernetesClient` bean — but they also ignore `adhar.kubernetes.master-url` and take their namespace from the annotation or `KubernetesUtils.getNamespace()`.

### What the auto-configuration actually registers

- `GracefulShutdownHandler` — a `SmartLifecycle` at the latest phase, so it starts last and **stops first**, maximising the drain window. `stop()` flips `isReady()` to false and then sleeps `pre-stop-drain-seconds` before the rest of the context shuts down. Also annotated for `@PreDestroy` so non-lifecycle shutdown paths still drain. A drain period of zero or less disables the sleep.
- `CachedServiceDiscovery` — `@ConditionalOnBean(KubernetesClient.class)`. A `ConcurrentHashMap` keyed by label selector with per-entry expiry; a non-positive `cache-refresh-interval` disables caching entirely. There is no background refresh — the first call after expiry pays the API round trip. The map is never bounded, so do not feed it dynamically generated selectors.
- `KubernetesReadinessHealthIndicator` and `KubernetesLivenessHealthIndicator`, only when Actuator is on the classpath. Both take the shutdown handler, leader-election service and watch services via `ObjectProvider`, so absent collaborators are simply omitted from the details.

**The three bean post-processors are not registered.** `LeaderElectedBeanPostProcessor`, `KubernetesWatchBeanPostProcessor` and `AutoScaleBeanPostProcessor` must be declared as beans yourself. Annotating a class and expecting something to happen is the second-most-common way to find this module doing nothing.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-kubernetes</artifactId>
    <version>0.1.0</version>
</dependency>
```

Fabric8 7.3.1 and `spring-cloud-starter-kubernetes-client-all` arrive transitively; do not pin `io.fabric8` yourself. Actuator is optional — without it the health indicators are not registered.

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

**`KubernetesFacade`** — a convenience layer returning plain values: `getConfigMapValue(cm, key)`, `getSecretValue(secret, key)`, `scaleDeployment(name, replicas)`, `restartDeployment(name)`, `getDeploymentInfo(name)`, `listServices(selector)`, `getCurrentPodInfo()`, `getCurrentNamespace()`, `isInKubernetes()`.

**Services**, each constructed with a `KubernetesClient`:

- `DeploymentService` — `scaleDeployment`, `restartDeployment`, `pauseDeployment` / `resumeDeployment`, `rollbackDeployment`, `updateImage(name, container, image)`, `isDeploymentReady`, `getReplicaSets`.
- `HorizontalPodAutoscalerService` — `reconcile(deploymentName[, namespace], KubernetesAutoScale)` builds and applies an `autoscaling/v2` HPA from the annotation's values; plus `buildHorizontalPodAutoscaler`, `getHorizontalPodAutoscaler`, `delete`.
- `IngressService`, `NamespaceService`, `ResourceMonitoringService` (`getPodMetrics`, `getPodsExceedingThresholds(cpu, memory)`, `getResourceQuota`).
- `LeaderElectionService` — constructed with a lock name, namespace, and the three lease durations; `start()`, `stop()`, `isLeader()`, `getIdentity()`, `getLockName()`, plus `onStartedLeading(Runnable)` / `onStoppedLeading(Runnable)`.
- `ConfigMapReloadService` and `SecretWatchService` — `watch(name, namespace)`, `stopWatching`, `stopAll`, `isWatching`, `getActiveWatchCount`. Each publishes `ConfigMapChangedEvent` / `SecretChangedEvent` carrying a `ChangeType`.

`@KubernetesResource` is a pure declaration: nothing in the module reads it. Treat it as documentation of intended requests and limits, not as something that configures a pod.

## Worked example: supplying the client, electing a leader, reloading config

```java
package com.example.platform;

import com.adhar.kit.kubernetes.client.KubernetesClient;
import com.adhar.kit.kubernetes.config.ConfigMapReloadService;
import com.adhar.kit.kubernetes.config.KubernetesProperties;
import com.adhar.kit.kubernetes.spring.LeaderElectedBeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("kubernetes")                       // never constructed on a laptop
@ConditionalOnProperty(name = "adhar.kubernetes.enabled", havingValue = "true", matchIfMissing = true)
public class K8sConfig {

    /** The bean the module will not create for you. destroyMethod is inferred from close(). */
    @Bean
    KubernetesClient kubernetesClient(KubernetesProperties properties) {
        return new KubernetesClient(properties);
    }

    /** Required for @LeaderElected to be discovered at all. Must be static: it is a BPP. */
    @Bean
    static LeaderElectedBeanPostProcessor leaderElectedBeanPostProcessor(KubernetesProperties properties) {
        return new LeaderElectedBeanPostProcessor(properties);
    }

    @Bean
    ConfigMapReloadService configMapReloadService(ApplicationEventPublisher publisher) {
        return new ConfigMapReloadService(publisher);
    }
}
```

```java
package com.example.jobs;

import com.adhar.kit.kubernetes.annotation.LeaderElected;
import com.adhar.kit.kubernetes.config.ConfigMapReloadService;
import com.adhar.kit.kubernetes.event.ConfigMapChangedEvent;
import com.adhar.kit.kubernetes.spring.LeaderElectionAware;
import com.adhar.kit.kubernetes.util.KubernetesUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@LeaderElected(lockName = "cleanup-leader", leaseDuration = 15000,
               renewDeadline = 10000, retryPeriod = 2000)
public class CleanupJob implements LeaderElectionAware {

    private final ConfigMapReloadService watches;
    private final ExpiryRepository repository;
    private final Settings settings;
    private volatile boolean leading = false;

    public CleanupJob(ConfigMapReloadService watches, ExpiryRepository repository, Settings settings) {
        this.watches = watches;
        this.repository = repository;
        this.settings = settings;
    }

    @PostConstruct
    void startWatching() {
        watches.watch("app-config", KubernetesUtils.getNamespace());
    }

    @Override public void onStartedLeading() { leading = true; }
    @Override public void onStoppedLeading() { leading = false; }

    @Scheduled(cron = "0 0 3 * * *")
    public void runNightlyCleanup() {
        if (!leading) return;
        // Re-check between batches: losing the lease does NOT interrupt this thread.
        for (var batch : repository.expiredBatches()) {
            if (!leading) {
                log.warn("Lost leadership mid-cleanup; stopping after {} batches", batch.index());
                return;
            }
            repository.purge(batch);
        }
    }

    @EventListener
    public void onConfigChanged(ConfigMapChangedEvent event) {
        // An informer replays current state on start, so expect an ADDED event
        // immediately after watch(), not only on a real change.
        log.info("ConfigMap {} {}", event.getName(), event.getChangeType());
        settings.reload();
    }
}
```

### Leader election semantics, including the mid-work case

Fabric8's `LeaderElector` is driven by a Kubernetes `Lease`. The leader must renew within `renewDeadline`; non-leaders retry every `retryPeriod`; a lease not renewed within `leaseDuration` becomes available. The identity is the pod name (`HOSTNAME`), or a random UUID when that is absent — meaning outside Kubernetes every restart contends under a fresh identity. The elector is configured `withReleaseOnCancel(true)`, so `stop()` releases the Lease rather than making the next leader wait out the full `leaseDuration`.

**What happens when the lease is lost while you are working:** `handleStopLeading()` sets `isLeader()` to false and runs your `onStoppedLeading` callbacks. That is all it does. **Your thread is not interrupted and your work is not cancelled.** Between the moment this pod stops renewing and the moment it notices, another pod can legitimately acquire the lease — so for a window bounded by the lease timings, two replicas can believe they are allowed to run. The module cannot fix that; your job must. Check `isLeader()` at every checkpoint, keep units of work short, and make them idempotent so a double-run is survivable. Treat leadership as a hint about who *should* run, never as a mutual-exclusion lock around a critical section.

Callbacks run on the elector's thread and exceptions are caught and logged at ERROR, so a throwing callback neither stops the election nor surfaces to you anywhere but the log.

> **Leader election is off by default.** `adhar.kubernetes.leader-election.enabled` defaults to `false`, and the post-processor logs `Leader election is disabled` with the candidate count rather than starting anything. This is deliberate, so an application does not begin contending for Leases — and needing RBAC on `coordination.k8s.io/leases` — merely by adding the annotation.

### ConfigMap reload

`ConfigMapReloadService.watch(name, namespace)` installs a Fabric8 `SharedIndexInformer` scoped to that single ConfigMap and publishes a Spring `ConfigMapChangedEvent` on add, update and delete. Because it is an informer, it **replays the current object as an `ADDED` event as soon as the watch starts**, and it re-lists on resync — so write your listener to be idempotent rather than treating every event as a genuine change. Watches are keyed by `name/namespace` and a second `watch` for the same key is a no-op. A failure to start is caught and logged at WARN, leaving reload-on-change silently off.

Nothing calls `watch` for you unless you register `KubernetesWatchBeanPostProcessor` and annotate a class with `@KubernetesConfigMap` / `@KubernetesSecret`, which is what consults `adhar.kubernetes.config-map.watch-enabled` and `adhar.kubernetes.secret.watch-enabled`.

## How it behaves

- **Reads fail silently.** This is the most important behavioural fact after the missing client bean. Every `KubernetesClient` read catches `Exception`, logs at ERROR and returns an empty result: `getConfigMap` returns `Map.of()`, `discoverServices` and `listPods` return `List.of()`, `getCurrentPodInfo` returns an empty `PodInfo`. **A 403 from RBAC is indistinguishable from "the ConfigMap does not exist" at the call site.** If a value matters, check for emptiness and fail loudly yourself; and when something returns nothing, read the application log before suspecting the cluster.
- **Construction does throw.** `new KubernetesClient(properties)` wraps a failure in `RuntimeException("Failed to create Kubernetes client")`. That is why the bean is profile- or property-guarded rather than created everywhere.
- **Thread-safety.** The Fabric8 client is thread-safe and intended to be shared. `CachedServiceDiscovery` uses a `ConcurrentHashMap` and accepts a benign race where two threads refresh the same selector at once. `LeaderElectionService` guards `start`/`stop` with `synchronized`, holds `leader` as `volatile`, and keeps callbacks in `CopyOnWriteArrayList`s. Informer callbacks arrive on the informer's own thread, so your `@EventListener` must be thread-safe.
- **Lifecycle ordering.** `GracefulShutdownHandler` runs at the latest `SmartLifecycle` phase; `LeaderElectedBeanPostProcessor` and `AutoScaleBeanPostProcessor` at `Integer.MAX_VALUE - 1000`, so they start after ordinary infrastructure and stop before the drain handler finishes. On stop, `LeaderElectedBeanPostProcessor` calls `stop()` on every service, releasing each Lease.
- **Annotations and proxies.** All five annotations are `@Target(TYPE)` and discovered with `bean.getClass().getAnnotation(...)` in `postProcessAfterInitialization`. None is `@Inherited`, so if a bean is CGLIB-proxied — because it also carries `@Transactional`, a caching annotation, or anything else that forces class-based proxying — the proxy subclass does not report the annotation and the bean is never registered as a candidate. Keep the annotated class free of proxy-forcing annotations, or call `LeaderElectionService` directly. The familiar **self-invocation** caveat applies to any aspect-driven annotation you combine with these: a `this.method()` call inside the same class never passes through the Spring proxy, so the annotation is silently skipped.
- **Degradation outside a cluster.** `LeaderElectionService` and the watch services catch `Throwable` when building their client and continue as no-ops: `isLeader()` stays permanently false, `watch` logs a warning and returns. That is what makes a local run safe — and also what makes a misconfigured cluster run look identical to a local one.

## RBAC the ServiceAccount actually needs

Grant only what the features you enabled touch. Each row is independent.

| Feature | API group | Resources | Verbs |
| --- | --- | --- | --- |
| `getCurrentPodInfo`, `getPod`, `listPods` | `""` | `pods` | `get`, `list` |
| `discoverServices` | `""` | `services` | `get`, `list` |
| `getConfigMap` | `""` | `configmaps` | `get` |
| `createOrUpdateConfigMap` | `""` | `configmaps` | `get`, `create`, `update` |
| ConfigMap watch (informer) | `""` | `configmaps` | `get`, `list`, `watch` |
| `getSecret` / Secret watch | `""` | `secrets` | `get` (plus `list`, `watch` for the informer) |
| Leader election | `coordination.k8s.io` | `leases` | `get`, `create`, `update` |
| `DeploymentService` | `apps` | `deployments` | `get`, `list`, `patch`, `update` |
| Rollback / `getReplicaSets` | `apps` | `replicasets` | `get`, `list` |
| `HorizontalPodAutoscalerService` | `autoscaling` | `horizontalpodautoscalers` | `get`, `create`, `update`, `delete` |
| `IngressService` | `networking.k8s.io` | `ingresses` | `get`, `list`, `create`, `update` |
| `ResourceMonitoringService` | `metrics.k8s.io` / `""` | `pods`, `resourcequotas` | `get`, `list` |

A namespaced `Role` plus `RoleBinding` is almost always right; reach for a `ClusterRole` only when `discovery.all-namespaces` is genuinely needed. Remember that a denial is logged and swallowed, so test the binding by asserting on real data, not on the absence of an exception.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.kubernetes.enabled` | Master switch | `true` |
| `adhar.kubernetes.namespace` | Namespace used for **all** `KubernetesClient` API calls | `default` |
| `adhar.kubernetes.master-url` | API server URL; auto-detected when unset | (none) |
| `adhar.kubernetes.api-version` | API version | `v1` |
| `adhar.kubernetes.discovery.enabled` | Service discovery | `true` |
| `adhar.kubernetes.discovery.all-namespaces` | Search beyond the configured namespace | `false` |
| `adhar.kubernetes.discovery.service-label` | Label key used to select services | `app` |
| `adhar.kubernetes.discovery.cache-enabled` | Register `CachedServiceDiscovery` | `true` |
| `adhar.kubernetes.discovery.cache-refresh-interval` | Cache TTL, ms; non-positive disables caching | `30000` |
| `adhar.kubernetes.config-map.name` / `.watch-enabled` / `.watch-interval` | ConfigMap watch, read by `KubernetesWatchBeanPostProcessor` | (none) / `true` / `10000` |
| `adhar.kubernetes.secret.name` / `.watch-enabled` / `.watch-interval` | Secret watch, same | (none) / `true` / `10000` |
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
    namespace: ${POD_NAMESPACE:default}
    discovery: { enabled: true, service-label: app, cache-refresh-interval: 30000 }
    config-map: { enabled: true, name: app-config, watch-enabled: true }
    leader-election: { enabled: true, lock-name: my-service-leader }
    graceful-shutdown: { pre-stop-drain-seconds: 5 }
```

## Testing

`adhar-kit-test-commons` has no Kubernetes helper, and Fabric8's own `KubernetesMockServer` is not a dependency of this module — add `io.fabric8:kubernetes-server-mock` at test scope if you want one.

1. **Anything using `KubernetesUtils`** — it reads `System.getenv`, which you cannot set from Java. Wrap the calls behind a small interface you can stub, or set the variables in the surefire configuration. This is the single biggest testability constraint in the module.
2. **`CachedServiceDiscovery`** — it has a package-visible constructor taking a `LongSupplier` clock, so you can mock the `KubernetesClient` delegate, advance the clock past the TTL and assert the delegate was called exactly twice. No cluster, no sleeping.
3. **`GracefulShutdownHandler`** — the package-visible constructor takes a `Sleeper`, so a drain test runs instantly: call `stop()`, assert `isReady()` went false and that the sleeper was invoked with the configured millis.
4. **Leader election** — `LeaderElectionService.buildElector` is package-visible for exactly this reason: subclass and return a fake elector, then call the public `handleStartLeading()` / `handleStopLeading()` to drive transitions and assert your callbacks and `isLeader()`. `LeaderElectedBeanPostProcessor.createService` is likewise package-visible so a test can check the annotation values were honoured.
5. **Watch listeners** — publish a `ConfigMapChangedEvent` directly onto the `ApplicationEventPublisher`; the event is a plain object and needs no informer.
6. **Disabling in a test** — `adhar.kubernetes.enabled: false` backs the auto-configuration off entirely, and simply not declaring the `KubernetesClient` bean already keeps every API-touching component out of the context.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Nothing from this module seems to do anything | `KubernetesClient` is intentionally not auto-created, so every `@ConditionalOnBean` component is absent | Declare the bean yourself, guarded by a profile or property |
| `NoSuchBeanDefinitionException: KubernetesClient` | Same cause, surfaced by an explicit injection | Same fix |
| ConfigMaps read from the wrong namespace | `adhar.kubernetes.namespace` defaults to `default` | Set it from `POD_NAMESPACE` |
| `getNamespace()` returns `default` in-cluster | `POD_NAMESPACE` is not injected; Kubernetes does not set it | Add the downward-API `env` block |
| A read returns empty and no exception | Every `KubernetesClient` read swallows failures, including 403 | Check the ERROR log; assert on content, not on the absence of an exception |
| `@LeaderElected` never elects a leader | `leader-election.enabled` is `false`, or the post-processor bean was never declared | Set it to `true`, declare the BPP, and grant RBAC on Leases |
| An annotated bean is never discovered | The bean is CGLIB-proxied and the annotation is not `@Inherited` | Move the annotation to an unproxied class, or wire the service directly |
| Two replicas ran the same job | Leadership was lost mid-work; losing the lease does not interrupt the thread | Re-check `isLeader()` between batches and make the work idempotent |
| A `ConfigMapChangedEvent` arrives at startup with no change | Informers replay current state as `ADDED` | Make the listener idempotent |
| No `ConfigMapChangedEvent` arrives at all | Nothing called `watch(name, namespace)` | Call it, or register `KubernetesWatchBeanPostProcessor` and annotate the class |
| `@KubernetesResource` has no effect | Nothing in the module reads it | Set requests and limits in the pod spec |
| Requests drop during a rolling update | No pre-stop drain, or the readiness indicator is not in the probe group | Keep graceful shutdown enabled and add `kubernetesReadiness` to the readiness group |
| Service discovery returns stale endpoints | Results are cached for the TTL and refresh only on the next call | Call `invalidate(selector)` or `refresh(selector)`, or lower `cache-refresh-interval` |
| Heap grows in a long-running pod | `CachedServiceDiscovery` keys by selector string and never evicts | Use a fixed set of selectors |

This module is most useful when your service runs *on* the [Adhar Platform](/docs); locally it degrades to no-ops because nothing that needs the API server is created eagerly.

## See also

- [Health](/adhar-kit/modules/health) — the health model the readiness and liveness indicators feed
- [Production](/docs/operations/production) — rollout, probes, and drain behaviour in practice
- [Config](/adhar-kit/modules/config) — configuration sources alongside ConfigMaps
- [Architecture](/docs/core-concepts/architecture) — how services sit in the platform
