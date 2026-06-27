import { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useInView } from '@/hooks/useInView';

type RevealDirection = 'up' | 'left' | 'right' | 'scale';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Animation direction. Defaults to "up". */
  direction?: RevealDirection;
  /** Stagger delay in ms — handy when revealing a list of siblings. */
  delay?: number;
  /** Render as a different element (e.g. "section", "li"). Defaults to "div". */
  as?: ElementType;
}

const directionClass: Record<RevealDirection, string> = {
  up: '',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
};

/**
 * Wraps content so it fades/slides into view on scroll.
 * Respects prefers-reduced-motion (content shows immediately).
 */
const Reveal = ({
  children,
  className,
  direction = 'up',
  delay = 0,
  as,
}: RevealProps) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Tag = (as ?? 'div') as ElementType;

  return (
    <Tag
      ref={ref}
      className={cn('reveal', directionClass[direction], inView && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
