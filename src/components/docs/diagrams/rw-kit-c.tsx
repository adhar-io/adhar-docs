import type { ComponentType } from "react";
import { Flow, Ladder, Split } from "@/components/docs/diagram-kit";

/** Adhar Kit docs diagrams. Every key is prefixed "nkc-". */

/* ---- kubernetes ---- */
// KEY nkc-kubernetes-wiring = NkcKubernetesWiring
const NkcKubernetesWiring = () => (
  <Split
    label="KubernetesAutoConfiguration registers only the pieces that are safe anywhere: the graceful-shutdown readiness gate, the kubernetesReadiness and kubernetesLiveness health indicators, and CachedServiceDiscovery once a KubernetesClient bean exists. You declare the KubernetesClient, the deployment, ingress, autoscaler and monitoring services, and the three bean post-processors that act on the annotations."
    caption="Services, watches and leader election also open their own default Fabric8 client, so they ignore master-url."
    left={{
      heading: "Auto-configured",
      tone: "primary",
      items: [
        "GracefulShutdownHandler (readiness gate)",
        "kubernetesReadiness indicator (Actuator)",
        "kubernetesLiveness indicator (Actuator)",
        "CachedServiceDiscovery (needs a client bean)",
      ],
      note: "Safe outside a cluster",
    }}
    right={{
      heading: "You declare",
      tone: "accent",
      items: [
        "KubernetesClient (master-url, namespace)",
        "Deployment / Ingress / HPA / monitoring services",
        "LeaderElectedBeanPostProcessor",
        "KubernetesWatchBeanPostProcessor + watchers",
        "AutoScaleBeanPostProcessor",
      ],
      note: "Guard with a profile: construction needs a cluster",
    }}
  />
);

// KEY nkc-kubernetes-shutdown = NkcKubernetesShutdown
const NkcKubernetesShutdown = () => (
  <Flow
    label="On SIGTERM the context stops GracefulShutdownHandler first because it has the highest lifecycle phase. Readiness turns OUT_OF_SERVICE, the handler sleeps for pre-stop-drain-seconds while the pod keeps serving, and only then do the leader-election and other lifecycle beans stop and the context close."
    caption="The handler has the highest SmartLifecycle phase, so it stops before everything else."
    nodes={[
      { title: "SIGTERM", lines: ["context close"], tone: "muted" },
      { title: "readiness", lines: ["OUT_OF_SERVICE"], tone: "primary" },
      { title: "drain", lines: ["pre-stop-drain-seconds", "still serving"] },
      { title: "other beans stop", lines: ["Leases released"] },
      { title: "exit", tone: "muted" },
    ]}
    edges={[{}, { label: "endpoints drop pod" }, {}, {}]}
  />
);

/* ---- logging ---- */
// KEY nkc-logging-paths = NkcLoggingPaths
const NkcLoggingPaths = () => (
  <Split
    label="Two output paths in adhar-kit-logging. Left: log statements and the @Loggable, @LogExecutionTime, @LogExceptions, @Audit and @LogMetrics aspects write straight to SLF4J and are masked by MaskingJsonEncoder in logback. Right: @BusinessEvent, @LogOperation, @TrackPerformance, @LogBatchJob, the typed event loggers and the REST API filter build AppLogEvents that AppLogEventPublisher enriches from the MDC, masks with LogDataMasker and hands to every AppLogEventSink."
    caption="Both paths end in the logback appenders from the bundled logback-spring.xml."
    left={{
      heading: "SLF4J path",
      items: [
        "log.info, LoggingFacade, AdharLogger",
        "@Loggable  @LogExecutionTime  @LogExceptions",
        "@Audit -> AUDIT.*   @LogMetrics -> METRICS.*",
        "masked in logback by MaskingJsonEncoder",
        "11 fixed keys, value always ********",
      ],
      note: "key=value and key: value pairs only",
    }}
    right={{
      heading: "Event path",
      tone: "primary",
      items: [
        "@BusinessEvent  @LogOperation  @TrackPerformance",
        "@LogBatchJob, typed loggers, REST API filter",
        "AppLogEventPublisher: enrich from MDC",
        "LogDataMasker: strategy, extra keys, patterns",
        "sinks -> Slf4jAppLogEventSink (ADHAR_EVENT.*)",
      ],
      note: "synchronous, on the calling thread",
    }}
  />
);

