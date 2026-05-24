
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Edit3, 
  Eye, 
  Trash2, 
  Clock, 
  User,
  BookOpen,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'review' | 'published';
  tags: string[];
  lastModified: string;
  author: string;
  views: number;
  readTime: string;
}

interface DocumentDashboardProps {
  onCreateNew: () => void;
  onEditDocument: (doc: Document) => void;
}

const DocumentDashboard = ({ onCreateNew, onEditDocument }: DocumentDashboardProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // Mock data - in real implementation, this would come from your backend
  const [documents] = useState<Document[]>([
    {
      id: '1',
      title: 'Quick Start Guide',
      description: 'Get up and running with ADHAR in 5 minutes',
      category: 'Getting Started',
      difficulty: 'beginner',
      status: 'published',
      tags: ['setup', 'installation', 'cli'],
      lastModified: '2024-12-14',
      author: 'Tech Writer',
      views: 1250,
      readTime: '5 min read'
    },
    {
      id: '2',
      title: 'Platform Architecture Deep Dive',
      description: 'Comprehensive guide to understanding ADHAR architecture',
      category: 'Core Concepts',
      difficulty: 'advanced',
      status: 'published',
      tags: ['architecture', 'kubernetes', 'microservices'],
      lastModified: '2024-12-13',
      author: 'Tech Writer',
      views: 890,
      readTime: '15 min read'
    },
    {
      id: '3',
      title: 'API Authentication Guide',
      description: 'How to authenticate with ADHAR APIs',
      category: 'API Reference',
      difficulty: 'intermediate',
      status: 'draft',
      tags: ['api', 'auth', 'security'],
      lastModified: '2024-12-12',
      author: 'Tech Writer',
      views: 0,
      readTime: '8 min read'
    }
  ]);

  const categories = ['all', 'Getting Started', 'Core Concepts', 'API Reference', 'Tutorials', 'Best Practices'];
  const statuses = ['all', 'draft', 'review', 'published'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    const matchesDifficulty = selectedDifficulty === 'all' || doc.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesDifficulty;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'intermediate':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  const stats = {
    total: documents.length,
    published: documents.filter(d => d.status === 'published').length,
    drafts: documents.filter(d => d.status === 'draft').length,
    totalViews: documents.reduce((acc, doc) => acc + doc.views, 0)
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Documentation Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and organize your documentation content
          </p>
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create New Document
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</p>
                <p className="text-3xl font-bold text-green-600">{stats.published}</p>
              </div>
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Drafts</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.drafts}</p>
              </div>
              <Edit3 className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Views</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents, tags, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="grid gap-6">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No documents found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedDifficulty !== 'all' 
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating your first document.'}
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map(doc => (
            <Card key={doc.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {doc.title}
                      </h3>
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                      <Badge className={getDifficultyColor(doc.difficulty)}>
                        {doc.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {doc.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {doc.author}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {doc.lastModified}
                      </div>
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {doc.views} views
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {doc.readTime}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {doc.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-6">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEditDocument(doc)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentDashboard;
