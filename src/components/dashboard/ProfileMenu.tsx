
import React from 'react';
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ProfileHeader } from './ProfileHeader';
import { WorkspaceSelector } from './WorkspaceSelector';
import { ProfileMenuItems } from './ProfileMenuItems';

interface ProfileMenuProps {
  children: React.ReactNode;
}

const organizations = [
  { id: '1', name: 'Acme Corp', type: 'Enterprise' },
  { id: '2', name: 'TechStart Inc', type: 'Startup' },
  { id: '3', name: 'Global Solutions', type: 'Enterprise' },
];

const teams = [
  { id: '1', name: 'Engineering', members: 12 },
  { id: '2', name: 'Product', members: 8 },
  { id: '3', name: 'Design', members: 5 },
  { id: '4', name: 'Marketing', members: 6 },
];

export function ProfileMenu({ children }: ProfileMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const user = {
    name: 'John Doe',
    email: 'john.doe@company.com',
    plan: 'Pro',
    avatar: '/placeholder.svg'
  };

  const [selectedOrg, setSelectedOrg] = React.useState('Acme Corp');
  const [selectedTeam, setSelectedTeam] = React.useState('Engineering');

  const handleLogout = () => {
    // Clear authentication state
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    // Redirect to login page
    navigate({ to: '/login' });
  };

  const handleMenuAction = (action: string) => {
    if (action === 'logout') {
      handleLogout();
    } else {
      console.log(`Profile menu action: ${action}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 p-0 bg-white/95 backdrop-blur-md dark:bg-gray-800/95 border border-gray-200/60 dark:border-gray-700/60 shadow-2xl rounded-xl animate-in slide-in-from-top-2 duration-300" 
        align="end"
      >
        {/* Profile Header */}
        <ProfileHeader user={user} />

        <div className="p-2">
          {/* Workspace Selection */}
          <WorkspaceSelector
            organizations={organizations}
            teams={teams}
            selectedOrg={selectedOrg}
            selectedTeam={selectedTeam}
            onOrgChange={setSelectedOrg}
            onTeamChange={setSelectedTeam}
          />

          <DropdownMenuSeparator className="border-gray-200/60 dark:border-gray-700/60 my-3" />

          {/* Profile Menu Items */}
          <ProfileMenuItems onMenuAction={handleMenuAction} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

