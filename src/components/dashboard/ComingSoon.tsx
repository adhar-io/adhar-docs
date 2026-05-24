
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction, Calendar, Bell } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  expectedDate?: string;
}

export function ComingSoon({ title, description, expectedDate }: ComingSoonProps) {
  return (
    <div className="p-6 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Card className="w-full max-w-2xl text-center border-0 shadow-lg">
        <CardHeader className="pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <Construction className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {expectedDate && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Expected launch: {expectedDate}</span>
            </div>
          )}
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              We're working hard to bring you this feature. Stay tuned for updates!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notify Me</span>
              </Button>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
