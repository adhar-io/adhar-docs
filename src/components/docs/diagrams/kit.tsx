import type { ComponentType } from "react";
import {
  Box,
  C,
  Caption,
  Frame,
  GroupBox,
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

export const kit = {
  "kit-facade-layers": FacadeLayers,
  "kit-annotation-vs-facade": AnnotationVsFacade,
  "kit-event-sourcing-flow": EventSourcingFlow,
  "kit-grpc-server-client": GrpcServerClient,
  "kit-persistence-layers": PersistenceLayers,
} as Record<string, ComponentType>;
