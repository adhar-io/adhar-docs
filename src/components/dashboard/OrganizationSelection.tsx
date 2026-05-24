
import React from 'react';
import { Building2, UsersIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarFooter } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function OrganizationSelection() {
  const [selectedOrg, setSelectedOrg] = React.useState('Acme Corp');
  const [selectedTeam, setSelectedTeam] = React.useState('Engineering');

  return (
    <SidebarFooter>
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {/* Organization Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
            Organization
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8 text-xs bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  <span className="truncate">{selectedOrg}</span>
                </div>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white shadow-lg border-blue-200">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setSelectedOrg(org.name)}
                  className="flex items-center justify-between hover:bg-blue-50"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{org.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{org.type}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-blue-50">
                <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                Create Organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Team Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
            Team
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-8 text-xs bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100">
                <div className="flex items-center space-x-2">
                  <UsersIcon className="w-3 h-3 text-green-600" />
                  <span className="truncate">{selectedTeam}</span>
                </div>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white shadow-lg border-green-200">
              {teams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => setSelectedTeam(team.name)}
                  className="flex items-center justify-between hover:bg-green-50"
                >
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="w-4 h-4 text-green-600" />
                    <span>{team.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{team.members} members</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-green-50">
                <UsersIcon className="w-4 h-4 mr-2 text-green-600" />
                Create Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </SidebarFooter>
  );
}
