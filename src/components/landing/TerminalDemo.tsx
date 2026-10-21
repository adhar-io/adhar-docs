
import React, { useState, useEffect, useRef } from 'react';
import TerminalHeader from './terminal/TerminalHeader';
import TerminalContent from './terminal/TerminalContent';

// Real commands and abridged real output — see /docs/reference/cli.
const commands = [
  {
    command: "adhar up",
    output: [
      "✓ Kind cluster created",
      "✓ Foundation: Cilium → ArgoCD → Gitea",
      "✓ Platform repository seeded in Gitea",
      "✓ ArgoCD syncing enabled packages",
      "→ https://console.adhar.localtest.me:8443"
    ]
  },
  {
    command: "adhar database create --name orders --engine postgresql --version 16",
    output: [
      "✓ Database 'orders' requested via Crossplane",
      "✓ Connection details written to a Secret"
    ]
  },
  {
    command: "adhar application deploy orders --template microservice -n orders --path manifests --project default",
    output: [
      "✓ Scaffolded adhar/orders in Gitea",
      "✓ Application orders created",
      "✓ ArgoCD synced orders"
    ]
  },
  {
    command: "adhar get status",
    output: [
      "Applications   Synced, Healthy",
      "Gateway        Ready",
      "Identity       Keycloak ready"
    ]
  },
  {
    command: "adhar down",
    output: [
      "✓ Kind cluster 'adhar' deleted"
    ]
  }
];

const TYPE_MS = 60; // per character
const HOLD_MS = 2800; // pause on a finished command before the next one

const TerminalDemo = () => {
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  // Without IntersectionObserver, just animate.
  const [onScreen, setOnScreen] = useState(() => typeof IntersectionObserver === 'undefined');
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
  );
  const ref = useRef<HTMLDivElement>(null);

  // Only animate while the terminal is visible.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One timer at a time: type the next character, or move to the next command.
  useEffect(() => {
    if (reducedMotion || !onScreen) return;
    const length = commands[currentCommandIndex].command.length;
    const timer =
      typingIndex < length
        ? setTimeout(() => setTypingIndex((i) => i + 1), TYPE_MS)
        : setTimeout(() => {
            setCurrentCommandIndex((i) => (i + 1) % commands.length);
            setTypingIndex(0);
          }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [currentCommandIndex, typingIndex, onScreen, reducedMotion]);

  // Reduced motion: show the whole session, fully typed.
  const shownIndex = reducedMotion ? commands.length - 1 : currentCommandIndex;
  const shownTyping = reducedMotion ? Number.MAX_SAFE_INTEGER : typingIndex;

  return (
    <div ref={ref} className="max-w-4xl mx-auto" role="img" aria-label="Terminal demo: adhar up brings up the platform, then a database is created, an app is deployed from a golden-path template, status is checked and the platform is torn down.">
      <div className="bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.35)]">
        <TerminalHeader />
        <TerminalContent 
          commands={commands} 
          currentCommandIndex={shownIndex}
          typingIndex={shownTyping}
        />
      </div>
    </div>
  );
};

export default TerminalDemo;
