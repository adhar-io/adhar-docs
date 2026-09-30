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
| Use it when | You want provider-portable LLM calls with guardrails, rate limiting, caching, and cost tracking already wired |

## How it works

There is one pipeline and three ways in. `AiServiceImpl` — the Spring bean behind the `com.adhar.kit.ai.service.AiService` interface — owns the pipeline; the REST controller, the `@AiChat` aspect, and `AiFacade` all route into it.

```text
  @AiChat method        AiFacade.chat(...)     POST /api/v1/ai/chat
        |                      |                       |
        +----------------------+-----------------------+
                               v
                      AiServiceImpl.chat()
                               |
     1. AiRateLimiter.checkRateLimit(identifier)   -> reject over quota
     2. AiSecurityValidator.validateRequest(...)   -> guardrails on input
     3. cache lookup (@AiCache: exact hash, then optional semantic)
     4. Spring AI ChatModel.call(...)              -> the provider
     5. securityValidator.sanitizeContent(output)  -> guardrails on output
     6. AiMetricsCollector.recordChatRequest/recordCost
                               |
                               v
                        AiChatResponse
```

`AiFacade` is a lazily-created singleton that starts with a no-op `DefaultAiProvider` — every operation on it throws `UnsupportedOperationException("AI provider not configured")`. At startup `AiFacadeInitializer` calls `facade.connect(springService, embeddingModel, toolCallingService, promptRegistry)`, swapping in a provider that delegates to `AiServiceImpl`. That is the single most important thing to understand about this module: **the facade is inert until a real Spring AI `ChatModel` exists**, which means an API key or base URL configured for one of the `spring-ai-starter-model-*` starters.

Guardrails are a chain of `Guardrail` beans — `ContentSafetyGuardrail`, `PiiGuardrail`, `SensitiveDataGuardrail` — each adapting `AiSecurityValidator`, collected into a `GuardrailChain`. They are registered only when an `AiSecurityValidator` bean exists and `adhar.ai.guardrails.enabled` is not `false`.

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

- **Chat** — `chat(message)`, `chat(systemPrompt, message)`, `chatWithContext(history, message)`, `chat(ChatRequest)`, `chatAsync(message)` returning a `CompletableFuture`, and `chatStream(message, Consumer<String>)` for token-by-token delivery.
- **Embeddings and similarity** — `embed(text)`, `embedBatch(texts)`, `similarity(a, b)`, `findSimilar(query, candidates, topK)`. `findSimilar` needs an `EmbeddingModel` bean; without one it throws.
- **RAG** — `storeDocument(id, content, metadata)`, `storeDocuments(documents)`, `queryDocuments(question, topK)` returning a `RagResponse` with `answer`, `sources`, and `confidence`, and `deleteDocument(id)`.
- **Multimodal** — `generateImage(prompt)` / `generateImage(ImageRequest)`, `analyzeImage(imageUrl, question)`.
- **Tools** — `chatWithFunctions(message, functions)` returns a `FunctionCallResponse` whose `hasFunctionCalls()` tells you whether the model asked for a tool; `executeFunction(call)` runs one. The loop is bounded by `adhar.ai.tools.max-iterations`.
- **Prompt templates** — `registerPromptTemplate(name, template)` and `renderPrompt(name, params)`, backed by `PromptTemplateRegistry` and usable before a provider is connected.
- **Models and budget** — `listModels()`, `getModelInfo()`, `useModel(modelId)`, `countTokens(text)`, `estimateCost(text)`.
- **Operational** — `isAvailable()`, `getProvider()`, `health()`.

`AdharFacade` exposes shortcuts: `adhar.chat("message")` and `adhar.chat("system prompt", "message")`.

REST endpoints under `/api/v1/ai`: `POST /chat`, `POST /chat/async`, `POST /chat/stream` (Server-Sent Events), `POST /embed`, `POST /search`, `POST /rag/chat`, `POST /rag/documents`, `GET /models`, `GET /health`.

## Worked example — minimal

```java
import com.adhar.kit.starter.AdharFacade;

@Service
public class SummaryService {
    private final AdharFacade adhar;
    public SummaryService(AdharFacade adhar) { this.adhar = adhar; }

    public String summarise(String article) {
        return adhar.chat("You summarise in three bullet points.", article);
    }
}
```

## Worked example — declarative methods

`@AiChat` turns a method into an LLM call: the aspect intercepts the invocation, substitutes `{param}` placeholders in the prompt from the method's parameter names, and returns the model's answer in place of the body. Nested paths such as `{order.customer.name}` resolve through JavaBean getters; an unresolvable placeholder becomes an empty string rather than an error.

```java
import com.adhar.kit.ai.annotation.AiCache;
import com.adhar.kit.ai.annotation.AiChat;
import com.adhar.kit.ai.annotation.AiMetrics;

@Service
public class ReviewService {

    @AiChat(prompt = "Translate to French: {text}")
    public String translateToFrench(String text) { return null; }

    @AiChat(
        systemPrompt = "You are an expert code reviewer. Reply in markdown.",
        prompt = "Review this {language} code:\n{code}",
        temperature = 0.3,
        maxTokens = 1000,
        model = "gpt-4",
        stopSequences = {"END-OF-REVIEW"})
    @AiCache(ttl = 1800, cacheName = "code-review", excludeParams = {"requestId"})
    @AiMetrics(trackTokens = true, trackCost = true, costAlertThreshold = 5.0)
    public String reviewCode(String language, String code, String requestId) { return null; }
}
```

### How the interception works

`AiChatAspect` is an AspectJ `@Around("@annotation(aiChat)")` advice registered as a bean by `AiAutoConfiguration` when `adhar.ai.annotations.ai-chat-enabled` is not `false`. It resolves the Spring-managed `AiService` through an `ObjectProvider`, lazily — because that bean only exists once a `ChatModel` is configured.

