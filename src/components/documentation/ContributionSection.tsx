
import { Button } from "@/components/ui/button";
import { GitBranch, FileText } from "lucide-react";

const ContributionSection = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Help Improve Our Documentation
        </h2>
        <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">
          Found an issue or want to contribute? Our documentation is open source and welcomes contributions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
            <GitBranch className="w-4 h-4 mr-2" />
            Edit on GitHub
          </Button>
          <Button variant="outline" className="border-white text-white hover:bg-white/10 dark:hover:bg-white/20 bg-transparent">
            <FileText className="w-4 h-4 mr-2" />
            Report Issue
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ContributionSection;
