---
title: "FAQ"
section: "Get Started"
order: 6
path: "/adhar-kit/faq"
---

# FAQ

**Is Adhar Kit tied to Spring Boot?**
No. It's framework-agnostic — Spring Boot, Quarkus, Micronaut, Helidon, and Vert.x are all first-class. The same code runs on each; only the wiring differs. See [Framework Support](/adhar-kit/frameworks).

**Do I have to use the whole toolkit?**
No. Import the [BOM](/adhar-kit/quickstart) and pick only the modules you need. Modules are also lazily initialized and gated by `adhar.kit.modules.<name>`, so unused ones cost nothing.

**What Java version is required?**
Java 25+ and Maven 3.9+.

**Is there a Gradle setup?**
The toolkit is documented and built with Maven. Use the BOM/starter coordinates in your Gradle build if you prefer, but the reference examples are Maven.

**How does it relate to the Adhar Platform?**
Adhar Kit is the *application-side* library; the [Adhar Platform](/docs) is the *infrastructure* it runs on. The kit is platform-aware — it detects Kubernetes / the Adhar Platform and wires itself to the platform's Prometheus, Vault/OpenBao, Kafka, and Dapr automatically. You can use either independently.

**How do I turn a module on or off?**
Toggle `adhar.kit.modules.<name>` (e.g. `adhar.kit.modules.ai=true`). A disabled module throws a clear error if you call its facade.

**Does it work with GraalVM native image?**
Yes — `mvn -Pnative native:compile`. All supported frameworks target native image.

**Where do I see which modules are active at runtime?**
With Spring Boot Actuator, `GET /actuator/adhar` lists the module registry and each module's state.

**How do I migrate a service between frameworks?**
Use the `adhar-kit-rewrite` module's OpenRewrite recipes, which include cross-framework migration.

**Where do I report issues or contribute?**
On [GitHub](https://github.com/adhar-io/adhar-kit) — see [Building & Contributing](/adhar-kit/build).
