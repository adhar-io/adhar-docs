---
title: "AI"
section: "Modules"
order: 28
path: "/adhar-kit/modules/ai"
---

# AI

`adhar-kit-ai` wraps a Spring AI `ChatModel` in one request pipeline: a response cache, request validation, a per-user rate limit, input guardrails, response PII redaction, and token and cost metrics. You reach it through `AiFacade`, an injectable `AiService`, `@AiChat` methods or REST endpoints. Use it on Spring Boot when you want LLM calls with those guardrails already in place, instead of calling a bare `ChatModel`.

## At a glance

| | |
|---|---|
| Artifact | `com.adhar.kit:adhar-kit-ai` (package `com.adhar.kit.ai`) |
| Module toggle | `adhar.kit.modules.ai`, default `false`. It gates `adhar.getAi()` |
| Module switch | `adhar.ai.enabled`, default `true`. It removes `AiAutoConfiguration` |
| Facade | `AiFacade` (`adhar.getAi()`, `adhar.chat(...)`); Spring service `com.adhar.kit.ai.service.AiService` |
| Required dependencies | `spring-ai-model`, Spring Boot web MVC, AOP, cache, actuator, Caffeine, Micrometer, Reactor, `adhar-kit-commons` |
| Optional dependencies | One model starter (`spring-ai-starter-model-openai`, `-ollama` or `-anthropic`) and `spring-ai-vector-store` — you add them |
| Frameworks | Spring Boot only for real calls. Elsewhere `AiFacade.getInstance()` exists but has no provider, so every generative call fails |

## How it works

`AiServiceImpl.chat(request)` is the pipeline. The `@AiChat` aspect and the REST controller call it directly. `AiFacade` calls it once it is connected (see below).

```diagram
nkb-ai-pipeline
```

`AiAutoConfiguration` is the only auto-configuration the module registers. The service layer is made of plain `@Service`, `@Component` and `@Configuration` classes, so it exists only when you scan or import it.

```diagram
nkb-ai-wiring
```

At startup `AiFacadeInitializer` looks for the Spring `AiService`. If it finds one, it calls `AiFacade.connect(...)`, and `getProvider()` changes from `"default"` to `"spring-ai"`. If it finds none, it logs *"No Spring AI chat service available; AiFacade left in graceful-degradation mode"*. In that mode every generative facade call throws `AiFacade.AiException` ("… AI provider not configured"). `listModels()` returns an empty list, `countTokens` returns `text.length() / 4`, and `estimateCost` returns `0.0`.

## Add it

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-ai</artifactId>
    <version>0.1.0</version>
</dependency>
<!-- Exactly one model provider. Versions come from spring-ai-bom via adhar-kit-bom. -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

Then do three things:

1. **Configure the provider through Spring AI's own keys**, for example `spring.ai.openai.api-key` and `spring.ai.openai.chat.options.model`. The module's `adhar.ai.open-ai.*`, `adhar.ai.azure.*` and `adhar.ai.ollama.*` keys do not configure a client.
2. **Provide the beans `AiServiceImpl` requires**: a `ChatModel`, an `EmbeddingModel` and a `VectorStore`. The provider starter supplies the first two. The `VectorStore` comes from a Spring AI vector-store starter or your own bean. If any of them is missing, the context fails to start once the service is scanned.
3. **Scan the service layer and import `AiConfiguration`.** Scan only the packages below:
   - Leave out `com.adhar.kit.ai.aspect`. The aspects are already auto-configured, and a scanned `AiCacheAspect` (built with its no-argument constructor) replaces the auto-configured one and has no semantic cache.
   - Leave out `config`. Scanning it registers a second `AiProperties` bean, so import `AiConfiguration` instead.
   - Leave out `controller` unless you want the REST endpoints.

```java
import com.adhar.kit.ai.config.AiConfiguration;

@SpringBootApplication
@ComponentScan(basePackages = {
        "com.example.app",                 // your own packages
        "com.adhar.kit.ai.service",
        "com.adhar.kit.ai.component",
        "com.adhar.kit.ai.security"})
@Import(AiConfiguration.class)             // ai-chat cache manager, aiTaskExecutor
public class App { }
```

Enable the facade accessor with `adhar.kit.modules.ai=true`.

## Use it

### Through the service

Inject `com.adhar.kit.ai.service.AiService` and send an `AiChatRequest`. Set `userId` or `tenantId`, because that is the rate-limit key. Without either, every caller shares the `"anonymous"` bucket.