/* ---- maven-plugin ---- */
// KEY nkc-maven-plugin-phases = NkcMavenPluginPhases
const NkcMavenPluginPhases = () => (
  <Ladder
    label="Default lifecycle phase of each adhar-kit-maven-plugin goal. validate: openapi-lint, validate, version, deps, bom. generate-sources: openapi and generate. verify: openapi-diff and cve. deploy: release. No phase, run explicitly: scaffold, adr, catalog."
    caption="A goal runs in its phase only once it is listed in <executions>; adhar-kit-parent binds openapi-lint and openapi."
    heading={["Default phase", "Goals"]}
    boxW={196}
    rungs={[
      { name: "validate", tone: "primary", adds: ["adhar:openapi-lint · adhar:validate", "adhar:version · adhar:deps · adhar:bom"] },
      { name: "generate-sources", tone: "primary", adds: ["adhar:openapi → target/generated-sources/openapi", "adhar:generate → target/generated-sources/adhar"] },
      { name: "verify", tone: "primary", adds: ["adhar:openapi-diff (against a git revision or release)", "adhar:cve (Sonatype OSS Index)"] },
      { name: "deploy", tone: "primary", adds: ["adhar:release (version, changelog, tag, optional deploy)"] },
      { name: "none", detail: "run explicitly", tone: "muted", adds: ["adhar:scaffold · adhar:adr · adhar:catalog"] },
    ]}
  />
);

/* ---- messaging ---- */
// KEY nkc-messaging-pipeline = NkcMessagingPipeline
const NkcMessagingPipeline = () => (
  <Ladder
    label="MessagingFacade publishes through the selected MessagePublisher (Kafka, RabbitMQ or Dapr). On the consume side the MessageListener hands each message to an optional deduplication handler, then an optional retry handler, then your consumer; when retries are exhausted the dead-letter publisher sends the message to the topic plus .dlq."
    caption="Dedup and retry are added per subscription only when enabled; the DLQ step needs retry enabled and a publisher."
    heading={["Stage", "What it does"]}
    boxW={270}
    rungs={[
      {
        name: "publish(topic, key, payload)",
        detail: "MessagePublisher",
        adds: ["Kafka, RabbitMQ or Dapr - first match wins", "Blocks until sent; a failure logs WARN, does not throw"],
        tone: "primary",
      },
      {
        name: "MessageListener",
        detail: "subscribe(topic, group, type, fn)",
        adds: ["Kafka container, Rabbit queue or Dapr stream", "Your handler runs on the broker's consumer thread"],
      },
      {
        name: "DeduplicatingMessageHandler",
        detail: "common.dedup.enabled (off)",
        adds: ["Key: ce-id header, then messageId header", "Seen within ttl-ms: skipped and treated as success"],
      },
      {
        name: "RetryingMessageHandler",
        detail: "common.retry.enabled (on)",
        adds: ["Any exception retries, up to max-attempts", "Exponential backoff, slept on the consumer thread"],
      },
      {
        name: "Consumer<T>",
        detail: "your handler",
        adds: ["Must be idempotent: delivery is at-least-once at best"],
        tone: "accent",
      },
      {
        name: "DeadLetterPublisher",
        detail: "common.dlq.enabled (on)",
        adds: ["After the last attempt: publish to <topic>.dlq", "Adds x-dlq, x-dlq-attempts, x-dlq-exception-* headers"],
      },
    ]}
  />
);

/* ---- metrics ---- */
// KEY nkc-metrics-http-path = NkcMetricsHttpPath
const NkcMetricsHttpPath = () => (
  <Flow
    label="HttpMetricsFilter times each servlet request, resolves the uri tag from the handler pattern or a path normalised to {id}, passes it through TagCardinalityLimiter which admits the first max-uri-tags values and maps the rest to other, records the adhar.http.server.requests timer in the MeterRegistry alongside the annotation, facade and JVM meters, and the registry is scraped at /actuator/prometheus or pushed over OTLP."
    caption="The same limited uri feeds SloRecorder, which publishes error budget and burn rate per configured target."
    nodes={[
      { title: "HttpMetricsFilter", lines: ["times each request", "method, status, outcome"] },
      { title: "uri tag", lines: ["handler pattern,", "else path with {id}"] },
      { title: "TagCardinalityLimiter", lines: ["first max-uri-tags", "values, then other"] },
      { title: "MeterRegistry", lines: ["+ aspects, facade,", "JVM collectors"], tone: "primary" },
      { title: "Export", lines: ["/actuator/prometheus", "OTLP push (opt-in)"], tone: "accent" },
    ]}
    edges={[{ label: "path" }, { label: "value" }, { label: "timer" }, { label: "scrape / push" }]}
  />
);

