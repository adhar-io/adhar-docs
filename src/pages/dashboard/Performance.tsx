
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Zap,
  Clock,
  Server,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Gauge,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

const performanceMetrics = [
  { name: 'CPU Usage', value: 67, change: 2.1, trend: 'up' },
  { name: 'Memory Usage', value: 45, change: -0.5, trend: 'down' },
  { name: 'Disk I/O', value: 32, change: 1.2, trend: 'up' },
  { name: 'Network I/O', value: 23, change: -0.8, trend: 'down' },
];

const serverStats = [
  { name: 'Server A', status: 'Healthy', cpu: 65, memory: 42, uptime: '14d 2h 3m' },
  { name: 'Server B', status: 'Warning', cpu: 82, memory: 78, uptime: '12d 5h 12m' },
  { name: 'Server C', status: 'Healthy', cpu: 54, memory: 35, uptime: '15d 8h 22m' },
];

const responseTimeData = [
  { time: '00:00', responseTime: 120 },
  { time: '03:00', responseTime: 150 },
  { time: '06:00', responseTime: 130 },
  { time: '09:00', responseTime: 180 },
  { time: '12:00', responseTime: 200 },
  { time: '15:00', responseTime: 170 },
  { time: '18:00', responseTime: 140 },
  { time: '21:00', responseTime: 160 },
];

const errorRateData = [
  { day: 'Mon', errors4xx: 12, errors5xx: 3 },
  { day: 'Tue', errors4xx: 8, errors5xx: 1 },
  { day: 'Wed', errors4xx: 5, errors5xx: 0 },
  { day: 'Thu', errors4xx: 7, errors5xx: 2 },
  { day: 'Fri', errors4xx: 15, errors5xx: 5 },
  { day: 'Sat', errors4xx: 10, errors5xx: 4 },
  { day: 'Sun', errors4xx: 6, errors5xx: 1 },
];

const Performance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
            Performance Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your system performance and health metrics in real-time
          </p>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</CardTitle>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">99.97%</div>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +0.02% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">127ms</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -15ms from last month
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Requests/Second</CardTitle>
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">1,847</div>
              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.3% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</CardTitle>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">0.03%</div>
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -0.01% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Response Time Chart */}
          <Card className="lg:col-span-2 border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Response Time Trends</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">Average response times over the last 24 hours</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200/60 dark:stroke-gray-700/60" />
                  <XAxis dataKey="time" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <YAxis className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' 
                    }} 
                  />
                  <Line type="monotone" dataKey="responseTime" stroke="#3B82F6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* System Resource Usage */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                  <Gauge className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">System Resources</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">Real-time utilization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">67%</span>
                </div>
                <Progress value={67} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
                      <HardDrive className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                      <Database className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disk I/O</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">32%</span>
                </div>
                <Progress value={32} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
                      <Wifi className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network I/O</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">23%</span>
                </div>
                <Progress value={23} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Rate Chart */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Error Rate Analysis</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">Error rates and types over the last 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={errorRateData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200/60 dark:stroke-gray-700/60" />
                <XAxis dataKey="day" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                <YAxis className="text-gray-500 dark:text-gray-400" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' 
                  }} 
                />
                <Bar dataKey="errors4xx" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                <Bar dataKey="errors5xx" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Server Status */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-500">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Server Status</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">Current status of all server instances</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {serverStats.map((server, index) => (
                <div key={index} className="p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-700/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{server.name}</h4>
                    <Badge 
                      variant={server.status === 'Healthy' ? 'default' : server.status === 'Warning' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {server.status}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.cpu}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.memory}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{server.uptime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Performance;