```java
import com.adhar.kit.ai.model.AiChatRequest;
import com.adhar.kit.ai.model.AiChatResponse;
import com.adhar.kit.ai.service.AiService;
import com.adhar.kit.commons.exception.ServiceException;
import com.adhar.kit.commons.exception.ValidationException;
import org.springframework.stereotype.Service;

@Service
public class Summariser {

    private final AiService ai;

    public Summariser(AiService ai) {
        this.ai = ai;
    }

    public String summarise(String userId, String text) {
        AiChatRequest request = AiChatRequest.builder()
                .message("Summarise in three bullet points:\n" + text)  // at most 10,000 chars
                .userId(userId)
                .build();
        try {
            AiChatResponse response = ai.chat(request);
            return response.getContent();
        } catch (ValidationException e) {
            return null;   // the prompt was rejected: too long, PII, a sensitive keyword
        } catch (ServiceException e) {
            return null;   // RATE_LIMIT_EXCEEDED, or AI_CHAT_ERROR from the provider (see getCause())
        }
    }
}
```

The same interface also offers `chatStream` (a `Flux`), `chatAsync` (a `Mono`), `embed`, `search`, `ragChat`, `addDocuments`, `chatWithTemplate` and `chatWithTools`.

### Through the facade

```java
AiFacade ai = adhar.getAi();   // needs adhar.kit.modules.ai=true
String answer = ai.chat("You are terse.", "What is a circuit breaker?");

ai.registerPromptTemplate("review", "Review this {language} code:\n{code}");
String prompt = ai.renderPrompt("review", Map.of("language", "Java", "code", source));
```

`PromptTemplateRegistry` also loads every `classpath*:ai/prompts/*.txt` at startup, named after the file. After `connect()`, some facade methods still throw `UnsupportedOperationException`, wrapped in `AiException`: `generateImage`, `analyzeImage`, `deleteDocument` and `useModel`.

### Declaratively

`@AiChat` replaces the method body with a model call. `{param}` placeholders come from parameter names, and nested paths such as `{order.customer.name}` resolve through getters. A placeholder that cannot be resolved becomes an empty string. Compile with `-parameters`.

```java
import com.adhar.kit.ai.annotation.AiCache;
import com.adhar.kit.ai.annotation.AiChat;
import com.adhar.kit.ai.annotation.AiMetrics;

@Service
public class ReviewService {

    @AiChat(systemPrompt = "You are a code reviewer. Reply in markdown.",
            prompt = "Review this {language} code:\n{code}")
    @AiCache(cacheName = "code-review", ttl = 1800, excludeParams = {"requestId"})
    @AiMetrics(metricName = "review.code", latencyAlertThreshold = 8000)
    public String review(String language, String code, String requestId) {
        return null;   // runs only when no AiService bean exists
    }
}
```

Behaviour to know:

- **No `AiService` bean means the aspect runs your method body.** It logs a warning first. A `null` from an `@AiChat` method usually means "no provider".
- **Self-invocation skips every AI aspect.** `this.review(...)` runs the raw body, so call annotated methods through another bean.
- **Aspect order**, outermost first: `@AiMetrics` (order 10), then `@AiCache` (50), then `@AiChat` and `@AiEmbedding` (100). A cache hit is still timed.
- **`async = true`** returns a `CompletableFuture<String>` that runs on the common fork-join pool.
- **`@AiCache`** keeps one Caffeine cache per `cacheName`. The first method to use a name sets its `ttl` (seconds) and `maxEntries`. `null` results are not cached. `condition`, `keyGenerator` and `cacheProvider` are not read.
- **`@AiEmbedding`** sends the first `String` argument, or the first `List` when `batch = true`, to `AiFacade.embed` or `embedBatch`. Unlike `@AiChat`, it throws when no provider is connected.

### Tools and guardrails

`ToolCallingService` runs a function-calling loop against the `ChatModel` and stops after `adhar.ai.tools.max-iterations` rounds. It calls the model directly, so tool calls bypass the cache, rate limiter and guardrails.

```java
AiTool weather = AiTool.of("get_weather", "Current weather for a city",
        "{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}}}",
        args -> weatherClient.current((String) args.get("city")));

ToolCallResult result = aiService.chatWithTools("Is it raining in Pune?", List.of(weather));
```

A tool that throws is reported back to the model as `ERROR: tool '<name>' failed: …`. It does not fail the call.

