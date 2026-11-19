---
title: "Maven Plugin"
section: "Modules"
order: 32
path: "/adhar-kit/modules/maven-plugin"
---

# Maven Plugin

`adhar-kit-maven-plugin` is build-time tooling: it generates code from your OpenAPI specs and checks them against the API contract, enforces code and layering conventions, reports on dependency hygiene and CVEs, computes versions from Conventional Commits, and scaffolds services, components and ADRs. Use it when you want the kit's conventions to fail a build instead of living in a wiki. Nothing here ships in your application — no beans, no auto-configuration, no runtime cost.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-maven-plugin` (packaging `maven-plugin`), goal prefix `adhar` |
| Goals | `openapi`, `openapi-lint`, `openapi-diff`, `catalog`, `validate`, `deps`, `bom`, `cve`, `version`, `release`, `generate`, `scaffold`, `adr` |
| Default phases | `validate`, `generate-sources`, `verify`, `deploy`; `scaffold`, `adr` and `catalog` have none |
| Requirements | Maven 3.9.9+ (the plugin API it is built against) on JDK 25+; every goal needs a project (`pom.xml`); `version`, `release` and `openapi-diff -Dadhar.openapi.diff.against` need a git work tree |
| Dependencies | openapi-generator, openapi-diff, JGit, semver4j, JavaPoet, Jackson, `adhar-kit-commons` |
| Network | `cve` (Sonatype OSS Index), `openapi-diff` with a `baseline` artifact, `version -Dversion.push=true` |

## How it works

Each goal is a Mojo with a default lifecycle phase. List a goal in `<executions>` and it runs in that phase; run the rest from the command line.

```diagram
nkc-maven-plugin-phases
```

- **Spec-first API goals** — `openapi-lint`, `openapi`, `openapi-diff`, `catalog`. They find one spec per major version at `api/v<major>/openapi.yaml`. `adhar-kit-parent` binds `openapi-lint` (validate) and `openapi` (generate-sources) in its `pluginManagement`, so a service with that parent only declares the plugin.
- **Reporters** — `validate`, `deps`, `bom`, `cve`. They read sources or the dependency tree and write a report under `target/`. They fail the build only when their `fail` flag is on (default `false`).
- **Git-aware mutators** — `version`, `release`. They rewrite `pom.xml` and create tags.
- **Generators** — `generate`, `scaffold`, `adr`. `generate` and `scaffold` write under `target/` by default; `adr` writes to `docs/adr` in your tree.

## Add it

```xml
<build>
  <plugins>
    <plugin>
      <groupId>com.adhar.kit</groupId>
      <artifactId>adhar-kit-maven-plugin</artifactId>
      <version>0.1.0</version>
      <configuration>
        <basePackage>com.example.orders</basePackage>
      </configuration>
      <executions>
        <execution>
          <id>adhar-openapi</id>
          <goals>
            <goal>openapi-lint</goal>
            <goal>openapi</goal>
          </goals>
        </execution>
        <execution>
          <id>adhar-standards</id>
          <goals>
            <goal>validate</goal>
          </goals>
          <configuration>
            <failOnError>true</failOnError>
          </configuration>
        </execution>
        <execution>
          <id>adhar-cve</id>
          <goals>
            <goal>cve</goal>
          </goals>
          <configuration>
            <failOnError>true</failOnError>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

If your project's parent is `adhar-kit-parent`, drop the `adhar-openapi` execution: the parent already binds it.

To use the short `adhar:` prefix outside a project that declares the plugin, register the group in `~/.m2/settings.xml`:

```xml
<settings>
  <pluginGroups>
    <pluginGroup>com.adhar.kit</pluginGroup>
  </pluginGroups>
</settings>
```

## Use it

### `adhar:openapi` — generate code from specs

Each `api/v<major>/openapi.yaml` generates into `<basePackage>.api.v<major>` (models in `.model`) and becomes a compile source root. Server specs are also copied into the artifact as `api/v<major>/openapi.yaml`, where `adhar-kit-commons` serves them at `GET /api/v<major>/openapi.yaml`. Generation is skipped when the spec bytes, presets, packages, options and plugin version are unchanged.

| Preset | Generates | Linted and shipped |
|---|---|---|
| `spring` (default) | Spring MVC interfaces for Spring Boot 4 (Jackson 3, JSpecify, Bean Validation); `skipDefaultInterface`, so a missing operation is a compile error | Yes |
| `jaxrs` | `jakarta.ws.rs` interfaces for Quarkus REST | Yes |
| `spring-client` | Spring `@HttpExchange` clients for another service's API, into `<basePackage>.client.v<major>` | No |

Add other services' specs with `<specs>`:

```xml
<configuration>
  <specs>
    <spec>
      <file>${project.basedir}/api-clients/payments/v1/openapi.yaml</file>
      <preset>spring-client</preset>
      <packageName>com.example.orders.clients.payments.v1</packageName>
    </spec>
  </specs>
