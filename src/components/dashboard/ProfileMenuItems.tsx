
import React from 'react';
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Settings,
  LogOut,
  Shield,
  CreditCard,
  Bell,
  HelpCircle,
  Key,
  BarChart3,
  Heart,
  Star,
  Gift,
} from 'lucide-react';

interface ProfileMenuItemsProps {
  onMenuAction: (action: string) => void;
}

export function ProfileMenuItems({ onMenuAction }: ProfileMenuItemsProps) {
  return (
    <>
      {/* Account Management */}
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Account
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onMenuAction('profile')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <User className="mr-2 h-4 w-4" />
          <span>Profile Settings</span>
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('billing')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing & Plans</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('notifications')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('preferences')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Settings className="mr-2 h-4 w-4" />
          <span>Preferences</span>
          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="border-gray-200 dark:border-gray-700" />

      {/* Security & Permissions */}
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Security
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onMenuAction('security')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Shield className="mr-2 h-4 w-4" />
          <span>Security & Permissions</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('api-keys')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Key className="mr-2 h-4 w-4" />
          <span>API Keys</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('usage')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Usage Analytics</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="border-gray-200 dark:border-gray-700" />

      {/* Support & Community */}
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Support
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onMenuAction('help')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Documentation</span>
          <DropdownMenuShortcut>⌘H</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('feedback')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Heart className="mr-2 h-4 w-4" />
          <span>Send Feedback</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMenuAction('community')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Star className="mr-2 h-4 w-4" />
          <span>Community</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="border-gray-200 dark:border-gray-700" />

      {/* Special Actions */}
      <DropdownMenuItem onClick={() => onMenuAction('referral')} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
        <Gift className="mr-2 h-4 w-4" />
        <span>Refer Friends</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          Get $10
        </Badge>
      </DropdownMenuItem>

      <DropdownMenuSeparator className="border-gray-200 dark:border-gray-700" />

      {/* Sign Out */}
      <DropdownMenuItem 
        onClick={() => onMenuAction('logout')}
        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Sign Out</span>
        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}