/* ---- notification ---- */
// KEY nkc-notification-send = NkcNotificationSend
const NkcNotificationSend = () => (
  <Ladder
    label="DefaultNotificationService.send runs in a fixed order: it first picks the first channel whose supports(type) is true and throws UnsupportedOperationException if none does; then the opt-out, rate-limit and idempotency guards can each return early; then the channel sends, and a failure goes to the retry handler with exponential backoff; every delivery attempt outcome is written to history, and a CloudEvent only when a publisher is wired."
    caption="send() is synchronous; sendAsync() runs the same steps on the configured executor."
    heading={["Step", "What happens"]}
    rungs={[
      { name: "findChannel(type)", detail: "first supports(type)", adds: ["No match: UnsupportedOperationException,", "thrown before any guard runs"], tone: "primary" },
      { name: "opt-out", detail: "NotificationPreferenceStore", adds: ["Opted out: return quietly, no history entry"] },
      { name: "rate limit", detail: "rate-limit.enabled only", adds: ["Over the window: return, failure entry", "\"Rate limit exceeded\""] },
      { name: "idempotency", detail: "metadata idempotencyKey", adds: ["Key seen within ttl-ms: return quietly"] },
      { name: "channel.send", detail: "email, webhook, SMS, ...", adds: ["Success: history entry, CloudEvent if a", "publisher is wired (none by default)"], tone: "accent" },
      { name: "retry handler", detail: "backoff-ms x 2^n", adds: ["Exhausted: failure entry, then", "RuntimeException to the caller"] },
    ]}
  />
);

/* ---- perf-profiler ---- */
// KEY nkc-perf-profiler-paths = NkcProfilerPaths
const NkcProfilerPaths = () => (
  <Ladder
    label="Path of a @Profiled call through ProfilingAspect: the sample-rate gate lets an unsampled call run with nothing recorded. A sampled call is timed with System.nanoTime and always records a Micrometer timer named adhar.profiler.<name>. A call over slowThresholdMs logs a warning and publishes a SlowCallEvent. If the method fits under max-tracked-methods, the call is recorded in the ProfilingRegistry, which keeps a rolling window with HdrHistogram percentiles and publishes a debounced SlowCallThresholdBreachedEvent on a p99 breach. The registry is what /actuator/profiling reads."
    heading={["step", "what it records"]}
    width={800}
    boxW={240}
    caption="ProfilerFacade.profile(...) skips the gate and the timer and writes only to its own registry."
    rungs={[
      { name: "@Profiled call", detail: "through the Spring proxy", adds: ["self-calls bypass the aspect: nothing recorded"], tone: "primary" },
      { name: "sample-rate gate", detail: "ThreadLocalRandom draw", adds: ["not sampled: method runs, nothing recorded"] },
      { name: "time the call", detail: "System.nanoTime", adds: ["Micrometer timer adhar.profiler.<name>", "tags class, method, success, error"] },
      { name: "slow check", detail: "slowThresholdMs, logSlow", adds: ["WARN log + SlowCallEvent, once per slow call"] },
      { name: "max-tracked-methods", detail: "cap on distinct keys", adds: ["over the cap: timer only, no registry entry"] },
      { name: "ProfilingRegistry", detail: "rolling window, HdrHistogram", adds: ["avg/min/max/p95/p99 in whole ms", "p99 breach: SlowCallThresholdBreachedEvent"], tone: "accent" },
    ]}
  />
);

/* ---- persistence ---- */
// KEY nkc-persistence-outbox-states = NkcPersistenceOutboxStates
const NkcPersistenceOutboxStates = () => (
  <Ladder
    label="Outbox row lifecycle: DomainEventOutboxBridge inserts a PENDING row before your transaction commits; OutboxPublisher fetches due PENDING or FAILED rows and calls OutboxRelay.relay; success marks the row PROCESSED, a failure marks it FAILED with a backed-off next_attempt_at, and reaching max-attempts marks it DEAD."
    caption="DEAD rows are never retried automatically. Reset status to PENDING to redrive."
    heading={["Row state", "What moves it"]}
    boxW={236}
    rungs={[
      { name: "PENDING", detail: "attempts=0, due now", adds: ["Inserted BEFORE_COMMIT, inside your transaction,", "by DomainEventOutboxBridge (or your own save)"], tone: "primary" },
      { name: "relay(event)", detail: "every poll-interval-ms", adds: ["OutboxPublisher fetches due PENDING/FAILED rows;", "success → PROCESSED (processed_at set)"], tone: "accent" },
      { name: "FAILED", detail: "attempts+1, last_error", adds: ["relay() threw; next_attempt_at = now +", "min(initial × multiplier^(attempts−1), max)"] },
      { name: "DEAD", detail: "attempts ≥ max-attempts", adds: ["Logged at ERROR; no automatic redrive"], tone: "muted" },
    ]}
  />
);

