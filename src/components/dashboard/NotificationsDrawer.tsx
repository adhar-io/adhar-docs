
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const notifications = [
  {
    id: 1,
    type: 'success',
    title: 'Model Deployment Complete',
    message: 'Your GPT-4 Vision model has been successfully deployed.',
    time: '2 minutes ago',
    read: false,
  },
  {
    id: 2,
    type: 'warning',
    title: 'High API Usage',
    message: 'You are approaching your monthly API limit.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 3,
    type: 'info',
    title: 'New Feature Available',
    message: 'Check out our new analytics dashboard features.',
    time: '3 hours ago',
    read: true,
  },
  {
    id: 4,
    type: 'error',
    title: 'Model Training Failed',
    message: 'Your custom model training encountered an error.',
    time: '5 hours ago',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
};

const getNotificationBadgeColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  }
};

export function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <span>Notifications</span>
          </SheetTitle>
          <SheetDescription>
            Stay updated with your AI platform activities
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-auto py-6">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-all duration-200 ${
                  !notification.read 
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {notification.time}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          <Badge className={getNotificationBadgeColor(notification.type)}>
                            {notification.type}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              <Button variant="outline" className="flex-1">
                Mark All as Read
              </Button>
              <Button variant="outline" className="flex-1">
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
