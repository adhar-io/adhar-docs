
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Eye, FileText, Image, Clock, Send } from 'lucide-react';
import EnhancedMarkdownRenderer from '@/components/EnhancedMarkdownRenderer';
import ImageUploader from './ImageUploader';
import { BlogPost } from '@/data/blogData';
import { useToast } from '@/hooks/use-toast';

interface BlogEditorProps {
  post?: BlogPost;
  onSave: (post: Partial<BlogPost>) => void;
  onPublish: (post: Partial<BlogPost>) => void;
}

const BlogEditor = ({ post, onSave, onPublish }: BlogEditorProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category: post?.category || '',
    author: post?.author || '',
    image: post?.image || '',
    featured: post?.featured || false,
  });
  
  const [activeTab, setActiveTab] = useState('edit');
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState('1 min read');

  useEffect(() => {
    const words = formData.content.split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    setReadTime(`${Math.max(1, Math.ceil(words / 200))} min read`);
  }, [formData.content]);

  useEffect(() => {
    if (formData.title && !post) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.title, post]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...formData,
      readTime,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    });
    toast({
      title: "Draft Saved",
      description: "Your blog post has been saved as a draft.",
    });
  };

  const handlePublish = () => {
    if (!formData.title || !formData.content || !formData.excerpt) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in title, content, and excerpt before publishing.",
        variant: "destructive",
      });
      return;
    }
    
    onPublish({
      ...formData,
      readTime,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    });
    toast({
      title: "Post Published",
      description: "Your blog post has been published successfully!",
    });
  };

  const categories = [
    'Platform Updates',
    'Security',
    'DevOps',
    'AI/ML',
    'Community',
    'Tutorial',
    'Case Study',
    'News'
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {post ? 'Edit Post' : 'Create New Post'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Write and publish your blog post with our powerful editor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handlePublish} className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Send className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Post Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter your blog post title..."
                  className="text-lg"
                />
              </div>
              
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="url-friendly-slug"
                />
              </div>
              
              <div>
                <Label htmlFor="excerpt">Excerpt *</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange('excerpt', e.target.value)}
                  placeholder="Brief description of your post (2-3 sentences)..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {wordCount} words
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {readTime}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit" className="mt-4">
                  <Textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Start writing your blog post in Markdown..."
                    className="min-h-[500px] font-mono"
                  />
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Supports Markdown formatting. Use **bold**, *italic*, `code`, and more.
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg p-6 min-h-[500px] bg-white dark:bg-gray-950">
                    {formData.content ? (
                      <EnhancedMarkdownRenderer content={formData.content} />
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-center py-20">
                        Start writing to see your preview
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publishing Options */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Author name"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange('featured', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="featured">Featured Post</Label>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Featured Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                currentImage={formData.image}
                onImageChange={(url) => handleInputChange('image', url)}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => setActiveTab('preview')}>
                <Eye className="w-4 h-4 mr-2" />
                Preview Post
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                SEO Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
