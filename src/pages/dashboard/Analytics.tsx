import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Eye,
  Clock,
  MousePointer,
  Smartphone,
  Monitor,
  Globe,
  BarChart3,
  PieChart,
  LineChart,
  Target
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const userGrowthData = [
  { month: 'Jan', users: 1200, newUsers: 340 },
  { month: 'Feb', users: 1850, newUsers: 520 },
  { month: 'Mar', users: 2100, newUsers: 380 },
  { month: 'Apr', users: 2800, newUsers: 720 },
  { month: 'May', users: 3200, newUsers: 890 },
  { month: 'Jun', users: 4100, newUsers: 1100 },
];

const deviceData = [
  { name: 'Desktop', value: 45, color: '#3B82F6' },
  { name: 'Mobile', value: 35, color: '#8B5CF6' },
  { name: 'Tablet', value: 20, color: '#10B981' },
];

const topPages = [
  { page: '/dashboard', views: 12543, bounceRate: 23 },
  { page: '/models', views: 8921, bounceRate: 31 },
  { page: '/analytics', views: 6754, bounceRate: 18 },
  { page: '/reports', views: 4532, bounceRate: 42 },
  { page: '/settings', views: 3210, bounceRate: 28 },
];

const Analytics = () => {
  return (
    <div className="p-6 space-y-8">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">847,394</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">124,567</div>
            <p className="text-xs text-purple-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">4:32</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">24.3%</div>
            <p className="text-xs text-orange-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              -3.1% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* User Growth Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <LineChart className="h-5 w-5 text-white" />
              </div>
              <span>User Growth Trend</span>
            </CardTitle>
            <CardDescription>Monthly user acquisition and total users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={3} />
                <Line type="monotone" dataKey="newUsers" stroke="#8B5CF6" strokeWidth={3} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600">
                <PieChart className="h-5 w-5 text-white" />
              </div>
              <span>Device Distribution</span>
            </CardTitle>
            <CardDescription>User sessions by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    dataKey="value"
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              {deviceData.map((device) => (
                <div key={device.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: device.color }}
                  />
                  <span className="text-sm">{device.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span>Top Performing Pages</span>
          </CardTitle>
          <CardDescription>Most visited pages and their performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPages.map((page, index) => (
              <div key={page.page} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{page.page}</p>
                    <p className="text-sm text-muted-foreground">{page.views.toLocaleString()} views</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={page.bounceRate < 30 ? 'default' : page.bounceRate < 40 ? 'secondary' : 'destructive'}>
                    {page.bounceRate}% bounce rate
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
