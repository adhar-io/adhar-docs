---
title: "Rewrite"
section: "Modules"
order: 35
path: "/adhar-kit/modules/rewrite"
---

# Rewrite

`adhar-kit-rewrite` packages [OpenRewrite](https://docs.openrewrite.org) recipes for code that uses the kit: adopting the `AdharFacade` shortcuts, bumping kit versions, moving to Spring Boot 4, and the mechanical part of a Spring-to-Quarkus or Spring-to-Micronaut move. Run them at build time with the OpenRewrite Maven plugin, or from code through `RewriteFacade`.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-rewrite` (package `com.adhar.kit.rewrite`); included in `adhar-kit-starter` |
| Facade gate | `adhar.kit.modules.rewrite`, default `false`. It gates `adhar.getRewrite()` |
| Module switch | `adhar.rewrite.enabled`, default `true`. It gates `RewriteAutoConfiguration`, which registers the `RewriteFacade` bean |
| Facade | `RewriteFacade` |
| Required dependencies | `rewrite-core`, `rewrite-java`, `adhar-kit-commons` |
| Optional dependencies | `rewrite-maven`, `rewrite-spring`, `rewrite-migrate-java`, `rewrite-testing-frameworks` — not transitive, so recipes that need them need them on your classpath |
| Frameworks | Framework-independent; the recipes edit source and POM files |

## How it works

```diagram
nka-rewrite-paths
```

A *recipe* is an OpenRewrite transformation identified by its fully qualified name. The module has three kinds:

- **Java recipes** — classes that extend `org.openrewrite.Recipe`. OpenRewrite finds them by name on the classpath.
- **One declarative recipe** — `com.adhar.kit.rewrite.recipe.adhar.FullModernization`, in `META-INF/rewrite/adhar-kit.yml`, which OpenRewrite discovers automatically.
- **YAML generators** — classes with a static `getYamlDefinition()` that returns a recipe as YAML. They are not recipes themselves: copy the YAML into your project's `rewrite.yml` to use them.

## Recipes

| Recipe | Kind | What it changes |
|---|---|---|
| `com.adhar.kit.rewrite.recipe.adhar.UseConvenienceShortcuts` | Java | Flattens accessor chains into shortcuts: `getMetrics().increment(…)` → `count(…)`, `getPersistence().save/findById/executeInTransaction(…)` → `save/findById/transactional(…)`, `getMessaging().publish(…)` → `publish(…)`, `getSecurity().hasPermission/hasRole/getCurrentUserId(…)` → the shortcuts, `getDocs()` → `getApiDocs()`, `getCore()` → `getUtils()` |
| `com.adhar.kit.rewrite.recipe.adhar.MigrateAdharKitVersion` | Java, with options | Bumps every `com.adhar.kit` dependency, parent, plugin and BOM version, and `<adhar-kit.version>`, from `oldVersion` to `newVersion`. `migrateLegacyPackages=true` also renames `com.adhar.adharkit.*` to `com.adhar.kit.*` |
| `com.adhar.kit.rewrite.recipe.spring.MigrateToSpringBoot4` | Java | Renames `spring-boot-starter-web`, `-aop` and `-oauth2-resource-server` to their Spring Boot 4 names, and moves the `actuate.health` and `test.autoconfigure.web.servlet` packages |
| `com.adhar.kit.rewrite.recipe.cross.SpringToQuarkus` | Java | Maps Spring stereotypes, `@Autowired`, `@Value`, `@Scheduled` and `@EventListener` to CDI and Quarkus types |
| `com.adhar.kit.rewrite.recipe.cross.SpringToMicronaut` | Java | Maps Spring stereotypes, `@Autowired`, `@RestController`, the `@*Mapping` annotations and `@Value` to Micronaut types |
| `com.adhar.kit.rewrite.recipe.adhar.AdoptCloudEvents` | Java, `status:in-progress` | Changes `BaseEvent`/`DomainEvent` to `AdharCloudEvent` under `com.adhar.kit.messaging.event`, which is not where these types live in 0.1.0 (`AdharCloudEvent` is in `com.adhar.kit.commons.event`). Review its output before you keep it. |
| `com.adhar.kit.rewrite.recipe.adhar.FullModernization` | Declarative | Runs `UpgradeToJava25`, `MigrateToSpringBoot4`, `JUnit4to5Migration`, `UseConvenienceShortcuts`, `AdoptCloudEvents`, `RemoveUnusedImports` and `AutoFormat`. Needs `rewrite-migrate-java` and `rewrite-testing-frameworks` |

YAML generators: `SpringToHelidon`, `SpringToVertx` (package `recipe.cross`), `MigrateToHelidon4`, `MigrateToMicronaut4`, `MigrateToQuarkusLatest` and `MigrateToVertx4`.

> **Warning:** Do not set `migrateLegacyPackages=true` on 0.1.0 code. `adhar-kit-cache` and `adhar-kit-logging` still use the `com.adhar.adharkit` packages, so renaming your imports breaks them.

## Run recipes at build time

Add the OpenRewrite Maven plugin with `adhar-kit-rewrite` as a plugin dependency, and name the recipes to activate:

```xml
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <version>6.42.0</version>
    <configuration>
        <activeRecipes>
            <recipe>com.adhar.kit.rewrite.recipe.adhar.UseConvenienceShortcuts</recipe>
        </activeRecipes>
    </configuration>
    <dependencies>
        <dependency>
            <groupId>com.adhar.kit</groupId>
            <artifactId>adhar-kit-rewrite</artifactId>
            <version>0.1.0</version>
        </dependency>
    </dependencies>
</plugin>
```

`6.42.0` is the plugin version the kit's build declares. For `FullModernization` or the upstream Java and testing recipes, also add `org.openrewrite.recipe:rewrite-migrate-java` and `org.openrewrite.recipe:rewrite-testing-frameworks` as plugin dependencies.

```bash
mvn rewrite:dryRun    # writes target/rewrite/rewrite.patch; changes nothing
mvn rewrite:run       # applies the changes to your sources
```

**Check:** after `rewrite:dryRun`, `target/rewrite/rewrite.patch` shows each change as a diff.

To pass options, declare the recipe in a `rewrite.yml` at the project root and activate it by its name:

```yaml
---
type: specs.openrewrite.org/v1beta/recipe
name: com.example.BumpAdharKit
recipeList:
  - com.adhar.kit.rewrite.recipe.adhar.MigrateAdharKitVersion:
      oldVersion: 0.1.0
      newVersion: <new-version>
```

## Use RewriteFacade

`RewriteFacade` is a singleton (`RewriteFacade.getInstance()`, or `adhar.getRewrite()` with `adhar.kit.modules.rewrite=true`) over a catalog of named recipe sets.

```java
RewriteFacade rewrite = RewriteFacade.getInstance();

// Real, in-process run against in-memory sources; returns per-file diffs
RewriteImpactReport report = rewrite.runInProcess(
        List.of("com.adhar.kit.rewrite.recipe.adhar.UseConvenienceShortcuts"),
        List.of(new InProcessRewriteRunner.SourceInput("src/main/java/Foo.java", javaSource)));
System.out.println(report.toMarkdown());

// Writes ./rewrite.yml for the "adhar-convenience-api" set and returns the mvn command to run
RewriteFacade.RewriteResult result = rewrite.dryRun("adhar-convenience-api", Path.of("."));
```

> **Note:** `runInProcess` parses Java with OpenRewrite's `JavaParser.fromJavaVersion()`, which needs a version-specific parser such as `org.openrewrite:rewrite-java-25` or `rewrite-java-21` on the classpath. `adhar-kit-rewrite` gets those only through its optional dependencies, so add one yourself, at the version that matches `rewrite-core` (8.85.x).

| Method | What it does |
|---|---|
| `runInProcess(recipeSetKey or recipeNames, sources)` | Runs the recipes in the JVM and returns a `RewriteImpactReport` (`changedFileCount()`, `fileDiffs()`, `toMarkdown()`, `toJson()`). Every name must be a `Recipe` class with a public no-arg constructor. |
| `dryRun(...)` / `apply(...)` | Do not change sources. They write `rewrite.yml` into the project directory and return a `RewriteResult` naming `mvn org.openrewrite.maven:rewrite-maven-plugin:dryRun` (or `:run`) `-Drewrite.activeRecipes=…`. |
| `listRecipeSets()`, `listRecipeSetKeys()`, `getRecipeSet(key)` | Browse the catalog. |
| `isRecipeAvailable(key)` | Whether every recipe class in a set loads. |
| `validateCatalog()` | A `ValidationReport` of every catalog name that does not resolve on the classpath. |

### The catalog

`RecipeCatalog` has these keys, grouped by category:

| Category | Keys |
|---|---|
| Java | `java-17`, `java-21`, `java-25` |
| Spring | `spring-boot-3`, `spring-boot-4` |
| Testing | `junit-5`, `assertj`, `mockito-5` |
| Security | `security-best-practices` |
| Adhar Kit | `adhar-convenience-api`, `adhar-spring-boot-4`, `adhar-version-migration`, `adhar-cloudevents`, `adhar-full-modernization` |
| Code quality | `code-cleanup`, `logging-best-practices`, `dependency-upgrade` |
| Quarkus, Micronaut, Helidon, Vert.x | `quarkus-3`, `quarkus-latest`, `micronaut-4`, `helidon-4`, `vertx-4` |
| Jakarta | `jakarta-ee-10`, `jakarta-ee-11` |
| Cross-framework | `spring-to-quarkus`, `spring-to-micronaut`, `spring-to-helidon`, `spring-to-vertx` |

Many keys name upstream OpenRewrite recipes whose artifacts the module does not bring, and `quarkus-latest`, `micronaut-4`, `helidon-4`, `vertx-4`, `spring-to-helidon` and `spring-to-vertx` name YAML generators, which do not resolve as recipes. Run `validateCatalog()` to see what resolves on your classpath before you rely on a key.

## Configuration

| Key | Default | Description |
|---|---|---|
| `adhar.kit.modules.rewrite` | `false` | Facade gate for `adhar.getRewrite()` |
| `adhar.rewrite.enabled` | `true` | Registers the `RewriteFacade` bean |

`adhar.rewrite.default-recipe-set` and `adhar.rewrite.output-dir` are declared in `RewriteProperties` but not read in 0.1.0.

## Limits

- **Structural matching.** `UseConvenienceShortcuts` matches accessor and method names, not types, so it can also rewrite a non-kit object that happens to have `getMetrics().increment(...)`. Review the patch.
- **Partial cross-framework coverage.** The Spring-to-X recipes change annotation and type names only; configuration, build files and framework-native code still need manual work. See [Framework Support](/adhar-kit/frameworks#migrating-between-frameworks).

## Next steps

- [Framework Support](/adhar-kit/frameworks) — what works on the runtime you migrate to.
- [Concepts](/adhar-kit/concepts) — the shortcuts `UseConvenienceShortcuts` targets.
- [Maven Plugin](/adhar-kit/modules/maven-plugin) — the kit's own `adhar:` goals.
- [Modules Overview](/adhar-kit/modules/overview) — the other modules.
