---
title: "AI"
section: "Modules"
order: 28
path: "/adhar-kit/modules/ai"
---

# AI

`adhar-kit-ai` is a unified, multi-provider AI/LLM interface — chat, embeddings, RAG, image generation, vision, function calling, and streaming — with caching, metrics, rate limiting, and content/PII guardrails, built on Spring AI.

> **Status:** the annotation-driven Spring path (`@AiChat` via `AiService`) is implemented; some concrete providers, the RAG vector store, and the default-provider `AiFacade` methods are marked as in progress in the module README.

## Install

```xml
<dependency>
    <groupId>com.adhar.kit</groupId>
    <artifactId>adhar-kit-ai</artifactId>
    <version>0.1.0-SNAPSHOT</version>
</dependency>
```

## Key APIs

`AiFacade` — `chat`, `chatWithContext`, `chatStream`, `embed`, `similarity`, `generateImage`, `analyzeImage`, `countTokens`, `estimateCost`, `health`. Annotations: `@AiChat`, `@AiEmbedding`, `@AiRag`, `@AiImageGeneration`, `@AiVision`, `@AiFunction`, `@AiCache`, `@AiMetrics`. Facade shortcut: `adhar.chat("system", "user message")`.

## Declarative AI methods

The `@AiChat` annotation turns a method into an LLM call — you declare the prompt, the module fills the return value:

```java
@Service
public class TranslationService {

    @AiChat(prompt = "Translate to French: {text}")
    public String translateToFrench(String text) { return null; }

    @AiChat(
        systemPrompt = "You are an expert code reviewer",
        prompt = "Review this code:\n{code}",
        temperature = 0.3,
        maxTokens = 1000)
    public String reviewCode(String code) { return null; }
}
```

## Configuration

```yaml
adhar:
  ai:
    enabled: true
    provider: openai            # openai | azure | claude | gemini | bedrock | ollama
    cache:       { enabled: true, provider: caffeine, ttl: 3600 }
    metrics:     { enabled: true, track-tokens: true, track-cost: true }
    rate-limit:  { enabled: true, requests-per-minute: 60, tokens-per-minute: 100000 }
    content-filter: { enabled: true, pii-detection: true }

spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
```

On the [Adhar Platform](/docs), point the provider at the in-cluster AI gateway (agentgateway / vLLM) instead of a public endpoint — the same code, routed and metered by the platform. Token/cost tracking and rate limiting protect your budget by default.
