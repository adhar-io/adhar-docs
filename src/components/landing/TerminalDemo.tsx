
import React, { useState, useEffect } from 'react';
import TerminalHeader from './terminal/TerminalHeader';
import TerminalContent from './terminal/TerminalContent';

const commands = [
  { 
    command: "adhar up -f adhar-config.yaml", 
    output: [
      "🚀 Setting up adhar platform...",
      "✅ Kubernetes cluster created",
      "✅ Platform live at https://console.adhar.io"
    ]
  },
  { 
    command: "adhar apps create myapp --template node", 
    output: [
      "📦 Creating application 'myapp'...",
      "✅ Git repository initialized",
      "✅ CI/CD pipeline configured",
      "✅ Deployment manifests generated",
      "🚀 App ready at https://myapp.adhar.io"
    ]
  },
  { 
    command: "adhar get secrets", 
    output: [
      "🔐 Fetching secrets from Vault...",
      "",
      "NAME              VALUE",
      "────────────────  ──────────",
      "ARGOCD_PASSWORD   ********",
      "GITEA_TOKEN       ********",
      "KEYCLOAK_SECRET   ********",
      "",
      "✅ 3 secrets found"
    ]
  },
  { 
    command: "adhar status", 
    output: [
      "Platform Status: HEALTHY ✅",
      "Uptime: 99.9% | CPU: 23% | Memory: 2.1GB",
      "Active Apps: 12 | Running Pods: 48"
    ]
  },
  { 
    command: "adhar down", 
    output: [
      "🛑 Shutting down platform...",
      "✅ Draining workloads gracefully",
      "✅ Backing up persistent data",
      "✅ Cleaning up resources",
      "👋 Platform stopped successfully"
    ]
  }
];

const TerminalDemo = () => {
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);

  useEffect(() => {
    const commandInterval = setInterval(() => {
      setCurrentCommandIndex((prev) => (prev + 1) % commands.length);
      setTypingIndex(0);
    }, 4500);

    const typingInterval = setInterval(() => {
      const currentCommand = commands[currentCommandIndex];
      if (currentCommand && typingIndex < currentCommand.command.length) {
        setTypingIndex(prev => prev + 1);
      }
    }, 80);
    
    return () => {
      clearInterval(commandInterval);
      clearInterval(typingInterval);
    };
  }, [currentCommandIndex, typingIndex]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-zinc-950 dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-[var(--shadow-lg)] border border-zinc-800/70 h-[500px] transition-all duration-300">
        <TerminalHeader />
        <TerminalContent 
          commands={commands} 
          currentCommandIndex={currentCommandIndex} 
          typingIndex={typingIndex} 
        />
      </div>
    </div>
  );
};

export default TerminalDemo;
