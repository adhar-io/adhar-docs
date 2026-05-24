import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  RotateCcw,
  X,
  Sparkles
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  suggestions?: string[];
}

interface AdharAssistChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdharAssistChat({ isOpen, onClose }: AdharAssistChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m Adhar Assist, your AI-powered development companion. How can I help you build, deploy, or optimize your applications today?',
      role: 'assistant',
      timestamp: new Date(),
      suggestions: [
        'Help me deploy my model',
        'Optimize my API performance',
        'Generate code documentation',
        'Analyze my project metrics'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you need help with "${input}". Let me analyze your request and provide a comprehensive solution. Here are some recommendations based on your current project setup and best practices.`,
        role: 'assistant',
        timestamp: new Date(),
        suggestions: [
          'Show me the code',
          'Explain further',
          'Alternative approaches',
          'Next steps'
        ]
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // Voice recognition would be implemented here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-full max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                <Bot className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adhar Assist</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Online</span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors h-10 w-10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center space-x-2 mb-3">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Adhar Assist</span>
                      </div>
                    )}
                    <Card className={`${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0' 
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    } shadow-sm hover:shadow-md transition-shadow duration-200`}>
                      <CardContent className="p-4">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        {message.role === 'assistant' && (
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {message.suggestions && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Badge 
                            key={index}
                            variant="secondary" 
                            className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs px-3 py-1 transition-all duration-200 hover:scale-105"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Adhar Assist anything..."
                className="pr-20 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 rounded-xl"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  onClick={toggleListening}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-gray-500" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Paperclip className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center mt-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <Sparkles className="w-3 h-3" />
              <span>Powered by Advanced AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
