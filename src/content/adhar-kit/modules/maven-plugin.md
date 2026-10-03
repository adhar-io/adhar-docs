---
title: "Maven Plugin"
section: "Modules"
order: 32
path: "/adhar-kit/modules/maven-plugin"
---

# Maven Plugin

`adhar-kit-maven-plugin` is build-time tooling, not a runtime library: it computes semantic versions from Conventional Commits, runs releases, scaffolds components, enforces code and architecture standards, and reports on dependency hygiene and CVEs. It exists because **conventions that live only in a wiki decay** — the layering rule nobody enforces, the version bump someone forgets, the transitive dependency that drifts off the BOM. Wiring these goals into the build turns those conventions into build failures.

Nothing on this page ends up in your application. There are no beans, no annotations, no auto-configuration and no runtime cost; the artifact is a `maven-plugin` packaging that runs inside Maven's JVM and touches your working tree, your git repository and, for two goals, the network.

## At a glance

| | |
|---|---|
| Plugin | `com.adhar.kit:adhar-kit-maven-plugin`, packaging `maven-plugin` |
| Goal prefix | `adhar` (configured via `maven-plugin-plugin`'s `goalPrefix`) |
| Built on | Maven Plugin API 3.9.9, JavaPoet (generation), JGit 7 + semver4j (versioning), Sonatype OSS Index (CVEs) |
| Requires | Maven 3.9.9+, Java 25+ |
| Mutates | `pom.xml`, git tags and refs, `CHANGELOG.md`, `RELEASE_NOTES.md`, `docs/adr/`, `target/` |
| Use it when | You want Adhar Kit's conventions checked in CI and its scaffolding available on the command line |

## How it works

Each goal is a Maven Mojo with a default lifecycle phase. Bind the ones you want enforcement from, and invoke the rest by hand.

```diagram
kit-maven-goals
```

Three groups behave differently, and knowing which is which saves time:

- **Read-only reporters** — `validate`, `deps`, `bom`, `cve`. They walk sources or the resolved dependency tree, write a report under `target/`, and fail the build only when their `failOnError` flag is on. Safe to run anywhere, including on a dirty tree.
- **Git-aware mutators** — `version`, `release`. They need a real git repository, and by default `version` rewrites `pom.xml`. Rehearse these before running them for real.
- **File generators** — `generate`, `scaffold`, `adr`. They write new files; `generate` and `scaffold` default to a path under `target/`, so they are harmless until you redirect them. `adr` is the exception: it writes to `${project.basedir}/docs/adr` by default, inside your working tree.

## Goals

| Goal | Default phase | Purpose |
|---|---|---|
| `adhar:version` | `validate` | Compute the next semantic version from commit history; optionally tag and push |
| `adhar:release` | `deploy` | Version, tag, changelog, release notes, and deploy |
| `adhar:generate` | `generate-sources` | Scaffold an entity, repository, service, controller, DTO, or all of them |
| `adhar:scaffold` | none | Generate a whole new service project |
| `adhar:validate` | `validate` | Enforce package structure, naming, annotations, documentation, and architecture rules |
| `adhar:deps` | `validate` | Dependency hygiene report |
| `adhar:bom` | `validate` | BOM alignment report (resolves test-scope dependencies) |
| `adhar:cve` | `verify` | Scan dependencies against Sonatype OSS Index |
| `adhar:adr` | none | Write an Architecture Decision Record |

`bom` and `cve` are declared with `requiresDependencyResolution = ResolutionScope.TEST`, so binding either one forces Maven to resolve the full test-scope dependency tree before the phase runs. On a cold local repository that is the slowest part of the build, and it is why those two goals are the ones that misbehave offline.

## Semantic versioning from commit history

`adhar:version` with `-Dversion.type=auto` walks commit history through JGit and classifies each message with three patterns:

| Bump | Pattern | Matching |
|---|---|---|
| MAJOR | `BREAKING[\s-]CHANGE` | Case-insensitive, found **anywhere** in the full message, including the footer |
| MINOR | `^feat(\(.+\))?:` | Case-insensitive, anchored to the **very start of the full message** |
| PATCH | `^fix(\(.+\))?:` | Case-insensitive, same anchoring |

Four consequences that are easy to get wrong:

1. **The patterns are not multiline.** `^` anchors to the first character of the whole commit message, so `feat:` must be the first thing in the subject line. A `feat:` appearing only in the body is invisible.
2. **The classification is an if/else chain per commit.** A commit carrying both a `BREAKING CHANGE` footer and a `feat:` subject counts only as breaking; the flags are then OR'd across all commits and the highest wins.
3. **No matching commit means no bump.** The current version is returned unchanged rather than defaulting to a patch.
4. **Scope is required to be non-empty if present.** `(\(.+\))?` matches `feat(api):` and `feat:`, but not `feat():`.

`getLastTag()` picks the highest tag that parses as a semantic version, tolerating a leading `v` or `V`, and falls back to the lexicographic maximum if no tag parses. The commit walk is then meant to stop at that tag — but it terminates on `commit.getName().startsWith(lastTag)`, comparing a 40-character SHA against a tag name like `v1.2.0`, which never matches. **In practice `auto` therefore analyses the entire reachable history, not just the commits since the last tag.** Once any `feat:` exists anywhere in the history, `auto` will keep computing at least a minor bump from the current POM version. Prefer an explicit `-Dversion.type=minor` in CI, and treat `auto` as a suggestion you read rather than a decision you automate.

> **`updatePom` rewrites the first `<version>` element in the document.** In a child module whose `<parent>` block precedes its own coordinates, that is the *parent's* version. The POM is also rewritten through a DOM transformer, so formatting and comments can shift. Run with `-Dversion.updatePom=false` first and read the computed version from the log; if you do let it write, review the diff before committing.

## Architecture rules

`adhar:validate` splits into two validators that count differently.

`CodeStandardsValidator` produces **errors** from package structure, naming conventions, annotations, and exception handling, and **warnings** from documentation and logging. Only errors can fail the build — a build with `failOnError = true` and nothing but Javadoc warnings still passes. Two of its checks surprise people on first adoption:

- `validatePackageStructure` expects all six of `controller`, `service`, `repository`, `model`, `dto` and `config` to exist as directory segments *somewhere* under the source root. A library module with no controllers reports a missing-package error for each one it lacks.
- `validateNamingConventions` requires a file under a `controller` segment to contain `Controller` in its name, under `service` to contain `Service` or `ServiceImpl`, and under `repository` to contain `Repository`. Matching is on path *components*, so Windows and Unix separators behave identically.

`ArchitectureRuleValidator` enforces the layering direction `controller -> service -> repository`. It is a text scan, not a compile:

1. It extracts the file's own package with `^\s*package\s+([\w.]+)\s*;` (multiline).
2. It assigns a layer by scanning the package's dot-separated segments for a component equal to `controller`, `service` or `repository` — so `com.example.service.impl` is SERVICE. A package with no such segment is **neutral**: the file is skipped entirely as an owner.
3. It extracts every import with `^\s*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;`, derives each import's package (handling `.*` wildcards correctly), and assigns it a layer the same way.
4. It reports a violation when the owner's rank (`REPOSITORY` 1, `SERVICE` 2, `CONTROLLER` 3) is **lower** than the import's.

So a repository importing a service is a violation; a controller importing a service is fine; and `dto`, `model`, `config`, `mapper`, `util` — anything without a layer segment — is exempt on both sides. Because matching is on whole segments, `com.example.servicecontroller` is not mistaken for either layer. Because it reads imports only, a cross-layer reference written as a fully-qualified inline name, or made between two classes in the same package, is invisible to it.

## Setup

```xml
<build>
  <plugins>
    <plugin>
      <groupId>com.adhar.kit</groupId>
      <artifactId>adhar-kit-maven-plugin</artifactId>
      <version>0.1.0</version>
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

Register the plugin group in `~/.m2/settings.xml` so the short `adhar:` prefix resolves:

```xml
<settings>
  <pluginGroups>
    <pluginGroup>com.adhar.kit</pluginGroup>
  </pluginGroups>
</settings>
```

## Worked example — wiring it into CI

Start permissive, then flip the gates once the backlog is clear. `failOnError` defaults to `false` on every reporting goal precisely so that adopting the plugin does not break an existing build on day one. On a multi-module build, put the plugin in the parent's `<pluginManagement>` and the `<executions>` in the modules that have a `src/main/java` — the aggregator POM has no source directory and `validate` will report nothing there.

```xml
<plugin>
  <groupId>com.adhar.kit</groupId>
  <artifactId>adhar-kit-maven-plugin</artifactId>
  <version>0.1.0</version>
  <executions>
    <execution>
      <id>standards</id>
      <phase>validate</phase>
      <goals><goal>validate</goal></goals>
      <configuration>
        <validateArchitecture>true</validateArchitecture>
        <validatePackageStructure>false</validatePackageStructure>
        <validateDocumentation>false</validateDocumentation>
        <failOnError>true</failOnError>
        <reportFile>${project.build.directory}/adhar-validation-report.txt</reportFile>
      </configuration>
    </execution>
    <execution>
      <id>security</id>
      <phase>verify</phase>
      <goals><goal>cve</goal></goals>
      <configuration>
        <cvssThreshold>7.0</cvssThreshold>
        <failOnError>true</failOnError>
        <cacheDir>${maven.multiModuleProjectDirectory}/.cve-cache</cacheDir>
      </configuration>
    </execution>
  </executions>
</plugin>
```

A matching CI step, with the report archived whether or not the build passes:

```bash
mvn -B verify
# Reports are written even when failOnError is false:
#   target/adhar-validation-report.txt
#   target/adhar-cve-report.txt
#   target/adhar-dependency-report.txt
#   target/adhar-bom-alignment-report.txt
```

`cacheDir` is pointed at the repository root rather than `target/` on purpose: `target` is wiped by `clean`, so the OSS Index cache would never survive a CI run. Cache that directory between runs and the CVE scan stops re-querying unchanged coordinates.

`adhar:cve` is deliberately lenient about the network. If OSS Index is unreachable it logs `OSS Index unreachable, skipping CVE check: ...` and **returns successfully** — a build on an air-gapped runner does not fail, it silently stops scanning. If you need the scan to be mandatory, assert on the presence and content of `target/adhar-cve-report.txt` in a separate CI step rather than relying on the goal's exit status. Use `-Dcve.skip=true` to skip it explicitly and visibly.

## Testing: dry-running a goal

"Testing" for a build plugin means running a goal and confirming what it would do without mutating the repository. Every mutating goal has a way to do that.

| Goal | Dry run | What it still does |
|---|---|---|
| `version` | `-Dversion.type=auto -Dversion.updatePom=false` (and omit `-Dversion.tag`) | Reads git, logs current and next version |
| `release` | `-Drelease.dryRun=true` | **Still validates**: branch matches `release.branch`, working directory is clean, tests pass. Everything after that is skipped |
| `generate` | `-Dgenerate.outputDir=/tmp/adhar-gen -Dgenerate.withTests=false` | Writes to the given directory only |
| `scaffold` | `-Dscaffold.outputDir=/tmp/adhar-svc` | Writes a project tree under that directory |
| `adr` | `-Dadr.dir=/tmp/adr` | Writes the ADR there instead of `docs/adr` |
| `validate`, `deps`, `bom` | — | Read-only by construction; only `target/` reports are written |
| `cve` | `-Dcve.skip=true` to skip entirely | Read-only; writes `target/adhar-cve-report.txt` |

```bash
# 1. See what the next version would be, without touching anything
mvn adhar:version -Dversion.type=auto -Dversion.updatePom=false

# 2. Generate a component into a scratch directory and inspect it
mvn adhar:generate -Dgenerate.type=all -Dgenerate.name=User \
                   -Dgenerate.package=com.acme.orders \
                   -Dgenerate.tableName=users \
                   -Dgenerate.outputDir=/tmp/adhar-gen

# 3. Rehearse the release — preconditions run, nothing is written
mvn adhar:release -Drelease.type=minor -Drelease.dryRun=true

# 4. Cut it for real
mvn adhar:release -Drelease.type=minor -Drelease.deploy=true -Drelease.sign=true
```

Note that `release.dryRun` is checked *after* `validateRelease()`, so a dry run on the wrong branch or a dirty tree fails — which is the point: it is a precondition check as much as a preview. A real run on a tree that fails those preconditions never reaches the mutating steps either.

Other common invocations:

```bash
mvn adhar:validate -Dvalidate.fail=true -Dvalidate.documentation=false
mvn adhar:deps -Ddeps.fail=true
mvn adhar:bom -Dbom.fail=true
mvn adhar:cve -Dcve.threshold=8.0 -Dcve.fail=true
mvn adhar:scaffold -Dscaffold.name=BillingService -Dscaffold.package=com.acme.billing
mvn adhar:adr -Dadr.title="Adopt Dapr for pub/sub" -Dadr.status=Accepted
```

`adhar:generate` adds its `outputDirectory` to the project's compile source roots, and its `testOutputDirectory` to the test compile source roots when `generateTests` is on, so generated code compiles in the same build when bound to `generate-sources`.

## Parameters

Every parameter has a `-D` user property, shown in the middle column.

### `adhar:version`

| Parameter | Property | Default |
|---|---|---|
| `versionType` | `version.type` — `auto`, `major`, `minor`, `patch` | `auto` |
| `createTag` | `version.tag` | `false` |
| `pushTag` | `version.push` (requires `createTag`) | `false` |
| `tagPrefix` | `version.tagPrefix` | `v` |
| `updatePom` | `version.updatePom` | `true` |
| `gitDirectory` | `version.gitDir` | `${project.basedir}` |
| `snapshotSuffix` | `version.snapshotSuffix` | `SNAPSHOT` |

### `adhar:release`

| Parameter | Property | Default |
|---|---|---|
| `releaseType` | `release.type` | `auto` |
| `dryRun` | `release.dryRun` | `false` |
| `deploy` | `release.deploy` | `false` |
| `signArtifacts` | `release.sign` | `false` |
| `generateChangelog` | `release.changelog` | `true` |
| `generateReleaseNotes` | `release.notes` | `true` |
| `createRelease` | `release.createRelease` | `false` |
| `changelogFile` | `release.changelogFile` | `${project.basedir}/CHANGELOG.md` |
| `releaseNotesFile` | `release.notesFile` | `${project.basedir}/RELEASE_NOTES.md` |
| `releaseBranch` | `release.branch` | `main` |
| `skipTests` | `release.skipTests` | `false` |

### `adhar:generate`

| Parameter | Property | Default |
|---|---|---|
| `type` (required) | `generate.type` — `entity`, `service`, `controller`, `repository`, `dto`, `all` | — |
| `name` (required) | `generate.name` | — |
| `basePackage` | `generate.package` | `${project.groupId}` |
| `outputDirectory` | `generate.outputDir` | `${project.build.directory}/generated-sources/adhar` |
| `testOutputDirectory` | `generate.testOutputDir` | `${project.build.directory}/generated-test-sources/adhar` |
| `generateTests` | `generate.withTests` | `true` |
| `useLombok` | `generate.useLombok` | `true` |
| `withOpenApi` | `generate.withOpenApi` | `true` |
| `tableName` | `generate.tableName` | (derived) |

### `adhar:validate`

| Parameter | Property | Default |
|---|---|---|
| `sourceDirectory` | `validate.sourceDir` | `${project.build.sourceDirectory}` |
| `failOnError` | `validate.fail` | `false` |
| `validatePackageStructure` | `validate.packageStructure` | `true` |
| `validateNaming` | `validate.naming` | `true` |
| `validateAnnotations` | `validate.annotations` | `true` |
| `validateDocumentation` (warnings only) | `validate.documentation` | `true` |
| `validateExceptions` | `validate.exceptions` | `true` |
| `validateLogging` (warnings only) | `validate.logging` | `true` |
| `validateArchitecture` | `validate.architecture` | `true` |
| `minCoverage` — bound, but not consulted | `validate.minCoverage` | `80` |
| `generateReport` / `reportFile` | `validate.report` / `validate.reportFile` | `true` / `${project.build.directory}/adhar-validation-report.txt` |

### `adhar:cve`, `adhar:deps`, `adhar:bom`, `adhar:scaffold`, `adhar:adr`

| Parameter | Property | Default |
|---|---|---|
| `cvssThreshold` | `cve.threshold` | `7.0` |
| `failOnError` (cve) | `cve.fail` | `false` |
| `skip` | `cve.skip` | `false` |
| `cacheDir` | `cve.cacheDir` | `${project.build.directory}/adhar-cve-cache` |
| `reportFile` (cve) | `cve.reportFile` | `${project.build.directory}/adhar-cve-report.txt` |
| `failOnError` / `generateReport` / `reportFile` (deps) | `deps.fail` / `deps.report` / `deps.reportFile` | `false` / `true` / `${project.build.directory}/adhar-dependency-report.txt` |
| `failOnError` / `generateReport` / `reportFile` (bom) | `bom.fail` / `bom.report` / `bom.reportFile` | `false` / `true` / `${project.build.directory}/adhar-bom-alignment-report.txt` |
| `name` (required, scaffold) | `scaffold.name` | — |
| `basePackage` / `artifactId` / `outputDirectory` | `scaffold.package` / `scaffold.artifactId` / `scaffold.outputDir` | `${project.groupId}` / (derived) / `${project.build.directory}/generated-service` |
| `title` (required, adr) | `adr.title` | — |
| `status` / `adrDirectory` | `adr.status` / `adr.dir` | `Proposed` / `${project.basedir}/docs/adr` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `No plugin found for prefix 'adhar'` | The plugin group is not registered | Add `com.adhar.kit` to `pluginGroups` in `settings.xml`, or use the full coordinates |
| `auto` bumps minor on a release with only fixes | The commit walk never stops at the last tag, so the whole history is classified | Use an explicit `-Dversion.type=patch` in CI |
| A `feat:` commit was ignored | The patterns are anchored to the start of the full message and are not multiline | Put `feat:` at the start of the subject line, not in the body |
| `version` rewrote the parent version | `updatePomVersion` edits the first `<version>` element in the document | Review the diff; use `-Dversion.updatePom=false` and set the version another way |
| Version goals fail outside a git checkout | JGit needs a repository at `version.gitDir` | Run inside the checkout, or point `version.gitDir` at it — a shallow CI clone may also lack the tag history |
| Validation reports nothing | `sourceDirectory` does not exist for this module | Skip the goal on POM-packaging aggregator modules |
| Six "Missing recommended package" errors on a library | `validatePackageStructure` expects all six conventional packages | Set `validatePackageStructure` to `false` on modules that are not services |
| `failOnError=true` but the build still passes | Documentation and logging findings are warnings, not errors | Expected; only errors fail the build |
| A known cross-layer call is not reported | The validator reads `import` statements only | Avoid fully-qualified inline references; same-package calls are invisible to it |
| Architecture violations in `dto` or `model` | Those packages are neutral by design | Move the class into a layered package if it should be governed |
| `adhar:cve` passes on an offline runner | An unreachable OSS Index is logged as a warning and the goal returns | Cache `cve.cacheDir`, or assert on the report file in CI |
| `adhar:bom` or `adhar:cve` is slow on a cold build | Both declare `requiresDependencyResolution = TEST` | Expected; warm the local repository, and persist the CVE cache |
| A release half-completed | `release.dryRun` was not used first | Rehearse with `-Drelease.dryRun=true`; preconditions still run, nothing is written |

## See also

- [Concepts](/adhar-kit/concepts) — the conventions `adhar:validate` enforces
- [Building & Contributing](/adhar-kit/build) — building the kit itself
- [Modules Overview](/adhar-kit/modules/overview) — what the generated components depend on
- [Security Best Practices](/docs/security/security-best-practices) — where the CVE gate fits
