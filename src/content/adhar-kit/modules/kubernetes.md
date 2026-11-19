---
title: "Kubernetes"
section: "Modules"
order: 30
path: "/adhar-kit/modules/kubernetes"
---

# Kubernetes

`adhar-kit-kubernetes` lets a service work with the cluster it runs in, through the Fabric8 client. Out of the box it gives you a readiness gate that drains traffic before shutdown, plus readiness and liveness health indicators. Once you declare a `KubernetesClient` bean, you can also read ConfigMaps and Secrets, discover services, manage deployments and ingresses, and use leader election, ConfigMap/Secret watches and HPA reconciliation. Use it when a service runs in-cluster and needs to observe or steer its own deployment. Nothing that needs the API server is created automatically, so the module loads safely on a laptop.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-kubernetes` |
| Toggle | `adhar.kubernetes.enabled` (default `true`) switches the auto-configuration. Facade gate `adhar.kit.modules.kubernetes` (default `false`); while it is off, `adhar.getKubernetes()` throws `IllegalStateException` |
| Facade | `adhar.getKubernetes()` → `KubernetesFacade`. It is **not** wired to your Spring properties: the default instance uses `new KubernetesProperties()` (namespace `default`). Install your own instance (see [Use it](#use-it)) |
| Main beans | `GracefulShutdownHandler`, `KubernetesReadinessHealthIndicator`, `KubernetesLivenessHealthIndicator`, `CachedServiceDiscovery` (auto-configured); `KubernetesClient`, `DeploymentService`, `LeaderElectionService`, `ConfigMapReloadService`, `SecretWatchService` (you declare them) |
| Dependencies | Required: `io.fabric8:kubernetes-client` 7.3.1, `spring-cloud-starter-kubernetes-client-all`. Optional: `spring-boot-starter-actuator` (health indicators), `adhar-kit-commons` |
| Frameworks | Spring Boot auto-configuration. `QuarkusKubernetesIntegration.createClient(...)` and `MicronautKubernetesIntegration.createClient(...)` build a `KubernetesClient` on other runtimes; nothing else is wired there |
| Needs | A ServiceAccount with RBAC for the resources you touch |

## How it works

```diagram
nkc-kubernetes-wiring
```

- **Auto-configured, safe anywhere.** `KubernetesAutoConfiguration` registers the graceful-shutdown handler, the two health indicators (only with Actuator on the classpath), and `CachedServiceDiscovery` (only when a `KubernetesClient` bean exists). Every bean is `@ConditionalOnMissingBean`.
- **You declare the client.** `KubernetesClient` is not auto-created, because building it fails outside a cluster. Without it, nothing that calls the API server exists. You get no error and no warning, only an absent bean.
- **Annotations need their post-processors.** `@LeaderElected`, `@KubernetesConfigMap`, `@KubernetesSecret` and `@KubernetesAutoScale` do nothing until you declare `LeaderElectedBeanPostProcessor`, `KubernetesWatchBeanPostProcessor` or `AutoScaleBeanPostProcessor`.
- **Two client paths.** `KubernetesClient` honours `master-url` and `namespace`. `LeaderElectionService`, the watch services, `DeploymentService`, `IngressService`, `HorizontalPodAutoscalerService`, `ResourceMonitoringService` and `NamespaceService` each build their **own** default Fabric8 client (in-cluster config or kubeconfig), so they ignore `master-url`. The services that take a `KubernetesClient` use it only for its namespace.
- **Environment facts need no credentials.** `KubernetesUtils` is static and reads environment variables (see [Downward API](#downward-api)).

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-kubernetes</artifactId>
    <version>0.1.0</version>
</dependency>

<!-- Optional: registers the kubernetesReadiness / kubernetesLiveness indicators -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Fabric8 arrives transitively; do not pin `io.fabric8` yourself.

### Downward API

Kubernetes sets only `KUBERNETES_SERVICE_HOST`/`PORT` and `HOSTNAME` (the pod name). Inject the rest, or `KubernetesUtils.getPodIp()`, `getNodeName()` and `getServiceAccountName()` return `null`, and `getNamespace()` silently returns `default`:

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

Then point the module at the pod's namespace and add the indicators to the probe groups:

```yaml
adhar:
  kubernetes:
    namespace: ${POD_NAMESPACE:default}
management:
  endpoint:
    health:
      group:
        readiness: { include: "readinessState,kubernetesReadiness" }
        liveness:  { include: "livenessState,kubernetesLiveness" }
