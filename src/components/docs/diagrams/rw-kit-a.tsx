import type { ComponentType } from "react";
import {
  Box,
  C,
  Caption,
  Flow,
  Frame,
  Ladder,
  Pipeline,
  Split,
  Stack,
} from "@/components/docs/diagram-kit";

/** Adhar Kit docs diagrams. Every key is prefixed "nka-". */

/* Quick Start: from the pom to a running, inspectable service. */
const QuickstartFlow = () => (
  <Flow
    label="The Quick Start service: the pom inherits adhar-kit-parent and adds adhar-kit-starter; application.yml sets the module gates and opens every path for the demo; GreetingService takes AdharFacade by injection and uses traced, count and cached; GET /greet/ada answers Hello, ada; /actuator/adhar reports eleven modules enabled and eleven disabled."
    caption="One dependency, one injected object. The actuator endpoint shows which facade modules are live."
    nodes={[
      { title: "pom.xml", lines: ["adhar-kit-parent", "adhar-kit-starter"], tone: "primary" },
      { title: "application.yml", lines: ["adhar.kit.modules.*", "permit-all (demo)"] },
      { title: "GreetingService", lines: ["AdharFacade injected", "traced · count · cached"] },
      { title: "GET /greet/ada", lines: ["Hello, ada"] },
      { title: "/actuator/adhar", lines: ["11 enabled", "11 disabled"], tone: "accent" },
    ]}
    edges={[{ label: "builds" }, { label: "wires" }, { label: "serves" }, { label: "reports" }]}
    gap={40}
  />
);

/* Concepts: what Spring Boot wires at startup, and which switch controls each part. */
const SpringWiring = () => (
  <Ladder
    label="Spring Boot startup. adhar.kit.enabled turns on AdharKitAutoConfiguration, which prints the banner and registers the module registry, the actuator endpoint and graceful shutdown. adhar.kit.modules.<id> becomes one AdharModuleAccess map. SpringAdharFacadeConfiguration then creates the AdharFacade bean from that map, wires the Tracer and CircuitBreakerRegistry beans into it and applies customizers. Separately, each module's own auto-configuration is controlled by adhar.<module>.enabled. The first getX() call checks the gate and builds the sub-facade once."
    heading={["switch or class", "what it controls"]}
    width={800}
    boxW={290}
    caption="Two independent switch families: the facade gate (adhar.kit.modules.*) and each module's own adhar.<module>.enabled."
    rungs={[
      {
        name: "adhar.kit.enabled",
        detail: "default true",
        adds: ["AdharKitAutoConfiguration: banner, module registry,", "/actuator/adhar, graceful shutdown"],
        tone: "primary",
      },
      {
        name: "adhar.kit.modules.<id>",
        detail: "22 ids · 11 on by default",
        adds: ["AdharModuleAccess: one map, read by AdharFacade", "and by the module registry"],
      },
      {
        name: "SpringAdharFacadeConfiguration",
        detail: "runs after the above",
        adds: ["AdharFacade bean; wires the Tracer and", "CircuitBreakerRegistry beans; applies customizers"],
      },
      {
        name: "adhar.<module>.enabled",
        detail: "one per module · mostly true",
        adds: ["each module's own @AutoConfiguration: its beans,", "aspects and filters — independent of the gate"],
      },
      {
        name: "adhar.getCache()",
        detail: "first call",
        adds: ["checks the gate, then builds the sub-facade once"],
        tone: "accent",
      },
    ]}
  />
);

/* Concepts: the facade gate versus a module's own switch. */
const TwoSwitches = () => (
  <Split
    label="Two switches. adhar.kit.modules.<id> gates AdharFacade accessors and shortcuts; it is read on Spring Boot only, eleven ids are on by default, a disabled accessor throws IllegalStateException, and it never stops a module's beans. adhar.<module>.enabled gates the module's own Spring auto-configuration; each module reads it with @ConditionalOnProperty, it is on when absent for almost every module, and turning it off removes that module's beans, aspects and filters without changing the facade gate."
    width={760}
    left={{
      heading: "adhar.kit.modules.<id>",
      tone: "primary",
      items: [
        "Gates AdharFacade accessors and shortcuts",
        "Read on Spring Boot only",
        "11 on, 11 off by default",
        "Off: getX() throws IllegalStateException",
        "Never stops a module's beans",
      ],
      note: "Reported by the banner and /actuator/adhar",
    }}
    right={{
      heading: "adhar.<module>.enabled",
      tone: "accent",
      items: [
        "Gates the module's own auto-configuration",
        "Read by each module's @ConditionalOnProperty",
        "On when absent, for almost every module",
        "Off: no beans, aspects or filters from it",
        "Leaves the facade gate unchanged",
      ],
      note: "Example: adhar.security.enabled=false",
    }}
  />
);

