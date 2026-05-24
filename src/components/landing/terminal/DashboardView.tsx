import React from 'react';
import { TrendingUp, Users, Zap, Shield, Activity, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import Logo from '@/components/ui/Logo';

const performanceData = [
  { name: 'Jan', revenue: 45000, users: 2400, apiCalls: 12000 },
  { name: 'Feb', revenue: 52000, users: 2800, apiCalls: 15000 },
  { name: 'Mar', revenue: 48000, users: 3200, apiCalls: 14000 },
  { name: 'Apr', revenue: 58000, users: 3800, apiCalls: 18000 },
  { name: 'May', revenue: 65000, users: 4200, apiCalls: 22000 },
  { name: 'Jun', revenue: 72000, users: 4600, apiCalls: 25000 },
];

const systemMetrics = [
  { name: 'CPU', value: 67 },
  { name: 'Memory', value: 45 },
  { name: 'Storage', value: 32 },
  { name: 'Network', value: 78 },
];

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  users: { label: 'Users', color: 'hsl(var(--accent))' },
  apiCalls: { label: 'API Calls', color: 'hsl(142 71% 45%)' },
};

const stats = [
  { icon: DollarSign, label: 'Revenue', value: '$72,000', delta: '+20.1%' },
  { icon: Users, label: 'Active users', value: '4,600', delta: '+180.1%' },
  { icon: Zap, label: 'API requests', value: '25,000', delta: '+19%' },
  { icon: Shield, label: 'Uptime', value: '99.9%', delta: '+2%' },
];

const DashboardView = () => {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/70 bg-card shadow-[var(--shadow-md)] h-[600px]">
      {/* Browser chrome */}
      <div className="flex items-center px-5 py-3 border-b border-border/70 bg-muted/40">
        <div className="flex space-x-1.5 mr-4">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 max-w-md mx-auto rounded-md border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground font-mono">
          https://console.adhar.io
        </div>
      </div>

      {/* Content */}
      <div className="p-6 h-[calc(600px-49px)] overflow-y-auto bg-background">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Logo size="md" showTagline={false} linkTo={null} />
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-status-blink" />
            All systems operational
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 mb-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground tracking-tight tabular">{s.value}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  {s.delta}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
          {/* Performance */}
          <div className="col-span-2 bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Performance</h3>
                <p className="text-xs text-muted-foreground">Revenue and user growth, 6 months</p>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-40">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--accent))" fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* System Health */}
          <div className="bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-primary">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">System health</h3>
                <p className="text-xs text-muted-foreground">Real-time</p>
              </div>
            </div>
            <div className="space-y-4">
              {systemMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">{metric.name}</span>
                    <span className="text-xs font-medium text-foreground tabular">{metric.value}%</span>
                  </div>
                  <div className="relative w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