To add a guardrail, publish a `Guardrail` bean. `GuardrailChain` collects every one of them in `getOrder()` order. The built-in guardrails use orders 10 (content-safety), 20 (pii) and 30 (sensitive-data).

```java
@Bean
Guardrail noInternalHosts() {
    return new Guardrail() {
        public String getName() { return "no-internal-hosts"; }
        public int getOrder() { return 40; }
        public void validateRequest(GuardrailRequest request) {
            if (request.content().contains(".internal")) {
                throw new ValidationException("INTERNAL_HOST", "Prompt names an internal host");
            }
        }
    };
}
```

The built-in request checks all throw `ValidationException`:

| Check | Code | Trigger |
|---|---|---|
| content-safety | `CONTENT_VIOLATION` | Phrases such as "how to hack" or "create virus" |
| content-safety | `CONTENT_TOO_LONG` | Over 50,000 characters |
| pii | `PII_DETECTED` | An email, SSN, card or phone pattern. Only when `security.validate-api-keys` is `true`; otherwise a warning |
| sensitive-data | `SENSITIVE_CONTENT` | A case-insensitive substring: `password`, `secret`, `token`, `api_key`, `private_key`, `confidential`, `restricted`, `classified` |

The substring match is broad: "Explain how OAuth tokens work" is rejected.

## Configuration

Properties bind under `adhar.ai` (`AiProperties`). These are the keys the code reads:

| Property | Type | Default | Description |
|---|---|---|---|
| `adhar.ai.enabled` | boolean | `true` | Registers `AiAutoConfiguration` |
| `adhar.ai.annotations.enabled` | boolean | `true` | Registers the `@AiChat` and `@AiEmbedding` aspects |
| `adhar.ai.cache.enabled` | boolean | `true` | Registers the `@AiCache` aspect. This is a different key from `caching.enabled` |
| `adhar.ai.metrics.enabled` | boolean | `true` | Registers the `@AiMetrics` aspect (needs a `MeterRegistry`) |
| `adhar.ai.caching.enabled` | boolean | `true` | Creates the Caffeine `aiCacheManager` behind `ai-chat` and `ai-embeddings` |
| `adhar.ai.caching.ttl` | Duration | `30m` | Write expiry of the response caches |
| `adhar.ai.caching.max-size` | int | `1000` | Entries per response cache |
| `adhar.ai.caching.semantic.enabled` | boolean | `false` | Adds embedding-similarity lookups to `@AiCache`. Needs exactly one `EmbeddingModel` bean |
| `adhar.ai.caching.semantic.similarity-threshold` | double | `0.95` | Minimum cosine similarity for a semantic hit |
| `adhar.ai.caching.semantic.max-entries` | int | `1000` | Embeddings kept per cache (LRU) |
| `adhar.ai.rate-limiting.enabled` | Boolean | `true` | In-process quota enforcement |
| `adhar.ai.rate-limiting.requests-per-minute` | Integer | `60` | Per identifier, per JVM |
| `adhar.ai.rate-limiting.requests-per-hour` | Integer | `1000` | Per identifier, per JVM |
| `adhar.ai.rate-limiting.requests-per-day` | Integer | `10000` | Per identifier, per JVM |
| `adhar.ai.security.enabled` | Boolean | `true` | Runs the request guardrails |
| `adhar.ai.security.validate-api-keys` | Boolean | `true` | Despite the name, makes `PII_DETECTED` throw instead of warn |
| `adhar.ai.security.allowed-models` | String[] | `gpt-3.5-turbo, gpt-4, llama2` | Request `model` allowlist; also the body of `GET /models` |
| `adhar.ai.guardrails.enabled` | boolean | `true` | Registers the built-in guardrails and `GuardrailChain` |
| `adhar.ai.tools.enabled` | boolean | `true` | Registers `ToolCallingService` (needs a `ChatModel`). `AiServiceImpl` needs it too |
| `adhar.ai.tools.max-iterations` | int | `5` | Cap on tool-calling rounds |
| `adhar.ai.open-ai.model` | String | `gpt-3.5-turbo` | Model name recorded on a response when the request names none; selects the cost row |
| `adhar.ai.costs.models.<model>.prompt-cost-per1k` | double | `gpt-3.5-turbo` `0.0005`, `gpt-4` `0.03` | USD per 1,000 prompt tokens |
| `adhar.ai.costs.models.<model>.completion-cost-per1k` | double | `gpt-3.5-turbo` `0.0015`, `gpt-4` `0.06` | USD per 1,000 completion tokens |
| `adhar.ai.costs.default-cost.*` | double | `0.0` | Used for a model missing from the table |

