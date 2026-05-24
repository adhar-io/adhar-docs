
import React from 'react';
import {
  Sidebar,
  SidebarContent,
} from '@/components/ui/sidebar';
import { DashboardSidebarHeader } from './SidebarHeader';
import { NavigationGroups } from './NavigationGroups';

export function DashboardSidebar() {
  return (
    <Sidebar className="w-64 border-r border-gray-200/60 dark:border-gray-700/60 shadow-xl" collapsible="none">
      <SidebarContent className="bg-white/90 backdrop-blur-md dark:bg-gray-900/90 flex flex-col h-full">
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md dark:bg-gray-900/95 border-b border-gray-200/60 dark:border-gray-700/60">
          <DashboardSidebarHeader />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <NavigationGroups />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