```

## Use it

### Declare the client and install the facade

```java
package com.example.platform;

import com.adhar.kit.kubernetes.KubernetesFacade;
import com.adhar.kit.kubernetes.client.KubernetesClient;
import com.adhar.kit.kubernetes.config.ConfigMapReloadService;
import com.adhar.kit.kubernetes.config.KubernetesProperties;
import com.adhar.kit.kubernetes.config.SecretWatchService;
import com.adhar.kit.kubernetes.service.DeploymentService;
import com.adhar.kit.kubernetes.spring.KubernetesWatchBeanPostProcessor;
import com.adhar.kit.kubernetes.spring.LeaderElectedBeanPostProcessor;
import com.adhar.kit.starter.AdharFacadeCustomizer;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("kubernetes")   // construction needs a reachable cluster
public class K8sConfig {

    @Bean
    KubernetesClient kubernetesClient(KubernetesProperties properties) {
        return new KubernetesClient(properties);   // close() is the inferred destroy method
    }

    @Bean
    DeploymentService deploymentService(KubernetesClient client) {
        return new DeploymentService(client);
    }

    /** Makes adhar.getKubernetes() use your properties instead of the defaults. */
    @Bean
    AdharFacadeCustomizer kubernetesFacade(KubernetesClient client, DeploymentService deployments) {
        KubernetesFacade facade = new KubernetesFacade(client, deployments);
        return adhar -> adhar.setKubernetes(facade);
    }

    /** Required for @LeaderElected. Static because it is a BeanPostProcessor. */
    @Bean
    static LeaderElectedBeanPostProcessor leaderElected(KubernetesProperties properties) {
        return new LeaderElectedBeanPostProcessor(properties);
    }

    @Bean
    ConfigMapReloadService configMapReloadService(ApplicationEventPublisher publisher) {
        return new ConfigMapReloadService(publisher);
    }

    @Bean
    SecretWatchService secretWatchService(ApplicationEventPublisher publisher) {
        return new SecretWatchService(publisher);
    }

    /** Required for @KubernetesConfigMap / @KubernetesSecret watches. */
    @Bean
    static KubernetesWatchBeanPostProcessor kubernetesWatches(KubernetesProperties properties,
            ConfigMapReloadService configMaps, SecretWatchService secrets) {
        return new KubernetesWatchBeanPostProcessor(properties, configMaps, secrets);
    }
}
```

The `AdharFacadeCustomizer` bean is applied when the starter creates `AdharFacade`. Remember to set `adhar.kit.modules.kubernetes: true`.

### Read config and act on deployments

```java
String url    = adhar.getKubernetes().getConfigMapValue("app-config", "db.url");
String secret = adhar.getKubernetes().getSecretValue("app-secrets", "api-key");   // base64-decoded
adhar.getKubernetes().scaleDeployment("worker", 3);
boolean ok    = adhar.getKubernetes().restartDeployment("worker");                 // rolling restart
```

| Type | Methods |
|---|---|
| `KubernetesFacade` | `getConfigMapValue`, `getConfigMapData`, `getSecretValue`, `getSecretData`, `createOrUpdateConfigMap`, `scaleDeployment`, `restartDeployment`, `getDeploymentInfo`, `listPods` (names), `listServices`, `getCurrentPodInfo` (map), `getCurrentNamespace`, `isInKubernetes` |
| `KubernetesClient` | `getCurrentPodInfo`, `getPod`, `listPods`, `discoverServices`, `getConfigMap(name[, namespace])`, `getSecret(name[, namespace])`, `createOrUpdateConfigMap`, `getNamespace`, `close` |
| `DeploymentService` | `getDeployment`, `listDeployments`, `scaleDeployment`, `restartDeployment`, `pauseDeployment`, `resumeDeployment`, `rollbackDeployment`, `updateImage(name, container, image)`, `isDeploymentReady`, `getReplicaSets` |
| `CachedServiceDiscovery` | `discoverServices`, `refresh`, `discoverServicesUncached`, `invalidate`, `invalidateAll` |
| `IngressService`, `NamespaceService`, `ResourceMonitoringService`, `HorizontalPodAutoscalerService` | Construct them yourself (`NamespaceService` takes no arguments; the rest take a `KubernetesClient`) |

### Run work on one replica

```java
package com.example.jobs;

import com.adhar.kit.kubernetes.annotation.LeaderElected;
import com.adhar.kit.kubernetes.spring.LeaderElectionAware;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@LeaderElected(lockName = "cleanup-leader")
public class CleanupJob implements LeaderElectionAware {