/* Framework Support: how each runtime obtains the one AdharFacade singleton. */
const FrameworkAdapters = () => (
  <Stack
    label="Every runtime reaches the same AdharFacade singleton. Spring Boot's SpringAdharFacadeConfiguration builds it from adhar.kit.modules.* and wires the Spring tracing and resilience adapters. Quarkus and Helidon MP use a CDI producer, Micronaut a factory, Helidon SE and Vert.x a static bootstrap; these call AdharFacade.getInstance(), which enables every module. Without a container, call getInstance() yourself."
    caption="Only the Spring Boot adapter reads adhar.kit.modules.*. The others create the singleton with every module enabled."
    width={780}
    layers={[
      { name: "Your code", items: "the same AdharFacade calls on every runtime", tone: "primary" },
      { name: "Spring Boot — SpringAdharFacadeConfiguration", items: "@Bean from adhar.kit.modules.*; wires Spring tracing and resilience adapters" },
      { name: "Quarkus / Helidon MP — Quarkus- and HelidonAdharFacadeProducer", items: "CDI @Produces @ApplicationScoped → AdharFacade.getInstance()" },
      { name: "Micronaut — MicronautAdharFacadeFactory", items: "@Factory + @Singleton → AdharFacade.getInstance()" },
      { name: "Helidon SE / Vert.x — HelidonSeBootstrap, VertxAdharFacadeBootstrap", items: "static adhar(); Vert.x can also store it in sharedData()" },
      { name: "AdharFacade.getInstance()", items: "one process-wide singleton; ServiceLoader customizers applied once", tone: "accent" },
    ]}
  />
);

/* Modules Overview: the real dependency edges between kit artifacts. */
const ModuleDependencies = () => (
  <Frame
    width={760}
    height={452}
    label="Module dependencies. adhar-kit-starter requires twenty-three modules and declares adhar-kit-batch optional; it does not include test-commons or the maven plugin. Nineteen artifacts require adhar-kit-commons at compile scope. docs, kubernetes, security and tracing depend on commons only optionally, test-commons at provided scope, and core and grpc have no kit dependency at all. Every other edge between sibling modules is optional."
  >
    <Box
      x={8}
      y={8}
      w={744}
      h={56}
      title="adhar-kit-starter"
      lines={["requires 23 modules · adhar-kit-batch is optional · no test-commons, no maven-plugin"]}
      tone="primary"
    />
    <line x1={380} y1={68} x2={380} y2={86} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
    <Box
      x={8}
      y={90}
      w={744}
      h={92}
      title="Require adhar-kit-commons (compile scope)"
      lines={[
        "ai · analytics · batch · cache · config · dapr · event-sourcing",
        "graphql · health · logging · maven-plugin · messaging · metrics",
        "notification · perf-profiler · persistence · resilience · rewrite",
      ]}
    />
    <Box
      x={8}
      y={194}
      w={366}
      h={56}
      title="commons is optional"
      lines={["docs · kubernetes · security · tracing"]}
      tone="muted"
    />
    <Box
      x={386}
      y={194}
      w={366}
      h={56}
      title="provided scope"
      lines={["test-commons → commons, batch"]}
      tone="muted"
    />
    <line x1={380} y1={254} x2={380} y2={272} stroke={C.strong} strokeWidth={1.5} markerEnd="url(#dk-arrow)" />
    <Box
      x={8}
      y={276}
      w={744}
      h={56}
      title="adhar-kit-commons"
      lines={["framework detection · AdharCloudEvent · DDD annotations · tenant and correlation context"]}
      tone="accent"
    />
    <Box
      x={8}
      y={344}
      w={744}
      h={44}
      title="No kit dependency: adhar-kit-core · adhar-kit-grpc"
      tone="muted"
    />
    <Caption x={8} y={410} weight={600} color={C.text}>
      Optional sibling edges (never resolved transitively)
    </Caption>
    <Caption x={8} y={428}>
      resilience → metrics · analytics → persistence, messaging · batch → logging
    </Caption>
    <Caption x={8} y={444}>
      cache, config, event-sourcing, messaging, notification, persistence, security → dapr
    </Caption>
  </Frame>
);

/* Building & Contributing: what each Maven phase enforces in the kit build. */
const BuildLifecycle = () => (
  <Pipeline
    label="The kit build by phase. validate runs the Maven Enforcer: Java 25 or later and Maven 3.8 or later. compile builds Java 25 sources with Lombok and keeps parameter names. test runs Surefire on *Test and *Tests classes with a five-minute per-test timeout. integration-test runs Failsafe on *IT classes in modules that bind it, with Docker for TestContainers. verify runs the JaCoCo check: 80 percent instruction coverage per module."
    caption="CI runs mvn verify -Djacoco.skip=true on JDK 25. Run the coverage gate locally before you merge."
    stages={[
      { name: "validate", detail: "maven-enforcer", guarantee: "Java 25+\nMaven 3.8+" },
      { name: "compile", detail: "Java 25 + Lombok", guarantee: "-parameters" },
      { name: "test", detail: "Surefire", guarantee: "*Test, *Tests\n5 m per-test timeout" },
      { name: "integration-test", detail: "Failsafe, opt-in", guarantee: "*IT, IT*, *ITCase\nneeds Docker" },
      { name: "verify", detail: "jacoco:check", guarantee: "80% instructions\nper module", tone: "accent" },
    ]}
  />
);

