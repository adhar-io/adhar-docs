---
title: "Building & Contributing"
section: "Get Started"
order: 5
path: "/adhar-kit/build"
---

# Building & Contributing

## Build the repo

```bash
git clone https://github.com/adhar-io/adhar-kit.git
cd adhar-kit

mvn clean install               # full build with tests
mvn clean install -DskipTests   # skip tests
mvn clean install -T 1C         # parallel build (1 thread per core)
mvn -Pnative native:compile     # GraalVM native image
```

Build a single module and its dependencies:

```bash
mvn clean install -pl :adhar-kit-metrics -am
```

## Testing & coverage

- Stack: **JUnit 5 + AssertJ + Mockito**; integration tests use **TestContainers**.
- **80% instruction coverage** is enforced by JaCoCo — the build fails below it.
- Unit tests: `*Test.java` / `*Tests.java` (`mvn test`). Integration tests: `*IT.java` / `*IntegrationTest.java` (`mvn verify`).

```bash
mvn clean verify jacoco:report
open target/site/jacoco/index.html
mvn test -pl adhar-kit-<module>     # a single module's tests
```

The Maven Enforcer requires **Java 25+** and **Maven 3.8+**.

## Contributing

- **Conventional commits** — `feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`, `test(...)`, `chore(...)`.
- **Workflow** — fork → feature branch off `main` → changes with tests → `mvn verify` passes → update `CHANGELOG.md` under `[Unreleased]` → open a PR.
- **Adding a module** is a documented checklist: create the directory + POM (inheriting `adhar-kit-parent`), a `*Facade`, `@AutoConfiguration`, `@ConfigurationProperties(prefix = "adhar.<name>")`, register in `AutoConfiguration.imports`, then wire it into the root `pom.xml`, the BOM, the starter, the `AdharFacade` accessor, tests, and the CHANGELOG.

## Versioning & release

- **Semantic Versioning**; changelog follows **Keep a Changelog**.
- Releases go through the Maven Release Plugin; the `release` profile attaches source + Javadoc JARs, GPG-signs artifacts, and publishes to **Maven Central**.

See `CONTRIBUTING.md` and `RELEASING.md` in the repository for the full details.
