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
    <div className="flex flex-col justify-end p-6 font-mono text-sm bg-gray-950 h-[240px] overflow-hidden text-left [&>*:last-child]:mb-0">
      {commands.map((cmd, idx) => {
        const shouldShow = idx <= currentCommandIndex;
        const isCurrentCommand = idx === currentCommandIndex;
        const displayCommand = isCurrentCommand ? cmd.command.slice(0, typingIndex) : cmd.command;
        const showOutput = idx < currentCommandIndex || (isCurrentCommand && typingIndex >= cmd.command.length);
        
        if (!shouldShow) return null;
        
        return (
          <div key={idx} className="mb-6">
            <div className="mb-2">
              <span className="text-green-400">$ {displayCommand}</span>
              {isCurrentCommand && typingIndex < cmd.command.length && (
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1 align-middle"></span>
              )}
            </div>
            
            {showOutput && cmd.output.map((line, lineIdx) => (
              <div key={lineIdx} className="text-gray-400 mb-1">
                {line}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default TerminalContent;
