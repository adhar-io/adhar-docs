---
title: "Building & Contributing"
section: "Get Started"
order: 5
path: "/adhar-kit/build"
---

# Building & Contributing

Adhar Kit is a **Maven multi-module reactor with 29 modules** built on Java 25. You build it from source to pick up an unreleased fix, to run the test suite against a change, or because you are contributing. This page covers all three, with the real commands.

## At a glance

| | |
|---|---|
| Repository | [github.com/adhar-io/adhar-kit](https://github.com/adhar-io/adhar-kit) |
| Build tool | Maven, reactor rooted at `adhar-kit` (`pom` packaging) |
| Toolchain | JDK 25+, Maven 3.9+ (Enforcer floor is Maven 3.8, Java 25) |
| Test stack | JUnit 5, AssertJ, Mockito; TestContainers for integration |
| Coverage gate | 80% instruction coverage per module, enforced by JaCoCo at `verify` |
| CI | GitHub Actions, JDK 25 on `ubuntu-latest` |
| License | Apache 2.0 |

## Clone and build

```bash
git clone https://github.com/adhar-io/adhar-kit.git
cd adhar-kit

mvn clean install                           # full build, tests, coverage gate
mvn install -DskipTests -Djacoco.skip=true  # fastest path to installed artifacts
mvn clean install -T 1C                     # parallel: 1 thread per core
```

The first build downloads a large dependency tree — Spring Boot 4.1, the Quarkus and Micronaut platform BOMs, Helidon, Vert.x, OpenTelemetry, gRPC, the AWS/Azure/GCP SDKs — so expect it to take a while. Subsequent builds are incremental.

Build one module and everything it needs, which is what you want during development:

```bash
mvn clean install -pl :adhar-kit-metrics -am   # module + its upstream dependencies
mvn compile -pl adhar-kit-persistence -am      # compile only, fastest feedback loop
```

> `-am` ("also make") is not optional when you touch `adhar-kit-commons`. Twenty other modules depend on it, and building one of them alone resolves a stale copy from your local repository instead of your edit.

## The reactor layout

The root `pom.xml` (`com.adhar.kit:adhar-kit:0.1.0`) lists the modules; it aggregates but does not act as the build parent. That job belongs to `adhar-kit-parent`, which itself inherits `spring-boot-starter-parent` and holds the Java version, plugin management, Enforcer rules and the coverage gate.

```text
adhar-kit/                      reactor root: pom packaging, <modules> list
├── adhar-kit-bom/              versions for kit + third-party artifacts
├── adhar-kit-parent/           build parent: Java 25, plugins, JaCoCo
│
├── adhar-kit-commons/          framework detection, CloudEvents, DDD
├── adhar-kit-core/             IDs, JSON, retry, async, Specification
│                               ^ commons is required by 20 modules
│
├── adhar-kit-config/           foundation: config, logging, metrics,
├── adhar-kit-logging/          tracing, cache, resilience, health,
├── adhar-kit-metrics/          persistence
├── adhar-kit-tracing/
├── adhar-kit-cache/
├── adhar-kit-resilience/
├── adhar-kit-health/
├── adhar-kit-persistence/
│
├── adhar-kit-messaging/        integration: messaging, grpc, graphql,
├── adhar-kit-grpc/             notification, docs
├── adhar-kit-graphql/
├── adhar-kit-notification/
├── adhar-kit-docs/
│
├── adhar-kit-security/         enterprise: security, event-sourcing,
├── adhar-kit-event-sourcing/   analytics, batch, ai, dapr, kubernetes,
├── adhar-kit-analytics/        perf-profiler
├── adhar-kit-batch/
├── adhar-kit-ai/
├── adhar-kit-dapr/
├── adhar-kit-kubernetes/
├── adhar-kit-perf-profiler/
│
├── adhar-kit-starter/          AdharFacade + the five framework adapters
├── adhar-kit-test-commons/     TestContainers helpers
├── adhar-kit-rewrite/          OpenRewrite recipes
└── adhar-kit-maven-plugin/     build tooling
```

Two ordering facts matter when you edit the build. `adhar-kit-bom` and `adhar-kit-parent` come first in `<modules>` because everything else resolves through them, and `adhar-kit-starter` comes late because it depends on every production module.

## Running tests

Unit and integration tests are separated by filename, and the two Maven phases run different sets.

| Kind | Pattern | Plugin | Phase |
|---|---|---|---|
| Unit | `*Test.java`, `*Tests.java` | Surefire | `test` |
| Integration | `IT*.java`, `*IT.java`, `*ITCase.java` | Failsafe | `integration-test` / `verify` |

```bash
mvn test                              # unit tests across the reactor
mvn verify                            # unit + integration + coverage gate
mvn test -pl adhar-kit-cache          # one module's unit tests
mvn test -pl adhar-kit-cache -Dtest=CacheFacadeTest   # one class
```

Surefire runs tests with `-Xmx1024m` and a **five-minute default JUnit timeout** (`junit.jupiter.execution.timeout.default = 5 m`), so a hung test — an unbounded `CompletableFuture.join()`, say — fails the module instead of blocking the whole build.

Integration tests use TestContainers, so a working Docker daemon is a prerequisite for `mvn verify`. `adhar-kit-test-commons` provides the container helpers (Postgres, Redis, Kafka, RabbitMQ, Vault and others) so individual modules do not each define their own.

### Coverage

JaCoCo is bound in `adhar-kit-parent` for every module: it prepares the agent, reports at `test`, and **checks at `verify`**. The rule is `BUNDLE` scope, `INSTRUCTION` counter, minimum `0.80` from the `jacoco.minimum.coverage` property. Drop below it and the build fails.

The gate deliberately excludes things it would measure badly: `**/annotation/**`, `*Properties`, `*AutoConfiguration`, `*Constants`, and the non-Spring framework adapter packages `**/quarkus/**`, `**/micronaut/**`, `**/helidon/**` and `**/vertx/**`.

```bash
mvn clean verify                       # per-module report + gate
open adhar-kit-cache/target/site/jacoco/index.html

mvn -Pcoverage verify                  # adds the aggregate report at root
mvn verify -Djacoco.skip=true          # skip instrumentation entirely
```

`-Djacoco.skip=true` is what CI uses for the pull-request build, so a local `mvn verify -Djacoco.skip=true --no-transfer-progress` reproduces CI exactly.

## Module conventions

Modules are uniform on purpose — knowing one means knowing them all. A module that does not follow these will look wrong in review.

- **Package** — `com.adhar.kit.<module>.*`.
- **One facade** — `com.adhar.kit.<name>.<Name>Facade` is the module's public API; everything else is internal.
- **Both lifecycles** — the facade supports `getInstance()` and DI, so it works with or without the starter.
- **Auto-configuration** — a `<Name>AutoConfiguration` annotated `@AutoConfiguration` with `@ConditionalOnProperty`, registered in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.
- **Properties** — `<Name>Properties` bound with `@ConfigurationProperties(prefix = "adhar.<name>")`.
- **Optional framework deps** — anything framework-specific is `<optional>true</optional>`.
- **CloudEvents 1.0** — every emitted event uses `AdharCloudEvent`.
- **Java 25 idioms** — records, sealed interfaces, pattern matching, text blocks.
- **Lombok `@Slf4j`** for logging; JavaDoc with `@author` and `@since` on every public class; no emojis in source.

### Adding a module

Fourteen steps, in this order. The ordering is not cosmetic — steps 7 to 11 are the wiring that makes the module reachable, and skipping one produces a module that builds but cannot be used.

1. Create `adhar-kit-<name>/`.
2. Add `pom.xml` with parent `adhar-kit-parent`.
3. Create `com.adhar.kit.<name>.<Name>Facade`.
4. Create `<Name>AutoConfiguration` with `@AutoConfiguration`.
5. Create `<Name>Properties` with `@ConfigurationProperties(prefix = "adhar.<name>")`.
6. Register the auto-configuration in `AutoConfiguration.imports`.
7. Add the module to the root `pom.xml` `<modules>`.
8. Add it to `adhar-kit-bom/pom.xml` dependency management.
9. Add it to `adhar-kit-starter/pom.xml` dependencies.
10. Add a lazy accessor to `AdharFacade`.
11. Add the toggle to `AdharKitProperties.Modules` and the registry in `AdharKitAutoConfiguration`.
12. Write the module `README.md`.
13. Write unit tests to 80%+ coverage.
14. Update the root `CHANGELOG.md`.

## Contributing a change

```bash
# 1. Fork on GitHub, then clone your fork and branch from main
git checkout -b feat/outbox-batch-publish main

# 2. Make the change with tests, then verify exactly what CI verifies
mvn verify -Djacoco.skip=true --no-transfer-progress

# 3. Then confirm the coverage gate separately for the module you touched
mvn verify -pl adhar-kit-persistence -am

# 4. Commit with a conventional-commit subject
git commit -m "feat(persistence): batch outbox publication by aggregate id"

# 5. Push and open a pull request
git push -u origin feat/outbox-batch-publish
```

Commit subjects follow conventional commits — `feat(scope):`, `fix(scope):`, `docs(scope):`, `refactor(scope):`, `test(scope):`, `chore(scope):`. The scope is the module name without the `adhar-kit-` prefix.

Before opening the PR, add an entry to `CHANGELOG.md` under `[Unreleased]`. The changelog follows Keep a Changelog and is the source for release notes, so an unlisted change is an invisible change.

CI runs `mvn verify -Djacoco.skip=true` on JDK 25 (Temurin) for every push to `main` or `develop` and every pull request against `main`, uploading Surefire reports on failure.

## Versioning and release

Versions follow Semantic Versioning. Releases are cut with the Maven Release Plugin, configured with `autoVersionSubmodules`, a tag format of `v@{project.version}`, and `release` as the activated profile:

```bash
mvn release:prepare -DdryRun=true    # rehearse
mvn release:prepare -Prelease        # set versions, commit, tag
mvn release:perform -Prelease        # build, sign, deploy
mvn release:rollback                 # undo a failed prepare
```

The `release` profile attaches source and JavaDoc JARs, GPG-signs every artifact, and publishes through the Sonatype central publishing plugin to Maven Central with `autoPublish` enabled. There is also a `workflow_dispatch` GitHub Actions release workflow that takes the release version and the next development version as inputs.

`RELEASING.md` in the repository documents the GPG key setup, the `~/.m2/settings.xml` server entries and the post-release verification steps. `CONTRIBUTING.md` is the canonical version of everything above.

## Next steps

- [Concepts](/adhar-kit/concepts) — the conventions a new module has to match.
- [Modules Overview](/adhar-kit/modules/overview) — where a change is likely to belong.
- [Quick Start](/adhar-kit/quickstart) — consume the artifacts you installed locally.
- [FAQ](/adhar-kit/faq) — build and troubleshooting questions.
