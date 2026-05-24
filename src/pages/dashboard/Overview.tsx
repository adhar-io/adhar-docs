
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  DollarSign, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Bell,
  Zap,
  Target,
  Cpu,
  Database,
  Cloud,
  Shield,
  Sparkles,
  Rocket,
  Heart,
  Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

const performanceData = [
  { name: 'Jan', value: 400, users: 240 },
  { name: 'Feb', value: 300, users: 139 },
  { name: 'Mar', value: 200, users: 980 },
  { name: 'Apr', value: 278, users: 390 },
  { name: 'May', value: 189, users: 480 },
  { name: 'Jun', value: 239, users: 380 },
  { name: 'Jul', value: 349, users: 430 },
];

const systemMetrics = [
  { name: 'Mon', cpu: 65, memory: 45, requests: 1200 },
  { name: 'Tue', cpu: 78, memory: 52, requests: 1400 },
  { name: 'Wed', cpu: 52, memory: 38, requests: 980 },
  { name: 'Thu', cpu: 67, memory: 48, requests: 1350 },
  { name: 'Fri', cpu: 89, memory: 65, requests: 1800 },
  { name: 'Sat', cpu: 34, memory: 28, requests: 750 },
  { name: 'Sun', cpu: 41, memory: 32, requests: 680 },
];

const recentActivities = [
  { id: 1, title: 'New deployment to Production', time: '2 minutes ago', type: 'deployment', status: 'success' },
  { id: 2, title: 'API rate limit threshold reached', time: '15 minutes ago', type: 'alert', status: 'warning' },
  { id: 3, title: 'Database backup completed', time: '1 hour ago', type: 'backup', status: 'success' },
  { id: 4, title: 'User authentication spike detected', time: '2 hours ago', type: 'security', status: 'info' },
  { id: 5, title: 'Model training job finished', time: '3 hours ago', type: 'ai', status: 'success' },
];

const quickActions = [
  { title: 'Deploy to Production', icon: Cloud, description: 'Deploy latest changes', color: 'from-blue-500 to-blue-600' },
  { title: 'Create New Model', icon: Cpu, description: 'Start AI model training', color: 'from-purple-500 to-purple-600' },
  { title: 'Backup Database', icon: Database, description: 'Manual backup', color: 'from-green-500 to-green-600' },
  { title: 'Security Scan', icon: Shield, description: 'Run security audit', color: 'from-red-500 to-red-600' },
];

const MetricCard = ({ title, value, change, icon: Icon, trend, bgGradient }: any) => (
  <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
    <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-10`} />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`p-2 rounded-lg bg-gradient-to-r ${bgGradient}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </CardHeader>
    <CardContent className="relative">
      <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
        {value}
      </div>
      <div className="flex items-center text-xs mt-2">
        {trend === 'up' ? (
          <div className="flex items-center text-green-600">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            <span className="font-medium">+{change}%</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <ArrowDownRight className="h-3 w-3 mr-1" />
            <span className="font-medium">{change}%</span>
          </div>
        )}
        <span className="ml-2 text-muted-foreground">from last month</span>
      </div>
    </CardContent>
  </Card>
);

const SystemHealth = () => (
  <Card className="border-0 shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span>System Health</span>
      </CardTitle>
      <CardDescription>Real-time system performance metrics</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>CPU Usage</span>
          <span className="font-medium">67%</span>
        </div>
        <div className="relative">
          <Progress value={67} className="h-3" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full opacity-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Memory Usage</span>
          <span className="font-medium">45%</span>
        </div>
        <div className="relative">
          <Progress value={45} className="h-3" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full opacity-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Disk Usage</span>
          <span className="font-medium">32%</span>
        </div>
        <div className="relative">
          <Progress value={32} className="h-3" />
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full opacity-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Network I/O</span>
          <span className="font-medium">23%</span>
        </div>
        <div className="relative">
          <Progress value={23} className="h-3" />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full opacity-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const Overview = () => {
  return (
    <div className="p-6 space-y-8">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value="$45,231"
          change="20.1"
          icon={DollarSign}
          trend="up"
          bgGradient="from-green-500 to-green-600"
        />
        <MetricCard
          title="Active Users"
          value="2,350"
          change="180.1"
          icon={Users}
          trend="up"
          bgGradient="from-blue-500 to-blue-600"
        />
        <MetricCard
          title="API Requests"
          value="12,234"
          change="19"
          icon={BarChart3}
          trend="up"
          bgGradient="from-purple-500 to-purple-600"
        />
        <MetricCard
          title="Uptime"
          value="99.9%"
          change="2"
          icon={Activity}
          trend="down"
          bgGradient="from-orange-500 to-orange-600"
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Performance Chart */}
        <Card className="col-span-2 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span>Performance Analytics</span>
            </CardTitle>
            <CardDescription>
              Revenue and user growth over the last 7 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="url(#colorValue)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#8B5CF6"
                  fill="url(#colorUsers)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Health */}
        <SystemHealth />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    activity.status === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    activity.status === 'info' ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                  } shadow-lg`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant={
                    activity.status === 'success' ? 'default' :
                    activity.status === 'warning' ? 'secondary' :
                    activity.status === 'info' ? 'outline' : 'destructive'
                  } className="shadow-sm">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Frequently used operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto p-4 hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:scale-105"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center mr-4 shadow-lg`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-foreground">{action.title}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span>System Metrics</span>
          </CardTitle>
          <CardDescription>
            Weekly system performance overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={systemMetrics}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="name" className="text-muted-foreground" />
              <YAxis className="text-muted-foreground" />
              <Tooltip />
              <Bar dataKey="cpu" fill="url(#cpuGradient)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="memory" fill="url(#memoryGradient)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
