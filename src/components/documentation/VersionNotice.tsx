
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";

interface VersionNoticeProps {
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
}

const VersionNotice = ({ selectedVersion, setSelectedVersion }: VersionNoticeProps) => {
  if (selectedVersion === "v2.1.0") return null;

  return (
    <section className="pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GitBranch className="h-5 w-5 text-yellow-400 dark:text-yellow-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You're viewing documentation for {selectedVersion}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  This is not the latest version. 
                  <button 
                    onClick={() => setSelectedVersion("v2.1.0")}
                    className="font-medium underline hover:no-underline ml-1"
                  >
                    Switch to v2.1.0 (Latest)
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VersionNotice;
