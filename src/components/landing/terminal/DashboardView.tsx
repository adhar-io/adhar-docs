
import React from 'react';
import { TrendingUp, Users, Zap, Shield, BarChart3, Activity, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import Logo from '@/components/ui/Logo';

const performanceData = [
  { name: 'Jan', revenue: 45000, users: 2400, apiCalls: 12000 },
  { name: 'Feb', revenue: 52000, users: 2800, apiCalls: 15000 },
  { name: 'Mar', revenue: 48000, users: 3200, apiCalls: 14000 },
  { name: 'Apr', revenue: 58000, users: 3800, apiCalls: 18000 },
  { name: 'May', revenue: 65000, users: 4200, apiCalls: 22000 },
  { name: 'Jun', revenue: 72000, users: 4600, apiCalls: 25000 },
];

const systemMetrics = [
  { name: 'CPU', value: 67, color: '#3B82F6' },
  { name: 'Memory', value: 45, color: '#8B5CF6' },
  { name: 'Storage', value: 32, color: '#10B981' },
  { name: 'Network', value: 78, color: '#F59E0B' },
];

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#3B82F6',
  },
  users: {
    label: 'Users',
    color: '#8B5CF6',
  },
  apiCalls: {
    label: 'API Calls',
    color: '#10B981',
  },
};

const DashboardView = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-200/60 dark:bg-gray-800 dark:border-gray-700/60 h-[600px] group hover:shadow-3xl transition-all duration-700 will-change-transform">
      {/* Browser Header with enhanced styling */}
      <div className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200/80 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 dark:border-gray-600/80 group-hover:from-blue-50/50 group-hover:to-purple-50/50 transition-all duration-500">
        <div className="flex space-x-2 mr-4">
          <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded-full shadow-sm hover:scale-110 transition-transform duration-200"></div>
          <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-sm hover:scale-110 transition-transform duration-200"></div>
          <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-sm hover:scale-110 transition-transform duration-200"></div>
        </div>
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 text-gray-600 text-sm border border-gray-200/60 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-600/60 shadow-inner hover:shadow-md transition-all duration-300">
          https://console.adhar.io
        </div>
      </div>
      
      {/* Dashboard Content with improved background */}
      <div className="bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6 h-[540px] overflow-y-auto dark:from-gray-800 dark:via-gray-900/80 dark:to-gray-800/90 backdrop-blur-sm">
        {/* Header with enhanced styling */}
        <div className="flex items-center justify-between mb-8 group/header">
          <div className="flex items-center space-x-4 transform group-hover/header:scale-[1.02] transition-all duration-500 will-change-transform">
            <Logo size="md" showTagline={false} linkTo={null} />
          </div>
          <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40 dark:bg-gray-800/60 dark:border-gray-700/40 hover:shadow-xl hover:scale-105 transition-all duration-500 will-change-transform">
            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">All systems operational</span>
          </div>
        </div>
        
        {/* Enhanced Key Metrics Cards with smooth animations */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/60 dark:bg-gray-700/80 dark:border-gray-600/60 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 will-change-transform group/card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500 will-change-transform">
                <DollarSign className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300 mb-2">$72,000</div>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              +20.1% from last month
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/60 dark:bg-gray-700/80 dark:border-gray-600/60 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 will-change-transform group/card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Users</div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500 will-change-transform">
                <Users className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300 mb-2">4,600</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              +180.1% from last month
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/60 dark:bg-gray-700/80 dark:border-gray-600/60 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 will-change-transform group/card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">API Requests</div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500 will-change-transform">
                <Zap className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300 mb-2">25,000</div>
            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              +19% from last month
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/60 dark:bg-gray-700/80 dark:border-gray-600/60 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 will-change-transform group/card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Uptime</div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500 will-change-transform">
                <Shield className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300 mb-2">99.9%</div>
            <div className="text-sm text-orange-600 dark:text-orange-400 font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              +2% from last month
            </div>
          </div>
        </div>
        
        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-3 gap-8">
          {/* Performance Analytics with improved styling */}
          <div className="col-span-2 bg-white/80 backdrop-blur-md rounded-xl p-8 shadow-lg border border-white/60 dark:bg-gray-700/80 dark:border-gray-600/60 hover:shadow-2xl hover:scale-[1.01] transition-all duration-700 will-change-transform group/chart">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover/chart:scale-110 group-hover/chart:rotate-3 transition-all duration-500 will-change-transform">
                <TrendingUp className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Performance Analytics</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue and user growth over the last 6 months</p>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-40">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200/60 dark:stroke-gray-600/40" />
                <XAxis dataKey="name" className="text-gray-500 dark:text-gray-400" />
                <YAxis className="text-gray-500 dark:text-gray-400" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="url(#colorRevenue)"
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
            </ChartContainer>
          </div>
          
          {/* Enhanced System Health */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 shadow-lg border border-white/60 dark:bg-gray-700/80 dark:border-gray-600/60 hover:shadow-2xl hover:scale-[1.01] transition-all duration-700 will-change-transform group/health">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 via-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover/health:scale-110 group-hover/health:rotate-3 transition-all duration-500 will-change-transform">
                <Activity className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">System Health</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Real-time performance</p>
              </div>
            </div>
            <div className="space-y-6">
              {systemMetrics.map((metric, index) => (
                <div key={index} className="space-y-3 group/metric">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-300">{metric.value}%</span>
                  </div>
                  <div className="relative w-full bg-gray-200/60 rounded-full h-3 dark:bg-gray-600/60 overflow-hidden shadow-inner">
                    <div 
                      className="h-3 rounded-full transition-all duration-1000 ease-out shadow-sm group-hover/metric:shadow-md" 
                      style={{ 
                        width: `${metric.value}%`,
                        background: `linear-gradient(90deg, ${metric.color}cc, ${metric.color})`
                      }}
                    ></div>
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full"
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;

