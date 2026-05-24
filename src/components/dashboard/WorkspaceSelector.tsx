
import React from 'react';
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Building2, Users } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface Team {
  id: string;
  name: string;
  members: number;
}

interface WorkspaceSelectorProps {
  organizations: Organization[];
  teams: Team[];
  selectedOrg: string;
  selectedTeam: string;
  onOrgChange: (orgName: string) => void;
  onTeamChange: (teamName: string) => void;
}

export function WorkspaceSelector({
  organizations,
  teams,
  selectedOrg,
  selectedTeam,
  onOrgChange,
  onTeamChange,
}: WorkspaceSelectorProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Workspace
      </DropdownMenuLabel>
      
      {/* Organization Selection */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-gray-900 dark:text-gray-100">
          <Building2 className="mr-2 h-4 w-4" />
          <span>{selectedOrg}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => onOrgChange(org.name)}
              className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span>{org.name}</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{org.type}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="border-gray-200 dark:border-gray-700" />
          <DropdownMenuItem className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Building2 className="mr-2 h-4 w-4" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* Team Selection */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-gray-900 dark:text-gray-100">
          <Users className="mr-2 h-4 w-4" />
          <span>{selectedTeam}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => onTeamChange(team.name)}
              className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Users className="mr-2 h-4 w-4" />
              <span>{team.name}</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{team.members} members</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="border-gray-200 dark:border-gray-700" />
          <DropdownMenuItem className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Users className="mr-2 h-4 w-4" />
            Create Team
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
