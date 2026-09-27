---
title: "Kubernetes"
section: "Modules"
order: 30
path: "/adhar-kit/modules/kubernetes"
---

# Kubernetes

`adhar-kit-kubernetes` integrates your service with Kubernetes via the Fabric8 client: service discovery, ConfigMap/Secret access and watching, leader election, HPA autoscaling, deployment/ingress management, pod info, and graceful shutdown.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-kubernetes</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
<dependency>
    <groupId>io.fabric8</groupId>
    <artifactId>kubernetes-client</artifactId>
    <version>6.9.0</version>
</dependency>
```

## Key APIs

`KubernetesClient` — `getCurrentPodInfo`, `discoverServices`, `getConfigMap`, `createOrUpdateConfigMap`, `getSecret`, `listPods`. Services: `DeploymentService`, `LeaderElectionService`, `HorizontalPodAutoscalerService`, `ConfigMapReloadService`, `SecretWatchService`, `GracefulShutdownHandler`. Annotations: `@KubernetesConfigMap`, `@KubernetesSecret`, `@LeaderElected`, `@KubernetesAutoScale`.

## Usage

```java
@Service
public class OrderService {
    @Autowired private KubernetesClient k8s;

    public void process() {
        PodInfo pod = k8s.getCurrentPodInfo();
        List<ServiceInfo> payment = k8s.discoverServices("app=payment-service");
        Map<String, String> config = k8s.getConfigMap("app-config");
    }
}
```

## Leader election

Run a task on exactly one replica:

```java
@LeaderElected
public void runScheduledCleanup() { ... }   // only the elected leader executes
```

## Live config reload

ConfigMap and Secret watches emit `ConfigMapChangedEvent` / `SecretChangedEvent`, so a config change rolls out without a pod restart.

## Configuration

```yaml
adhar:
  kubernetes:
    enabled: true
    namespace: default
    discovery: { enabled: true, service-label: "adhar.io/discover" }
    config-map: { enabled: true, name: app-config, watch-enabled: true }
    leader-election: { enabled: true, lock-name: my-service-leader }
    graceful-shutdown: { pre-stop-drain-seconds: 5 }
```

This module is most useful when your service runs *on* the [Adhar Platform](/docs); locally it degrades gracefully.
