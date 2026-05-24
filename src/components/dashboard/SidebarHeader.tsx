
import React from 'react';
import { SidebarHeader } from '@/components/ui/sidebar';
import Logo from '@/components/ui/Logo';

export function DashboardSidebarHeader() {
  return (
    <SidebarHeader>
      <div className="p-4 border-b border-sidebar-border">
        <Logo size="md" showTagline={true} linkTo="/dashboard" variant="sidebar" className="text-sidebar-foreground" />
      </div>
    </SidebarHeader>
  );
}
