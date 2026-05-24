import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  feature: string;
  gradientFrom: string;
  gradientTo: string;
  featureIcon: LucideIcon;
  useSolidBackground?: boolean;
}

const accentFromBg = (bg: string): { ring: string; chip: string; icon: string } => {
  if (bg.includes('blue')) {
    return {
      ring: 'group-hover:border-blue-500/40',
      chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20',
      icon: 'text-blue-600 dark:text-blue-300',
    };
  }
  if (bg.includes('purple')) {
    return {
      ring: 'group-hover:border-purple-500/40',
      chip: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20',
      icon: 'text-purple-600 dark:text-purple-300',
    };
  }
  if (bg.includes('green')) {
    return {
      ring: 'group-hover:border-emerald-500/40',
      chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20',
      icon: 'text-emerald-700 dark:text-emerald-300',
    };
  }
  if (bg.includes('orange')) {
    return {
      ring: 'group-hover:border-amber-500/40',
      chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20',
      icon: 'text-amber-700 dark:text-amber-300',
    };
  }
  return {
    ring: 'group-hover:border-primary/40',
    chip: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
    icon: 'text-primary',
  };
};

const CapabilityCard = ({
  icon: Icon,
  title,
  description,
  feature,
  gradientFrom,
  featureIcon: FeatureIcon,
}: CapabilityCardProps) => {
  const accent = accentFromBg(gradientFrom);

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${accent.ring}`}
    >
      {/* Icon chip */}
      <div className={`mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent.chip}`}>
        <Icon className={`h-5 w-5 ${accent.icon}`} strokeWidth={2} />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>

      {/* Description */}
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>

      {/* Feature pill at footer */}
      <div className="mt-6 pt-5 border-t border-border/60">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FeatureIcon className={`h-3.5 w-3.5 ${accent.icon}`} strokeWidth={2.5} />
          <span>{feature}</span>
        </div>
      </div>
    </article>
  );
};

export default CapabilityCard;
