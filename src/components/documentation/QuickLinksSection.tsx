
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Code2, GitBranch, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const QuickLinksSection = () => {
  return (
    <section className="pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6">
          <Link to="/docs/quick-start-guide">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white cursor-pointer">
              <CardContent className="p-6">
                <BookOpen className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">Quick Start</h3>
                <p className="text-blue-100 dark:text-blue-200 mb-4">Get started with ADHAR in minutes</p>
                <div className="flex items-center text-white">
                  Start Here <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/docs/api-reference">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white cursor-pointer">
              <CardContent className="p-6">
                <Code2 className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">API Reference</h3>
                <p className="text-purple-100 dark:text-purple-200 mb-4">Complete API documentation</p>
                <div className="flex items-center text-white">
                  View API <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/docs/templates">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white cursor-pointer">
              <CardContent className="p-6">
                <GitBranch className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">Examples</h3>
                <p className="text-green-100 dark:text-green-200 mb-4">Sample projects and templates</p>
                <div className="flex items-center text-white">
                  Browse <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default QuickLinksSection;
