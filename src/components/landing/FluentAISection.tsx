
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Lightbulb, BarChart3, Zap, Database, MessageCircle, ArrowRight } from "lucide-react";

const FluentAISection = () => {
  const aiCapabilities = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Intelligent Data Analysis",
      description: "Automatically identifies patterns and anomalies in your infrastructure data",
      color: "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-800/20"
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Predictive Insights",
      description: "Forecasts potential issues before they impact your operations",
      color: "bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Smart Recommendations",
      description: "Provides actionable suggestions for optimization and scaling",
      color: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Automated Responses",
      description: "Executes intelligent remediation actions based on learned patterns",
      color: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20"
    }
  ];

  const platformIntegration = [
    {
      icon: <Database className="w-5 h-5" />,
      title: "Data Discovery",
      description: "AI-powered data cataloging and classification across all your sources"
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Analytics Engine",
      description: "Machine learning algorithms that understand your business context"
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Natural Language Queries",
      description: "Ask questions in plain English and get instant, accurate answers"
    }
  ];

  return (
    <section id="fluent-ai" className="py-24 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0 dark:from-purple-900/50 dark:to-pink-900/50 dark:text-purple-300">
            <Brain className="w-4 h-4 mr-2" />
            Powered by Fluent AI
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Integrated Data & AI Platform
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Transform raw data into strategic decisions with AI that understands context, not just numbers. 
            Fluent AI revolutionizes how you discover, understand, and act on business intelligence.
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-medium shadow-lg">
            <Zap className="w-5 h-5 mr-2" />
            AI That Understands Your Language
          </div>
        </div>

        <div className="mb-16">
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 border-0 shadow-2xl overflow-hidden">
            <CardContent className="p-12 text-center text-white relative">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-white/20 to-white/10 rounded-3xl flex items-center justify-center mr-6 shadow-lg backdrop-blur-sm border border-white/20">
                    <Brain className="w-10 h-10" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-4xl font-bold mb-2">Understands Your Data</h3>
                    <p className="text-purple-100 text-lg">Context-Aware Intelligence for Better Decisions</p>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
                  <div className="grid md:grid-cols-3 gap-6 text-left">
                    {platformIntegration.map((item, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">{item.title}</h4>
                          <p className="text-purple-100 text-sm">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-2xl font-bold">99.2%</div>
                    <div className="text-purple-100 text-sm">Accuracy Rate</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-2xl font-bold">&lt; 100ms</div>
                    <div className="text-purple-100 text-sm">Response Time</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-purple-100 text-sm">Monitoring</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-2xl font-bold">Auto</div>
                    <div className="text-purple-100 text-sm">Learning</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {aiCapabilities.map((capability, index) => (
            <Card key={index} className={`${capability.color} border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 group`}>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 border border-gray-200 dark:border-gray-600">
                    {capability.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {capability.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {capability.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300">
            <CardContent className="p-12">
              <Brain className="w-16 h-16 text-purple-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Experience Fluent AI in Action
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                See how Fluent AI transforms complex data queries into simple conversations. 
                Try our interactive demo to experience the future of data intelligence.
              </p>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-8 py-3 shadow-lg">
                <MessageCircle className="w-5 h-5 mr-2" />
                Try Interactive Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FluentAISection;
