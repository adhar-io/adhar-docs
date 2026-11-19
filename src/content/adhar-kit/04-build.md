---
title: "Building & Contributing"
section: "Get Started"
order: 5
path: "/adhar-kit/build"
---

# Building & Contributing

Adhar Kit is a Maven *reactor* — one build over several modules — of 29 artifacts on Java 25. Build it from source to try an unreleased fix, to run the tests against a change, or to contribute a module. This page gives the real commands and the rules the build enforces.

## At a glance

| | |
|---|---|
| Repository | [github.com/adhar-io/adhar-kit](https://github.com/adhar-io/adhar-kit) |
| Toolchain | JDK 25+ and Maven 3.8+ (enforced); `./mvnw` downloads Maven 3.9.11 |
| Default build flags | `.mvn/maven.config` sets `-T 2C`: modules build in parallel |
| Build cache | Maven Build Cache Extension, from `.mvn/extensions.xml` |
| Tests | JUnit 5, AssertJ, Mockito; TestContainers for integration tests |
| Coverage gate | 80% instruction coverage per module, checked at `verify` |
| CI | GitHub Actions, JDK 25 (Temurin), `mvn verify -Djacoco.skip=true` |

## What the build enforces

```diagram
nka-build-lifecycle
```

## Clone and build

```bash
git clone https://github.com/adhar-io/adhar-kit.git
cd adhar-kit

./mvnw clean install                           # build, test, coverage gate, install to ~/.m2
./mvnw install -DskipTests -Djacoco.skip=true  # fastest way to installed artifacts
```

**Check:** `ls ~/.m2/repository/com/adhar/kit/` lists `adhar-kit-starter`, `adhar-kit-bom` and the other artifacts at `0.1.0`. A service can now resolve them, as in the [Quick Start](/adhar-kit/quickstart).

The first build downloads a large dependency tree: the Spring Boot 4.1, Quarkus and Micronaut platform BOMs, Helidon, Vert.x, OpenTelemetry, gRPC and the AWS and Google Cloud SDKs.

While you work on one module, build it with what it depends on:

```bash
./mvnw install -pl :adhar-kit-metrics -am      # module + its upstream modules
./mvnw compile -pl adhar-kit-persistence -am   # compile only
```

> **Note:** After changing `adhar-kit-commons`, always build with `-am` ("also make"). Most modules depend on it, and without `-am` Maven uses the stale copy in `~/.m2`.

## The reactor layout

The root `pom.xml` (`com.adhar.kit:adhar-kit:0.1.0`) lists the modules but is not their parent. Every module inherits `adhar-kit-parent`, which inherits `spring-boot-starter-parent` and holds the Java version, plugin management, the Enforcer rules and the coverage gate.

```text
adhar-kit/                     reactor root: <modules> list, release and coverage profiles
├── adhar-kit-bom/             versions for every kit artifact and the third-party stack
├── adhar-kit-parent/          build parent: Java 25, plugins, Enforcer, JaCoCo
├── adhar-kit-commons/         framework detection, AdharCloudEvent, DDD, context
├── adhar-kit-core/            CoreFacade utilities; no kit dependency
├── adhar-kit-config/ … adhar-kit-persistence/
│                              foundation: config, logging, metrics, tracing,
│                              cache, resilience, health, persistence
├── adhar-kit-messaging/ … adhar-kit-docs/
│                              integration: messaging, grpc, graphql, notification, docs
├── adhar-kit-security/ … adhar-kit-perf-profiler/
│                              security, event-sourcing, analytics, batch, ai,
│                              dapr, kubernetes, perf-profiler
├── adhar-kit-starter/         AdharFacade and the framework adapters
├── adhar-kit-test-commons/    TestContainers helpers, batch test support
├── adhar-kit-rewrite/         OpenRewrite recipes
└── adhar-kit-maven-plugin/    the adhar: Maven goals
```

`adhar-kit-bom` and `adhar-kit-parent` come first in `<modules>`, because every other module resolves through them.

## Running tests

| Kind | Class names | Plugin | Phase |
|---|---|---|---|
| Unit | `*Test`, `*Tests` | Surefire | `test` |
| Integration | `*IT`, `IT*`, `*ITCase` | Failsafe, in modules that declare it | `integration-test`, `verify` |

```bash
./mvnw test                                         # unit tests, whole reactor
./mvnw test -pl adhar-kit-cache                     # one module
./mvnw test -pl adhar-kit-cache -Dtest=CacheFacadeTest   # one class
./mvnw verify                                       # tests + coverage gate
```

- Surefire runs with `-Xmx1024m` and `junit.jupiter.execution.timeout.default = 5 m`, so a hung test fails its module instead of blocking the build.
- Test methods do not run concurrently: facades, log capture and meter registries are process-wide. Speed comes from building modules in parallel.
- Integration tests use TestContainers and need a running Docker daemon.

### Coverage

`adhar-kit-parent` binds JaCoCo for every module: `prepare-agent`, a `report` at `test`, and a `check` at `verify`. The rule is `BUNDLE` scope, `INSTRUCTION` counter, minimum `${jacoco.minimum.coverage}` = `0.80`.

The check excludes code it would measure badly: `**/annotation/**`, `*Properties`, `*AutoConfiguration`, `*Constants`, the `quarkus`, `micronaut`, `helidon` and `vertx` adapter packages, and models generated by `adhar:openapi` (`**/api/v?/model/**`, `**/api/v??/model/**` and the same under `client`).

```bash
./mvnw clean verify                    # per-module report and gate
open adhar-kit-cache/target/site/jacoco/index.html
./mvnw verify -Djacoco.skip=true       # skip instrumentation, as CI does
```

## Module conventions

- **Package** — `com.adhar.kit.<module>.*` for new code. (`adhar-kit-cache` and `adhar-kit-logging` still use `com.adhar.adharkit.*`.)
- **One facade** — `<Name>Facade` is the module's public API, usable through `getInstance()` and through DI.
- **Auto-configuration** — a `<Name>AutoConfiguration` with `@ConditionalOnProperty(prefix = "adhar.<name>", name = "enabled", matchIfMissing = true)`, listed in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.
- **Properties** — `<Name>Properties` with `@ConfigurationProperties(prefix = "adhar.<name>")`.
- **Optional framework dependencies** — anything framework-specific is `<optional>true</optional>`.
- **Events** — use `AdharCloudEvent` from `adhar-kit-commons`.
- **Style** — Java 25 idioms, Lombok `@Slf4j`, JavaDoc with `@author` and `@since` on public classes, no emoji in source.

### Adding a module

Steps 7–11 make the module reachable; skip one and the module builds but nothing can use it.

1. Create `adhar-kit-<name>/`.
2. Add a `pom.xml` whose parent is `adhar-kit-parent`.
3. Create `com.adhar.kit.<name>.<Name>Facade`.
4. Create `<Name>AutoConfiguration` with `@AutoConfiguration`.
5. Create `<Name>Properties` with `@ConfigurationProperties(prefix = "adhar.<name>")`.
6. List the auto-configuration in `AutoConfiguration.imports`.
7. Add the module to the root `pom.xml` `<modules>`.
8. Add it to `adhar-kit-bom` dependency management.
9. Add it to `adhar-kit-starter`'s dependencies.
10. Add a `MOD_<NAME>` id and a gated, lazy accessor (and setter) to `AdharFacade`.
11. Add the toggle to `AdharKitProperties.Modules`, and the id to all three lists in `AdharKitAutoConfiguration`: the banner, `buildModuleAccess` and the module registry.
12. Write the module `README.md`.
13. Write tests to at least 80% instruction coverage.
14. Add a `CHANGELOG.md` entry.

## Contributing a change

```bash
git checkout -b feat/outbox-batch-publish main
./mvnw verify -Djacoco.skip=true --no-transfer-progress   # what CI runs
./mvnw verify -pl adhar-kit-persistence -am               # the coverage gate for your module
git commit -m "feat(persistence): batch outbox publication by aggregate id"
git push -u origin feat/outbox-batch-publish
```

- Commit subjects follow conventional commits — `feat`, `fix`, `docs`, `refactor`, `test`, `chore` — with the module name, minus `adhar-kit-`, as the scope.
- Add an entry under `[Unreleased]` in `CHANGELOG.md` (Keep a Changelog format).
- CI runs on every push to `main` or `develop` and every pull request against `main`, and uploads the Surefire reports when it fails.

## Releases

Versions follow Semantic Versioning. Two release paths exist:

- **GitHub Actions** — the `release.yml` workflow (`workflow_dispatch`) takes `releaseVersion` and `nextVersion`. It sets the version with `versions:set`, runs `mvn verify -Djacoco.skip=true`, deploys with `mvn deploy -Prelease -DskipTests`, tags `v<releaseVersion>`, then sets the next development version.
- **Maven Release Plugin** — configured in `adhar-kit-parent` with `autoVersionSubmodules`, tag format `v@{project.version}` and the `release` profile.

The root POM's `release` profile adds source and Javadoc JARs, GPG signing and the Sonatype Central publishing plugin. `RELEASING.md` in the repository covers GPG keys, `~/.m2/settings.xml` and post-release checks; `CONTRIBUTING.md` is the source for the contribution rules above.

## Next steps

- [Concepts](/adhar-kit/concepts) — the facade and switch model a new module plugs into.
- [Modules Overview](/adhar-kit/modules/overview) — where a change belongs.
- [Quick Start](/adhar-kit/quickstart) — consume the artifacts you installed.
- [FAQ](/adhar-kit/faq) — build and troubleshooting questions.
