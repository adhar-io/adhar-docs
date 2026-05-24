
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Eye, 
  Wand2, 
  BookOpen, 
  FileText, 
  Settings, 
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EnhancedMarkdownRenderer from '@/components/EnhancedMarkdownRenderer';

interface DocumentData {
  id?: string;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  status: 'draft' | 'review' | 'published';
}

interface DocumentEditorProps {
  document?: DocumentData;
  onSave: (data: DocumentData) => void;
  onPublish: (data: DocumentData) => void;
}

const DocumentEditor = ({ document, onSave, onPublish }: DocumentEditorProps) => {
  const [documentData, setDocumentData] = useState<DocumentData>({
    title: '',
    description: '',
    content: '',
    category: 'Getting Started',
    difficulty: 'beginner',
    tags: [],
    status: 'draft',
    ...document
  });
  
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();

  const categories = [
    'Getting Started',
    'Core Concepts',
    'API Reference',
    'Tutorials',
    'Best Practices',
    'Troubleshooting',
    'Integration Guides',
    'Security'
  ];

  const aiSuggestions = [
    'Improve the structure and readability of this content',
    'Add code examples to explain the concepts better',
    'Create a step-by-step tutorial format',
    'Add troubleshooting section with common issues',
    'Generate API reference documentation',
    'Create beginner-friendly introduction',
    'Add advanced use cases and examples'
  ];

  const handleInputChange = (field: keyof DocumentData, value: any) => {
    setDocumentData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !documentData.tags.includes(newTag.trim())) {
      setDocumentData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDocumentData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAiEnhance = async (suggestion: string) => {
    setIsAiGenerating(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let enhancedContent = documentData.content;
      
      // Mock AI enhancements based on suggestion
      if (suggestion.includes('structure')) {
        enhancedContent = `# ${documentData.title}

## Overview
${documentData.description}

## Prerequisites
- Basic understanding of the platform
- Access to development environment

## Step-by-Step Guide

${documentData.content}

## Best Practices
- Follow the established patterns
- Test your implementation
- Document your changes

## Troubleshooting
Common issues and their solutions will be added here.

## Next Steps
What to do after completing this guide.`;
      } else if (suggestion.includes('code examples')) {
        enhancedContent = documentData.content + `

## Code Examples

\`\`\`javascript
// Example implementation
const example = {
  name: 'sample',
  value: 'demonstration'
};
\`\`\`

\`\`\`bash
# Command line usage
npm install package-name
npm run setup
\`\`\``;
      }
      
      setDocumentData(prev => ({ ...prev, content: enhancedContent }));
      toast({
        title: "AI Enhancement Complete",
        description: "Your content has been enhanced with AI suggestions.",
      });
    } catch (error) {
      toast({
        title: "Enhancement Failed",
        description: "Failed to enhance content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleCustomAiPrompt = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAiGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const enhancement = `\n\n## AI Generated Section\n${aiPrompt}\n\nThis section was generated based on your prompt: "${aiPrompt}"\n\nLorem ipsum content would be generated here based on the AI prompt.`;
      
      setDocumentData(prev => ({
        ...prev,
        content: prev.content + enhancement
      }));
      
      setAiPrompt('');
      toast({
        title: "AI Content Generated",
        description: "New content has been added based on your prompt.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSave = () => {
    onSave(documentData);
  };

  const handlePublish = () => {
    onPublish({ ...documentData, status: 'published' });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(documentData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to Clipboard",
      description: "Document content has been copied to clipboard.",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {document ? 'Edit Documentation' : 'Create New Documentation'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create comprehensive, AI-enhanced documentation with ease
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={documentData.status === 'published' ? 'default' : 'secondary'}>
            {documentData.status}
          </Badge>
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
            <BookOpen className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Document Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category */}
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={documentData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={documentData.difficulty} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => handleInputChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button size="sm" onClick={handleAddTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documentData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* AI Enhancements */}
              <div>
                <Label className="flex items-center mb-3">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Enhancements
                </Label>
                <div className="space-y-2">
                  {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-3"
                      onClick={() => handleAiEnhance(suggestion)}
                      disabled={isAiGenerating}
                    >
                      <Wand2 className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="text-xs">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Document Title"
                  value={documentData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="text-lg font-semibold"
                />
                <Textarea
                  placeholder="Brief description of what this documentation covers..."
                  value={documentData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={2}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'write' | 'preview')}>
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="write" className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Write
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <TabsContent value="write" className="space-y-4">
                  {/* AI Prompt */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border">
                    <Label className="flex items-center mb-2">
                      <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                      AI Writing Assistant
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Ask AI to help with your documentation..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCustomAiPrompt()}
                      />
                      <Button onClick={handleCustomAiPrompt} disabled={isAiGenerating || !aiPrompt.trim()}>
                        {isAiGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Content Editor */}
                  <Textarea
                    placeholder="Start writing your documentation in Markdown format...

# Getting Started

Welcome to this documentation! Here you can write comprehensive guides using Markdown.

## Features

- **Bold text** and *italic text*
- `code snippets` and code blocks
- Lists and tables
- Links and images

```javascript
// Code example
const example = 'Hello World';
```

> Tip: Use the AI assistant above to help enhance your content!"
                    value={documentData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className="min-h-[600px] font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="preview">
                  <div className="border rounded-lg p-6 min-h-[600px] bg-white dark:bg-gray-900">
                    <EnhancedMarkdownRenderer content={documentData.content || "# Preview\n\nStart writing to see your content rendered here..."} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
