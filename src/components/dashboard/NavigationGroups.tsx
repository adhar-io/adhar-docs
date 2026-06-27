
import React from 'react';
import { Link, useLocation } from "@tanstack/react-router";
import { 
  BarChart3, 
  Settings, 
  Database, 
  Brain, 
  Zap, 
  Users, 
  FileText,
  Activity,
  Shield,
  Palette,
  Code,
  Truck,
  Search,
  Target,
  Building,
  GitBranch,
  Layers,
  Globe,
  UserCheck,
  Key,
  Gauge,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navigationGroups = [
  {
    label: 'Dashboard',
    items: [
      { title: 'Overview', url: '/dashboard', icon: Gauge },
      { title: 'Analytics', url: '/dashboard/analytics', icon: PieChart },
      { title: 'Performance', url: '/dashboard/performance', icon: TrendingUp },
    ]
  },
  {
    label: 'Define',
    items: [
      { title: 'Requirements', url: '/dashboard/requirements', icon: Target },
      { title: 'Architecture', url: '/dashboard/architecture', icon: Building },
      { title: 'Planning', url: '/dashboard/planning', icon: FileText },
    ]
  },
  {
    label: 'Design',
    items: [
      { title: 'UI/UX Design', url: '/dashboard/design', icon: Palette },
      { title: 'Prototypes', url: '/dashboard/prototypes', icon: Layers },
      { title: 'Assets', url: '/dashboard/assets', icon: Database },
    ]
  },
  {
    label: 'Develop',
    items: [
      { title: 'Code Repository', url: '/dashboard/repository', icon: GitBranch },
      { title: 'AI Models', url: '/dashboard/models', icon: Brain },
      { title: 'APIs', url: '/dashboard/apis', icon: Code },
    ]
  },
  {
    label: 'Deliver',
    items: [
      { title: 'Deployments', url: '/dashboard/deployments', icon: Truck },
      { title: 'Releases', url: '/dashboard/releases', icon: Globe },
      { title: 'Monitoring', url: '/dashboard/monitoring', icon: Activity },
    ]
  },
  {
    label: 'Discover',
    items: [
      { title: 'Data Sources', url: '/dashboard/data', icon: Database },
      { title: 'Insights', url: '/dashboard/insights', icon: Search },
      { title: 'Reports', url: '/dashboard/reports', icon: BarChart3 },
    ]
  },
  {
    label: 'Administrator',
    items: [
      { title: 'Team Management', url: '/dashboard/team', icon: Users },
      { title: 'Permissions', url: '/dashboard/permissions', icon: UserCheck },
      { title: 'Security', url: '/dashboard/security', icon: Shield },
      { title: 'API Keys', url: '/dashboard/api-keys', icon: Key },
      { title: 'Automations', url: '/dashboard/automations', icon: Zap },
      { title: 'Settings', url: '/dashboard/settings', icon: Settings },
    ]
  },
];

export function NavigationGroups() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (active: boolean) =>
    active 
      ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium border-r-2 border-blue-500" 
      : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 text-sidebar-foreground hover:text-blue-600";

  return (
    <div className="flex-1 overflow-y-auto">
      {navigationGroups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="text-sidebar-foreground/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.url} 
                      className={`flex items-center px-4 py-2 text-sm rounded-lg mx-2 transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
