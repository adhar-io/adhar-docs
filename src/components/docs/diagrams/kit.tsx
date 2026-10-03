import type { ComponentType } from "react";
import {
  Box,
  C,
  Caption,
  Flow,
  Frame,
  GroupBox,
  Ladder,
  MONO,
} from "@/components/docs/diagram-kit";

/**
 * Diagrams for the Adhar Kit pages. Registered in `diagrams/index.tsx`.
 *
 * Most of these pictures are nested or branching — a facade that contains its
 * own adapter layer, a filter chain that feeds an aspect, a fan-out from one
 * bus to three subscribers — so they place their own coordinates inside a
 * `Frame` rather than going through a layout primitive. The few that are a
 * plain left-to-right chain use `Flow`, and the few that are a plain
 * top-to-bottom chain use `Ladder`.
 */

/* ---------------- small local helpers ---------------- */

function Mono({
  x,
  y,
  children,
  anchor = "start",
  size = 11.5,
  color = C.text,
  weight = 400,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={weight}
      fill={color}
    >
      {children}
    </text>
  );
}

function VArrow({
  x,
  y1,
  y2,
  tone,
  dashed,
}: {
  x: number;
  y1: number;
  y2: number;
  tone?: "primary";
  dashed?: boolean;
}) {
  const p = tone === "primary";
  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      stroke={p ? C.primary : C.strong}
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 4" : undefined}
      markerEnd={p ? "url(#dk-arrow-primary)" : "url(#dk-arrow)"}
    />
  );
}

function HArrow({ y, x1, x2 }: { y: number; x1: number; x2: number }) {
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke={C.strong}
      strokeWidth={1.5}
      markerEnd="url(#dk-arrow)"
    />
  );
}

function Rail({
  x1,
  x2,
  y,
}: {
  x1: number;
  x2: number;
  y: number;
}) {
  return (
    <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.strong} strokeWidth={1.5} />
  );
}

function Plate({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={10}
      fill={C.fill}
      stroke={C.line}
      strokeWidth={1.25}
    />
  );
}

/** A name/description row of the kind several of these chains are made of. */
function NamedRow({
  x,
  descX,
  y,
  name,
  desc,
}: {
  x: number;
  descX: number;
  y: number;
  name: string;
  desc: string;
}) {
  return (
    <g>
      <Mono x={x} y={y} size={11.5} weight={600}>
        {name}
      </Mono>
      <Caption x={descX} y={y}>
        {desc}
      </Caption>
    </g>
  );
}

/* ---------------- 00-overview: the facade sandwich ---------------- */

function FacadeLayers() {
  const CX = 360;
  return (
    <Frame
      width={720}
      height={440}
      label="Your application code calls shortcuts on AdharFacade; the facade exposes lazy, gated module sub-facades and sits on a framework adapter layer for Spring, Quarkus, Micronaut, Helidon and Vert.x, which in turn talks to the infrastructure."
    >
      <Box
        x={56}
        y={14}
        w={608}
        h={56}
        title="YOUR APPLICATION CODE"
        lines={["OrderService · PaymentService · …"]}
        tone="primary"
      />
      <VArrow x={CX} y1={70} y2={112} tone="primary" />
      <Caption x={CX + 14} y={86} color={C.primary} weight={600}>
        adhar.safe(…)   adhar.cached(…)
      </Caption>
      <Caption x={CX + 14} y={100} color={C.primary} weight={600}>
        adhar.publish(…)   adhar.save(…)
      </Caption>

      <GroupBox
        x={24}
        y={112}
        w={672}
        h={204}
        label="AdharFacade — framework-neutral · 23 accessors · shortcuts"
      />
      <Plate x={44} y={142} w={632} h={76} />
      <Mono x={CX} y={164} anchor="middle" size={11} color={C.dim}>
        LoggingFacade · MetricsFacade · TracingFacade
      </Mono>
      <Mono x={CX} y={180} anchor="middle" size={11} color={C.dim}>
        CacheFacade · SecurityFacade · MessagingFacade …
      </Mono>
      <Mono x={CX} y={196} anchor="middle" size={11} color={C.dim}>
        (lazy, gated by AdharModuleAccess)
      </Mono>
      <Box
        x={44}
        y={234}
        w={632}
        h={60}
        title="FRAMEWORK ADAPTER LAYER"
        lines={["Spring · Quarkus · Micronaut · Helidon · Vert.x"]}
        tone="accent"
      />

      <VArrow x={CX} y1={316} y2={344} />
      <Box
        x={56}
        y={344}
        w={608}
        h={84}
        title="INFRASTRUCTURE"
        lines={[
          "Kafka · RabbitMQ · JPA/Postgres · Caffeine",
          "OpenTelemetry · Micrometer/Prometheus",
          "Kubernetes · Dapr · OAuth2/JWT providers",
        ]}
      />
    </Frame>
  );
}

/* ---------------- 02-frameworks: one facade, five adapters ---------------- */

