import React from 'react';

interface Command {
  command: string;
  output: string[];
}

interface TerminalContentProps {
  commands: Command[];
  currentCommandIndex: number;
  typingIndex: number;
}

const TerminalContent = ({ commands, currentCommandIndex, typingIndex }: TerminalContentProps) => {
  return (
    <div className="flex flex-col justify-end p-4 sm:p-6 font-mono text-xs sm:text-sm bg-gray-950 h-[260px] overflow-hidden text-left [&>*:last-child]:mb-0 [mask-image:linear-gradient(to_bottom,transparent,black_30%)]">
      {commands.map((cmd, idx) => {
        const shouldShow = idx <= currentCommandIndex;
        const isCurrentCommand = idx === currentCommandIndex;
        const displayCommand = isCurrentCommand ? cmd.command.slice(0, typingIndex) : cmd.command;
        const showOutput = idx < currentCommandIndex || (isCurrentCommand && typingIndex >= cmd.command.length);
        
        if (!shouldShow) return null;
        
        return (
          <div key={cmd.command} className="mb-6">
            <div className="mb-2">
              <span className="text-green-400">$ {displayCommand}</span>
              {isCurrentCommand && typingIndex < cmd.command.length && (
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1 align-middle"></span>
              )}
            </div>
            
            {showOutput && cmd.output.map((line) => (
              <div key={line} className="text-gray-400 mb-1 whitespace-pre-wrap">
                {line.startsWith('✓') ? (
                  <><span className="text-emerald-400">✓</span>{line.slice(1)}</>
                ) : line.startsWith('→') ? (
                  <span className="text-sky-400">{line}</span>
                ) : (
                  line
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default TerminalContent;
