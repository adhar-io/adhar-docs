
import { Separator } from "@/components/ui/separator";

const DocumentationFooter = () => {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border border-gray-700/30 bg-gray-800">
                <img 
                  src="/lovable-uploads/c2bbb6a6-c383-4f93-953e-1a233d76654b.png" 
                  alt="ADHAR Logo" 
                  className="w-6 h-6 drop-shadow-sm filter brightness-110"
                />
              </div>
              <span className="text-xl font-bold">ADHAR</span>
            </div>
            <p className="text-gray-400 dark:text-gray-500">
              The Open Foundation for cloud-native development.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Documentation</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Getting Started</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Examples</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Stack Overflow</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
            </ul>
          </div>
        </div>
        <Separator className="my-8 bg-gray-800 dark:bg-gray-700" />
        <div className="text-center text-gray-400 dark:text-gray-500">
          <p>&copy; 2024 ADHAR. Built with ❤️ for developers.</p>
        </div>
      </div>
    </footer>
  );
};

export default DocumentationFooter;
