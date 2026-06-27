
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, Moon, Sun } from "lucide-react";
import { Github } from "@/components/brand-icons";
import { Link } from "@tanstack/react-router";

interface DocumentationHeaderProps {
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isVisible: boolean;
}

const DocumentationHeader = ({
  selectedVersion,
  setSelectedVersion,
  searchQuery,
  setSearchQuery,
  isDarkMode,
  toggleDarkMode,
  isVisible
}: DocumentationHeaderProps) => {
  const versions = [
    { value: "v2.1.0", label: "v2.1.0 (Latest)", isLatest: true },
    { value: "v2.0.3", label: "v2.0.3", isLatest: false },
    { value: "v2.0.2", label: "v2.0.2", isLatest: false },
    { value: "v1.9.1", label: "v1.9.1", isLatest: false },
    { value: "v1.8.0", label: "v1.8.0", isLatest: false }
  ];

  return (
    <>
      {/* Sticky Header */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border border-gray-200/30 dark:border-gray-700/30 bg-white dark:bg-gray-800 hover:scale-105 transition-all duration-300">
                <img 
                  src="/lovable-uploads/c2bbb6a6-c383-4f93-953e-1a233d76654b.png" 
                  alt="ADHAR Logo" 
                  className="w-6 h-6 drop-shadow-sm filter brightness-110"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-wide">
                ADHAR
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              {/* Version Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                    {selectedVersion}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  {versions.map((version) => (
                    <DropdownMenuItem
                      key={version.value}
                      onClick={() => setSelectedVersion(version.value)}
                      className="flex items-center justify-between text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>{version.label}</span>
                      {version.isLatest && (
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs">
                          Latest
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleDarkMode}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <a href="https://github.com/adhar-io/adhar" target="_blank" rel="noopener noreferrer">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Everything you need to know to build amazing cloud-native applications with ADHAR
              </p>
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                {selectedVersion}
              </Badge>
            </div>
            
            {/* Search */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg focus:shadow-xl transition-shadow text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DocumentationHeader;
