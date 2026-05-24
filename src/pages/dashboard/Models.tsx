
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Play, Pause, Settings, TrendingUp } from 'lucide-react';

const Models = () => {
  const models = [
    {
      id: 1,
      name: 'GPT-4 Vision',
      status: 'active',
      accuracy: '95.2%',
      requests: '234K',
      lastUpdate: '2 hours ago',
      type: 'Vision AI',
    },
    {
      id: 2,
      name: 'Sentiment Analyzer',
      status: 'active',
      accuracy: '91.8%',
      requests: '89K',
      lastUpdate: '4 hours ago',
      type: 'NLP',
    },
    {
      id: 3,
      name: 'Recommendation Engine',
      status: 'paused',
      accuracy: '87.5%',
      requests: '156K',
      lastUpdate: '1 day ago',
      type: 'ML',
    },
    {
      id: 4,
      name: 'Fraud Detection',
      status: 'active',
      accuracy: '99.1%',
      requests: '45K',
      lastUpdate: '30 minutes ago',
      type: 'Security',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Models</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage and monitor your deployed AI models
          </p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white">
          Deploy New Model
        </Button>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <Card key={model.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-400 dark:to-purple-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{model.name}</CardTitle>
                    <Badge className={getStatusColor(model.status)}>
                      {model.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{model.accuracy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Requests</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{model.requests}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.type}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{model.lastUpdate}</p>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button size="sm" variant="outline" className="flex-1">
                  {model.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model Performance Summary */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Model Performance Summary</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Overall performance metrics across all models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">4</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Models</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">93.4%</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Accuracy</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">524K</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">99.9%</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Models;
