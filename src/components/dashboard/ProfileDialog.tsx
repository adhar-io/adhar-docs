
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Settings, 
  LogOut, 
  Crown, 
  Shield, 
  Mail, 
  Phone,
  MapPin,
  Calendar,
  Building2,
  Star
} from 'lucide-react';

interface ProfileDialogProps {
  children: React.ReactNode;
}

export function ProfileDialog({ children }: ProfileDialogProps) {
  const user = {
    name: 'John Doe',
    email: 'john.doe@company.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    joinDate: 'January 2023',
    company: 'ADHAR Technologies',
    role: 'Senior Developer',
    plan: 'Pro',
    avatar: '/placeholder.svg'
  };

  const stats = [
    { label: 'Projects', value: '12' },
    { label: 'Models Deployed', value: '48' },
    { label: 'API Calls', value: '1.2M' },
    { label: 'Team Members', value: '8' }
  ];

  const recentActivity = [
    { action: 'Deployed Model', target: 'sentiment-analysis-v2', time: '2 hours ago' },
    { action: 'Created Project', target: 'customer-insights', time: '1 day ago' },
    { action: 'Updated API', target: 'recommendation-engine', time: '3 days ago' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-start space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-semibold">{user.name}</h3>
                <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                  <Crown className="w-3 h-3 mr-1" />
                  {user.plan}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.role}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Building2 className="w-4 h-4" />
                  <span>{user.company}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {user.joinDate}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Contact Information</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{user.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{user.location}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Account Statistics</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Recent Activity */}
          <div className="space-y-3">
            <h4 className="font-medium">Recent Activity</h4>
            <div className="space-y-2">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <div>
                    <span className="text-sm font-medium">{activity.action}</span>
                    <span className="text-sm text-gray-500 ml-1">{activity.target}</span>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1">
              <Settings className="w-4 h-4 mr-2" />
              Account Settings
            </Button>
            <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
