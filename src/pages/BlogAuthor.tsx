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

  const handleEditDocument = (doc: DocumentData) => {
    setEditingDocument(doc);
    setEditingPost(undefined);
    setCurrentView('editor');
  };

  const handleSave = (data: Partial<BlogPost> | DocumentData) => {
    toast({
      title: "Saved",
      description: `${contentType === 'blog' ? 'Blog post' : 'Documentation'} saved.`,
    });
  };

  const handlePublish = (data: Partial<BlogPost> | DocumentData) => {
    setCurrentView('dashboard');
    toast({
      title: "Published",
      description: `${contentType === 'blog' ? 'Blog post' : 'Documentation'} published.`,
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
    toast({ title: "Logged out", description: "Come back soon." });
    navigate('/');
  };

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    setCurrentView('dashboard');
    setEditingPost(undefined);
    setEditingDocument(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Auth Header */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Content management
          </h1>
          <button
            onClick={handleLogout}
            className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full px-4 h-9 text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      <main className="pt-6">
        {currentView === 'editor' && (
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={handleBackToDashboard}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to dashboard
              </button>
            </div>
          </div>
        )}

        {currentView === 'dashboard' ? (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <Tabs value={contentType} onValueChange={(value) => handleContentTypeChange(value as ContentType)} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="blog" className="flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    <span>Blog</span>
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="flex items-center gap-2">
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