</configuration>
```

A `<spec>` takes `file` (required), `preset`, `packageName` and `major` (defaults to the `v<major>` directory, else the major of `info.version`). Two specs that generate into one package, or two server specs for the same major, fail the build.

### `adhar:openapi-lint` — check the API contract

Every rule below is an error unless marked as a warning:

| Rule | Requirement |
|---|---|
| `openapi-version` | `openapi: 3.0.x` (Swagger 2.0 and 3.1 are rejected) |
| `info-version` | A quoted semantic version whose major matches the `v<major>` directory |
| `servers` | Host only; no base path |
| `path-prefix` | Every path starts with `/api/v<major>` |
| `operation-id` | Every operation has a unique `operationId` |
| `operation-tags` | Every operation has a tag (the first names the generated `<Tag>Api`) |
| `responses`, `problem-json` | Every operation declares responses; every 4xx, 5xx and `default` response uses `application/problem+json` |
| `external-ref`, `unresolved-ref` | No `$ref` outside the document; every `$ref` resolves |
| `inline-schema` (warning) | Request and response bodies use named schemas |

```bash
mvn adhar:openapi-lint -Dadhar.openapi.lint.failOnWarnings=true
```

### `adhar:openapi-diff` — block breaking changes

Compares each server spec with a baseline and fails on a change that breaks clients of that major (a removed operation, a new required request field, a changed type). A breaking change belongs in a new `api/v<major+1>/openapi.yaml`. Every change is written to `target/openapi-diff.md`. With no baseline set, the goal logs and does nothing.

```bash
mvn adhar:openapi-diff -Dadhar.openapi.diff.against=origin/main                    # git revision
mvn adhar:openapi-diff -Dadhar.openapi.diff.baseline=1.4.0                         # released version of this project
mvn adhar:openapi-diff -Dadhar.openapi.diff.baseline=com.example:orders:1.4.0      # any artifact
```

In a shallow CI clone, fetch the revision first (`git fetch origin main`).

### `adhar:catalog` — declare APIs in `catalog-info.yaml`

Writes one `kind: API` entity per server spec (annotated `adhar.io/generated-by: adhar-kit-maven-plugin`) and the Component's `spec.providesApis`. Other lines and documents are left as written. Run it when you add or remove a major; use `check` in CI to fail when the catalog lags behind the specs.

```bash
mvn adhar:catalog
mvn adhar:catalog -Dadhar.catalog.check=true
```

### `adhar:validate` — code standards and layering

| Check | Flag | Finding |
|---|---|---|
| Packages `controller`, `service`, `repository`, `model`, `dto`, `config` all exist somewhere under the source root | `validatePackageStructure` | Error per missing package |
| Files under `controller`/`service`/`repository` have `Controller`/`Service`/`Repository` in their name | `validateNaming` | Error |
| Controllers carry `@RestController`/`@Controller`; classes under `service/impl` carry `@Service` | `validateAnnotations` | Error |
| Repositories carry `@Repository` or extend `JpaRepository`/`CrudRepository` | `validateAnnotations` | Warning |
| Public types have Javadoc | `validateDocumentation` | Warning |
| Controllers contain `@ExceptionHandler`/`@ControllerAdvice` | `validateExceptions` | Warning |
| Services have a logger; no `System.out.println` | `validateLogging` | Warning |
| Imports flow `controller → service → repository`, never backwards | `validateArchitecture` | Error |

Only errors fail the build (with `failOnError`). The layering check is a text scan of `package` and `import` lines: a package's layer is its first segment equal to `controller`, `service` or `repository`; packages without one (`dto`, `model`, `config`, …) are exempt.

```bash
mvn adhar:validate -Dvalidate.fail=true -Dvalidate.packageStructure=false
```

### `adhar:deps`, `adhar:bom`, `adhar:cve` — dependency reports

| Goal | Reports | Fails on (with `fail=true`) |
|---|---|---|
| `deps` | Duplicate declarations, versions that diverge from `<dependencyManagement>`, unmanaged hard-coded versions. Reads the model only; no resolution, no network | Duplicates and convergence conflicts (unmanaged versions are informational) |
| `bom` | Resolved versions that differ from the managed (BOM) version | Any misalignment |
| `cve` | Resolved dependencies with a CVSS score at or above `cve.threshold`, from Sonatype OSS Index | Any violation |

`bom` and `cve` resolve the full test-scope dependency tree.

```bash
mvn adhar:deps -Ddeps.fail=true
mvn adhar:bom -Dbom.fail=true
mvn adhar:cve -Dcve.threshold=8.0 -Dcve.fail=true
```

### `adhar:version` — next version from commits

`version.type=auto` classifies commits by their full message: `BREAKING CHANGE` / `BREAKING-CHANGE` anywhere → major; `feat:` or `feat(scope):` at the start → minor; `fix:` at the start → patch. The highest wins; no match keeps the current version. `-SNAPSHOT` is dropped from the result.

```bash
mvn adhar:version -Dversion.type=minor -Dversion.updatePom=false   # log the next version only
mvn adhar:version -Dversion.type=minor -Dversion.tag=true -Dversion.push=true
```

### `adhar:release` — cut a release

In order: check the branch (`release.branch`, `main`, `master` or `develop`), check the tree is clean, run `mvn test -q`. With `dryRun` it stops there. Otherwise it sets the version in `pom.xml`, runs `mvn test` again (unless `skipTests`), writes `CHANGELOG.md` and `RELEASE_NOTES.md`, creates the annotated tag `v<version>`, and runs `mvn deploy -DskipTests` if `deploy` is set. `release.type=auto` removes `-SNAPSHOT`; `major`/`minor`/`patch` bump.

```bash
mvn adhar:release -Drelease.type=minor -Drelease.dryRun=true
mvn adhar:release -Drelease.type=minor -Drelease.deploy=true
```

### `adhar:generate`, `adhar:scaffold`, `adhar:adr` — generators

```bash
# Entity, repository, service, controller and DTO (plus an integration test) for User
mvn adhar:generate -Dgenerate.type=all -Dgenerate.name=User -Dgenerate.package=com.acme.orders