`AiProperties` also binds keys that no code reads: `provider`, `default-model`, `max-tokens`, `temperature`, `timeout`, `max-retries`, `open-ai.api-key`/`base-url`/…, `azure.*`, `ollama.*`, `vector-store.*`, `rate-limiting.window-size`, `caching.provider`, `security.log-requests`, `security.audit-enabled`, `metrics.track-*`, `metrics.export-prometheus` and the per-annotation `annotations.ai-*-enabled` flags. Setting them changes nothing.

The cost table is an estimate you maintain. It does not track any vendor's price list.

## Operations

**Metrics.** `AiMetricsCollector` (it needs a `MeterRegistry`) records:

| Meter | Type | Recorded when |
|---|---|---|
| `ai.chat.requests.total`, `ai.chat.response.time` | counter, timer | Every chat, including streamed and RAG calls |
| `ai.chat.requests{provider,model}` | counter | Every chat |
| `ai.rag.requests.total`, `ai.rag.requests{knowledge_base}` | counter | Every `ragChat` |
| `ai.errors.total`, `ai.errors{type,provider,operation}` | counter | `AI_CHAT_ERROR` and `AI_STREAM_ERROR` failures |
| `ai.cost.total.usd`, `ai.tokens.total` | gauge | Registered on the first costed response |
| `<metricName>.latency`, `<metricName>.total{success}` | timer, counter | Each `@AiMetrics` method (default base `ai.operation`) |

Use `AiMetricsCollector.getSummary()` for running token and cost totals. The two gauges are registered once, from a snapshot value, and do not track later updates. `ai.embedding.*`, `ai.rate_limit.exceeded` and `ai.vector_store.*` are registered but nothing increments them.

**Health.** `AiFacade.health()` returns `available`, `provider` and the adapter status. `GET /api/v1/ai/health` calls `isHealthy()`, which sends a real "Hello" chat on every probe. That spends tokens and counts against the `"anonymous"` rate-limit bucket, so do not wire it to a liveness probe.

**Failures.** There is no retry, circuit breaker or fallback. A provider failure surfaces differently depending on the entry point:

| Entry point | What you get |
|---|---|
| `AiService` | `ServiceException("AI_CHAT_ERROR")`; inspect `getCause()` |
| `AiFacade` | `AiFacade.AiException` |
| `@AiChat` | `RuntimeException("AI chat failed: …")` |

Wrap calls with [Resilience](/adhar-kit/modules/resilience) if you need retries.

## Limits

- **Request options do not reach the provider.** `AiServiceImpl` builds the prompt from the messages only. Temperature, `maxTokens` and stop sequences on `AiChatRequest`, and on `@AiChat`, are ignored. The request `model` is only checked against the allowlist and used in the cache key and cost lookup. The provider's `spring.ai.*` options decide the real model and settings.
- **The `ai-chat` cache key is message plus model.** System prompt, history and options are not part of it, so two requests that differ only there share an answer. Set a `sessionId` to skip the cache. A cache hit also skips validation, rate limiting and guardrails.
- **Rate limits are per JVM.** Three replicas admit three times the quota. The counter map keeps one entry per identifier for the life of the process.
- **Streaming is not accounted.** `chatStream` is not cached, its chunks are not redacted, and it records zero tokens.
- **RAG is basic.** `ragChat` always retrieves 5 documents and does not filter by knowledge base; the name is only a tag on the response. `search` reports a score of `0.0`. Facade `queryDocuments` returns a confidence of `1.0`.
- **No processor for `@AiRag`, `@AiVision`, `@AiImageGeneration` or `@AiFunction`.** The annotations exist, but nothing intercepts them.
- **One provider at a time.** Two model starters create two `ChatModel` beans, which `AiServiceImpl` cannot choose between. Two `EmbeddingModel` beans also switch the semantic cache off.
- **The REST endpoints have no authentication of their own.** If you scan `com.adhar.kit.ai.controller`, protect `/api/v1/ai/**` with [Security](/adhar-kit/modules/security).

## Next steps

- [Concepts](/adhar-kit/concepts) — module toggles, facades and auto-configuration
- [Cache](/adhar-kit/modules/cache) — general-purpose caching next to `@AiCache`
- [Metrics](/adhar-kit/modules/metrics) — where the `ai.*` meters land
- [Resilience](/adhar-kit/modules/resilience) — retries and circuit breakers around model calls
