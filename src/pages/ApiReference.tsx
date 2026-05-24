
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

const ApiReference = () => {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/projects",
      description: "List all projects",
      parameters: [
        { name: "limit", type: "integer", description: "Number of projects to return (default: 20)" },
        { name: "offset", type: "integer", description: "Number of projects to skip (default: 0)" }
      ]
    },
    {
      method: "POST",
      path: "/api/v1/projects",
      description: "Create a new project",
      parameters: [
        { name: "name", type: "string", description: "Project name (required)" },
        { name: "description", type: "string", description: "Project description" },
        { name: "template", type: "string", description: "Template to use for the project" }
      ]
    },
    {
      method: "GET",
      path: "/api/v1/projects/{id}",
      description: "Get project details",
      parameters: [
        { name: "id", type: "string", description: "Project ID (required)" }
      ]
    },
    {
      method: "PUT",
      path: "/api/v1/projects/{id}",
      description: "Update a project",
      parameters: [
        { name: "id", type: "string", description: "Project ID (required)" },
        { name: "name", type: "string", description: "Project name" },
        { name: "description", type: "string", description: "Project description" }
      ]
    },
    {
      method: "DELETE",
      path: "/api/v1/projects/{id}",
      description: "Delete a project",
      parameters: [
        { name: "id", type: "string", description: "Project ID (required)" }
      ]
    }
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "POST": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "PUT": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "DELETE": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />

      <main className="pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              API Reference
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Complete reference for the ADHAR platform API endpoints and authentication.
            </p>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                v2.1.0
              </Badge>
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                REST API
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Getting Started */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Getting Started</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Base URL and authentication information for the ADHAR API.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Base URL</h4>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-mono text-sm">
                    https://api.adhar.platform.com
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Authentication</h4>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    All API requests require authentication using a Bearer token in the Authorization header:
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-mono text-sm">
                    Authorization: Bearer your_api_token_here
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endpoints */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {endpoints.map((endpoint, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <Badge className={getMethodColor(endpoint.method)}>
                          {endpoint.method}
                        </Badge>
                        <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {endpoint.path}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(endpoint.path, endpoint.path)}
                          className="p-1"
                        >
                          {copiedEndpoint === endpoint.path ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">{endpoint.description}</p>
                      
                      {endpoint.parameters.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Parameters</h5>
                          <div className="space-y-2">
                            {endpoint.parameters.map((param, paramIndex) => (
                              <div key={paramIndex} className="flex items-start gap-4 text-sm">
                                <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded min-w-fit">
                                  {param.name}
                                </code>
                                <Badge variant="outline" className="text-xs">
                                  {param.type}
                                </Badge>
                                <span className="text-gray-600 dark:text-gray-300">{param.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Examples */}
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Example Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="space-y-4">
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`curl -X GET "https://api.adhar.platform.com/api/v1/projects" \\
     -H "Authorization: Bearer your_api_token_here" \\
     -H "Content-Type: application/json"`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="javascript" className="space-y-4">
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`const response = await fetch('https://api.adhar.platform.com/api/v1/projects', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_token_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="python" className="space-y-4">
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`import requests

headers = {
    'Authorization': 'Bearer your_api_token_here',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.adhar.platform.com/api/v1/projects', headers=headers)
data = response.json()`}</pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApiReference;
