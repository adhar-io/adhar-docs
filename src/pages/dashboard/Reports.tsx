
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Download, 
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const reportsData = [
  { name: 'User Activity Report', type: 'Analytics', status: 'Ready', lastUpdated: '2 hours ago', size: '2.4 MB' },
  { name: 'Performance Metrics', type: 'System', status: 'Generating', lastUpdated: '5 minutes ago', size: '1.8 MB' },
  { name: 'Revenue Analysis', type: 'Financial', status: 'Ready', lastUpdated: '1 day ago', size: '3.2 MB' },
  { name: 'Security Audit', type: 'Security', status: 'Ready', lastUpdated: '3 days ago', size: '5.1 MB' },
];

const weeklyData = [
  { day: 'Mon', reports: 12 },
  { day: 'Tue', reports: 19 },
  { day: 'Wed', reports: 15 },
  { day: 'Thu', reports: 22 },
  { day: 'Fri', reports: 28 },
  { day: 'Sat', reports: 16 },
  { day: 'Sun', reports: 11 },
];

const Reports = () => {
  return (
    <div className="p-6 space-y-8">
      {/* Report Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">1,247</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">987</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generating</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">23</div>
            <p className="text-xs text-orange-600 flex items-center mt-1">
              <Activity className="h-3 w-3 mr-1" />
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Reports</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">5</div>
            <p className="text-xs text-red-600 flex items-center mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Weekly Report Generation */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span>Weekly Report Generation</span>
            </CardTitle>
            <CardDescription>Number of reports generated per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="day" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip />
                <Bar dataKey="reports" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Generate and manage reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generate New Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Bulk Download
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span>Recent Reports</span>
          </CardTitle>
          <CardDescription>Latest generated reports and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportsData.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground">{report.type} • {report.size}</p>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-4">
                  <div>
                    <Badge variant={report.status === 'Ready' ? 'default' : report.status === 'Generating' ? 'secondary' : 'destructive'}>
                      {report.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{report.lastUpdated}</p>
                  </div>
                  {report.status === 'Ready' && (
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
