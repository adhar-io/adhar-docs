
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  Clock,
  TrendingUp,
  FileText,
  Users
} from 'lucide-react';
import { BlogPost, blogPosts } from '@/data/blogData';

interface BlogDashboardProps {
  onCreateNew: () => void;
  onEditPost: (post: BlogPost) => void;
}

const BlogDashboard = ({ onCreateNew, onEditPost }: BlogDashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const categories = ['all', 'Platform Updates', 'Security', 'DevOps', 'AI/ML', 'Community'];
  const statuses = ['all', 'published', 'draft'];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalPosts: blogPosts.length,
    published: blogPosts.length,
    drafts: 3,
    views: '12.5k',
    engagement: '4.2%'
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Blog Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your blog posts and track performance
          </p>
        </div>
        <Button onClick={onCreateNew} className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
                <p className="text-2xl font-bold">{stats.totalPosts}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
                <p className="text-2xl font-bold text-green-600">{stats.published}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Drafts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.drafts}</p>
              </div>
              <Edit className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
                <p className="text-2xl font-bold">{stats.views}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Engagement</p>
                <p className="text-2xl font-bold">{stats.engagement}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search posts, authors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Posts ({filteredPosts.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({stats.published})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({stats.drafts})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {post.title}
                      </h3>
                      <Badge variant={post.featured ? "default" : "secondary"}>
                        {post.featured ? 'Featured' : post.category}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEditPost(post)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="published">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Published posts view would show only published content
          </div>
        </TabsContent>
        
        <TabsContent value="drafts">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Draft posts view would show only draft content
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogDashboard;
