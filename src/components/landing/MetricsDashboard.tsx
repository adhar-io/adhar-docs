import React, { useId, useMemo, useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  Clock,
  CheckCircle2,
  TrendingUp,
  Zap,
} from 'lucide-react';

// ---------- shared chart helpers ----------

type ChartTone = {
  /** Tailwind text-color class providing the line stroke + dot color via currentColor */
  text: string;
  /** Hex value used for SVG gradient stops (gradients can't read currentColor reliably) */
  hex: string;
  /** Tailwind background gradient classes for the progress bar */
  bar: string;
  /** Tailwind icon color class */
  icon: string;
  /** Tailwind background tint for the icon chip */
  chip: string;
};

const TONES: Record<'blue' | 'violet' | 'cyan' | 'emerald', ChartTone> = {
  blue: {
    text: 'text-[hsl(217_91%_60%)]',
    hex: '#3b82f6',
    bar: 'from-[hsl(217_91%_60%)] to-[hsl(217_91%_70%)]',
    icon: 'text-[hsl(217_91%_60%)]',
    chip: 'bg-[hsl(217_91%_60%/0.12)]',
  },
  violet: {
    text: 'text-[hsl(262_83%_65%)]',
    hex: '#8b5cf6',
    bar: 'from-[hsl(262_83%_58%)] to-[hsl(262_83%_70%)]',
    icon: 'text-[hsl(262_83%_65%)]',
    chip: 'bg-[hsl(262_83%_58%/0.12)]',
  },
  cyan: {
    text: 'text-[hsl(190_95%_55%)]',
    hex: '#06b6d4',
    bar: 'from-[hsl(190_95%_50%)] to-[hsl(190_95%_60%)]',
    icon: 'text-[hsl(190_95%_55%)]',
    chip: 'bg-[hsl(190_95%_50%/0.12)]',
  },
  emerald: {
    text: 'text-[hsl(152_70%_50%)]',
    hex: '#10b981',
    bar: 'from-[hsl(152_70%_45%)] to-[hsl(152_70%_55%)]',
    icon: 'text-[hsl(152_70%_50%)]',
    chip: 'bg-[hsl(152_70%_45%/0.12)]',
  },
};

// Build a smooth Catmull-Rom -> Bezier path
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

