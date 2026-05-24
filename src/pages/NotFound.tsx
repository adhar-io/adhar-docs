import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative text-center max-w-md">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground mb-4">
          Error 404
        </p>
        <h1 className="text-7xl sm:text-8xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-xl text-foreground mt-6 mb-2 font-medium">Page not found</p>
        <p className="text-muted-foreground mb-8">
          The page <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm">{location.pathname}</code> doesn't exist or has moved.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button asChild variant="outline">
            <button onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </button>
          </Button>
          <Button asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Return home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
