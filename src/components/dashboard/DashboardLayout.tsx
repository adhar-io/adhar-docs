
import React from 'react';
import { Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';

const DashboardLayout = () => {
  const navigate = useNavigate();

  // Check authentication on component mount
  React.useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
      navigate({ to: '/login' });
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-800 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col w-full overflow-hidden">
          <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm">
            <DashboardHeader />
          </div>
          <main className="flex-1 overflow-auto w-full">
            <div className="w-full overflow-x-hidden">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

