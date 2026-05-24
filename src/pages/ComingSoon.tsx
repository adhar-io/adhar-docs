import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Bell, ArrowLeft, Rocket, Sparkles, Construction } from 'lucide-react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import comingSoonHero from '@/assets/coming-soon-hero.jpg';

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-20 min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Card className="w-full max-w-3xl text-center border-0 shadow-2xl bg-gradient-to-br from-background via-background to-muted/20">
          <CardHeader className="pb-8 pt-12">
            {/* Hero Illustration */}
            <div className="mx-auto mb-8 relative max-w-2xl">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={comingSoonHero} 
                  alt="ADHAR Platform - Coming Soon" 
                  className="w-full h-full object-cover animate-fade-in"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
                
                {/* Floating badges */}
                <div className="absolute top-4 right-4 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Coming Soon</span>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 animate-pulse">
                  <div className="bg-accent/90 backdrop-blur-sm text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    <span>In Development</span>
                  </div>
                </div>
              </div>
            </div>

            <CardTitle className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
              We're Building Something Amazing
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our team is hard at work crafting an exceptional experience for you. 
              The ADHAR platform is coming soon with powerful features that will transform your workflow.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8 pb-12">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-muted/50 py-3 px-6 rounded-full inline-flex mx-auto">
              <Calendar className="w-4 h-4" />
              <span>Launching in 2027</span>
            </div>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                Be the first to know when we launch! Get early access and exclusive updates.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Button 
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-primary via-primary to-accent hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notify Me When Ready
                </Button>
                
                <Link to="/" className="flex-1">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="w-full border-2 hover:bg-muted/50 transition-all duration-300"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
              <div className="p-6 rounded-xl bg-muted/30 border border-border/50">
                <Rocket className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Fast & Powerful</h3>
                <p className="text-sm text-muted-foreground">Built for speed and efficiency</p>
              </div>
              <div className="p-6 rounded-xl bg-muted/30 border border-border/50">
                <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Feature-Rich</h3>
                <p className="text-sm text-muted-foreground">Everything you need and more</p>
              </div>
              <div className="p-6 rounded-xl bg-muted/30 border border-border/50">
                <Construction className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Always Improving</h3>
                <p className="text-sm text-muted-foreground">Regular updates and enhancements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default ComingSoon;