/* ---- resilience ---- */
// KEY nkc-resilience-chain = NkcResilienceChain
const NkcResilienceChain = () => (
  <Ladder
    label="ResilienceAspect wraps an annotated method in one fixed decorator chain: Retry outermost, then CircuitBreaker, RateLimit, TimeLimiter and Bulkhead innermost, with the optional ChaosPolicy applied just before the method body. Only when the whole chain has failed does the caller get the fallbackMethod result, else a cached last good result, else the original exception."
    caption="One fallback for the whole chain; it runs after retries are exhausted, not on each failed attempt."
    heading={["Decorator", "What it does in this position"]}
    rungs={[
      {
        name: "caller",
        adds: ["on final failure: fallbackMethod,", "else FallbackCache, else rethrow"],
        tone: "primary",
      },
      { name: "@Retry", adds: ["outermost: re-runs everything below"] },
      { name: "@CircuitBreaker", adds: ["records every attempt; fails fast when OPEN"] },
      { name: "@RateLimit", adds: ["takes a permit only for calls the breaker let through"] },
      { name: "@TimeLimiter", adds: ["deadline for one attempt, starts after the permit"] },
      { name: "@Bulkhead", adds: ["innermost: semaphore permit held for one attempt"] },
      {
        name: "your method",
        detail: "+ ChaosPolicy, if enabled",
        adds: ["runs once per attempt"],
        tone: "accent",
      },
    ]}
  />
);

/* ---- security ---- */
// KEY nkc-security-layers = NkcSecurityLayers
const NkcSecurityLayers = () => (
  <Flow
    label="A request passes the opt-in servlet filters (rate limiting, API key), then the stateless SecurityFilterChain that decodes the JWT and applies URL rules ending in anyRequest().authenticated(), then AccessControlAspect checks @RequiresRole and @RequiresPermission before your method runs."
    caption="Each layer can stop the request: filters with 429/401, the chain with 401/403, the aspect with AccessDeniedException."
    nodes={[
      { title: "request" },
      { title: "servlet filters", lines: ["RateLimitingFilter", "ApiKeyAuthentication", "both opt-in"] },
      { title: "SecurityFilterChain", lines: ["STATELESS, JWT decode", "URL rules, then", "anyRequest().authenticated()"], tone: "primary" },
      { title: "AccessControlAspect", lines: ["@RequiresRole", "@RequiresPermission"] },
      { title: "your method", tone: "accent" },
    ]}
    edges={[{}, {}, { label: "SecurityContext" }, {}]}
  />
);

/* ---- tracing ---- */
// KEY nkc-tracing-pipeline = NkcTracingPipeline
const NkcTracingPipeline = () => (
  <Flow
    label="Spans come from Spring Boot observations (HTTP, Kafka, RabbitMQ, JDBC), the TracingAspect annotations and the AdharTracing or TracingFacade API. The OpenTelemetry SDK sampler records them by probability, or always in tail mode. In tail mode TailSamplingSpanProcessor keeps traces with an error, a slow root or a random draw. Kept spans go through a BatchSpanProcessor to the OTLP, Zipkin or Jaeger exporter. SpanMetricsProcessor sees every recorded span."
    caption="SpanMetricsProcessor sits beside the export path and sees every recorded span, kept or not (span.duration, span.errors)."
    nodes={[
      { title: "Span sources", lines: ["Boot observations", "@NewSpan aspect", "AdharTracing API"], tone: "primary" },
      { title: "Sampler", lines: ["ratio: probability", "tail: alwaysOn"] },
      { title: "Tail sampling", lines: ["mode=tail only", "error · latency · rate"], tone: "muted" },
      { title: "BatchSpanProcessor", lines: ["512 spans / 5 s"] },
      { title: "Exporter", lines: ["OTLP gRPC or HTTP", "Zipkin · Jaeger"], tone: "accent" },
    ]}
    edges={[{ label: "record" }, { label: "buffer" }, { label: "keep" }, { label: "export", tone: "primary" }]}
  />
);

export const rw_kit_c: Record<string, ComponentType> = {
  "nkc-logging-paths": NkcLoggingPaths,
  "nkc-kubernetes-wiring": NkcKubernetesWiring,
  "nkc-kubernetes-shutdown": NkcKubernetesShutdown,
  "nkc-maven-plugin-phases": NkcMavenPluginPhases,
  "nkc-messaging-pipeline": NkcMessagingPipeline,
  "nkc-notification-send": NkcNotificationSend,
  "nkc-perf-profiler-paths": NkcProfilerPaths,
  "nkc-metrics-http-path": NkcMetricsHttpPath,
  "nkc-persistence-outbox-states": NkcPersistenceOutboxStates,
  "nkc-security-layers": NkcSecurityLayers,
  "nkc-tracing-pipeline": NkcTracingPipeline,
  "nkc-resilience-chain": NkcResilienceChain,
};
