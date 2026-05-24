
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Play, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CodeExampleProps {
  examples: Array<{
    id: string;
    title: string;
    language: string;
    code: string;
    description?: string;
    runnable?: boolean;
  }>;
  className?: string;
}

const CodeExample = ({ examples, className = "" }: CodeExampleProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleRun = async (code: string, id: string, language: string) => {
    setRunningId(id);
    
    // Simulate running code
    setTimeout(() => {
      setRunningId(null);
      toast.success('Code executed successfully!');
    }, 2000);
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      typescript: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      bash: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      yaml: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      json: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      curl: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[language] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  if (examples.length === 0) return null;

  return (
    <Card className={`my-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Code Examples
        </CardTitle>
      </CardHeader>
      <CardContent>
        {examples.length === 1 ? (
          <SingleExample 
            example={examples[0]} 
            onCopy={handleCopy}
            onRun={handleRun}
            copiedId={copiedId}
            runningId={runningId}
            getLanguageColor={getLanguageColor}
          />
        ) : (
          <Tabs defaultValue={examples[0].id} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${examples.length}, 1fr)` }}>
              {examples.map((example) => (
                <TabsTrigger key={example.id} value={example.id} className="text-sm">
                  {example.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {examples.map((example) => (
              <TabsContent key={example.id} value={example.id} className="mt-4">
                <SingleExample 
                  example={example} 
                  onCopy={handleCopy}
                  onRun={handleRun}
                  copiedId={copiedId}
                  runningId={runningId}
                  getLanguageColor={getLanguageColor}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

interface SingleExampleProps {
  example: {
    id: string;
    title: string;
    language: string;
    code: string;
    description?: string;
    runnable?: boolean;
  };
  onCopy: (code: string, id: string) => void;
  onRun: (code: string, id: string, language: string) => void;
  copiedId: string | null;
  runningId: string | null;
  getLanguageColor: (language: string) => string;
}

const SingleExample = ({ 
  example, 
  onCopy, 
  onRun, 
  copiedId, 
  runningId, 
  getLanguageColor 
}: SingleExampleProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h4 className="font-semibold text-gray-900 dark:text-white">{example.title}</h4>
        <Badge variant="secondary" className={getLanguageColor(example.language)}>
          {example.language}
        </Badge>
        {example.runnable && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            Runnable
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {example.runnable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRun(example.code, example.id, example.language)}
            disabled={runningId === example.id}
            className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
          >
            {runningId === example.id ? (
              <>
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                Running
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run
              </>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(example.code, example.id)}
          className="text-gray-600 dark:text-gray-300"
        >
          {copiedId === example.id ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
    
    {example.description && (
      <p className="text-sm text-gray-600 dark:text-gray-400">{example.description}</p>
    )}
    
    <div className="relative">
      <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border">
        <code>{example.code}</code>
      </pre>
    </div>
  </div>
);

export default CodeExample;