interface MiniChartProps {
  data: number[];
  tone: ChartTone;
  max?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, tone, max = 100 }) => {
  const uid = useId().replace(/:/g, '');
  const W = 200;
  const H = 64;
  const P = 4; // padding so stroke + glow aren't clipped

  const { linePath, areaPath, last } = useMemo(() => {
    const series = data.length ? data : [0];
    const ceil = Math.max(max, ...series);
    const points = series.map((v, i) => ({
      x: P + (i / Math.max(series.length - 1, 1)) * (W - P * 2),
      y: P + (1 - v / ceil) * (H - P * 2),
    }));
    const line = smoothPath(points);
    const area = `${line} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
    return { linePath: line, areaPath: area, last: points[points.length - 1] };
  }, [data, max]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-16 ${tone.text}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone.hex} stopOpacity="0.35" />
          <stop offset="100%" stopColor={tone.hex} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={`grid-${uid}`} width={W} height={H / 3} patternUnits="userSpaceOnUse">
          <path
            d={`M 0 0 L ${W} 0`}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="2 4"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      <rect width={W} height={H} fill={`url(#grid-${uid})`} />
      <path d={areaPath} fill={`url(#fill-${uid})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${uid})`}
      />
      {/* Latest-point dot with halo */}
      <circle cx={last.x} cy={last.y} r="4" fill="currentColor" opacity="0.18">
        <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.05;0.18" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={last.x} cy={last.y} r="2" fill="currentColor" />
    </svg>
  );
};

// ---------- main dashboard ----------

const MetricsDashboard = () => {
  const [metrics, setMetrics] = useState({
    deploymentsToday: 0,
    successRate: 0,
    avgDeployTime: 12.5,
    activeServices: 0,
    cpuUsage: 42,
    memoryUsage: 51,
    networkThroughput: 160,
    uptime: 99.95,
  });

  const [history, setHistory] = useState({
    cpu: Array(24).fill(0).map(() => 30 + Math.random() * 25),
    memory: Array(24).fill(0).map(() => 40 + Math.random() * 22),
    network: Array(24).fill(0).map(() => 100 + Math.random() * 100),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        deploymentsToday: Math.min(prev.deploymentsToday + 1, 247),
        successRate: Math.min(prev.successRate + 0.5, 99.8),
        avgDeployTime: Math.max(8.42, prev.avgDeployTime - 0.1),
        activeServices: Math.min(prev.activeServices + 1, 52),
        cpuUsage: 35 + Math.random() * 20,
        memoryUsage: 42 + Math.random() * 18,
        networkThroughput: 120 + Math.random() * 90,
        uptime: Math.min(prev.uptime + 0.001, 99.99),
      }));

      setHistory((prev) => ({
        cpu: [...prev.cpu.slice(1), 35 + Math.random() * 20],
        memory: [...prev.memory.slice(1), 42 + Math.random() * 18],
        network: [...prev.network.slice(1), 120 + Math.random() * 90],
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ---------- subcomponents ----------

  const MetricCard = ({
    icon: Icon,
    label,
    value,
    unit,
    tone,
    trend,
  }: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    unit: string;
    tone: ChartTone;
    trend?: 'up' | 'down' | 'stable';
  }) => (
    <div
      className="
        relative group overflow-hidden rounded-xl
        bg-card/60 backdrop-blur-md
        border border-border/60
        p-4 transition-all duration-500
        hover:border-primary/40 hover:-translate-y-0.5
        hover:shadow-lg hover:shadow-primary/10
      "
    >
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${tone.hex}33, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`grid place-items-center w-9 h-9 rounded-lg ${tone.chip}`}>
            <Icon className={`w-4.5 h-4.5 ${tone.icon}`} />
          </div>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full
                ${
                  trend === 'up'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : trend === 'down'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-amber-500/10 text-amber-500'
                }`}
            >
              <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
              {trend === 'up' ? '+12%' : trend === 'down' ? '−18%' : '0%'}
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
            {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 1) : value}
            <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );

  const ChartCard = ({
    icon: Icon,
    label,
    value,
    unit,
    tone,
    data,
    max,
    pct,
    subtitle,
  }: {
    icon: React.ElementType;
    label: string;
    value: number;
    unit: string;
    tone: ChartTone;
    data: number[];
    max?: number;
    pct?: number; // 0..100 for progress bar; omit to hide
    subtitle?: string;
  }) => (
    <div
      className="
        group relative overflow-hidden rounded-xl
        bg-card/60 backdrop-blur-md border border-border/60
        p-4 transition-all duration-500
        hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10
      "
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`grid place-items-center w-7 h-7 rounded-md ${tone.chip}`}>
            <Icon className={`w-3.5 h-3.5 ${tone.icon}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-lg font-bold tabular-nums ${tone.text}`}>
          {value.toFixed(unit === '%' ? 1 : 0)}
          <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
        </span>
      </div>

      <MiniChart data={data} tone={tone} max={max} />

      {typeof pct === 'number' && (
        <div className="mt-3">
          <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className={`bg-gradient-to-r ${tone.bar} h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_currentColor]`}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
        </div>
      )}
      {subtitle && (
        <div className="mt-2 text-[11px] text-muted-foreground tabular-nums">{subtitle}</div>
      )}
    </div>
  );

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <span className="relative grid place-items-center w-8 h-8 rounded-lg bg-primary/10">
              <Activity className="w-4.5 h-4.5 text-primary" />
              <span className="absolute inset-0 rounded-lg bg-primary/20 animate-ping opacity-40" />
            </span>
            Live Platform Metrics
          </h3>
          <p className="text-sm text-muted-foreground mt-1 ml-10">
            Real-time deployment and resource monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-emerald-500">All Systems Operational</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <MetricCard
          icon={Zap}
          label="Deployments Today"
          value={metrics.deploymentsToday}
          unit="deploys"
          tone={TONES.blue}
          trend="up"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Success Rate"
          value={metrics.successRate}
          unit="%"
          tone={TONES.emerald}
          trend="stable"
        />
        <MetricCard
          icon={Clock}
          label="Avg Deploy Time"
          value={metrics.avgDeployTime}
          unit="min"
          tone={TONES.violet}
          trend="down"
        />
        <MetricCard
          icon={Activity}
          label="Active Services"
          value={metrics.activeServices}
          unit="services"
          tone={TONES.cyan}
          trend="up"
        />
      </div>

      {/* Resource Usage Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <ChartCard
          icon={Cpu}
          label="CPU Usage"
          value={metrics.cpuUsage}
          unit="%"
          tone={TONES.blue}
          data={history.cpu}
          max={100}
        />
        <ChartCard
          icon={HardDrive}
          label="Memory"
          value={metrics.memoryUsage}
          unit="%"
          tone={TONES.violet}
          data={history.memory}
          max={100}
        />
        <ChartCard
          icon={Network}
          label="Network"
          value={metrics.networkThroughput}
          unit="MB/s"
          tone={TONES.cyan}
          data={history.network}
          max={250}
          subtitle={`Throughput · ${(metrics.networkThroughput * 8).toFixed(0)} Mbps`}
        />
      </div>

      {/* Platform Uptime */}
      <div className="mt-5 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-md border border-border/60 rounded-full">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-muted-foreground">
            Platform Uptime:{' '}
            <span className="font-bold text-emerald-500 tabular-nums">
              {metrics.uptime.toFixed(2)}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
