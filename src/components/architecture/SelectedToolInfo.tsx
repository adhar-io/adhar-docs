
import React from 'react';

interface SelectedToolInfoProps {
  selectedTool: string | null;
}

const SelectedToolInfo = ({ selectedTool }: SelectedToolInfoProps) => {
  if (!selectedTool) return null;

  return (
    <div className="mt-8 bg-gradient-to-r from-white to-gray-50 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
      <h4 className="font-bold text-xl mb-3 text-gray-800 dark:text-gray-200">Selected: {selectedTool}</h4>
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        Click on tools to learn more about their integration in the ADHAR platform.
      </p>
    </div>
  );
};

export default SelectedToolInfo;
