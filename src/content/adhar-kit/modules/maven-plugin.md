---
title: "Maven Plugin"
section: "Modules"
order: 32
path: "/adhar-kit/modules/maven-plugin"
---

# Maven Plugin

`adhar-kit-maven-plugin` is enterprise build tooling: semantic versioning from Conventional Commits, release management, code generation (entity/repo/service/controller/DTO/tests), code-standard validation (including a layered-architecture check), and dependency hygiene reporting.

## Goals

| Goal | Purpose |
|---|---|
| `adhar:version` | Compute the next semantic version from commit history |
| `adhar:release` | Tag, changelog, release notes, and deploy |
| `adhar:generate` | Scaffold entities, repositories, services, controllers, DTOs, tests |
| `adhar:validate` | Enforce package structure, naming, annotations, and architecture rules |
| `adhar:deps` | Report dependency hygiene |

## Setup

```xml
<build>
  <plugins>
    <plugin>
      <groupId>com.adhar.kit</groupId>
      <artifactId>adhar-kit-maven-plugin</artifactId>
      <version>0.1.0-SNAPSHOT</version>
      <executions>
        <execution>
          <id>validate-standards</id>
          <phase>validate</phase>
          <goals><goal>validate</goal></goals>
        </execution>
      </executions>
      <configuration>
        <validatePackageStructure>true</validatePackageStructure>
        <validateNaming>true</validateNaming>
        <validateArchitecture>true</validateArchitecture>
        <failOnError>false</failOnError>
      </configuration>
    </plugin>
  </plugins>
</build>
```

Register the plugin group so you can use the short `adhar:` prefix:

```xml
<settings>
  <pluginGroups>
    <pluginGroup>com.adhar.kit</pluginGroup>
  </pluginGroups>
</settings>
```

## Common invocations

```bash
mvn adhar:version -Dversion.type=minor
mvn adhar:release -Drelease.type=major -Drelease.deploy=true
mvn adhar:generate -Dgenerate.type=all -Dgenerate.name=User
mvn adhar:validate -Dvalidate.fail=true
mvn adhar:deps -Ddeps.fail=true
```

Requires Maven 3.9.9+ / Java 25+. Wire `validate` into your build to enforce Adhar Kit's conventions ([Concepts](/adhar-kit/concepts)) in CI, and use `generate` to scaffold new components that already follow them.