    private final AtomicBoolean leading = new AtomicBoolean();

    @Override public void onStartedLeading() { leading.set(true); }
    @Override public void onStoppedLeading() { leading.set(false); }

    @Scheduled(cron = "0 0 3 * * *")
    public void runNightlyCleanup() {
        if (!leading.get()) return;
        // Do short, idempotent units of work and re-check leading.get() between them:
        // losing the lease does not interrupt this thread.
    }
}
```

Set `adhar.kubernetes.leader-election.enabled: true`. While it is `false` (the default), the post-processor logs `Leader election is disabled` and starts nothing. Lock name, namespace and lease timings come from the **annotation** (`lockName`, `namespace`, `leaseDuration`, `renewDeadline`, `retryPeriod`; defaults `leader-election`, the pod namespace, 15000/10000/2000 ms). The identity is `HOSTNAME`, or a random UUID when that is unset.

### React to ConfigMap changes

```java
package com.example.config;

import com.adhar.kit.kubernetes.annotation.KubernetesConfigMap;
import com.adhar.kit.kubernetes.event.ChangeType;
import com.adhar.kit.kubernetes.event.ConfigMapChangedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@KubernetesConfigMap(name = "app-config")
public class AppConfigListener {

    @EventListener
    public void onChange(ConfigMapChangedEvent event) {
        if (event.getChangeType() == ChangeType.DELETED) return;
        // Informers replay current state as ADDED on start: keep this idempotent.
        reload(event.getData());
    }

    private void reload(java.util.Map<String, String> data) { /* ... */ }
}
```

`watch(name, namespace)` on `ConfigMapReloadService` / `SecretWatchService` starts a Fabric8 informer scoped to one object and publishes `ConfigMapChangedEvent` / `SecretChangedEvent` (`getName`, `getNamespace`, `getData`, `getChangeType`: `ADDED`, `MODIFIED`, `DELETED`). You can call it directly instead of using the annotation. The namespace is the annotation's, else `adhar.kubernetes.namespace`.

### Reconcile an HPA from an annotation

Declare `HorizontalPodAutoscalerService` and `AutoScaleBeanPostProcessor`, then annotate a class with `@KubernetesAutoScale(minReplicas = 2, maxReplicas = 10, targetCpuUtilization = 70)`. At startup the post-processor applies an `autoscaling/v2` HPA (create or replace) targeting the Deployment named after the **class in kebab case** (`OrderService` → `order-service`). CPU is always a target; memory is added when `targetMemoryUtilization > 0` (default `80`). Scale-up/down stabilization defaults are `0` and `300` seconds.

## Configuration

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.kubernetes.enabled` | boolean | `true` | Switches the whole auto-configuration |
| `adhar.kubernetes.namespace` | String | `default` | Namespace for every `KubernetesClient` call, the watch post-processor and HPA reconciliation |
| `adhar.kubernetes.master-url` | String | — | API server URL for `KubernetesClient`; auto-detected when unset |
| `adhar.kubernetes.discovery.cache-enabled` | boolean | `true` | Register `CachedServiceDiscovery` (needs a `KubernetesClient` bean) |
| `adhar.kubernetes.discovery.cache-refresh-interval` | long (ms) | `30000` | Cache TTL per selector; `0` or less disables caching |
| `adhar.kubernetes.config-map.watch-enabled` | boolean | `true` | Let `KubernetesWatchBeanPostProcessor` start ConfigMap watches |
| `adhar.kubernetes.secret.watch-enabled` | boolean | `true` | Let `KubernetesWatchBeanPostProcessor` start Secret watches |
| `adhar.kubernetes.leader-election.enabled` | boolean | `false` | Start elections for `@LeaderElected` beans |
| `adhar.kubernetes.graceful-shutdown.enabled` | boolean | `true` | Register `GracefulShutdownHandler` |
| `adhar.kubernetes.graceful-shutdown.pre-stop-drain-seconds` | long | `5` | Keep serving after readiness turns false; `0` or less skips the wait |
| `adhar.kubernetes.probes.enabled` | boolean | `true` | Register the readiness and liveness indicators |

`KubernetesProperties` also binds `api-version` (`v1`), `discovery.enabled` (`true`), `discovery.all-namespaces` (`false`), `discovery.service-label` (`app`), `config-map.enabled`/`.name`/`.watch-interval` (`true`/—/`10000`), `secret.enabled`/`.name`/`.watch-interval` (same), `leader-election.lock-name`/`.lease-duration`/`.renew-deadline`/`.retry-period` (`leader-election`/`15000`/`10000`/`2000`) and `pod.*`. **Nothing in the module reads these**; setting them has no effect.

