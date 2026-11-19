import type { ComponentType } from "react";
import { Flow, Ladder, Pipeline, Split, Stack } from "@/components/docs/diagram-kit";

/** Adhar Kit docs diagrams. Every key is prefixed "nkb-". */
export const rw_kit_b: Record<string, ComponentType> = {

  /* ---------------- modules/ai ---------------- */

  "nkb-ai-pipeline": () => (
    <Ladder
      width={760}
      boxW={250}
      heading={["Step", "What happens"]}
      label="AiServiceImpl.chat runs one pipeline for the facade, @AiChat methods and POST /api/v1/ai/chat: the ai-chat response cache is checked first, then request validation, the per-JVM rate limiter, the guardrail chain, the blocking ChatModel call, response PII redaction, and finally token and cost metrics."
      caption="A cache hit returns before validation, rate limiting and guardrails run."
      rungs={[
        {
          name: "AiServiceImpl.chat()",
          detail: "facade | @AiChat | REST",
          adds: ["All three entry points end here (facade only after connect())"],
          tone: "primary",
        },
        {
          name: "@Cacheable \"ai-chat\"",
          detail: "key: message + model",
          adds: ["Hit returns at once; skipped when sessionId is set"],
        },
        {
          name: "validateRequest",
          adds: ["Blank, >10,000 chars, or model not allowed → ValidationException"],
        },
        {
          name: "AiRateLimiter",
          detail: "userId | tenantId | anonymous",
          adds: ["Minute / hour / day counters, per JVM → RATE_LIMIT_EXCEEDED"],
        },
        {
          name: "GuardrailChain",
          detail: "content-safety, pii, sensitive",
          adds: ["Plus any Guardrail beans you add, in @Order"],
        },
        {
          name: "ChatModel.call(prompt)",
          adds: ["Spring AI provider; failures → ServiceException AI_CHAT_ERROR"],
        },
        {
          name: "sanitizeContent",
          adds: ["Emails, SSNs, cards, phones in the answer → [EMAIL_REDACTED] …"],
        },
        {
          name: "AiMetricsCollector",
          adds: ["ai.chat.requests, ai.chat.response.time, estimated cost"],
          tone: "accent",
        },
      ]}
    />
  ),

  "nkb-ai-wiring": () => (
    <Split
      width={760}
      label="What adhar-kit-ai registers on its own versus what needs a component scan. AiAutoConfiguration registers AiFacade, the four annotation aspects, the prompt template registry, the tool-calling service and the guardrail chain. AiServiceImpl, AiConfiguration, the rate limiter, the security validator, the metrics collector and the REST controller are plain stereotype classes that exist only when your component scan reaches them or you import them."
      caption="Without the right-hand beans, AiFacade stays on its no-op provider and @AiChat methods run their own bodies."
      left={{
        heading: "AiAutoConfiguration",
        tone: "primary",
        items: [
          "AiFacade + AiFacadeInitializer",
          "@AiChat, @AiEmbedding, @AiCache aspects",
          "@AiMetrics aspect (needs MeterRegistry)",
          "PromptTemplateRegistry (ai/prompts/*.txt)",
          "ToolCallingService (needs a ChatModel)",
          "Guardrails + GuardrailChain",
        ],
      }}
      right={{
        heading: "Only when scanned or imported",
        tone: "accent",
        items: [
          "AiServiceImpl (Chat/EmbeddingModel, VectorStore)",
          "AiConfiguration: ai-chat cache, aiTaskExecutor",
          "AiRateLimiter, AiSecurityValidator",
          "AiMetricsCollector",
          "AiController: /api/v1/ai/*",
        ],
      }}
    />
  ),

  /* ---------------- modules/analytics ---------------- */

  "nkb-analytics-pipeline": () => (
    <Flow
      label="An analytics call such as track or identify passes the consent gateway, which drops opted-out ids, then the PII scrubber, then the bounded batching queue, and is finally posted by OkHttpPostHogClient to PostHog's /batch/ endpoint. The client logs HTTP and network errors instead of throwing them."
      caption="Every step returns quietly on failure; nothing reaches your request path as an exception."
      nodes={[
        { title: "track()", lines: ["identify, alias,", "group, pageview"], tone: "primary" },
        { title: "ConsentGateway", lines: ["opted-out id", "→ dropped"] },
        { title: "PiiScrubber", lines: ["redacted keys,", "exact-match patterns"] },
        { title: "BatchingEventSender", lines: ["bounded queue", "DROP_OLDEST | BLOCK"] },
        { title: "PostHog", lines: ["POST /batch/", "errors logged"], tone: "accent" },
      ]}
      edges={[{}, {}, { label: "enqueue" }, { label: "flush" }]}
    />
  ),

  "nkb-analytics-flags": () => (
    <Flow
      label="isFeatureEnabled(userId, flagKey) first checks the in-memory flag cache. On a miss it calls PostHog's /decide endpoint synchronously on the calling thread and caches every returned flag for that user for the configured TTL. A missing flag, a failed call or any error returns false."
      caption="A failed /decide is cached as 'off' for the TTL, so flags fail closed."
      nodes={[
        { title: "isFeatureEnabled", lines: ["(userId, flagKey)"], tone: "primary" },
        { title: "FeatureFlagCache", lines: ["per user + flag", "TTL 60 s default"] },
        { title: "POST /decide/?v=3", lines: ["on the caller", "all flags for user"] },
        { title: "boolean", lines: ["missing or error", "→ false"], tone: "accent" },
      ]}
      edges={[{}, { label: "miss" }, { label: "cache all" }]}
    />
  ),


  /* modules/cache: the two caching paths */
  "nkb-cache-paths": () => (
    <Split
      label="Two caching paths in adhar-kit-cache. Left: the Adhar annotations run as aspects over the Caffeine CacheManager; @MultiLevelCache adds a SecondLevelCache L2 chosen as your bean, then Dapr, then Redis, then in-memory; CacheMetricsBinder publishes adhar.cache meters. Right: Spring's own @Cacheable goes through the Spring CacheManager the module registers: DaprCacheManager when adhar.cache.provider is dapr, RedisCacheManager when a Redis connection exists, KafkaCacheManager when adhar.cache.kafka.enabled is true; your own CacheManager bean always wins."
      caption="The two paths share nothing except the Redis or Dapr store an L2 may point at."
      left={{
        heading: "Adhar annotations",
        tone: "primary",
        items: [
          "@Cacheable, @CacheLock, @MultiLevelCache, ...",
          "Aspects over CacheManager (Caffeine L1)",
          "@MultiLevelCache L2: SecondLevelCache bean",
          "your bean > Dapr > Redis > in-memory",
          "adhar.cache.* meters via CacheMetricsBinder",
        ],
        note: "Needs aspectjweaver; adhar.cache.aspects.enabled",
      }}
      right={{
        heading: "Spring @Cacheable",
        tone: "accent",
        items: [
          "org.springframework.cache.annotation",
          "Spring CacheManager registered by the module",
          "provider=dapr: DaprCacheManager",
          "Redis connection: RedisCacheManager",
          "kafka.enabled=true: KafkaCacheManager",
        ],
        note: "Your own CacheManager bean always wins",
      }}
    />
  ),

  /* modules/cache: @MultiLevelCache read path */
  "nkb-cache-multilevel": () => (
    <Flow
      label="@MultiLevelCache read path: the SpEL key is looked up in the Caffeine L1 cache; on a miss the SecondLevelCache L2 is checked; on a second miss the annotated method runs. An L2 hit is copied into L1; a loaded value is written to L1, and to L2 when writeThrough is true."
      caption="An L2 hit is promoted into L1. A loaded value goes to L1, and to L2 when writeThrough is true."
      nodes={[
        { title: "@MultiLevelCache", lines: ["key = SpEL"], tone: "primary" },
        { title: "L1 Caffeine", lines: ["CacheManager", "l1Ttl (minutes)"] },
        { title: "L2", lines: ["SecondLevelCache", "l2Ttl (minutes)"] },
        { title: "your method", lines: ["runs on a miss"], tone: "accent" },
      ]}
      edges={[{ label: "get" }, { label: "miss" }, { label: "miss" }]}
    />
  ),

  /* modules/config: source priority stack */
  "nkb-config-sources": () => (
    <Stack
      label="ConfigManager sources by default priority, highest first: EnvironmentConfigSource at 200, DaprSecretConfigSource at 160, DaprConfigSource at 150, sources declared under adhar.config.sources with a default priority of 100, and ConfigSource beans at their own priority. They are merged into one map, and PropertyEncryptor decrypts ENC values on each read."
      caption="Sources are applied lowest priority first, so the highest-priority source that defines a key wins."
      layers={[
        { id: "200", name: "EnvironmentConfigSource", items: "System.getenv(): DATABASE_URL -> database.url", tone: "primary" },
        { id: "160", name: "DaprSecretConfigSource", items: "adhar.config.dapr.secret-store (needs adhar.dapr.enabled=true)" },
        { id: "150", name: "DaprConfigSource", items: "adhar.config.dapr.config-store, keys, subscribe" },
        { id: "100", name: "Declared sources", items: "adhar.config.sources.<name>: file, vault, consul, configmap" },
        { id: "any", name: "ConfigSource beans", items: "their own getPriority(); interface default 100" },
        { name: "ConfigManager merged map, then PropertyEncryptor", items: "key-level merge; ENC(...) decrypted on every read", tone: "accent" },
      ]}
    />
  ),


  "nkb-commons-request": () => (
    <Flow
      label="The adhar-kit-commons request path on Spring MVC. CorrelationIdFilter reads or generates X-Correlation-ID and X-Request-ID and puts them in CorrelationContext and the MDC. TenantContextFilter reads X-Tenant-ID into TenantContext and the MDC. ApiVersionHeaderFilter sets API-Version on /api/v<major> paths and rejects a contradicting request header. The controller and any @Idempotent bean run. Exceptions go to SpringGlobalExceptionHandler, which builds an ErrorResponse, and ProblemDetailsResponseAdvice rewrites it as application/problem+json on /api/v<major> paths."
      caption="Both context filters clear their thread-locals and MDC keys in a finally block."
      nodes={[
        { title: "Correlation filter", lines: ["X-Correlation-ID", "X-Request-ID", "-> context + MDC"], tone: "primary" },
        { title: "Tenant filter", lines: ["X-Tenant-ID", "-> TenantContext", "+ MDC tenantId"] },
        { title: "Version filter", lines: ["/api/v<major> only", "sets API-Version"] },
        { title: "Your code", lines: ["controller", "@Idempotent beans"] },
        { title: "Exception handler", lines: ["exception ->", "ErrorResponse"] },
        { title: "Problem details", lines: ["problem+json on", "/api/v<major>"], tone: "accent" },
      ]}
      edges={[{}, {}, {}, { label: "throws", dashed: true }, {}]}
    />
  ),

  "nkb-core-layers": () => (
    <Split
      label="What adhar-kit-core gives you with and without Spring Boot. With Spring Boot, CoreAutoConfiguration publishes the adharCoreAsyncExecutor, an ObjectMapper, a CoreFacade bean and the @Retry, @Memoize and @Async aspects. In any JVM, the static utilities and value types work with no container: CoreFacade.getInstance, Result, Either, Try, Specification, RetryUtil, AsyncUtil, Memoizer, Lazy, SnowflakeIdGenerator and ContextPropagatingExecutor."
      caption="The Spring CoreFacade bean and CoreFacade.getInstance() are two different objects."
      left={{
        heading: "Spring Boot — CoreAutoConfiguration",
        tone: "primary",
        items: [
          "adharCoreAsyncExecutor (bounded pool)",
          "ObjectMapper with JavaTimeModule",
          "CoreFacade bean",
          "@Retry, @Memoize, @Async aspects",
        ],
        note: "adhar.core.enabled / adhar.core.aspects.enabled",
      }}
      right={{
        heading: "Any JVM — no container",
        items: [
          "CoreFacade.getInstance()",
          "Result, Either, Try, Specification",
          "RetryUtil, AsyncUtil, Memoizer, Lazy",
          "SnowflakeIdGenerator",
          "ContextPropagatingExecutor",
        ],
        note: "Plain static utilities and value types",
      }}
    />
  ),

  "nkb-core-context-executor": () => (
    <Flow
      label="How ContextPropagatingExecutor carries context across a thread hop. On submit, the caller thread captures every registered ContextSnapshot. The task waits in the delegate pool's queue. On the worker thread the snapshots are restored, the task runs, and every snapshot is reset in a finally block. The default registry holds only MdcContextSnapshot."
      caption="By default only the SLF4J MDC travels; plain thread-locals need their own ContextSnapshot."
      nodes={[
        { title: "Caller thread", lines: ["submit(task)", "captureAll()"], tone: "primary" },
        { title: "Delegate pool", lines: ["queue / worker"] },
        { title: "Worker thread", lines: ["restoreAll()"] },
        { title: "Task runs", lines: ["MDC present"] },
        { title: "finally", lines: ["resetAll()", "MDC.clear()"], tone: "accent" },
      ]}
    />
  ),


  /* ---------------- modules/dapr ---------------- */

  "nkb-dapr-flow": () => (
    <Flow
      label="Application code and the Dapr annotations call DaprFacade, which records an adhar.dapr observation, applies a circuit breaker per target app id and raises DaprError on failure. The facade hands the call to a backend: in sidecar mode the SDK client and HTTP client reach the local daprd sidecar on port 3500 HTTP or 50001 gRPC, which resolves named components such as statestore, pubsub and secretstore; in memory mode the backend keeps everything inside the JVM."
      caption="In memory mode the call stops at the backend: nothing leaves the JVM."
      nodes={[
        { title: "your code", lines: ["DaprFacade calls", "@DaprState, @DaprPublish", "@DaprSubscribe handlers"], tone: "primary" },
        { title: "DaprFacade", lines: ["observation adhar.dapr", "breaker per app id", "DaprError on failure"] },
        { title: "backend", lines: ["sidecar: SDK + HTTP", "memory: in-process"] },
        { title: "daprd sidecar", lines: [":3500 HTTP", ":50001 gRPC"] },
        { title: "components", lines: ["statestore, pubsub", "secretstore, configstore", "lockstore"], tone: "accent" },
      ]}
      edges={[{ label: "call" }, {}, { label: "sidecar mode", tone: "primary" }, { label: "by name" }]}
    />
  ),

  "nkb-dapr-modes": () => (
    <Split
      label="adhar.dapr.mode auto picks sidecar mode when DAPR_HTTP_PORT, DAPR_HTTP_ENDPOINT or adhar.dapr.dapr-http-port is set, and memory mode otherwise. Sidecar mode builds one SDK client, waits for the sidecar at startup and supports every building block. Memory mode builds no client, keeps state, cache, pub/sub, locks, configuration and secrets in the JVM, and fails invocation, bindings, jobs, actors, crypto and workflows with DaprError."
      caption="mode: auto picks the left column when the injector has set DAPR_HTTP_PORT."
      left={{
        heading: "sidecar mode",
        tone: "primary",
        items: [
          "DAPR_HTTP_PORT or DAPR_HTTP_ENDPOINT set",
          "one SDK client bean (DaprClientImpl)",
          "waits for /v1.0/healthz/outbound",
          "every building block",
        ],
      }}
      right={{
        heading: "memory mode",
        items: [
          "no sidecar configured",
          "no SDK client; one startup warning",
          "state, cache, pub/sub, lock, config, secrets",
          "invoke, bindings, jobs, actors: DaprError",
        ],
        note: "per process: not shared between replicas",
      }}
    />
  ),

  /* ---------------- modules/health ---------------- */

  "nkb-health-groups": () => (
    <Flow
      label="Indicators — your AdharHealthIndicator beans, the readinessGate, the non-critical memory check and the optional certificate and circuit-breaker checks — are registered with HealthRegistry. The registry runs a group's indicators in parallel with a 5 second wait, caches results for 10 seconds and aggregates them worst-of, or by weighted score, into the default, readiness, liveness and startup groups. Nothing reaches Actuator or Kubernetes probes until you bridge a group into an Actuator HealthIndicator."
      caption="The module has no /health endpoint: bridge a group into Actuator for probes to see it."
      nodes={[
        { title: "indicators", lines: ["your beans (default)", "readinessGate", "memory (non-critical)"], tone: "primary" },
        { title: "HealthRegistry", lines: ["parallel, 5 s wait", "TTL cache 10 s", "worst-of or weighted"] },
        { title: "groups", lines: ["default, readiness", "liveness, startup"] },
        { title: "your bridge", lines: ["Actuator HealthIndicator", "probe groups"], tone: "accent" },
      ]}
      edges={[{ label: "register" }, { label: "checkGroup" }, { label: "you wire", dashed: true }]}
    />
  ),


  "nkb-graphql-request-path": () => (
    <Pipeline
      label="A GraphQL request passes the WebGraphQlInterceptor beans (persisted queries, allow-list, cost rate limit, security gate), then graphql-java parses and validates it, then the depth and complexity limits run before execution; @auth is checked as each protected field is fetched, and DataLoaders batch keys once per request."
      caption="Rejections before execution cost a parse, never a resolver call. Interceptor order is not fixed."
      stages={[
        { name: "Interceptors", detail: "APQ · allow-list", guarantee: "rate limit\nsecurity gate" },
        { name: "Parse + validate", detail: "graphql-java", guarantee: "schema-valid\ndocument" },
        { name: "Pre-execution", detail: "depth · complexity", guarantee: "abort before\nany fetcher", tone: "primary" },
        { name: "Data fetchers", detail: "@auth per field", guarantee: "denied field\nis null" },
        { name: "DataLoader", detail: "per request", guarantee: "one batch\nper loader" },
      ]}
    />
  ),

};
