
import React, { useState } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Brain, 
  FileText, 
  Database, 
  Users, 
  Settings,
  Zap,
  TrendingUp,
  Clock,
  Star,
  Bot
} from 'lucide-react';

interface SmartSearchProps {
  trigger?: React.ReactNode;
}

export function SmartSearch({ trigger }: SmartSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Mock search results with categories
  const searchResults = {
    recent: [
      { id: 1, title: 'Customer Sentiment Model', type: 'model', icon: Brain, path: '/dashboard/models/sentiment' },
      { id: 2, title: 'Q3 Analytics Report', type: 'report', icon: FileText, path: '/dashboard/reports/q3' },
      { id: 3, title: 'User Database', type: 'data', icon: Database, path: '/dashboard/data/users' },
    ],
    suggestions: [
      { id: 4, title: 'Deploy new model', type: 'action', icon: Zap, action: 'deploy' },
      { id: 5, title: 'View team performance', type: 'action', icon: TrendingUp, action: 'performance' },
      { id: 6, title: 'Manage API keys', type: 'action', icon: Settings, action: 'api-keys' },
    ],
    ai: [
      { id: 7, title: 'How to optimize model performance?', type: 'ai', icon: Bot, response: 'ai-help' },
      { id: 8, title: 'Best practices for data security', type: 'ai', icon: Bot, response: 'ai-help' },
      { id: 9, title: 'Explain transformer architecture', type: 'ai', icon: Bot, response: 'ai-help' },
    ]
  };

  const handleSelect = (item: any) => {
    if (item.path) {
      // Navigate to path
      console.log('Navigate to:', item.path);
    } else if (item.action) {
      // Perform action
      console.log('Perform action:', item.action);
    } else if (item.response) {
      // AI response
      console.log('AI help:', item.title);
    }
    setOpen(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'model': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'report': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'data': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'action': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      case 'ai': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200';
    }
  };

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          className="relative w-full justify-start text-sm text-muted-foreground bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
          Search everything...
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2 font-mono text-[11px] font-medium text-gray-600 dark:text-gray-400 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CommandInput 
            placeholder="Search projects, models, data, or ask AI..." 
            value={query}
            onValueChange={setQuery}
            className="border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          <CommandList className="bg-white dark:bg-gray-900">
            <CommandEmpty>
              <div className="text-center py-6">
                <Bot className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No results found.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try asking our AI assistant!</p>
              </div>
            </CommandEmpty>

            <CommandGroup heading="Recent" className="text-gray-900 dark:text-gray-100">
              {searchResults.recent.map((item) => (
                <CommandItem 
                  key={item.id} 
                  onSelect={() => handleSelect(item)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <item.icon className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="flex-1">{item.title}</span>
                  <Badge variant="secondary" className={`text-xs border-0 ${getTypeColor(item.type)}`}>
                    {item.type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-gray-200 dark:bg-gray-700" />

            <CommandGroup heading="Quick Actions" className="text-gray-900 dark:text-gray-100">
              {searchResults.suggestions.map((item) => (
                <CommandItem 
                  key={item.id} 
                  onSelect={() => handleSelect(item)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <item.icon className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="flex-1">{item.title}</span>
                  <Badge variant="secondary" className={`text-xs border-0 ${getTypeColor(item.type)}`}>
                    {item.type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-gray-200 dark:bg-gray-700" />

            <CommandGroup heading="AI Assistant" className="text-gray-900 dark:text-gray-100">
              {searchResults.ai.map((item) => (
                <CommandItem 
                  key={item.id} 
                  onSelect={() => handleSelect(item)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <item.icon className="mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="flex-1">{item.title}</span>
                  <Badge variant="secondary" className={`text-xs border-0 ${getTypeColor(item.type)}`}>
                    AI
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