Two consequences follow, and both surprise people:

1. **With no provider configured the aspect calls `joinPoint.proceed()`.** Your method body runs instead. If the body is `return null`, the method silently returns `null` rather than failing. Treat a `null` from an `@AiChat` method as "no provider", not "the model said nothing".
2. **Self-invocation bypasses the aspect entirely**, because Spring AOP works through a proxy. Call annotated methods from another bean.

`AiCacheAspect` runs the exact-hash cache and, when `adhar.ai.caching.semantic.enabled` is true *and* an `EmbeddingModel` bean exists, additionally matches misses by cosine similarity against recent entries. `AiMetricsAspect` is registered only when Micrometer's `MeterRegistry` is on the classpath.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `adhar.ai.enabled` | Master switch | `true` |
| `adhar.ai.provider` | Default provider name | `openai` |
| `adhar.ai.default-model` | Model used when none is specified | `gpt-3.5-turbo` |
| `adhar.ai.max-tokens` / `temperature` | Module-level generation defaults | `1000` / `0.7` |
| `adhar.ai.timeout` / `max-retries` | Request timeout (seconds) and retry count | `30` / `3` |
| `adhar.ai.openai.api-key` / `.base-url` / `.model` | OpenAI credentials and endpoint | — / `https://api.openai.com` / `gpt-3.5-turbo` |
| `adhar.ai.azure.api-key` / `.endpoint` / `.deployment-name` | Azure OpenAI wiring | (none) |
| `adhar.ai.ollama.base-url` / `.model` | Local Ollama | `http://localhost:11434` / `llama2` |
| `adhar.ai.vector-store.type` | `redis`, `chroma`, or `pinecone` | `redis` |
| `adhar.ai.vector-store.index-name` / `.dimensions` / `.similarity-function` | Vector index shape | `adhar-vectors` / `1536` / `cosine` |
| `adhar.ai.rate-limiting.requests-per-minute` / `-hour` / `-day` | Request quotas | `60` / `1000` / `10000` |
| `adhar.ai.caching.enabled` / `.ttl` / `.max-size` / `.provider` | Response cache | `true` / `30m` / `1000` / `caffeine` |
| `adhar.ai.caching.semantic.enabled` / `.similarity-threshold` / `.max-entries` | Embedding-similarity cache layer | `false` / `0.95` / `1000` |
| `adhar.ai.tools.enabled` / `.max-iterations` | Tool-calling loop bound | `true` / `5` |
| `adhar.ai.guardrails.enabled` | Register the default guardrail chain | `true` |
| `adhar.ai.security.validate-api-keys` / `.log-requests` / `.audit-enabled` | Security behaviour; `log-requests` can capture PII | `true` / `false` / `true` |
| `adhar.ai.security.allowed-models` | Model allowlist | `gpt-3.5-turbo, gpt-4, llama2` |
| `adhar.ai.metrics.track-tokens` / `.track-cost` / `.track-latency` | Micrometer emission | `true` |
| `adhar.ai.costs.models.<model>.prompt-cost-per1k` / `.completion-cost-per1k` | Cost table, USD per 1,000 tokens | `gpt-3.5-turbo` 0.0005/0.0015, `gpt-4` 0.03/0.06 |
| `adhar.ai.annotations.<name>-enabled` | Per-annotation aspect toggles | `true` |

```yaml
adhar:
  ai:
    enabled: true
    provider: openai
    openai:
      api-key: ${OPENAI_API_KEY}
      model: gpt-4
    caching:
      enabled: true
      ttl: 30m
      semantic: { enabled: true, similarity-threshold: 0.95 }
    rate-limiting: { enabled: true, requests-per-minute: 60 }
    guardrails: { enabled: true }
    tools: { enabled: true, max-iterations: 5 }
```

> The cost table is a coarse, configurable approximation, not a mirror of any vendor's price list. Update `adhar.ai.costs.models` when your pricing changes, or `estimateCost` will drift.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `UnsupportedOperationException: AI provider not configured` | `AiFacade` still holds the no-op provider — no `ChatModel` bean | Configure a `spring-ai-starter-model-*` provider (API key or base URL) |
| An `@AiChat` method returns `null` | No `AiService` bean, so the aspect ran the original body | Same fix; check the startup warning about no `ChatModel` |
| The annotation does nothing at all | Self-invocation inside the same bean, or the aspect toggle is off | Call via the injected bean; check `adhar.ai.annotations.ai-chat-enabled` |
| A `{placeholder}` renders empty | The name does not match a parameter name or a resolvable bean path | Match the parameter name; compile with `-parameters` |
| `findSimilar` throws | No `EmbeddingModel` bean | Add an embedding-capable starter |
| Costs read as zero | The response model is absent from `adhar.ai.costs.models` and `default-cost` is 0.0 | Add the model to the cost table |
| Prompts appear in logs | `adhar.ai.security.log-requests` is on | Leave it `false` outside debugging |
| Tool calling never converges | The loop stopped at `max-iterations` and returned the latest partial answer | Raise `adhar.ai.tools.max-iterations`, or narrow the tool set |

On the [Adhar Platform](/docs), point the provider base URL at the in-cluster AI gateway rather than a public endpoint — the same code, routed and metered by the platform.

## See also

- [Platform Services](/docs/core-concepts/platform-services) — the in-cluster AI and model-serving services
- [Cache](/adhar-kit/modules/cache) — the caching layer behind `@AiCache`
- [Metrics](/adhar-kit/modules/metrics) — where token and cost counters land
- [Security](/adhar-kit/modules/security) — the validation the guardrails adapt
