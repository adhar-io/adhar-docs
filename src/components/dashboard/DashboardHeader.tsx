
import React from 'react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, Moon, Sun, Bot, Zap } from 'lucide-react';
import { SmartSearch } from './SmartSearch';
import { AdharAssistChat } from './AdharAssistChat';
import { QuickAppsOverlay } from './QuickAppsOverlay';
import { ProfileMenu } from './ProfileMenu';
import { NotificationsDrawer } from './NotificationsDrawer';

export function DashboardHeader() {
  const [isDark, setIsDark] = React.useState(() => {
    // Check if dark mode is already active
    return document.documentElement.classList.contains('dark');
  });
  const [notifications] = React.useState(3);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isQuickAppsOpen, setIsQuickAppsOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    
    // Store the preference in localStorage
    localStorage.setItem('darkMode', newIsDark.toString());
  };

  // Initialize dark mode from localStorage on component mount
  React.useEffect(() => {
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode !== null) {
      const isDarkStored = storedDarkMode === 'true';
      setIsDark(isDarkStored);
      document.documentElement.classList.toggle('dark', isDarkStored);
    }
  }, []);

  return (
    <>
      <header className="h-16 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between px-6 shadow-sm">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200" />
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 flex justify-center max-w-2xl mx-8">
          <div className="w-full max-w-md">
            <SmartSearch />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Adhar Assist - Icon only */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200"
            onClick={() => setIsChatOpen(true)}
            title="Adhar Assist"
          >
            <Bot className="w-5 h-5" />
          </Button>

          {/* Quick Apps - Icon only */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200"
            onClick={() => setIsQuickAppsOpen(true)}
            title="Quick Apps"
          >
            <Zap className="w-5 h-5" />
          </Button>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            onClick={() => setIsNotificationsOpen(true)}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
              >
                {notifications}
              </Badge>
            )}
          </Button>
          
          {/* Profile with Avatar */}
          <ProfileMenu>
            <Button variant="ghost" className="p-1 h-auto rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200">
              <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-indigo-500/20 transition-all duration-200">
                <AvatarImage src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=64&h=64&fit=crop&crop=face" alt="Profile" />
                <AvatarFallback className="text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </ProfileMenu>
        </div>
      </header>

      {/* Overlays */}
      <AdharAssistChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
      <QuickAppsOverlay 
        isOpen={isQuickAppsOpen} 
        onClose={() => setIsQuickAppsOpen(false)} 
      />
      <NotificationsDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  );
}
