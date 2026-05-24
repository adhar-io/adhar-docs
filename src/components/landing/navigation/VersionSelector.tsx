
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface VersionSelectorProps {
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
}

const VersionSelector = ({ selectedVersion, setSelectedVersion }: VersionSelectorProps) => {
  const versions = [
    { value: "v2.1.0", label: "v2.1.0 (Latest)", isLatest: true },
    { value: "v2.0.3", label: "v2.0.3", isLatest: false },
    { value: "v2.0.2", label: "v2.0.2", isLatest: false },
    { value: "v1.9.1", label: "v1.9.1", isLatest: false },
    { value: "v1.8.0", label: "v1.8.0", isLatest: false }
  ];

  return (
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
  );
};

export default VersionSelector;
