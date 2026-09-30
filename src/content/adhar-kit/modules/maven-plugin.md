---
title: "Maven Plugin"
section: "Modules"
order: 32
path: "/adhar-kit/modules/maven-plugin"
---

# Maven Plugin

`adhar-kit-maven-plugin` is build-time tooling, not a runtime library: it computes semantic versions from Conventional Commits, runs releases, scaffolds components, enforces code and architecture standards, and reports on dependency hygiene and CVEs. It exists because **conventions that live only in a wiki decay** — the layering rule nobody enforces, the version bump someone forgets, the transitive dependency that drifts off the BOM. Wiring these goals into the build turns those conventions into build failures.

## At a glance

| | |
|---|---|
| Plugin | `com.adhar.kit:adhar-kit-maven-plugin`, packaging `maven-plugin` |
| Goal prefix | `adhar` (configured via `maven-plugin-plugin`'s `goalPrefix`) |
| Built on | Maven Plugin API 3.9.9, JavaPoet (generation), JGit (versioning and tagging), Sonatype OSS Index (CVEs) |
| Requires | Maven 3.9.9+, Java 25+ |
| Use it when | You want Adhar Kit's conventions checked in CI and its scaffolding available on the command line |

## How it works

Each goal is a Maven Mojo with a default lifecycle phase. Bind the ones you want enforcement from, and invoke the rest by hand.

```text
  mvn verify
    |
    validate ---> adhar:version   (compute next semver from git history)
    |             adhar:validate  (package, naming, annotations, layering)
    |             adhar:deps      (dependency hygiene report)
    |             adhar:bom       (BOM alignment report)
    |
    generate-sources
    |        ---> adhar:generate  (entity / repo / service / controller / DTO)
    |                             adds outputDirectory as a compile source root
    |
    verify   ---> adhar:cve       (OSS Index scan, CVSS-thresholded)
    |
    deploy   ---> adhar:release   (tag, changelog, release notes, deploy)

  no phase: adhar:adr, adhar:scaffold  (invoke explicitly)
```

Two goals read git rather than the POM. `adhar:version` walks commit history with JGit and applies Conventional Commits rules: a message matching `BREAKING[ -]CHANGE` bumps MAJOR, `feat(scope):` bumps MINOR, `fix(scope):` bumps PATCH. `adhar:release` builds on the same machinery.

`adhar:validate` splits into two validators. `CodeStandardsValidator` checks package structure, naming conventions, annotations, Javadoc, exception handling, and logging. `ArchitectureRuleValidator` enforces the layering direction `controller -> service -> repository`: it reads each class's actual `package` declaration to determine its layer, then inspects `import` statements for dependencies on a higher-ranked layer. Packages that belong to no layer — `dto`, `model`, `config` — are neutral and exempt. Matching is on whole package segments, so `com.example.servicecontroller` is not mistaken for the controller layer.

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

## Worked example — enforce standards and scan CVEs in CI

Start permissive, then flip the gates once the backlog is clear. `failOnError` defaults to `false` on every reporting goal precisely so that adopting the plugin does not break an existing build on day one.

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
      </configuration>
    </execution>
  </executions>
</plugin>
```

`adhar:cve` caches OSS Index responses under `${project.build.directory}/adhar-cve-cache`; point `cve.cacheDir` at a persistent path in CI to avoid re-querying on every run, or set `-Dcve.skip=true` for offline builds.

## Worked example — a release from the command line

```bash
# 1. See what the next version would be, without touching anything
mvn adhar:version -Dversion.type=auto -Dversion.updatePom=false

# 2. Generate a component and its tests
mvn adhar:generate -Dgenerate.type=all -Dgenerate.name=User \
                   -Dgenerate.package=com.acme.orders \
                   -Dgenerate.tableName=users

# 3. Rehearse the release
mvn adhar:release -Drelease.type=minor -Drelease.dryRun=true

# 4. Cut it for real
mvn adhar:release -Drelease.type=minor -Drelease.deploy=true -Drelease.sign=true
```

Other common invocations:

```bash
mvn adhar:validate -Dvalidate.fail=true
mvn adhar:deps -Ddeps.fail=true
mvn adhar:bom -Dbom.fail=true
mvn adhar:cve -Dcve.threshold=8.0 -Dcve.fail=true
mvn adhar:scaffold -Dscaffold.name=BillingService -Dscaffold.package=com.acme.billing
mvn adhar:adr -Dadr.title="Adopt Dapr for pub/sub" -Dadr.status=Accepted
```

`adhar:generate` adds its `outputDirectory` to the project's compile source roots, so generated code compiles in the same build.

## Parameters

Every parameter has a `-D` user property, shown in the middle column.

### `adhar:version`

| Parameter | Property | Default |
|---|---|---|
| `versionType` | `version.type` — `auto`, `major`, `minor`, `patch` | `auto` |
| `createTag` | `version.tag` | `false` |
| `pushTag` | `version.push` | `false` |
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
| `validateDocumentation` | `validate.documentation` | `true` |
| `validateExceptions` | `validate.exceptions` | `true` |
| `validateLogging` | `validate.logging` | `true` |
| `validateArchitecture` | `validate.architecture` | `true` |
| `minCoverage` | `validate.minCoverage` | `80` |
| `generateReport` / `reportFile` | `validate.report` / `validate.reportFile` | `true` / `${project.build.directory}/adhar-validation-report.txt` |

### `adhar:cve`, `adhar:deps`, `adhar:bom`, `adhar:scaffold`, `adhar:adr`

| Parameter | Property | Default |
|---|---|---|
| `cvssThreshold` | `cve.threshold` | `7.0` |
| `failOnError` (cve) | `cve.fail` | `false` |
| `skip` | `cve.skip` | `false` |
| `cacheDir` | `cve.cacheDir` | `${project.build.directory}/adhar-cve-cache` |
| `reportFile` (cve) | `cve.reportFile` | `${project.build.directory}/adhar-cve-report.txt` |
| `failOnError` (deps) | `deps.fail` | `false` |
| `reportFile` (deps) | `deps.reportFile` | `${project.build.directory}/adhar-dependency-report.txt` |
| `failOnError` (bom) | `bom.fail` | `false` |
| `reportFile` (bom) | `bom.reportFile` | `${project.build.directory}/adhar-bom-alignment-report.txt` |
| `name` (required, scaffold) | `scaffold.name` | — |
| `basePackage` / `artifactId` / `outputDirectory` | `scaffold.package` / `scaffold.artifactId` / `scaffold.outputDir` | `${project.groupId}` / (derived) / `${project.build.directory}/generated-service` |
| `title` (required, adr) | `adr.title` | — |
| `status` / `adrDirectory` | `adr.status` / `adr.dir` | `Proposed` / `${project.basedir}/docs/adr` |

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `No plugin found for prefix 'adhar'` | The plugin group is not registered | Add `com.adhar.kit` to `pluginGroups` in `settings.xml`, or use the full coordinates |
| `adhar:version` always computes a patch bump | Commit messages do not follow Conventional Commits | Use `feat:`, `fix:`, or a `BREAKING CHANGE` footer; the matchers are anchored at the start of the message |
| Version goals fail outside a git checkout | JGit needs a repository at `version.gitDir` | Run inside the checkout, or point `version.gitDir` at it — a shallow CI clone may also lack the tag history |
| Validation reports nothing | `sourceDirectory` does not exist for this module | Skip the goal on POM-packaging aggregator modules |
| Architecture violations in `dto` or `model` | Those packages are neutral by design | Move the class into a layered package if it should be governed |
| A false layer match on a package like `servicecontroller` | Not possible — matching is per package segment | If a real violation is reported, it is a real cross-layer import |
| `adhar:cve` is slow or fails offline | It queries Sonatype OSS Index over the network | Persist `cve.cacheDir` across CI runs, or set `-Dcve.skip=true` |
| A release half-completed | `release.dryRun` was not used first | Rehearse with `-Drelease.dryRun=true`; it makes no changes |

## See also

- [Concepts](/adhar-kit/concepts) — the conventions `adhar:validate` enforces
- [Building & Contributing](/adhar-kit/build) — building the kit itself
- [Modules Overview](/adhar-kit/modules/overview) — what the generated components depend on
- [Security Best Practices](/docs/security/security-best-practices) — where the CVE gate fits