function FrameworkAdapters() {
  const PAD = 8;
  const W = 761;
  const CX = 388.5;
  const bw = 145;
  const gap = 9;
  const adapters = [
    { title: "Spring", line: "@AutoConfiguration" },
    { title: "Quarkus", line: "CDI @Produces" },
    { title: "Micronaut", line: "@Factory @Singleton" },
    { title: "Helidon", line: "CDI / SE bootstrap" },
    { title: "Vert.x", line: "static + shared" },
  ];
  const xs = adapters.map((_, i) => PAD + i * (bw + gap));
  const cs = xs.map((x) => x + bw / 2);

  return (
    <Frame
      width={PAD * 2 + W}
      height={382}
      minWidth={640}
      label="Identical application code calls AdharFacade, a plain singleton class; five framework adapters — Spring, Quarkus, Micronaut, Helidon and Vert.x — each produce that same instance, and FrameworkDetector probes the classpath once to report which runtime is in use."
    >
      <Box
        x={PAD}
        y={12}
        w={W}
        h={58}
        title="YOUR CODE — identical on all five runtimes"
        lines={['adhar.safe("charge", () -> gateway.charge(x), () -> queue)']}
        tone="primary"
      />
      <VArrow x={CX} y1={70} y2={94} tone="primary" />

      <Box
        x={PAD}
        y={94}
        w={W}
        h={62}
        title="AdharFacade  (plain class, no DI annotations, singleton)"
        lines={["→ the SAME instance whichever adapter produced it"]}
      />

      <line
        x1={CX}
        y1={156}
        x2={CX}
        y2={176}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={cs[0]} x2={cs[4]} y={176} />
      {cs.map((c, i) => (
        <VArrow key={`d${i}`} x={c} y1={176} y2={196} />
      ))}

      {adapters.map((a, i) => (
        <Box
          key={a.title}
          x={xs[i]}
          y={196}
          w={bw}
          h={74}
          title={a.title}
          lines={[a.line]}
        />
      ))}

      {cs.map((c, i) => (
        <line
          key={`u${i}`}
          x1={c}
          y1={270}
          x2={c}
          y2={288}
          stroke={C.strong}
          strokeWidth={1.5}
        />
      ))}
      <Rail x1={cs[0]} x2={cs[4]} y={288} />
      <VArrow x={CX} y1={288} y2={308} />

      <Box
        x={PAD}
        y={308}
        w={W}
        h={62}
        title="FrameworkDetector — probes the classpath once, caches it"
        lines={["SPRING_BOOT → QUARKUS → MICRONAUT → HELIDON → VERTX → OTHER"]}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- 03-concepts: annotation path vs facade path ---------------- */

function AnnotationVsFacade() {
  const LX = 120;
  const RX = 520;
  const MX = 320;
  return (
    <Frame
      width={720}
      height={350}
      label="Two ways into one module: an @CircuitBreaker annotation handled by ResilienceAspect, and a direct adhar.resilient call. Both converge on CircuitBreakerFacade, which delegates to the Resilience4j registry via SpringCircuitBreakerAdapter."
    >
      <Caption x={8} y={16} size={11} weight={600} color={C.text}>
        Two ways into one module — identical implementation behind both
      </Caption>

      <Mono x={20} y={44} size={12} color={C.primary} weight={600}>
        @CircuitBreaker(&quot;payments&quot;)
      </Mono>
      <Mono x={20} y={60} size={11} color={C.dim}>
        public Receipt charge(Order o) &#123;…&#125;
      </Mono>
      <Mono x={410} y={44} size={12} color={C.accent} weight={600}>
        adhar.resilient(&quot;payments&quot;, …)
      </Mono>

      <VArrow x={LX} y1={70} y2={96} />
      <Box
        x={36}
        y={96}
        w={168}
        h={56}
        title="ResilienceAspect"
        tone="primary"
      />
      <Caption x={216} y={118}>
        AOP proxy, opt-in
      </Caption>
      <Caption x={216} y={132}>
        per annotated method
      </Caption>

      <line
        x1={LX}
        y1={152}
        x2={LX}
        y2={180}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <line
        x1={RX}
        y1={70}
        x2={RX}
        y2={180}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={LX} x2={RX} y={180} />
      <VArrow x={MX} y1={180} y2={204} />

      <Box
        x={216}
        y={204}
        w={208}
        h={46}
        title="CircuitBreakerFacade"
        tone="accent"
      />
      <Caption x={436} y={231}>
        module public API
      </Caption>

      <VArrow x={MX} y1={250} y2={272} />
      <Box
        x={192}
        y={272}
        w={256}
        h={58}
        title="Resilience4j registry"
        lines={["via SpringCircuitBreakerAdapter"]}
      />
    </Frame>
  );
}

/* ---------------- modules/event-sourcing: append, then fan out ---------------- */

function EventSourcingFlow() {
  const LEFT = 8;
  const BOXW = 404;
  const CX = LEFT + BOXW / 2;
  const TX = 428;
  const fanW = 240;
  const fanXs = [8, 268, 528];
  const fanCs = fanXs.map((x) => x + fanW / 2);

  return (
    <Frame
      width={780}
      height={376}
      minWidth={640}
      label="A command loads an aggregate through AggregateRepository, the aggregate decides and emits uncommitted domain events, EventStore.saveEvents appends them under an expected version, and EventBus.publish fans them out to projections, the saga manager and catch-up subscriptions."
    >
      <Box x={LEFT} y={14} w={BOXW} h={40} title="Command" tone="primary" />
      <VArrow x={CX} y1={54} y2={68} />

      <Box
        x={LEFT}
        y={68}
        w={BOXW}
        h={40}
        title="AggregateRepository.load(id, Order.class)"
        titleSize={12}
      />
      <Caption x={TX} y={83}>
        snapshot (if any) → applySnapshot
      </Caption>
      <Caption x={TX} y={98}>
        + getEventsAfterVersion → apply(event) per event
      </Caption>
      <VArrow x={CX} y1={108} y2={122} />

      <Box x={LEFT} y={122} w={BOXW} h={40} title="AggregateRoot" />
      <Caption x={TX} y={146}>
        business decision → uncommitted DomainEvent(s)
      </Caption>
      <VArrow x={CX} y1={162} y2={176} />

      <Box
        x={LEFT}
        y={176}
        w={BOXW}
        h={40}
        title="EventStore.saveEvents(id, events, expectedVersion)"
        titleSize={12}
      />
      <Caption x={TX} y={191}>
        version mismatch → ConcurrencyException
      </Caption>
      <Caption x={TX} y={206}>
        every snapshot-interval events → SnapshotStore.save
      </Caption>
      <VArrow x={CX} y1={216} y2={230} />

      <Box
        x={LEFT}
        y={230}
        w={BOXW}
        h={40}
        title="EventBus.publish(event)"
        tone="accent"
      />

      <line
        x1={CX}
        y1={270}
        x2={CX}
        y2={288}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={fanCs[0]} x2={fanCs[2]} y={288} />
      {fanCs.map((c, i) => (
        <VArrow key={i} x={c} y1={288} y2={304} />
      ))}

      <Box
        x={fanXs[0]}
        y={304}
        w={fanW}
        h={56}
        title="Projections"
        lines={["read models, checkpointed"]}
      />
      <Box
        x={fanXs[1]}
        y={304}
        w={fanW}
        h={56}
        title="SagaManager"
        lines={["multi-step workflows"]}
      />
      <Box
        x={fanXs[2]}
        y={304}
        w={fanW}
        h={56}
        title="CatchUpSubscription"
        lines={["rebuild / late subscriber"]}
      />
    </Frame>
  );
}

/* ---------------- modules/graphql: what runs before a fetcher ---------------- */

function GraphQlPipeline() {
  const CX = 360;
  return (
    <Frame
      width={720}
      height={352}
      label="A GraphQL POST passes through the WebGraphQlInterceptor chain, then pre-execution Instrumentation, before any DataFetcher runs; DataLoader then batches keys into one query per batch."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        HTTP POST /graphql
      </Mono>
      <VArrow x={CX} y1={28} y2={48} tone="primary" />

      <GroupBox
        x={8}
        y={48}
        w={704}
        h={108}
        label="WebGraphQlInterceptor chain"
      />
      <NamedRow
        x={24}
        descX={278}
        y={86}
        name="PersistedQueryInterceptor"
        desc="hash → full query (Apollo APQ)"
      />
      <NamedRow
        x={24}
        descX={278}
        y={104}
        name="AllowedQueryInterceptor"
        desc="reject anything unregistered"
      />
      <NamedRow
        x={24}
        descX={278}
        y={122}
        name="QueryCostRateLimitInterceptor"
        desc="token bucket per client id"
      />
      <NamedRow
        x={24}
        descX={278}
        y={140}
        name="GraphQlSecurityInterceptor"
        desc="require-authentication gate"
      />

      <VArrow x={CX} y1={156} y2={176} />

      <GroupBox
        x={8}
        y={176}
        w={704}
        h={90}
        label="Instrumentation (pre-execution)"
      />
      <NamedRow
        x={24}
        descX={288}
        y={214}
        name="MaxQueryDepthInstrumentation"
        desc="hard depth ceiling"
      />
      <NamedRow
        x={24}
        descX={288}
        y={232}
        name="MaxQueryComplexityInstrumentation"
        desc="field-count ceiling"
      />
      <NamedRow
        x={24}
        descX={288}
        y={250}
        name="FieldAuthorizationInstrumentation"
        desc="@auth(roles:[…]) directive"
      />

      <VArrow x={CX} y1={266} y2={286} />

      <Box x={40} y={286} w={150} h={52} title="DataFetchers" />
      <HArrow y={312} x1={194} x2={236} />
      <Box
        x={240}
        y={286}
        w={220}
        h={52}
        title="DataLoader"
        lines={["batches keys"]}
      />
      <HArrow y={312} x1={464} x2={506} />
      <Box
        x={510}
        y={286}
        w={200}
        h={52}
        title="one query per batch"
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/grpc: two halves plus the interceptor order ------- */

function GrpcServerClient() {
  const colW = 386;
  const sX = 8;
  const cX = 434;
  const sC = sX + colW / 2;
  const cC = cX + colW / 2;
  const chain = [
    "Metrics",
    "ConcurrencyLimit",
    "Auth",
    "Tracing",
    "Logging",
    "Exception",
  ];
  const bw = 126;
  const gap = 9;
  const xs = chain.map((_, i) => 8 + i * (bw + gap));
  const cs = xs.map((x) => x + bw / 2);

  return (
    <Frame
      width={828}
      height={396}
      minWidth={660}
      label="On the server GrpcServiceRegistrar hands @GrpcService beans to AdharGrpcServer; on the client GrpcClientBeanPostProcessor injects channels from AdharGrpcClientFactory, which caches one channel per name. They meet over HTTP/2 on port 9090, and the server interceptor chain runs Metrics, ConcurrencyLimit, Auth, Tracing, Logging and Exception outermost-first before your service implementation."
    >
      <Caption x={sX} y={18} size={11} weight={700} color={C.primary}>
        SERVER
      </Caption>
      <Caption x={cX} y={18} size={11} weight={700} color={C.accent}>
        CLIENT
      </Caption>

      <Box x={sX} y={30} w={colW} h={40} title="@GrpcService beans" />
      <VArrow x={sC} y1={70} y2={84} />
      <Box
        x={sX}
        y={84}
        w={colW}
        h={52}
        title="GrpcServiceRegistrar"
        lines={["(afterSingletons…)"]}
      />
      <VArrow x={sC} y1={136} y2={150} />
      <Box
        x={sX}
        y={150}
        w={colW}
        h={52}
        title="AdharGrpcServer"
        lines={["addService / start"]}
        tone="primary"
      />

      <Box x={cX} y={30} w={colW} h={40} title={'@GrpcClient("payments")'} />
      <VArrow x={cC} y1={70} y2={84} />
      <Box x={cX} y={84} w={colW} h={52} title="GrpcClientBeanPostProc." />
      <VArrow x={cC} y1={136} y2={150} />
      <Box
        x={cX}
        y={150}
        w={colW}
        h={52}
        title="AdharGrpcClientFactory"
        lines={["getChannel(name) cached"]}
        tone="accent"
      />

      <path
        d={`M ${cC} 202 L ${cC} 230 L ${sC} 230 L ${sC} 206`}
        fill="none"
        stroke={C.strong}
        strokeWidth={1.5}
        markerEnd="url(#dk-arrow)"
      />
      <Caption x={(sC + cC) / 2} y={224} anchor="middle" size={11} weight={600}>
        HTTP/2 :9090
      </Caption>

      <Caption x={8} y={268} size={11} weight={600} color={C.text}>
        server interceptor chain, outermost first
      </Caption>
      {chain.map((name, i) => (
        <g key={name}>
          <Box
            x={xs[i]}
            y={280}
            w={bw}
            h={40}
            title={name}
            titleSize={11}
            tone={i === 0 ? "primary" : "plain"}
          />
          {i < chain.length - 1 && (
            <HArrow y={300} x1={xs[i] + bw + 2} x2={xs[i] + bw + gap - 2} />
          )}
        </g>
      ))}
      <VArrow x={cs[5]} y1={320} y2={342} />
      <Box
        x={cs[5] - 75}
        y={342}
        w={150}
        h={40}
        title="your service impl"
        titleSize={11}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/health: indicators, registry, groups ---------------- */

const HealthRegistryFlow = () => (
  <Flow
    label="Health indicator beans register with HealthRegistry, which caches results for a TTL, applies a per-check timeout and rolls them up worst-of into the liveness, readiness, startup and default groups that the Kubernetes probes read."
    caption="Kubernetes probes read /health/live and /health/ready."
    nodes={[
      {
        title: "@HealthIndicator beans",
        lines: [
          "DatabaseHealthIndicator",
          "RedisHealthIndicator",
          "PaymentGatewayHealth",
          "ReadinessStateManager",
        ],
        tone: "primary",
      },
      {
        title: "HealthRegistry",
        lines: [
          "register(...)",
          "TTL cache (10s)",
          "per-check timeout",
          "worst-of rollup",
          "transition history",
        ],
      },
      {
        title: "Groups",
        lines: ["liveness", "readiness", "startup", "default"],
        tone: "accent",
      },
    ]}
  />
);

/* ---------------- modules/messaging: publish, then the handler chain -------- */

function MessagingChain() {
  const LEFT = 8;
  const BOXW = 280;
  const CX = LEFT + BOXW / 2;
  const TX = 306;
  const IX = 28;
  const IW = 300;
  const ICX = IX + IW / 2;
  const ITX = 348;

  return (
    <Frame
      width={720}
      height={490}
      label="A publish is wrapped as a CloudEvents Message by CloudEventAdapter, sent by MessagePublisher to Kafka or RabbitMQ, and received by MessageListener; every subscription then runs through deduplication, retry, your consumer, and finally the dead-letter publisher."
    >
      <Box
        x={LEFT}
        y={14}
        w={BOXW}
        h={40}
        title="publish(topic, payload)"
        tone="primary"
      />
      <VArrow x={CX} y1={54} y2={68} />

      <Box x={LEFT} y={68} w={BOXW} h={40} title="CloudEventAdapter" />
      <Caption x={TX} y={92}>
        Message&lt;T&gt; (ce-id, ce-type, ce-source, ce-time)
      </Caption>
      <VArrow x={CX} y1={108} y2={122} />

      <Box x={LEFT} y={122} w={BOXW} h={40} title="MessagePublisher" />
      <Caption x={TX} y={146}>
        Kafka topic / RabbitMQ exchange
      </Caption>
      <VArrow x={CX} y1={162} y2={176} />

      <Box x={LEFT} y={176} w={BOXW} h={40} title="MessageListener" />
      <VArrow x={CX} y1={216} y2={234} />

      <GroupBox x={8} y={234} w={704} h={244} label="handler chain" />

      <Box
        x={IX}
        y={262}
        w={IW}
        h={40}
        title="DeduplicatingMessageHandler"
        titleSize={12}
      />
      <Caption x={ITX} y={286}>
        ce-id seen before?
      </Caption>
      <VArrow x={ICX} y1={302} y2={316} />

      <Box x={IX} y={316} w={IW} h={40} title="RetryingMessageHandler" />
      <Caption x={ITX} y={340}>
        n attempts, backoff
      </Caption>
      <VArrow x={ICX} y1={356} y2={370} />

      <Box
        x={IX}
        y={370}
        w={IW}
        h={40}
        title="your Consumer<T>"
        tone="accent"
      />
      <VArrow x={ICX} y1={410} y2={424} />
      <Caption x={ICX + 10} y={421} size={10}>
        still failing
      </Caption>

      <Box x={IX} y={424} w={IW} h={40} title="DeadLetterPublisher" />
      <Caption x={ITX} y={448}>
        → &lt;topic&gt;.dlq
      </Caption>
    </Frame>
  );
}

/* ---------------- modules/notification: route, guard, send ------------------ */

function NotificationSend() {
  const CX = 380;
  const channels = [
    { title: "EMAIL", line: "JavaMail" },
    { title: "WEBHOOK", line: "WebClient" },
    { title: "IN_APP", line: "logged" },
    { title: "SMS", line: "HTTP" },
    { title: "Dapr binding", line: "smtp / sms" },
  ];
  const cw = 140;
  const cgap = 9;
  const cxs = channels.map((_, i) => 12 + i * (cw + cgap));
  const ccs = cxs.map((x) => x + cw / 2);
  const guards: [string, string][] = [
    ["preferences", "has the user opted out?"],
    ["rate limit", "within maxPerWindow?"],
    ["idempotency", "seen this key already?"],
  ];

  return (
    <Frame
      width={760}
      height={400}
      label="A notification is routed to the first channel whose supports(type) matches — email, webhook, in-app, SMS or a Dapr binding — then the preference, rate-limit and idempotency guards run, and a successful send writes a history entry and a CloudEvent."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        adhar.notify(…)   /   sendFromTemplate(…)
      </Mono>
      <VArrow x={CX} y1={28} y2={46} tone="primary" />

      <Box
        x={280}
        y={46}
        w={200}
        h={40}
        title="Notification (record)"
        tone="primary"
      />

      <Caption x={CX + 12} y={104}>
        findChannel: first channel where supports(type)
      </Caption>
      <line
        x1={CX}
        y1={86}
        x2={CX}
        y2={112}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={ccs[0]} x2={ccs[4]} y={112} />
      {ccs.map((c, i) => (
        <VArrow key={i} x={c} y1={112} y2={124} />
      ))}
      {channels.map((ch, i) => (
        <Box
          key={ch.title}
          x={cxs[i]}
          y={124}
          w={cw}
          h={56}
          title={ch.title}
          titleSize={12}
          lines={[ch.line]}
        />
      ))}

      <VArrow x={CX} y1={180} y2={206} />
      <Caption x={CX + 12} y={196}>
        none matches → UnsupportedOperationException
      </Caption>

      <Plate x={170} y={206} w={420} h={86} />
      {guards.map(([name, q], i) => (
        <g key={name}>
          <Mono x={190} y={232 + i * 22} size={11.5} weight={600}>
            {name}
          </Mono>
          <Caption x={296} y={232 + i * 22}>
            {q}
          </Caption>
        </g>
      ))}
      <Caption x={600} y={254} weight={600}>
        any hit → return
      </Caption>

      <VArrow x={CX} y1={292} y2={316} />
      <Caption x={CX + 12} y={308}>
        send, then retry with exponential backoff
      </Caption>

      <Box
        x={200}
        y={316}
        w={360}
        h={72}
        title="history entry  +  CloudEvent"
        lines={[
          "com.adhar.notification.sent",
          "com.adhar.notification.failed",
        ]}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/overview: who depends on what -------------------- */

function ModuleDependencies() {
  const dependents = [
    "logging · metrics · cache · config · health · batch",
    "messaging · persistence · notification · graphql · ai",
    "analytics · event-sourcing · dapr · resilience · rewrite",
    "perf-profiler · maven-plugin · test-commons · starter",
  ];
  const siblings = [
    "resilience → metrics",
    "analytics → persistence, messaging",
    "cache, config, messaging, notification, persistence,",
    "event-sourcing, security → dapr",
  ];

  return (
    <Frame
      width={740}
      height={470}
      label="Module dependencies: core, docs and grpc stand alone; adhar-kit-commons is required by twenty modules and optional for tracing, kubernetes and security; every sibling edge — resilience to metrics, analytics to persistence and messaging, and seven modules to dapr — is optional."
    >
      <line
        x1={8}
        y1={16}
        x2={40}
        y2={16}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Caption x={48} y={20}>
        required edge
      </Caption>
      <line
        x1={178}
        y1={16}
        x2={210}
        y2={16}
        stroke={C.line}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <Caption x={218} y={20}>
        {"optional edge (<optional>true</optional>)"}
      </Caption>

      <Box
        x={8}
        y={34}
        w={724}
        h={62}
        title="Standalone — no dependency on any other kit module"
        lines={["adhar-kit-core · adhar-kit-docs · adhar-kit-grpc"]}
        tone="muted"
      />

      <Box
        x={8}
        y={118}
        w={724}
        h={78}
        title="adhar-kit-commons"
        lines={[
          "framework detection · AdharCloudEvent · DDD annotations",
          "tenant & correlation context · idempotency",
        ]}
        tone="primary"
      />

      <line
        x1={370}
        y1={240}
        x2={370}
        y2={200}
        stroke={C.strong}
        strokeWidth={1.5}
        markerEnd="url(#dk-arrow)"
      />
      <Caption x={382} y={224} weight={600}>
        required by 20 modules
      </Caption>

      <Plate x={8} y={240} w={724} h={120} />
      {dependents.map((row, i) => (
        <Mono key={row} x={370} y={266 + i * 17} anchor="middle" size={11}>
          {row}
        </Mono>
      ))}
      <line
        x1={28}
        y1={330}
        x2={712}
        y2={330}
        stroke={C.line}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <Mono x={370} y={348} anchor="middle" size={11} color={C.dim}>
        tracing · kubernetes · security   (optional edge)
      </Mono>

      <Caption x={8} y={384} size={11} weight={600} color={C.text}>
        Sibling edges, all optional
      </Caption>
      {siblings.map((row, i) => (
        <Mono key={row} x={28} y={404 + i * 16} size={11} color={C.dim}>
          {row}
        </Mono>
      ))}
    </Frame>
  );
}

/* ---------------- modules/persistence: four concerns, one session ----------- */

function PersistenceLayers() {
  const concerns: [string, string][] = [
    ["AuditableEntity", "@CreatedDate / @CreatedBy / @Version"],
    ["SoftDeletableEntity", '@SQLRestriction("deleted=false")'],
    ["Multi-tenancy", "TenantContext → schema resolver"],
    ["Outbox", "row written in the SAME transaction"],
  ];

  return (
    <Frame
      width={740}
      height={408}
      label="PersistenceFacade delegates to SpringPersistenceAdapter over the same JPA session that carries auditing, soft delete, multi-tenancy and the outbox; the business row and the outbox row commit together, and OutboxPublisher polls with SELECT FOR UPDATE SKIP LOCKED before handing each event to OutboxRelay."
    >
      <Box
        x={8}
        y={14}
        w={300}
        h={40}
        title="your @Service (@Transactional)"
        tone="primary"
      />
      <VArrow x={158} y1={54} y2={74} />

      <Box x={8} y={74} w={300} h={40} title="PersistenceFacade" />
      <HArrow y={94} x1={312} x2={396} />
      <Caption x={354} y={85} anchor="middle">
        delegate
      </Caption>
      <Box
        x={400}
        y={66}
        w={332}
        h={56}
        title="SpringPersistenceAdapter"
        lines={["EntityManager + TxManager"]}
      />

      <VArrow x={158} y1={114} y2={138} />
      <Plate x={8} y={138} w={724} h={116} />
      {concerns.map(([name, detail], i) => (
        <g key={name}>
          <Mono x={28} y={164 + i * 26} size={11.5} weight={600}>
            {name}
          </Mono>
          <Mono x={200} y={164 + i * 26} size={11} color={C.dim}>
            {detail}
          </Mono>
        </g>
      ))}

      <VArrow x={158} y1={254} y2={282} />
      <Caption x={158} y={298} anchor="middle" size={11} weight={600}>
        COMMIT
      </Caption>

      <VArrow x={561} y1={254} y2={278} />
      <Box
        x={390}
        y={278}
        w={342}
        h={56}
        title="OutboxPublisher polls"
        lines={["SELECT … FOR UPDATE SKIP LOCKED"]}
      />
      <VArrow x={561} y1={334} y2={356} />
      <Box
        x={430}
        y={356}
        w={262}
        h={40}
        title="OutboxRelay.relay(event)"
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/security: filters, then the aspect ---------------- */

function SecurityLayers() {
  const SX = 168;
  const chainRows = [
    "sessions STATELESS",
    "CORS → CsrfTokenRepository → oauth2ResourceServer.jwt",
    "   ↳ JwtDecoder validates, JwtUtils maps claims to the GrantedAuthority set",
    "authorization: permit-all / authenticated / authorities,",
    "   then anyRequest().authenticated()",
  ];
  const aspectRules = [
    "method-level annotation wins over class-level",
    "role AND permission constraints must both pass",
    "failure → AccessDeniedException",
  ];

  return (
    <Frame
      width={740}
      height={478}
      label="A request passes the servlet filters, then the SecurityFilterChain which validates the JWT and populates the SecurityContext; AccessControlAspect then evaluates @RequiresRole and @RequiresPermission before your method runs."
    >
      <Mono x={SX} y={20} anchor="middle" size={12.5} weight={600}>
        HTTP request
      </Mono>
      <VArrow x={SX} y1={28} y2={48} tone="primary" />

      <GroupBox x={8} y={48} w={724} h={90} label="servlet filters" />
      <NamedRow
        x={28}
        descX={248}
        y={88}
        name="SecurityHeadersFilter"
        desc="HSTS, CSP, frame-options, …"
      />
      <NamedRow
        x={28}
        descX={248}
        y={108}
        name="RateLimitingFilter"
        desc="memory or Redis store"
      />
      <NamedRow
        x={28}
        descX={248}
        y={128}
        name="ApiKeyAuthenticationFilter"
        desc="X-API-Key → principal"
      />

      <VArrow x={SX} y1={138} y2={158} />

      <GroupBox x={8} y={158} w={724} h={124} label="SecurityFilterChain" />
      {chainRows.map((row, i) => (
        <Mono key={row} x={28} y={198 + i * 18} size={11} color={C.dim}>
          {row}
        </Mono>
      ))}

      <VArrow x={SX} y1={282} y2={306} />
      <Caption x={SX + 12} y={298} weight={600}>
        SecurityContext populated
      </Caption>

      <Box
        x={8}
        y={306}
        w={320}
        h={40}
        title="@RequiresRole / @RequiresPermission"
        titleSize={12}
      />
      <VArrow x={SX} y1={346} y2={366} />
      <Box
        x={8}
        y={366}
        w={320}
        h={40}
        title="AccessControlAspect (@Around)"
        tone="primary"
      />
      {aspectRules.map((r, i) => (
        <g key={r}>
          <circle cx={348} cy={368 + i * 16} r={2.5} fill={C.strong} />
          <Caption x={360} y={372 + i * 16}>
            {r}
          </Caption>
        </g>
      ))}

      <VArrow x={SX} y1={406} y2={426} />
      <Box x={8} y={426} w={320} h={40} title="your method" tone="accent" />
    </Frame>
  );
}

/* ---------------- modules/ai: three ways in, one pipeline ------------------ */

function AiPipeline() {
  const CX = 380;
  const entries = [
    "@AiChat method",
    "AiFacade.chat(…)",
    "POST /api/v1/ai/chat",
  ];
  const ew = 240;
  const exs = entries.map((_, i) => 8 + i * (ew + 12));
  const ecs = exs.map((x) => x + ew / 2);
  const steps: [string, string, string][] = [
    ["1", "AiRateLimiter.checkRateLimit(identifier)", "reject over quota"],
    ["2", "AiSecurityValidator.validateRequest(…)", "guardrails on input"],
    ["3", "cache lookup (@AiCache)", "exact hash, then optional semantic"],
    ["4", "Spring AI ChatModel.call(…)", "the provider"],
    ["5", "securityValidator.sanitizeContent(output)", "guardrails on output"],
    ["6", "AiMetricsCollector", "recordChatRequest / recordCost"],
  ];

  return (
    <Frame
      width={760}
      height={394}
      label="An @AiChat method, AiFacade.chat and POST /api/v1/ai/chat all route into AiServiceImpl.chat, which runs one pipeline — rate limit, input guardrails, cache lookup, the Spring AI ChatModel call, output guardrails, then metrics and cost — and returns an AiChatResponse."
    >
      {entries.map((e, i) => (
        <Box
          key={e}
          x={exs[i]}
          y={14}
          w={ew}
          h={40}
          title={e}
          titleSize={12}
          tone="primary"
        />
      ))}
      {ecs.map((c, i) => (
        <line
          key={`d${i}`}
          x1={c}
          y1={54}
          x2={c}
          y2={72}
          stroke={C.strong}
          strokeWidth={1.5}
        />
      ))}
      <Rail x1={ecs[0]} x2={ecs[2]} y={72} />
      <VArrow x={CX} y1={72} y2={94} tone="primary" />

      <Box x={240} y={94} w={280} h={44} title="AiServiceImpl.chat()" />
      <VArrow x={CX} y1={138} y2={158} />

      <Plate x={8} y={158} w={744} h={160} />
      {steps.map(([n, name, desc], i) => (
        <g key={name}>
          <Mono x={28} y={186 + i * 22} size={11} color={C.dim} weight={600}>
            {n}
          </Mono>
          <Mono x={48} y={186 + i * 22} size={11.5} weight={600}>
            {name}
          </Mono>
          <Caption x={356} y={186 + i * 22}>
            {desc}
          </Caption>
        </g>
      ))}

      <VArrow x={CX} y1={318} y2={342} />
      <Box x={280} y={342} w={200} h={40} title="AiChatResponse" tone="accent" />
    </Frame>
  );
}

/* ---------------- modules/analytics: consent, scrub, batch, send ----------- */

const AnalyticsPipeline = () => (
  <Ladder
    width={780}
    boxW={268}
    label="Every analytics call passes the consent gateway, the PII scrubber and a bounded batching sender before OkHttpPostHogClient posts it to PostHog; a failed send falls into a retry buffer with exponential backoff and an optional JSONL spill file."
    rungs={[
      {
        name: "track() / identify() / group()",
        adds: [],
        tone: "primary",
      },
      {
        name: "ConsentGateway",
        adds: ["distinct id opted out? → drop, return"],
      },
      {
        name: "PiiScrubber",
        adds: [
          "redacted keys + pattern detection",
          "→ ***REDACTED***",
        ],
      },
      {
        name: "BatchingEventSender",
        detail: "bounded queue (queue-capacity)",
        adds: [
          "overflow → DROP_OLDEST | BLOCK",
          "flush on batch-size OR flush-interval",
        ],
      },
      {
        name: "OkHttpPostHogClient",
        adds: ["→ PostHog /capture"],
        tone: "accent",
      },
      {
        name: "retry buffer",
        detail: "on failure",
        adds: ["exp. backoff → optional JSONL spill file"],
      },
    ]}
  />
);

/* ---------------- modules/batch: schedule, lock, launch -------------------- */

function BatchFlow() {
  const CX = 380;
  const LC = 190;
  const RC = 570;

  return (
    <Frame
      width={760}
      height={480}
      label="BatchFacade owns a BatchScheduler that turns cron expressions into TaskScheduler fires, takes a SchedulerLock per job so only one replica launches it, and runs the Spring Batch job through JobLauncher with a unique run.id; AdharJobExecutionListener feeds BatchMetrics and publishes BatchJobFailedEvent."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        adhar.getBatch()
      </Mono>
      <VArrow x={CX} y1={28} y2={46} tone="primary" />
      <Box x={290} y={46} w={180} h={40} title="BatchFacade" tone="primary" />

      <line
        x1={CX}
        y1={86}
        x2={CX}
        y2={104}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={LC} x2={RC} y={104} />
      <VArrow x={LC} y1={104} y2={122} />
      <VArrow x={RC} y1={104} y2={122} />

      <Box
        x={60}
        y={122}
        w={260}
        h={56}
        title="BatchScheduler"
        lines={["cron → TaskScheduler"]}
      />
      <Box
        x={440}
        y={122}
        w={260}
        h={56}
        title="BatchMetrics"
        lines={["Micrometer, optional"]}
      />

      <VArrow x={LC} y1={178} y2={204} />
      <Caption x={LC + 12} y={196}>
        per fire time
      </Caption>
      <Box
        x={10}
        y={204}
        w={360}
        h={40}
        title="SchedulerLock.tryLock(jobName, ttl)"
        titleSize={12}
      />
      <VArrow x={LC} y1={244} y2={270} />
      <Caption x={LC + 12} y={262}>
        not acquired → skip on this node
      </Caption>
      <Box
        x={10}
        y={270}
        w={360}
        h={40}
        title="JobLauncher.run(job, run.id=<millis>)"
        titleSize={12}
      />
      <VArrow x={LC} y1={310} y2={332} />
      <Box
        x={10}
        y={332}
        w={360}
        h={56}
        title="Spring Batch Job"
        lines={["Step (chunk) → Reader / Processor / Writer"]}
      />
      <VArrow x={LC} y1={388} y2={410} />
      <Box
        x={10}
        y={410}
        w={360}
        h={56}
        title="AdharStepExecutionListener"
        titleSize={12}
        lines={["AdharSkipListener"]}
      />

      <Box
        x={440}
        y={270}
        w={260}
        h={40}
        title="AdharJobExecutionListener"
        titleSize={11.5}
      />
      <VArrow x={RC} y1={270} y2={182} />
      <Caption x={RC + 12} y={228}>
        recordJobExecution
      </Caption>
      <VArrow x={RC} y1={310} y2={332} />
      <Box
        x={450}
        y={332}
        w={240}
        h={40}
        title="BatchJobFailedEvent"
        titleSize={12}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/cache: L1, metrics, L2 --------------------------- */

function CacheLayers() {
  const CX = 390;
  const metrics = [
    "adhar.cache.gets{result=hit|miss}",
    "adhar.cache.evictions",
    "adhar.cache.hit.ratio",
    "adhar.cache.size",
  ];
  const multi: [string, boolean][] = [
    ["L1: CacheManager", false],
    ["L2: SecondLevelCache", false],
    ["InMemory (default)", true],
    ["SpringCache (e.g. Redis)", true],
    ["Dapr", true],
  ];

  return (
    <Frame
      width={784}
      height={448}
      minWidth={640}
      label="The caching annotations run through CachingAspect, which builds a key with CacheKeyGenerator and resolves a named CacheFacade through CacheManager; the facade wraps a Caffeine L1 and reports to Micrometer through CacheMetricsBinder, while MultiLevelCacheService adds an L2 behind it and the Kafka cache listener carries invalidation between nodes."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        @Cacheable / @CachePut / @CacheEvict
      </Mono>
      <VArrow x={CX} y1={28} y2={48} tone="primary" />

      <Box x={250} y={48} w={280} h={40} title="CachingAspect" />
      <Rail x1={530} x2={552} y={68} />
      <Box
        x={552}
        y={40}
        w={232}
        h={56}
        title="CacheKeyGenerator"
        titleSize={12}
        lines={["SpEL key + KeyPartitionResolver"]}
      />

      <VArrow x={CX} y1={88} y2={110} />
      <Box x={250} y={110} w={280} h={40} title="CacheManager" />

      <line
        x1={CX}
        y1={150}
        x2={CX}
        y2={170}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={136} x2={658} y={170} />
      <VArrow x={136} y1={170} y2={188} />
      <VArrow x={658} y1={170} y2={188} />

      <Box
        x={16}
        y={188}
        w={240}
        h={40}
        title={'CacheFacade("products")'}
        titleSize={12}
        tone="primary"
      />
      <HArrow y={208} x1={260} x2={290} />
      <Box x={294} y={188} w={130} h={40} title="Caffeine L1" tone="accent" />

      <VArrow x={136} y1={228} y2={250} />
      <Box
        x={16}
        y={250}
        w={240}
        h={40}
        title="CacheMetricsBinder"
        titleSize={12}
      />
      <HArrow y={270} x1={260} x2={290} />
      <Box x={294} y={250} w={130} h={40} title="Micrometer" titleSize={12} />
      <line
        x1={359}
        y1={290}
        x2={359}
        y2={302}
        stroke={C.line}
        strokeWidth={1}
      />
      {metrics.map((m, i) => (
        <Mono key={m} x={294} y={316 + i * 16} size={11} color={C.dim}>
          {m}
        </Mono>
      ))}

      <Box
        x={538}
        y={188}
        w={240}
        h={56}
        title="MultiLevelCacheService"
        titleSize={12}
        lines={["for @MultiLevelCache"]}
      />
      <VArrow x={658} y1={244} y2={266} />
      <Plate x={540} y={266} w={236} h={114} />
      {multi.map(([row, indented], i) => (
        <Mono
          key={row}
          x={indented ? 584 : 560}
          y={290 + i * 18}
          size={11}
          color={indented ? C.dim : C.text}
          weight={indented ? 400 : 600}
        >
          {row}
        </Mono>
      ))}

      <Box
        x={16}
        y={392}
        w={752}
        h={46}
        title="KafkaCacheListener / KafkaCacheManager"
        titleSize={12}
        lines={["cross-node invalidation messages"]}
        tone="muted"
      />
    </Frame>
  );
}

/* ---------------- modules/config: priority merge --------------------------- */

function ConfigPriority() {
  const CX = 370;
  const sources: [string, string, string][] = [
    ["EnvironmentConfigSource", "200", "added automatically"],
    ["VaultConfigSource", "150", ""],
    ["ConsulConfigSource", "140", ""],
    ["ConfigMapConfigSource", "130", ""],
    ["FileConfigSource", "", "explicit; interface default 100"],
    ["<your ConfigSource bean>", "", "contributed, any priority"],
  ];

  return (
    <Frame
      width={740}
      height={390}
      label="ConfigManager keeps its sources sorted by priority — environment 200, Vault 150, Consul 140, ConfigMap 130, file and contributed beans below — resolves a key from the highest-priority source that has it, and passes the result through PropertyEncryptor so ENC(...) values are decrypted on read."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        getProperty(&quot;database.url&quot;)
      </Mono>
      <VArrow x={CX} y1={28} y2={48} tone="primary" />

      <GroupBox
        x={8}
        y={48}
        w={724}
        h={182}
        label="ConfigManager — sources sorted by priority, highest first"
      />
      {sources.map(([name, priority, note], i) => (
        <g key={name}>
          <Mono x={28} y={86 + i * 22} size={11.5} weight={600}>
            {name}
          </Mono>
          {priority ? (
            <Mono
              x={240}
              y={86 + i * 22}
              size={12}
              weight={700}
              color={C.primary}
            >
              {priority}
            </Mono>
          ) : (
            <Caption x={240} y={86 + i * 22}>
              {note}
            </Caption>
          )}
          {priority && note && (
            <Caption x={300} y={86 + i * 22}>
              {note}
            </Caption>
          )}
        </g>
      ))}

      <VArrow x={CX} y1={230} y2={254} />
      <Box
        x={250}
        y={254}
        w={240}
        h={56}
        title="PropertyEncryptor"
        lines={["ENC(…) → plaintext"]}
      />
      <VArrow x={CX} y1={310} y2={332} />
      <Box x={290} y={332} w={160} h={40} title="resolved value" tone="accent" />
    </Frame>
  );
}

/* ---------------- modules/dapr: app, sidecar, components ------------------- */

function DaprSidecar() {
  return (
    <Frame
      width={760}
      height={352}
      label="Inside the pod your application — AdharDaprClient, DaprFacade and the @DaprState and @DaprPublish aspects — talks only to the local Dapr sidecar on port 3500 HTTP or 50001 gRPC; Dapr reads GET /dapr/subscribe to learn the subscriptions and then delivers to POST /dapr/subscribe/<pubsub>/<topic>, while the sidecar resolves the named components."
    >
      <GroupBox x={8} y={14} w={744} h={226} label="pod" />

      <Box
        x={32}
        y={48}
        w={320}
        h={98}
        title="your app"
        lines={[
          "AdharDaprClient",
          "DaprFacade",
          "@DaprState aspect",
          "@DaprPublish aspect",
        ]}
        tone="primary"
      />
      <HArrow y={97} x1={356} x2={412} />
      <Box
        x={416}
        y={48}
        w={312}
        h={98}
        title="dapr sidecar"
        lines={[":3500 HTTP", ":50001 gRPC"]}
        tone="accent"
      />

      <Box
        x={32}
        y={164}
        w={320}
        h={56}
        title="GET  /dapr/subscribe"
        titleSize={12}
        lines={["POST /dapr/subscribe/<pubsub>/<topic>"]}
      />
      <path
        d="M 572 146 L 572 192 L 356 192"
        fill="none"
        stroke={C.strong}
        strokeWidth={1.5}
        markerEnd="url(#dk-arrow)"
      />
      <Caption x={464} y={186} anchor="middle">
        Dapr asks, then delivers
      </Caption>

      <VArrow x={660} y1={146} y2={268} />
      <Box
        x={8}
        y={268}
        w={744}
        h={72}
        title="components"
        lines={[
          "statestore · pubsub · secretstore",
          "configstore · lockstore · bindings",
        ]}
      />
    </Frame>
  );
}

/* ---------------- modules/kubernetes: environment vs API server ------------ */

function KubernetesServices() {
  const services: [string, string][] = [
    ["CachedServiceDiscovery", ""],
    ["DeploymentService", ""],
    ["IngressService", ""],
    ["HorizontalPodAutoscalerService", ""],
    ["ResourceMonitoringService", ""],
    ["ConfigMapReloadService", "→ ConfigMapChangedEvent"],
    ["SecretWatchService", "→ SecretChangedEvent"],
    ["LeaderElectionService", "→ Lease contention"],
  ];

  return (
    <Frame
      width={780}
      height={446}
      minWidth={640}
      label="Environment facts come from the downward API through KubernetesUtils with no credentials, while live API access goes through the KubernetesClient bean you supply, which backs service discovery, deployments, ingress, autoscaling, resource monitoring, ConfigMap and Secret watches and leader election; both sides feed the readiness and liveness health indicators."
    >
      <Box
        x={8}
        y={14}
        w={244}
        h={56}
        title="env / downward API"
        titleSize={12}
        lines={["no credentials"]}
        tone="muted"
      />
      <Box
        x={288}
        y={14}
        w={484}
        h={56}
        title="API server"
        lines={["ServiceAccount + RBAC"]}
        tone="muted"
      />
      <VArrow x={130} y1={70} y2={90} />
      <VArrow x={530} y1={70} y2={90} />

      <Box x={8} y={90} w={244} h={40} title="KubernetesUtils" tone="primary" />
      <Box
        x={288}
        y={90}
        w={484}
        h={56}
        title="KubernetesClient"
        lines={["you supply this bean"]}
        tone="primary"
      />

      <VArrow x={130} y1={130} y2={152} />
      <Box
        x={8}
        y={152}
        w={244}
        h={40}
        title="GracefulShutdownHandler"
        titleSize={11.5}
      />

      <VArrow x={530} y1={146} y2={166} />
      <Plate x={288} y={166} w={484} h={184} />
      {services.map(([name, event], i) => (
        <g key={name}>
          <Mono x={306} y={192 + i * 20} size={11.5} weight={600}>
            {name}
          </Mono>
          {event && (
            <Caption x={528} y={192 + i * 20}>
              {event}
            </Caption>
          )}
        </g>
      ))}

      <VArrow x={130} y1={192} y2={376} />
      <VArrow x={530} y1={350} y2={376} />
      <Box
        x={8}
        y={378}
        w={764}
        h={58}
        title="KubernetesReadinessHealthIndicator"
        titleSize={12}
        lines={["KubernetesLivenessHealthIndicator"]}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/logging: two paths, one encoder ------------------ */

function LoggingPaths() {
  return (
    <Frame
      width={740}
      height={422}
      label="Ordinary statements go through AdharLogger, while structured events go through AppLogEventPublisher and LogDataMasker to Slf4jAppLogEventSink or your own sink; both paths meet at MaskingJsonEncoder, which adds the MDC fields before writing to stdout, a file or Logstash."
    >
      <Mono x={180} y={20} anchor="middle" size={12} weight={600}>
        @Loggable / log.info(…)
      </Mono>
      <Mono x={540} y={20} anchor="middle" size={12} weight={600}>
        @BusinessEvent / @Audit / @LogBatchJob
      </Mono>
      <VArrow x={180} y1={28} y2={48} tone="primary" />
      <VArrow x={540} y1={28} y2={48} tone="primary" />

      <Box x={60} y={48} w={240} h={40} title="AdharLogger" />
      <Box
        x={420}
        y={48}
        w={240}
        h={40}
        title="AppLogEventPublisher"
        titleSize={12}
      />

      <VArrow x={540} y1={88} y2={110} />
      <Box
        x={400}
        y={110}
        w={280}
        h={56}
        title="LogDataMasker"
        lines={["mask before any sink"]}
        tone="primary"
      />

      <line
        x1={540}
        y1={166}
        x2={540}
        y2={184}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={460} x2={640} y={184} />
      <VArrow x={460} y1={184} y2={200} />
      <VArrow x={640} y1={184} y2={200} />
      <Box
        x={360}
        y={200}
        w={200}
        h={40}
        title="Slf4jAppLogEventSink"
        titleSize={11.5}
      />
      <Box
        x={560}
        y={200}
        w={160}
        h={40}
        title="<your sink>"
        titleSize={12}
        tone="muted"
      />

      <line
        x1={180}
        y1={88}
        x2={180}
        y2={258}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <line
        x1={460}
        y1={240}
        x2={460}
        y2={258}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={180} x2={460} y={258} />
      <VArrow x={320} y1={258} y2={280} />

      <Box
        x={120}
        y={280}
        w={400}
        h={70}
        title="MaskingJsonEncoder"
        lines={[
          "MDC: correlationId, requestId, tenantId,",
          "userId, traceId, spanId",
        ]}
      />
      <VArrow x={320} y1={350} y2={372} />
      <Box
        x={180}
        y={372}
        w={280}
        h={40}
        title="stdout / file / Logstash"
        titleSize={12}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/maven-plugin: goals by lifecycle phase ----------- */

function MavenGoals() {
  const phases: {
    name: string;
    goals: [string, string][];
    note?: string;
  }[] = [
    {
      name: "validate",
      goals: [
        ["adhar:version", "compute next semver from git history"],
        ["adhar:validate", "package, naming, annotations, layering"],
        ["adhar:deps", "dependency hygiene report"],
        ["adhar:bom", "BOM alignment report"],
      ],
    },
    {
      name: "generate-sources",
      goals: [["adhar:generate", "entity / repo / service / controller / DTO"]],
      note: "adds outputDirectory as a compile source root",
    },
    {
      name: "verify",
      goals: [["adhar:cve", "OSS Index scan, CVSS-thresholded"]],
    },
    {
      name: "deploy",
      goals: [["adhar:release", "tag, changelog, release notes, deploy"]],
    },
  ];

  let y = 40;
  const placed = phases.map((p) => {
    const rows = p.goals.length + (p.note ? 1 : 0);
    const h = rows * 20 + 20;
    const at = y;
    y += h + 14;
    return { ...p, y: at, h };
  });

  return (
    <Frame
      width={760}
      height={396}
      label="Each Maven goal binds to a default lifecycle phase: validate runs adhar:version, adhar:validate, adhar:deps and adhar:bom; generate-sources runs adhar:generate; verify runs adhar:cve; deploy runs adhar:release; and adhar:adr and adhar:scaffold have no phase and are invoked explicitly."
    >
      <Mono x={88} y={20} anchor="middle" size={12.5} weight={600}>
        mvn verify
      </Mono>
      <VArrow x={88} y1={26} y2={40} tone="primary" />

      {placed.map((p, i) => (
        <g key={p.name}>
          <Box
            x={8}
            y={p.y}
            w={160}
            h={p.h}
            title={p.name}
            titleSize={12.5}
            tone="primary"
          />
          {i < placed.length - 1 && (
            <VArrow x={88} y1={p.y + p.h + 2} y2={placed[i + 1].y - 2} />
          )}
          <Plate x={192} y={p.y} w={560} h={p.h} />
          {p.goals.map(([goal, purpose], k) => (
            <g key={goal}>
              <Mono x={212} y={p.y + 26 + k * 20} size={11.5} weight={600}>
                {goal}
              </Mono>
              <Caption x={326} y={p.y + 26 + k * 20}>
                {purpose}
              </Caption>
            </g>
          ))}
          {p.note && (
            <Caption x={326} y={p.y + 26 + p.goals.length * 20}>
              {p.note}
            </Caption>
          )}
        </g>
      ))}

      <Box
        x={8}
        y={340}
        w={744}
        h={46}
        title="no default phase — invoke explicitly"
        titleSize={12}
        lines={["adhar:adr · adhar:scaffold"]}
        tone="muted"
      />
    </Frame>
  );
}

/* ---------------- modules/metrics: sources, registry, export --------------- */

function MetricsRegistry() {
  const sources = [
    {
      title: "@Timed / @Counted / @Gauged …",
      titleSize: 12,
      line: "EnhancedMetricsAspect",
      y: 32,
      h: 56,
    },
    {
      title: "MetricsFacade",
      titleSize: 13,
      line: "increment / recordTime",
      y: 100,
      h: 56,
    },
    {
      title: "HttpMetricsFilter",
      titleSize: 13,
      line: "adhar.http.server.requests",
      y: 168,
      h: 56,
    },
    {
      title: "JVM / system / cgroup collectors",
      titleSize: 11.5,
      line: "",
      y: 236,
      h: 40,
    },
  ];

  return (
    <Frame
      width={800}
      height={480}
      minWidth={640}
      label="Annotations, the MetricsFacade, HttpMetricsFilter and the JVM collectors all feed one Micrometer MeterRegistry, which exports to /actuator/prometheus and optionally an OTLP collector; MeterFilters add the common tags and cap the uri tag at max-uri-tags, and SloRecorder turns HTTP outcomes into error-budget and burn-rate metrics."
    >
      <Caption x={8} y={20} size={11} weight={700}>
        SOURCES
      </Caption>
      <Caption x={340} y={20} size={11} weight={700}>
        REGISTRY
      </Caption>
      <Caption x={540} y={20} size={11} weight={700}>
        EXPORT
      </Caption>

      {sources.map((s) => (
        <g key={s.title}>
          <Box
            x={8}
            y={s.y}
            w={300}
            h={s.h}
            title={s.title}
            titleSize={s.titleSize}
            lines={s.line ? [s.line] : []}
          />
          <HArrow y={s.y + s.h / 2} x1={312} x2={336} />
        </g>
      ))}

      <Box
        x={340}
        y={32}
        w={160}
        h={244}
        title="MeterRegistry"
        titleSize={12.5}
        tone="primary"
      />

      <HArrow y={80} x1={504} x2={536} />
      <Box
        x={540}
        y={60}
        w={252}
        h={40}
        title="/actuator/prometheus"
        titleSize={12}
        tone="accent"
      />
      <HArrow y={168} x1={504} x2={536} />
      <Box
        x={540}
        y={140}
        w={252}
        h={56}
        title="OTLP collector"
        lines={["opt-in"]}
        tone="accent"
      />

      <VArrow x={420} y1={276} y2={300} />
      <Plate x={180} y={300} w={480} h={76} />
      <Mono x={200} y={324} size={11.5} weight={600}>
        MeterFilters
      </Mono>
      <Caption x={200} y={342}>
        common tags: application, environment, pod, namespace
      </Caption>
      <Caption x={200} y={358}>
        TagCardinalityLimiter caps uri at max-uri-tags
      </Caption>

      <VArrow x={420} y1={376} y2={400} />
      <Box
        x={180}
        y={400}
        w={480}
        h={70}
        title="SloRecorder reads HTTP outcomes"
        titleSize={12}
        lines={["adhar.slo.error_budget.remaining", "adhar.slo.burn_rate"]}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/perf-profiler: two recording paths --------------- */

function ProfilerPaths() {
  const CX = 380;
  return (
    <Frame
      width={760}
      height={482}
      label="A profiled call passes a sampleRate gate — an unsampled call runs and records nothing — then is timed with System.nanoTime and recorded twice: into a Micrometer timer that reaches your metrics backend, and into the bounded ProfilingRegistry whose rolling windows produce reports, hotspots and percentiles and raise SlowCallThresholdBreachedEvent when p99 crosses the alert threshold."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        @Profiled method / adhar.profiled(&quot;name&quot;, supplier)
      </Mono>
      <VArrow x={CX} y1={28} y2={48} tone="primary" />

      <Box x={260} y={48} w={240} h={40} title="sampleRate gate" />
      <Caption x={520} y={60} anchor="middle">
        not sampled
      </Caption>
      <HArrow y={68} x1={504} x2={536} />
      <Box
        x={540}
        y={48}
        w={212}
        h={56}
        title="run method"
        lines={["record nothing"]}
        tone="muted"
      />

      <VArrow x={CX} y1={88} y2={112} />
      <Box
        x={260}
        y={112}
        w={240}
        h={56}
        title="time the call"
        lines={["System.nanoTime"]}
        tone="primary"
      />

      <line
        x1={CX}
        y1={168}
        x2={CX}
        y2={188}
        stroke={C.strong}
        strokeWidth={1.5}
      />
      <Rail x1={180} x2={580} y={188} />
      <VArrow x={180} y1={188} y2={206} />
      <VArrow x={580} y1={188} y2={206} />

      <Box
        x={8}
        y={206}
        w={344}
        h={84}
        title="Micrometer Timer"
        lines={[
          '"adhar.profiler.<name>"',
          "tags: class, method,",
          "success, error",
        ]}
      />
      <VArrow x={180} y1={290} y2={314} />
      <Box
        x={28}
        y={314}
        w={304}
        h={40}
        title="your metrics backend"
        titleSize={12}
        tone="accent"
      />

      <Box
        x={408}
        y={206}
        w={344}
        h={56}
        title="ProfilingRegistry"
        lines={["maxTrackedMethods cap"]}
      />
      <VArrow x={580} y1={262} y2={286} />
      <Plate x={408} y={286} w={344} h={52} />
      <Mono x={428} y={310} size={11} color={C.dim}>
        rolling window (windowDuration)
      </Mono>
      <Mono x={428} y={328} size={11} color={C.dim}>
        history (historyWindows)
      </Mono>
      <VArrow x={580} y1={338} y2={362} />
      <Box
        x={408}
        y={362}
        w={344}
        h={40}
        title="ProfilingReport / hotspots / percentiles"
        titleSize={11}
      />
      <VArrow x={580} y1={402} y2={432} />
      <Caption x={568} y={420} anchor="end">
        p99 &gt; p99-alert-threshold-ms
      </Caption>
      <Box
        x={408}
        y={432}
        w={344}
        h={40}
        title="SlowCallThresholdBreachedEvent"
        titleSize={11.5}
        tone="accent"
      />
    </Frame>
  );
}

/* ---------------- modules/resilience: the decorator order ------------------ */

const ResilienceOrder = () => (
  <Ladder
    label="ResilienceAspect composes the Resilience4j decorators in one fixed order — Retry outermost, then CircuitBreaker, RateLimiter, TimeLimiter and Bulkhead innermost — around your method, which on failure falls back to fallbackMethod, then the FallbackCache, and otherwise propagates the exception."
    rungs={[
      { name: "caller", adds: [], tone: "primary" },
      {
        name: "Retry",
        adds: ["outermost: re-attempts the whole chain below"],
      },
      {
        name: "CircuitBreaker",
        adds: ["counts the outcome of each attempt"],
      },
      { name: "RateLimiter", adds: ["admission control"] },
      { name: "TimeLimiter", adds: ["bounds one attempt"] },
      { name: "Bulkhead", adds: ["innermost: concurrency cap"] },
      {
        name: "your method",
        adds: [
          "throws → fallbackMethod, else FallbackCache,",
          "else the exception propagates",
        ],
        tone: "accent",
      },
    ]}
  />
);

/* ---------------- modules/tracing: create, move, decide, export ------------ */

function TracingPath() {
  const CX = 198;
  return (
    <Frame
      width={760}
      height={420}
      label="An inbound request carrying W3C traceparent and baggage headers reaches TracingServerSpanFilter, which creates the server span and feeds TraceContextMdcFilter for log correlation; TracingAspect creates the annotated spans and TraceContextTaskDecorator carries context across an @Async hop, then the span processors record metrics and apply tail sampling before the exporter."
    >
      <Mono x={CX} y={20} anchor="middle" size={12.5} weight={600}>
        Inbound request
      </Mono>
      <Caption x={CX} y={36} anchor="middle">
        traceparent / baggage headers (W3C by default)
      </Caption>
      <VArrow x={CX} y1={42} y2={62} tone="primary" />

      <Box
        x={8}
        y={62}
        w={380}
        h={56}
        title="TracingServerSpanFilter"
        titleSize={12}
        lines={["creates the server span"]}
        tone="primary"
      />
      <HArrow y={90} x1={392} x2={424} />
      <Box
        x={428}
        y={62}
        w={324}
        h={56}
        title="TraceContextMdcFilter"
        titleSize={12}
        lines={["MDC{traceId, spanId} → logs"]}
      />

      <VArrow x={CX} y1={118} y2={142} />
      <Box
        x={8}
        y={142}
        w={380}
        h={70}
        title="TracingAspect"
        lines={[
          "@NewSpan · @ContinueSpan · @DatabaseSpan",
          "@HttpClientSpan · @MessagingSpan · @AsyncSpan",
        ]}
      />
      <HArrow y={177} x1={392} x2={424} />
      <Box
        x={428}
        y={149}
        w={324}
        h={56}
        title="TraceContextTaskDecorator"
        titleSize={12}
        lines={["context survives an @Async hop"]}
      />

      <VArrow x={CX} y1={212} y2={236} />
      <GroupBox x={8} y={236} w={744} h={94} label="Span processors" />
      <NamedRow
        x={28}
        descX={260}
        y={276}
        name="SpanMetricsProcessor"
        desc="span counts / latency into Micrometer"
      />
      <NamedRow
        x={28}
        descX={260}
        y={300}
        name="TailSamplingSpanProcessor"
        desc="keep-on-error / keep-on-latency"
      />

      <VArrow x={CX} y1={330} y2={354} />
      <Box
        x={8}
        y={354}
        w={744}
        h={56}
        title="Exporter"
        lines={["OTLP (default, gRPC :4317)  |  Zipkin  |  Jaeger"]}
        tone="accent"
      />
    </Frame>
  );
}

export const kit = {
  "kit-facade-layers": FacadeLayers,
  "kit-framework-adapters": FrameworkAdapters,
  "kit-annotation-vs-facade": AnnotationVsFacade,
  "kit-event-sourcing-flow": EventSourcingFlow,
  "kit-graphql-pipeline": GraphQlPipeline,
  "kit-grpc-server-client": GrpcServerClient,
  "kit-health-registry": HealthRegistryFlow,
  "kit-messaging-chain": MessagingChain,
  "kit-notification-send": NotificationSend,
  "kit-module-dependencies": ModuleDependencies,
  "kit-persistence-layers": PersistenceLayers,
  "kit-security-layers": SecurityLayers,
  "kit-ai-pipeline": AiPipeline,
  "kit-analytics-pipeline": AnalyticsPipeline,
  "kit-batch-flow": BatchFlow,
  "kit-cache-layers": CacheLayers,
  "kit-config-priority": ConfigPriority,
  "kit-dapr-sidecar": DaprSidecar,
  "kit-kubernetes-services": KubernetesServices,
  "kit-logging-paths": LoggingPaths,
  "kit-maven-goals": MavenGoals,
  "kit-metrics-registry": MetricsRegistry,
  "kit-profiler-paths": ProfilerPaths,
  "kit-resilience-order": ResilienceOrder,
  "kit-tracing-path": TracingPath,
} as Record<string, ComponentType>;