/* API Docs: the spec-first path from a written contract to Swagger UI. */
const DocsSpecFirst = () => (
  <Flow
    label="Spec-first API documentation. You write api/v1/openapi.yaml. The adhar:openapi-lint goal checks it at validate; adhar:openapi generates the <basePackage>.api.v1 interfaces and models and copies the spec into the jar. adhar-kit-commons serves it at GET /api/v1/openapi.yaml, and adhar-kit-docs points Swagger UI at it through ShippedSpecSwaggerUi."
    caption="springdoc's /v3/api-docs, derived from the code, stays available for tools."
    nodes={[
      { title: "api/v1/openapi.yaml", lines: ["the contract you write"], tone: "primary" },
      { title: "adhar:openapi-lint", lines: ["validate phase"] },
      { title: "adhar:openapi", lines: ["<basePackage>.api.v1", "spec copied into the jar"] },
      { title: "GET /api/v1/openapi.yaml", lines: ["adhar-kit-commons"] },
      { title: "Swagger UI", lines: ["ShippedSpecSwaggerUi", "adhar-kit-docs"], tone: "accent" },
    ]}
    edges={[{}, {}, {}, {}]}
    gap={34}
  />
);

/* Test Commons: what @AdharIntegrationTest does before your test runs. */
const TestContainers = () => (
  <Flow
    label="@AdharIntegrationTest lists containers such as POSTGRES and KAFKA. AdharKitExtension starts each one once per JVM through TestContainerRegistry, publishes its connection details as Spring properties such as spring.datasource.url and spring.kafka.bootstrap-servers, the @SpringBootTest context binds to them, and your test reads them through @ContainerProperty fields or ContainerConnectionInfo."
    caption="Containers start before the Spring context, so the context binds to them with no @DynamicPropertySource in your test."
    nodes={[
      { title: "@AdharIntegrationTest", lines: ["POSTGRES, KAFKA, …"], tone: "primary" },
      { title: "AdharKitExtension", lines: ["starts each container", "once per JVM"] },
      { title: "Spring properties", lines: ["spring.datasource.url", "spring.kafka.bootstrap-servers"] },
      { title: "@SpringBootTest", lines: ["context binds to", "the containers"] },
      { title: "your test", lines: ["@ContainerProperty", "ContainerConnectionInfo"], tone: "accent" },
    ]}
    edges={[{}, {}, {}, {}]}
    gap={34}
  />
);

/* Rewrite: the two ways to use the recipes. */
const RewritePaths = () => (
  <Split
    label="Two ways to use adhar-kit-rewrite. At build time, add it as a dependency of the OpenRewrite Maven plugin, name a recipe, and run rewrite:dryRun to get a patch or rewrite:run to change the sources. In code, RewriteFacade's dryRun and apply write a rewrite.yml and return the Maven command, runInProcess runs recipes on in-memory sources and returns a RewriteImpactReport with per-file diffs, and validateCatalog lists recipe names that do not resolve."
    width={760}
    left={{
      heading: "Build time: rewrite-maven-plugin",
      tone: "primary",
      items: [
        "Add adhar-kit-rewrite as a plugin dependency",
        "Name a recipe class or FullModernization",
        "rewrite:dryRun writes a patch, changes nothing",
        "rewrite:run applies the changes",
      ],
      note: "Upstream recipes need their own artifact on the plugin",
    }}
    right={{
      heading: "In code: RewriteFacade",
      tone: "accent",
      items: [
        "dryRun / apply: write rewrite.yml + the command",
        "runInProcess: run recipes on in-memory sources",
        "Impact report: per-file diffs, Markdown or JSON",
        "validateCatalog: list names that do not resolve",
      ],
      note: "adhar.getRewrite() needs adhar.kit.modules.rewrite=true",
    }}
  />
);

export const rw_kit_a: Record<string, ComponentType> = {
  "nka-quickstart-flow": QuickstartFlow,
  "nka-spring-wiring": SpringWiring,
  "nka-two-switches": TwoSwitches,
  "nka-framework-adapters": FrameworkAdapters,
  "nka-module-dependencies": ModuleDependencies,
  "nka-build-lifecycle": BuildLifecycle,
  "nka-docs-spec-first": DocsSpecFirst,
  "nka-test-containers": TestContainers,
  "nka-rewrite-paths": RewritePaths,
};
