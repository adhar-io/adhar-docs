
import React from 'react';
import { Terminal } from 'lucide-react';

const TerminalHeader = () => {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center space-x-3">
        <div className="flex space-x-2">
          <div className="w-2.5 h-2.5 bg-red-500/80 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-yellow-500/80 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-green-500/80 rounded-full"></div>
        </div>
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm font-medium">ADHAR CLI</span>
        </div>
      </div>
    </div>
  );
};

export default TerminalHeader;