# A Spring Boot service on adhar-kit-parent and adhar-kit-starter
mvn adhar:scaffold -Dscaffold.name=BillingService -Dscaffold.package=com.acme.billing

# docs/adr/NNNN-adopt-dapr-for-pub-sub.md, numbered after the highest existing record
mvn adhar:adr -Dadr.title="Adopt Dapr for pub/sub" -Dadr.status=Accepted
```

`generate` adds its output directory to the compile source roots (and the test directory to the test roots when it writes tests), so binding it to `generate-sources` compiles the result in the same build. Generated repositories extend `JpaRepository` and `JpaSpecificationExecutor`; entities use `AuditingEntityListener`.

## Configuration

Set a parameter in `<configuration>` by name, or on the command line with `-D<user property>`.

### OpenAPI goals (shared by `openapi`, `openapi-lint`, `openapi-diff`, `catalog`)

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `apiDirectory` | `adhar.openapi.apiDirectory` | File | `${project.basedir}/api` | Holds `v<major>/openapi.yaml` |
| `discover` | `adhar.openapi.discover` | boolean | `true` | Find specs under `apiDirectory` |
| `preset` | `adhar.openapi.preset` | String | `spring` | `spring`, `jaxrs` or `spring-client` |
| `basePackage` | `adhar.openapi.basePackage` | String | `${project.groupId}` | Package prefix; invalid characters become `_` |
| `specs` | — | List | — | Extra `<spec>` entries |
| `skip` | `adhar.openapi.skip` | boolean | `false` | Skip all four goals |

### `adhar:openapi`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `outputDirectory` | `adhar.openapi.outputDirectory` | File | `${project.build.directory}/generated-sources/openapi` | Generated sources |
| `resourcesDirectory` | `adhar.openapi.resourcesDirectory` | File | `${project.build.directory}/generated-resources/openapi` | Where shipped specs are copied |
| `shipSpecs` | `adhar.openapi.shipSpecs` | boolean | `true` | Ship server specs in the artifact |
| `additionalProperties` | — | Map | — | openapi-generator options that override the preset |

### `adhar:openapi-lint`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `failOnWarnings` | `adhar.openapi.lint.failOnWarnings` | boolean | `false` | Warnings fail the build too |
| `skipLint` | `adhar.openapi.lint.skip` | boolean | `false` | Skip linting only |

### `adhar:openapi-diff`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `against` | `adhar.openapi.diff.against` | String | — | Git branch, tag or commit to compare with |
| `baseline` | `adhar.openapi.diff.baseline` | String | — | `groupId:artifactId:version`, or a version of this project (used when `against` is unset) |
| `failOnBreaking` | `adhar.openapi.diff.failOnBreaking` | boolean | `true` | A breaking change fails the build |
| `requireVersionBump` | `adhar.openapi.diff.requireVersionBump` | boolean | `false` | A changed spec must raise `info.version` |
| `reportFile` | `adhar.openapi.diff.report` | File | `${project.build.directory}/openapi-diff.md` | Markdown report of every change |

### `adhar:catalog`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `catalogFile` | `adhar.catalog.file` | File | `${project.basedir}/catalog-info.yaml` | Must exist |
| `component` | `adhar.catalog.component` | String | — | Component to update when the file has several |
| `check` | `adhar.catalog.check` | boolean | `false` | Fail instead of writing when out of date |

### `adhar:validate`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `sourceDirectory` | `validate.sourceDir` | File | `${project.build.sourceDirectory}` | Sources to scan |
| `failOnError` | `validate.fail` | boolean | `false` | Errors fail the build |
| `validatePackageStructure` | `validate.packageStructure` | boolean | `true` | Six expected packages |
| `validateNaming` | `validate.naming` | boolean | `true` | Class names per layer |
| `validateAnnotations` | `validate.annotations` | boolean | `true` | Stereotype annotations |
| `validateDocumentation` | `validate.documentation` | boolean | `true` | Javadoc (warnings) |
| `validateExceptions` | `validate.exceptions` | boolean | `true` | Controller exception handling (warnings) |
| `validateLogging` | `validate.logging` | boolean | `true` | Loggers, `System.out` (warnings) |
| `validateArchitecture` | `validate.architecture` | boolean | `true` | Layering direction |
| `minCoverage` | `validate.minCoverage` | int | `80` | Accepted but not used |
| `generateReport` | `validate.report` | boolean | `true` | Write the report |
| `reportFile` | `validate.reportFile` | File | `${project.build.directory}/adhar-validation-report.txt` | Report path |

### `adhar:deps` and `adhar:bom`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `failOnError` | `deps.fail` / `bom.fail` | boolean | `false` | Findings fail the build |
| `generateReport` | `deps.report` / `bom.report` | boolean | `true` | Write the report |
| `reportFile` | `deps.reportFile` / `bom.reportFile` | File | `${project.build.directory}/adhar-dependency-report.txt` / `…/adhar-bom-alignment-report.txt` | Report path |

### `adhar:cve`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `cvssThreshold` | `cve.threshold` | double | `7.0` | Minimum CVSS score reported |
| `failOnError` | `cve.fail` | boolean | `false` | Violations fail the build |
| `skip` | `cve.skip` | boolean | `false` | Skip the scan |
| `cacheDir` | `cve.cacheDir` | File | `${project.build.directory}/adhar-cve-cache` | OSS Index response cache |
| `reportFile` | `cve.reportFile` | File | `${project.build.directory}/adhar-cve-report.txt` | Report path |

### `adhar:version`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `versionType` | `version.type` | String | `auto` | `auto`, `major`, `minor`, `patch` |
| `updatePom` | `version.updatePom` | boolean | `true` | Write the version to `pom.xml` |
| `createTag` | `version.tag` | boolean | `false` | Create a tag |
| `pushTag` | `version.push` | boolean | `false` | Push the tag (only with `createTag`) |
| `tagPrefix` | `version.tagPrefix` | String | `v` | Tag name prefix |
| `gitDirectory` | `version.gitDir` | String | `${project.basedir}` | Repository location |
| `snapshotSuffix` | `version.snapshotSuffix` | String | `SNAPSHOT` | Accepted but not used |

### `adhar:release`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `releaseType` | `release.type` | String | `auto` | `auto` (drop `-SNAPSHOT`), `major`, `minor`, `patch` |
| `dryRun` | `release.dryRun` | boolean | `false` | Run the precondition checks only |
| `releaseBranch` | `release.branch` | String | `main` | Added to the allowed set `main`, `master`, `develop` |
| `skipTests` | `release.skipTests` | boolean | `false` | Skip the second test run |
| `generateChangelog` | `release.changelog` | boolean | `true` | Prepend to the changelog |
| `changelogFile` | `release.changelogFile` | String | `${project.basedir}/CHANGELOG.md` | Changelog path |
| `generateReleaseNotes` | `release.notes` | boolean | `true` | Write release notes |
| `releaseNotesFile` | `release.notesFile` | String | `${project.basedir}/RELEASE_NOTES.md` | Release notes path |
| `deploy` | `release.deploy` | boolean | `false` | Run `mvn deploy -DskipTests` |
| `signArtifacts` | `release.sign` | boolean | `false` | Logs `maven-gpg-plugin` instructions only |
| `createRelease` | `release.createRelease` | boolean | `false` | Logs a `gh release create` command only |

### `adhar:generate`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `type` | `generate.type` | String | required | `entity`, `repository`, `service`, `controller`, `dto`, `all` |
| `name` | `generate.name` | String | required | Class or entity name |
| `basePackage` | `generate.package` | String | `${project.groupId}` | Package |
| `outputDirectory` | `generate.outputDir` | File | `${project.build.directory}/generated-sources/adhar` | Sources |
| `testOutputDirectory` | `generate.testOutputDir` | File | `${project.build.directory}/generated-test-sources/adhar` | Tests (`all` only) |
| `generateTests` | `generate.withTests` | boolean | `true` | Write an integration test (`all` only) |
| `useLombok` | `generate.useLombok` | boolean | `true` | Lombok on entity, service, DTO |
| `withOpenApi` | `generate.withOpenApi` | boolean | `true` | OpenAPI annotations on the controller |
| `tableName` | `generate.tableName` | String | derived | Entity table name |

### `adhar:scaffold` and `adhar:adr`

| Parameter | User property | Type | Default | Description |
|---|---|---|---|---|
| `name` | `scaffold.name` | String | required | Service name, e.g. `OrderService` |
| `basePackage` | `scaffold.package` | String | `${project.groupId}` | Package and groupId |
| `artifactId` | `scaffold.artifactId` | String | kebab-case of `name` | Generated artifactId |
| `outputDirectory` | `scaffold.outputDir` | File | `${project.build.directory}/generated-service` | Project root |
| `title` | `adr.title` | String | required | Decision title |
| `status` | `adr.status` | String | `Proposed` | ADR status |
| `adrDirectory` | `adr.dir` | File | `${project.basedir}/docs/adr` | Where records go |

## Limits

- **`version.type=auto` reads the whole history.** The walk does not stop at the last tag, so every reachable commit is classified: once any `feat:` exists, `auto` always proposes at least a minor bump. Pass an explicit `-Dversion.type=major|minor|patch` in CI and use `auto` only as a hint.
- **Commit patterns are anchored to the start of the full message.** A `feat:` that is not the first text of the subject is ignored; `feat():` (empty scope) does not match.
- **`version` rewrites the first `<version>` element.** In a module whose `<parent>` comes first, that is the parent's version. The POM is reserialised, so formatting can change. Run with `-Dversion.updatePom=false` first and review the diff.
- **`release` neither commits nor pushes.** It edits `pom.xml`, `CHANGELOG.md` and `RELEASE_NOTES.md` in the work tree and tags `HEAD`, so the tag points at the commit before those edits. Commit, move the tag (`git tag -f -a v<version>`), and push yourself. The tag prefix is always `v`.
- **`release` runs Maven as a subprocess** (`mvn test -q` as a precondition, even with `dryRun` or `skipTests`; `mvn deploy` with `deploy`). `mvn` must be on `PATH`, and each subprocess is killed after 10 minutes.
- **The changelog range uses the last tag by name, not by version.** With `v1.9.0` and `v1.10.0`, it may start from the wrong tag. Check the generated entry.
- **`cve` passes when OSS Index is unreachable.** It logs `OSS Index unreachable, skipping CVE check` and returns success. Cached responses never expire: delete `cacheDir` to pick up newly published CVEs. To make the scan mandatory, check `target/adhar-cve-report.txt` in a separate CI step.
- **`validate` fails on a module without sources.** With `validatePackageStructure` on, a POM-packaging aggregator has no `src/main/java` and the goal errors. Bind it only in modules with sources.
- **`validate` counts are approximate.** The logged error and warning totals can exceed the distinct findings; architecture violations appear in the log but not in the report file. Read both.
- **Only the OpenAPI goals are marked thread-safe.** Maven warns about the others in a parallel build (`-T`).
- **`release.sign` and `release.createRelease` do not sign or publish.** Configure `maven-gpg-plugin` and use `gh release create` instead.

## Next steps

- [Commons](/adhar-kit/modules/commons) — serves the shipped specs at `/api/v<major>/openapi.yaml`.
- [Concepts](/adhar-kit/concepts) — the conventions `adhar:validate` enforces.
- [Building the kit](/adhar-kit/build) — how the kit itself is built and released.
- [Modules overview](/adhar-kit/modules/overview) — what generated and scaffolded code depends on.
