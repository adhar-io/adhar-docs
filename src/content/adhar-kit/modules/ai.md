---
title: "AI"
section: "Modules"
order: 28
path: "/adhar-kit/modules/ai"
---

# AI

`adhar-kit-ai` is a unified, multi-provider AI/LLM interface — chat, embeddings, RAG, image generation, vision, function calling, and streaming — built on Spring AI. Its reason to exist is that **a bare `ChatModel` call has no budget ceiling, no PII guard, no cache, and no cost accounting**; every team that ships one ends up writing the same wrapper. This module is that wrapper, and it applies identically whether you call the facade, the REST endpoint, or an annotated method.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-ai` |
| Built on | Spring AI 2.0 (`spring-ai-starter-model-openai` / `-ollama` / `-anthropic`, `spring-ai-vector-store`), Micrometer, Caffeine, AspectJ |
| Entry points | `AiFacade` (via `adhar.getAi()`), the Spring-managed `AiService`, `/api/v1/ai/*` |
| Annotations | `@AiChat`, `@AiEmbedding`, `@AiCache`, `@AiMetrics`, `@AiRag`, `@AiVision`, `@AiImageGeneration`, `@AiFunction` |
| Auto-configured | `AiAutoConfiguration` only — the service layer needs component scanning (see below) |
| Use it when | You want provider-portable LLM calls with guardrails, rate limiting, caching, and cost tracking already wired |

## How it works

There is one pipeline and three ways in. `AiServiceImpl` — the Spring bean behind the `com.adhar.kit.ai.service.AiService` interface — owns the pipeline; the REST controller, the `@AiChat` aspect, and `AiFacade` all route into it.

```diagram
kit-ai-pipeline
```

### The initialisation mechanism, exactly

`AiFacade` is a lazily-created singleton whose `provider` field starts as the private no-op `DefaultAiProvider`. In that state the facade is *constructed and reachable* — `getInstance()` works, `isAvailable()` returns `true`, `health()` reports `{"status": "not_configured"}` — but every generative call throws `UnsupportedOperationException("AI provider not configured")`. Three methods deliberately do not throw: `listModels()` returns an empty list, `countTokens(text)` returns `text.length() / 4`, and `estimateCost(text)` returns `0.0`. Prompt templates also work, because they live on the facade's own registry rather than on the provider.

At startup `AiFacadeInitializer.connect()` (a `@PostConstruct`) resolves the Spring-managed `AiService` through an `ObjectProvider`. If it is absent, the initializer logs *"No Spring AI chat service available; AiFacade left in graceful-degradation mode"* and returns. If present, it calls `facade.connect(service, embeddingModel, toolCallingService, promptRegistry)`, swapping in a `SpringServiceProvider` that delegates to `AiServiceImpl`.

> **The one thing to check first.** The auto-configuration registry lists only `AiAutoConfiguration`. `AiServiceImpl`, `AiConfiguration`, `AiRateLimiter`, `AiMetricsCollector`, `AiSecurityValidator` and `AiController` are plain `@Service`/`@Component`/`@Configuration` classes under `com.adhar.kit.ai.*`, so they become beans only when your component scan reaches that package. Adding the dependency alone gives you `AiFacade` and the aspects, but **no** `AiService`, no REST endpoints, and a facade stuck on the no-op provider. Add `@ComponentScan("com.adhar.kit.ai")` and a `spring-ai-starter-model-*` provider — `AiServiceImpl` also requires `ChatModel`, `EmbeddingModel` and `VectorStore` beans.

### The request pipeline

`AiServiceImpl.chat(request)` is annotated `@Cacheable(value = "ai-chat", key = "#request.message + '-' + #request.model", condition = "#request.sessionId == null")`, so the cache sits **outside** everything else:

1. **Response cache.** A hit returns immediately — skipping validation, guardrails and the rate limiter. The key is message plus model only: temperature, `maxTokens` and conversation history are *not* in it, so two requests differing only in system prompt collide. Set a `sessionId` to opt out.
2. **Validation.** A null or blank message, a message over 10,000 characters, or a model absent from `adhar.ai.security.allowed-models` each throw `ValidationException`.
3. **Rate limit.** `checkRateLimit(identifier)` keyed on `userId`, else `tenantId`, else the literal `"anonymous"`. Exceeding any of the minute/hour/day counters throws `ServiceException("RATE_LIMIT_EXCEEDED")` before a token is spent.
4. **Guardrails.** `AiSecurityValidator.validateRequest` runs the `GuardrailChain` when one is wired, falling back to its own inline checks otherwise.
5. **Model call.** `chatModel.call(prompt)` — blocking.
6. **Sanitize.** Emails, SSNs, card numbers and phone numbers in the response become `[EMAIL_REDACTED]` and friends.
7. **Metrics.** Token counts, duration, and — only when the provider returned usage metadata — estimated cost.

Three guardrail rejections surprise people, and all three are on by default:

- A prompt containing `password`, `secret`, `token`, `api_key`, `private_key`, `confidential`, `restricted` or `classified` as a case-insensitive substring throws `ValidationException("SENSITIVE_CONTENT")`. "Explain how OAuth tokens work" is rejected.
- A prompt matching an email, SSN, credit-card or phone pattern throws `ValidationException("PII_DETECTED")` — gated, confusingly, on `adhar.ai.security.validate-api-keys`. Set it to `false` to downgrade to a log warning.
- Prompts over 50,000 characters throw `ValidationException("CONTENT_TOO_LONG")`, a separate and looser bound than the 10,000-character validation limit.

Set `adhar.ai.security.enabled: false` to bypass the whole validator.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-ai</artifactId>
    <version>0.1.0</version>
</dependency>
```

Spring AI versions come from the `spring-ai-bom` (2.0.0) imported through `adhar-kit-bom`, so do not pin them yourself.

## Key APIs

`AiFacade` implements the `com.adhar.kit.ai.api.AiService` interface, so one type covers the whole surface:

- **Chat** — `chat(message)`, `chat(systemPrompt, message)`, `chatWithContext(history, message)`, `chat(ChatRequest)`, `chatAsync`, `chatStream(message, Consumer<String>)`.
- **Embeddings** — `embed`, `embedBatch` (which loops one call per text, so it is no cheaper than `embed`), `similarity`, `findSimilar`.
- **RAG** — `storeDocument`, `storeDocuments`, `queryDocuments(question, topK)` returning a `RagResponse` of `answer`, `sources`, `confidence`.
- **Tools** — `chatWithFunctions(message, functions)` returns a `FunctionCallResponse` whose `hasFunctionCalls()` says whether the model asked for a tool; `executeFunction(call)` runs one, bounded by `tools.max-iterations`.
- **Operational** — `registerPromptTemplate` / `renderPrompt` (usable before connect), `isAvailable()`, `getProvider()` (`"default"` before connect, `"spring-ai"` after), `health()`, `countTokens`, `estimateCost`.

> **Not everything survives `connect()`.** The `SpringServiceProvider` adapter still throws `UnsupportedOperationException` for `generateImage`, `analyzeImage`, `deleteDocument` and `useModel` — the Spring service has no equivalent. Pick the model per request instead of calling `useModel`. `findSimilar` additionally throws when no `EmbeddingModel` bean was supplied to `connect`.

`AdharFacade` exposes `adhar.chat("message")` and `adhar.chat("system prompt", "message")`. REST endpoints under `/api/v1/ai`: `POST /chat`, `/chat/async`, `/chat/stream` (SSE), `/embed`, `/search`, `/rag/chat`, `/rag/documents`, plus `GET /models` and `GET /health`.

## Worked example — a budgeted summariser

A complete service: it names the caller so the rate limiter keys per user rather than lumping everyone into `"anonymous"`, respects the 10,000-character validation bound, and degrades instead of failing the request.

```java
import com.adhar.kit.ai.model.AiChatRequest;
import com.adhar.kit.ai.model.AiChatResponse;
import com.adhar.kit.ai.service.AiService;
import com.adhar.kit.commons.exception.ServiceException;
import com.adhar.kit.commons.exception.ValidationException;
import org.springframework.stereotype.Service;

@Service
public class ArticleSummariser {

    private static final int MAX_PROMPT_CHARS = 9_000;

    private final AiService ai;

    public ArticleSummariser(AiService ai) {   // requires @ComponentScan("com.adhar.kit.ai")
        this.ai = ai;
    }

    public Summary summarise(String userId, String tenantId, Article article) {
        String body = article.body().length() > MAX_PROMPT_CHARS
                ? article.body().substring(0, MAX_PROMPT_CHARS)
                : article.body();

        AiChatRequest request = AiChatRequest.builder()
                .message("Summarise in three bullet points:\n" + body)
                .userId(userId)        // rate-limit key; without it everyone shares "anonymous"
                .tenantId(tenantId)
                .model("gpt-4")        // must appear in adhar.ai.security.allowed-models
                .build();

        try {
            AiChatResponse response = ai.chat(request);
            var usage = response.getUsage();
            long tokens = usage != null && usage.getTotalTokens() != null ? usage.getTotalTokens() : 0L;
            return new Summary(response.getContent(), tokens, false);

        } catch (ValidationException e) {
            // Guardrail rejection: PII, a sensitive keyword, an over-long or
            // disallowed prompt. Not retryable — the prompt is the problem.
            return Summary.degraded(article);

        } catch (ServiceException e) {
            // RATE_LIMIT_EXCEEDED, or AI_CHAT_ERROR for anything the provider did wrong.
            return Summary.degraded(article);
        }
    }

    public record Summary(String text, long tokensUsed, boolean degraded) {
        static Summary degraded(Article a) { return new Summary(a.firstParagraph(), 0L, true); }
    }
}
```

Note the exception vocabulary: connection refused, a vendor 429, and a read timeout all arrive as `ServiceException("AI_CHAT_ERROR", "Failed to process chat request", cause)`, so inspect `getCause()` if you need to tell them apart.

## Worked example — declarative methods

`@AiChat` turns a method into an LLM call: the aspect substitutes `{param}` placeholders from the method's parameter names and returns the model's answer in place of the body. Nested paths such as `{order.customer.name}` resolve through JavaBean getters; an unresolvable placeholder becomes an empty string rather than an error.

```java
@Service
public class ReviewService {

    @AiChat(
        systemPrompt = "You are an expert code reviewer. Reply in markdown.",
        prompt = "Review this {language} code:\n{code}",
        temperature = 0.3,
        maxTokens = 1000,
        model = "gpt-4",
        stopSequences = {"END-OF-REVIEW"})
    @AiCache(ttl = 1800, cacheName = "code-review", excludeParams = {"requestId"})
    @AiMetrics(metricName = "review.code", latencyAlertThreshold = 8000)
    public String reviewCode(String language, String code, String requestId) { return null; }
}
```

### How the interception works

`AiChatAspect` is an `@Around("@annotation(aiChat)")` advice registered by `AiAutoConfiguration` when `adhar.ai.annotations.enabled` is not `false`. (`AiProperties` also declares per-annotation flags such as `ai-chat-enabled`, but nothing reads them — the single `annotations.enabled` switch is the real gate.) It resolves the `AiService` through an `ObjectProvider`, lazily, because that bean exists only once the service layer is scanned and a `ChatModel` is configured.

Two consequences follow, and both surprise people:

1. **With no `AiService` bean the aspect calls `joinPoint.proceed()`.** Your method body runs instead, and a startup warning is logged. If the body is `return null`, the method silently returns `null`. Treat a `null` from an `@AiChat` method as "no provider", not "the model said nothing".
2. **Self-invocation bypasses the aspect entirely.** Spring AOP works through a proxy, so `this.reviewCode(...)` from inside `ReviewService` runs the raw body — no prompt, no model call, no cache, no metrics, no error. Call annotated methods from another bean, or inject a self-reference. The same caveat applies to `@AiCache`, `@AiMetrics` and `@AiEmbedding`.

Aspect order runs `@AiMetrics` (`@Order(10)`) outermost, then `@AiCache` (`@Order(50)`), then `@AiChat` (`@Order(100)`) — so a cache hit is still timed and counted.

`AiCacheAspect` keeps one Caffeine cache per `cacheName`, sized by `maxEntries` and expired by `ttl` from the annotation; `null` results are never cached. When `adhar.ai.caching.semantic.enabled` is true *and* exactly one `EmbeddingModel` bean exists (resolved with `getIfUnique`, so two model starters silently disable the semantic path), an exact-hash miss additionally scans a bounded LRU of recent embeddings for a cosine match at or above `similarity-threshold`.

`AiMetricsAspect` records `<metricName>.latency` and `<metricName>.total` (default base name `ai.operation`) and logs an alert when `latencyAlertThreshold` is exceeded. Despite the annotation's `trackTokens` and `trackCost` attributes, this aspect records neither — token and cost accounting happens inside `AiServiceImpl`.

## How it behaves

**Thread safety and concurrency.** `AiFacade` is a singleton whose `provider`, `promptRegistry` and `available` fields are `volatile`, so `connect()` publishes safely to concurrent readers; `AiServiceImpl`, `AiRateLimiter`, `AiMetricsCollector` and `AiSecurityValidator` are stateless-or-concurrent singletons, safe to share. There is no global queue and no ordering guarantee — concurrent callers go straight to the provider, bounded only by the rate limiter and the Spring AI starter's connection pool. The module defines an `aiTaskExecutor` bean (`ThreadPoolTaskExecutor`, core 5, max 20, queue 100, prefix `ai-async-`, `CallerRunsPolicy`), so when both pool and queue saturate, async work runs on the calling thread rather than being rejected.

**Streaming versus blocking.** Both exist, and they are not equivalent. `chatStream` runs validation and guardrails, then returns `chatModel.stream(prompt)` mapped to chunks. It is **not** cached, its chunks are **not** passed through `sanitizeContent`, and on completion it records a chat request with a token count of `0` — so streamed traffic contributes nothing to the `ai.tokens.total` or `ai.cost.total.usd` gauges. If budget accounting matters, use the blocking path.

**Rate limiting is in-process.** `AiRateLimiter` holds a `ConcurrentHashMap<identifier, counters>` in heap, with three independently-reset windows. Two consequences: quotas are per JVM, so a three-replica deployment admits three times `requests-per-minute`; and the map has no eviction, so one entry accumulates per distinct id for the life of the process. Key by tenant rather than user if your user cardinality is large.

**Failure behaviour.** The provider being unreachable surfaces as `ServiceException("AI_CHAT_ERROR")` from the service, `AiFacade.AiException` from the facade, and `RuntimeException("AI chat failed: ...")` from the `@AiChat` aspect — in every case after an `ai.errors` counter is incremented. There is no retry, circuit breaker or fallback here; `adhar.ai.max-retries` is bound but not consumed. Wrap the call with [Resilience](/adhar-kit/modules/resilience) if you need one.

**Metrics.** With a `MeterRegistry` present, `AiMetricsCollector` publishes `ai.chat.requests.total`, `ai.chat.response.time`, `ai.chat.requests{provider,model}`, the equivalent `ai.embedding.*` and `ai.rag.*` meters, `ai.errors{type,provider,operation}`, `ai.rate_limit.exceeded`, `ai.cache.events{result,operation}`, `ai.vector_store.operation.time{operation}`, and the `ai.cost.total.usd` / `ai.tokens.total` gauges.

**Resource bounds.** The Spring response cache is Caffeine-bounded by `adhar.ai.caching.max-size` / `.ttl`; each `@AiCache` cache by its own annotation; each semantic store is a bounded LRU of `semantic.max-entries` embeddings. The rate-limiter map and the `PromptTemplateRegistry` are the two unbounded structures.

## Testing

There is no AI helper in `adhar-kit-test-commons`; test against the interface instead.

- **Unit tests** — inject a Mockito mock of `com.adhar.kit.ai.service.AiService` and stub `chat(any())` to return `AiChatResponse.builder().content("...").build()`.
- **Aspect tests** — build the aspect directly (`new AiChatAspect(provider)` with a mocked `ObjectProvider<AiService>`) and drive it with a mocked `ProceedingJoinPoint`; no Spring context needed. That is what the module's own `AiChatAspectTest` does.
- **Disabling side effects** — `adhar.ai.enabled: false` removes the whole auto-configuration; `adhar.ai.annotations.enabled: false` keeps the facade but silences the aspects. Leaving the service layer unscanned is itself a working "no AI in tests" setup: `@AiChat` methods fall through to their bodies.
- **Guardrails in tests** — a fixture prompt containing an email address or the word "token" is rejected. Set `adhar.ai.security.enabled: false` unless the guardrail is what you are asserting.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.ai.enabled` | Master switch | `true` |
| `adhar.ai.provider` / `.default-model` | Provider name and fallback model | `openai` / `gpt-3.5-turbo` |
| `adhar.ai.max-tokens` / `.temperature` / `.timeout` / `.max-retries` | Module-level generation defaults | `1000` / `0.7` / `30` / `3` |
| `adhar.ai.openai.api-key` / `.base-url` / `.model` | OpenAI credentials and endpoint | — / `https://api.openai.com` / `gpt-3.5-turbo` |
| `adhar.ai.azure.api-key` / `.endpoint` / `.deployment-name` | Azure OpenAI wiring | (none) |
| `adhar.ai.ollama.base-url` / `.model` | Local Ollama | `http://localhost:11434` / `llama2` |
| `adhar.ai.vector-store.type` / `.index-name` / `.dimensions` / `.similarity-function` | `redis`, `chroma` or `pinecone`, and the index shape | `redis` / `adhar-vectors` / `1536` / `cosine` |
| `adhar.ai.rate-limiting.enabled` | In-process quota enforcement | `true` |
| `adhar.ai.rate-limiting.requests-per-minute` / `-hour` / `-day` | Quotas, **per JVM** | `60` / `1000` / `10000` |
| `adhar.ai.caching.enabled` / `.ttl` / `.max-size` | Spring response cache (`ai-chat`, `ai-embeddings`) | `true` / `30m` / `1000` |
| `adhar.ai.caching.semantic.enabled` / `.similarity-threshold` / `.max-entries` | Embedding-similarity layer in `@AiCache` | `false` / `0.95` / `1000` |
| `adhar.ai.cache.enabled` | Registers `AiCacheAspect` — a *different* key from `caching.enabled` | `true` |
| `adhar.ai.tools.enabled` / `.max-iterations` | Tool-calling loop bound | `true` / `5` |
| `adhar.ai.guardrails.enabled` | Register the default guardrail chain | `true` |
| `adhar.ai.security.enabled` | Master switch for request validation and response sanitizing | `true` |
| `adhar.ai.security.validate-api-keys` | Despite the name: makes PII detection *throw* rather than warn | `true` |
| `adhar.ai.security.log-requests` | Logs prompts; can capture PII | `false` |
| `adhar.ai.security.allowed-models` | Model allowlist, also the body of `GET /models` | `gpt-3.5-turbo, gpt-4, llama2` |
| `adhar.ai.metrics.enabled` | Register `AiMetricsAspect` | `true` |
| `adhar.ai.costs.models.<model>.prompt-cost-per1k` / `.completion-cost-per1k` | Cost table, USD per 1,000 tokens | `gpt-3.5-turbo` 0.0005/0.0015, `gpt-4` 0.03/0.06 |
| `adhar.ai.costs.default-cost.*` | Fallback for models absent from the table | `0.0` |
| `adhar.ai.annotations.enabled` | Register `AiChatAspect` and `AiEmbeddingAspect` | `true` |

```yaml
adhar:
  ai:
    provider: openai
    openai: { api-key: "${OPENAI_API_KEY}", model: gpt-4 }
    caching:
      ttl: 30m
      semantic: { enabled: true, similarity-threshold: 0.95 }
    rate-limiting: { requests-per-minute: 60 }
    tools: { max-iterations: 5 }
```

> The cost table is a coarse, configurable approximation, not a mirror of any vendor's price list. Update `adhar.ai.costs.models` when your pricing changes, or `estimateCost` will drift — and note that an unlisted model falls back to `default-cost`, which is zero, so a silently-free model is a configuration gap rather than a bargain.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `UnsupportedOperationException: AI provider not configured` | `AiFacade` still holds the no-op provider | Scan `com.adhar.kit.ai` and configure a `spring-ai-starter-model-*` provider |
| No `AiService` bean to inject | Only `AiAutoConfiguration` is auto-registered | Add `@ComponentScan("com.adhar.kit.ai")` |
| An `@AiChat` method returns `null` | No `AiService` bean, so the aspect ran the original body | Same fix; check the startup warning |
| The annotation does nothing at all | Self-invocation, or `adhar.ai.annotations.enabled` is off | Call via the injected bean, not `this.` |
| `ValidationException: SENSITIVE_CONTENT` on a harmless prompt | The prompt contains `token`, `secret`, `password`… as a substring | Reword, or set `adhar.ai.security.enabled: false` |
| `ValidationException: PII_DETECTED` | An email/phone/SSN/card pattern in the prompt | Redact before sending, or set `validate-api-keys: false` to warn instead |
| Two different prompts return the same answer | The `ai-chat` cache key is message + model only | Set a `sessionId` on the request to bypass the cache |
| A `{placeholder}` renders empty | The name does not match a parameter name or a resolvable bean path | Match the parameter name; compile with `-parameters` |
| Streaming calls show zero tokens and zero cost | `chatStream` records a token count of `0` by design | Use the blocking path where accounting matters |
| Semantic cache never hits | Two `EmbeddingModel` beans, so `getIfUnique` returned `null` | Keep one embedding starter on the classpath |
| Costs read as zero | The model is absent from `adhar.ai.costs.models`, so `default-cost` (0.0) applied | Add the model to the cost table |
| Rate limits admit more than configured | Counters are per JVM, not distributed | Divide the quota by replica count, or enforce at the gateway |

On the [Adhar Platform](/docs), point the provider base URL at the in-cluster AI gateway rather than a public endpoint — the same code, routed and metered by the platform, and a natural place to enforce the cross-replica quota the in-process limiter cannot.

## See also

- [Concepts](/adhar-kit/concepts) — the facade, module-gating and auto-configuration model this page assumes
- [Cache](/adhar-kit/modules/cache) — the caching vocabulary behind `@AiCache`
- [Metrics](/adhar-kit/modules/metrics) — where the token and cost meters land
- [Security](/adhar-kit/modules/security) — the validation the guardrails adapt
