
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import BlogDashboard from '@/components/blog/BlogDashboard';
import BlogEditor from '@/components/blog/BlogEditor';
import DocumentDashboard from '@/components/docs/DocumentDashboard';
import DocumentEditor from '@/components/docs/DocumentEditor';
import { BlogPost } from '@/data/blogData';
import { ArrowLeft, LogOut, FileText, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'dashboard' | 'editor';
type ContentType = 'blog' | 'docs';

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

const BlogAuthor = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [contentType, setContentType] = useState<ContentType>('blog');
  const [editingPost, setEditingPost] = useState<BlogPost | undefined>();
  const [editingDocument, setEditingDocument] = useState<DocumentData | undefined>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check authentication on component mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  const handleCreateNew = () => {
    setEditingPost(undefined);
    setEditingDocument(undefined);
    setCurrentView('editor');
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setEditingDocument(undefined);
    setCurrentView('editor');
  };

  const handleEditDocument = (doc: any) => {
    setEditingDocument(doc);
    setEditingPost(undefined);
    setCurrentView('editor');
  };

  const handleSave = (data: Partial<BlogPost> | DocumentData) => {
    console.log('Saving content:', data);
    // In a real implementation, you'd save to your backend/database
    toast({
      title: "Content Saved",
      description: `${contentType === 'blog' ? 'Blog post' : 'Documentation'} has been saved successfully.`,
    });
  };

  const handlePublish = (data: Partial<BlogPost> | DocumentData) => {
    console.log('Publishing content:', data);
    // In a real implementation, you'd publish to your backend/database
    setCurrentView('dashboard');
    toast({
      title: "Content Published",
      description: `${contentType === 'blog' ? 'Blog post' : 'Documentation'} has been published successfully.`,
    });
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setEditingPost(undefined);
    setEditingDocument(undefined);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    setCurrentView('dashboard');
    setEditingPost(undefined);
    setEditingDocument(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      {/* Auth Header */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8 py-4 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80 dark:border-gray-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Content Management System
            </h1>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
      
      <main className="pt-6">
        {currentView === 'editor' && (
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">
              <Button 
                variant="ghost" 
                onClick={handleBackToDashboard}
                className="mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
        
        {currentView === 'dashboard' ? (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <Tabs value={contentType} onValueChange={(value) => handleContentTypeChange(value as ContentType)} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="blog" className="flex items-center space-x-2">
                    <PenTool className="w-4 h-4" />
                    <span>Blog Management</span>
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Documentation</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="blog">
                  <BlogDashboard 
                    onCreateNew={handleCreateNew}
                    onEditPost={handleEditPost}
                  />
                </TabsContent>
                
                <TabsContent value="docs">
                  <DocumentDashboard 
                    onCreateNew={handleCreateNew}
                    onEditDocument={handleEditDocument}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          contentType === 'blog' ? (
            <BlogEditor
              post={editingPost}
              onSave={handleSave}
              onPublish={handlePublish}
            />
          ) : (
            <DocumentEditor
              document={editingDocument}
              onSave={handleSave}
              onPublish={handlePublish}
            />
          )
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogAuthor;
