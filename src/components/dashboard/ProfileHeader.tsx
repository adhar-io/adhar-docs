
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface User {
  name: string;
  email: string;
  plan: string;
  avatar: string;
}

interface ProfileHeaderProps {
  user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <div className="flex items-center space-x-3">
        <Avatar className="w-12 h-12 border-2 border-white/20">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-white/20 text-white">
            {user.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold">{user.name}</h3>
            <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
              <Crown className="w-3 h-3 mr-1" />
              {user.plan}
            </Badge>
          </div>
          <p className="text-sm text-white/80">{user.email}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-lg font-bold">12</div>
          <div className="text-xs text-white/80">Projects</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-lg font-bold">48</div>
          <div className="text-xs text-white/80">Models</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-lg font-bold">1.2M</div>
          <div className="text-xs text-white/80">API Calls</div>
        </div>
      </div>
    </div>
  );
}
