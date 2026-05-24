---
title: "Load configuration from Vault & ConfigMaps"
section: "Guides"
order: 5
category: "Configuration"
path: "/adhar-kit/guides/config-from-vault"
---

# Load configuration from Vault & ConfigMaps

> Merge configuration from multiple ordered sources with hot reload.

**Category:** Configuration

### 1. Declare typed properties

Use @ConfigProperty for type-safe binding. Validation annotations are respected.

```java
@ConfigProperty(name = "db.url") @NotBlank String dbUrl;
@ConfigProperty(name = "db.pool.size") @Min(1) int poolSize;
```

### 2. Enable the Vault source

Add the source and point it at your Vault instance — secrets refresh on rotation.

```yaml
adhar:
  config:
    sources:
      - type: vault
        path: secret/data/orders
        refresh: 30s
```