## Operations

```diagram
nkc-kubernetes-shutdown
```

- **Graceful shutdown.** `GracefulShutdownHandler` has the highest `SmartLifecycle` phase, so it starts last and stops first. On stop it turns readiness false, sleeps `pre-stop-drain-seconds`, then lets the rest of the context close. It also runs from `@PreDestroy`. Leader-election and autoscale post-processors stop afterwards and release their Leases.
- **Health.** `kubernetesReadiness` is `OUT_OF_SERVICE` until the handler starts and again while draining (details `ready`, `draining`). `kubernetesLiveness` is always `UP` (detail `running`). Both add `leaderElection` (`leader`/`follower`), `leaderLock`, `leaderIdentity`, `configMapWatches` and `secretWatches` when those beans exist. No Micrometer metrics are published.
- **Reads fail quietly.** Every `KubernetesClient` and service call catches the exception, logs at ERROR and returns an empty map, empty list, empty `PodInfo`, `null` or `false`. A 403 from RBAC looks exactly like a missing object. Check the content of the result and fail loudly where a value matters.
- **Construction does throw.** `new KubernetesClient(...)` wraps failures in `RuntimeException("Failed to create Kubernetes client")`, and the services that build their own Fabric8 client throw from the constructor. Guard these beans with a profile or property. `LeaderElectionService` and the watch services instead catch the failure and become no-ops (`isLeader()` stays `false`, `watch` logs a warning).
- **RBAC.** Grant only what you use; a namespaced `Role` is almost always enough.

| Feature | API group | Resources | Verbs |
|---|---|---|---|
| Pod info, `getPod`, `listPods` | `""` | `pods` | `get`, `list` |
| `discoverServices` | `""` | `services` | `list` |
| `getConfigMap` / ConfigMap watch | `""` | `configmaps` | `get` / `get`, `list`, `watch` |
| `createOrUpdateConfigMap` | `""` | `configmaps` | `get`, `create`, `update` |
| `getSecret` / Secret watch | `""` | `secrets` | `get` / `get`, `list`, `watch` |
| Leader election | `coordination.k8s.io` | `leases` | `get`, `create`, `update` |
| `DeploymentService` | `apps` | `deployments`, `replicasets` | `get`, `list`, `patch`, `update` |
| HPA reconciliation | `autoscaling` | `horizontalpodautoscalers` | `get`, `create`, `update`, `delete` |
| `IngressService` | `networking.k8s.io` | `ingresses` | `get`, `list` |
| `ResourceMonitoringService` | `""` | `pods`, `resourcequotas` | `get`, `list` |
| `NamespaceService` | `""` | `namespaces` (cluster-scoped) | `get`, `list`, `create`, `delete` |

## Limits

- **Namespace defaults to `default`.** Both `adhar.kubernetes.namespace` and `KubernetesUtils.getNamespace()` fall back to `default`. Set the property from `POD_NAMESPACE`.
- **Leadership is a hint, not a lock.** Losing the Lease sets `isLeader()` to false and runs `onStoppedLeading`; it does not interrupt running work. For a window bounded by the lease timings, two replicas can both act. Keep work short and idempotent. Callbacks run on the elector thread; an exception there is logged at ERROR and ignored.
- **Annotations are read from the bean's class.** None is `@Inherited`, so a CGLIB-proxied bean (for example one with `@Transactional`) is never picked up. Keep annotated classes free of proxy-forcing annotations, or call the service directly.
- **Ignored attributes.** `reloadOnChange` on `@KubernetesConfigMap`/`@KubernetesSecret`, `customMetrics` on `@KubernetesAutoScale`, and the whole `@KubernetesResource` annotation are not read.
- **`ResourceMonitoringService` does not read live usage.** It reports container requests as usage; it does not query the metrics server.
- **Service discovery cache.** Entries refresh only on the next call after expiry, and the map is never evicted. Use a fixed set of selectors.
- **`KubernetesUtils` reads `System.getenv`.** Wrap it behind an interface if you need to stub it in tests.

## Next steps

- [Health](/adhar-kit/modules/health) — the health model the probe indicators feed.
- [Config](/adhar-kit/modules/config) — configuration sources alongside ConfigMaps.
- [Concepts](/adhar-kit/concepts) — module toggles, auto-configuration and the facade.
- [Production](/docs/operations/production) — rollout, probes and drain behaviour on the platform.
