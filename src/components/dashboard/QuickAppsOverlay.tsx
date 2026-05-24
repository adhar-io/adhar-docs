
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Database,
  Code,
  Globe,
  Settings,
  Users,
  BarChart3,
  FileText,
  Calendar,
  Mail,
  Cloud,
  Shield,
  Zap,
  Brain,
  Camera,
  Music,
  Video,
  Image,
  Palette,
  Calculator,
  Clock,
  Map,
  CloudRain,
  ShoppingCart,
  CreditCard,
  Truck,
  Package,
  Building,
  Home,
  Car,
  Plane,
  Train,
  Phone,
  MessageSquare,
  Heart,
  Star,
  Gift,
  Trophy,
  Target,
  Lightbulb,
  Bookmark,
  Share,
  Download,
  Upload,
  Printer,
  Save,
  Edit,
  Copy,
  Scissors,
  Trash,
  Archive,
  Flag,
  Bell,
  Lock
} from 'lucide-react';

interface QuickApp {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  url?: string;
  color: string;
}

interface QuickAppsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickApps: QuickApp[] = [
  // Analytics & Data
  { id: '1', name: 'Analytics Dashboard', description: 'View comprehensive analytics', icon: BarChart3, category: 'Analytics', color: 'bg-blue-500' },
  { id: '2', name: 'Data Studio', description: 'Analyze and visualize data', icon: Database, category: 'Analytics', color: 'bg-purple-500' },
  { id: '3', name: 'Reports Generator', description: 'Generate custom reports', icon: FileText, category: 'Analytics', color: 'bg-green-500' },
  
  // Development
  { id: '4', name: 'Code Editor', description: 'Edit code online', icon: Code, category: 'Development', color: 'bg-gray-800' },
  { id: '5', name: 'API Testing', description: 'Test and debug APIs', icon: Globe, category: 'Development', color: 'bg-orange-500' },
  { id: '6', name: 'Git Manager', description: 'Manage repositories', icon: Archive, category: 'Development', color: 'bg-red-500' },
  
  // AI & ML
  { id: '7', name: 'Model Training', description: 'Train ML models', icon: Brain, category: 'AI/ML', color: 'bg-indigo-500' },
  { id: '8', name: 'AI Playground', description: 'Experiment with AI', icon: Zap, category: 'AI/ML', color: 'bg-yellow-500' },
  { id: '9', name: 'Data Labeling', description: 'Label training data', icon: Target, category: 'AI/ML', color: 'bg-teal-500' },
  
  // Productivity
  { id: '10', name: 'Calendar', description: 'Manage your schedule', icon: Calendar, category: 'Productivity', color: 'bg-blue-600' },
  { id: '11', name: 'Task Manager', description: 'Track tasks and projects', icon: Trophy, category: 'Productivity', color: 'bg-amber-500' },
  { id: '12', name: 'Notes', description: 'Take and organize notes', icon: Edit, category: 'Productivity', color: 'bg-lime-500' },
  
  // Communication
  { id: '13', name: 'Team Chat', description: 'Communicate with team', icon: MessageSquare, category: 'Communication', color: 'bg-cyan-500' },
  { id: '14', name: 'Video Calls', description: 'Video conferencing', icon: Video, category: 'Communication', color: 'bg-rose-500' },
  { id: '15', name: 'Email Client', description: 'Manage emails', icon: Mail, category: 'Communication', color: 'bg-slate-600' },
  
  // Media & Design
  { id: '16', name: 'Image Editor', description: 'Edit and enhance images', icon: Image, category: 'Media', color: 'bg-pink-500' },
  { id: '17', name: 'Video Editor', description: 'Edit video content', icon: Video, category: 'Media', color: 'bg-violet-500' },
  { id: '18', name: 'Design Studio', description: 'Create designs', icon: Palette, category: 'Media', color: 'bg-fuchsia-500' },
  
  // Business
  { id: '19', name: 'CRM', description: 'Customer relationship management', icon: Users, category: 'Business', color: 'bg-emerald-500' },
  { id: '20', name: 'Invoice Generator', description: 'Create and manage invoices', icon: CreditCard, category: 'Business', color: 'bg-sky-500' },
  { id: '21', name: 'Inventory', description: 'Manage inventory', icon: Package, category: 'Business', color: 'bg-orange-600' },
  
  // Utilities
  { id: '22', name: 'Calculator', description: 'Scientific calculator', icon: Calculator, category: 'Utilities', color: 'bg-gray-600' },
  { id: '23', name: 'Weather', description: 'Check weather forecasts', icon: CloudRain, category: 'Utilities', color: 'bg-blue-400' },
  { id: '24', name: 'World Clock', description: 'Track time zones', icon: Clock, category: 'Utilities', color: 'bg-stone-500' },
  
  // Security
  { id: '25', name: 'Security Monitor', description: 'Monitor security events', icon: Shield, category: 'Security', color: 'bg-red-600' },
  { id: '26', name: 'Password Manager', description: 'Manage passwords', icon: Lock, category: 'Security', color: 'bg-zinc-600' },
  { id: '27', name: 'Audit Logs', description: 'View system audit logs', icon: FileText, category: 'Security', color: 'bg-neutral-600' },
  
  // Cloud Services
  { id: '28', name: 'Cloud Storage', description: 'Manage cloud files', icon: Cloud, category: 'Cloud', color: 'bg-blue-500' },
  { id: '29', name: 'Backup Manager', description: 'Manage backups', icon: Archive, category: 'Cloud', color: 'bg-green-600' },
  { id: '30', name: 'CDN Manager', description: 'Manage content delivery', icon: Globe, category: 'Cloud', color: 'bg-purple-600' },
];

export function QuickAppsOverlay({ isOpen, onClose }: QuickAppsOverlayProps) {
  const handleAppClick = (app: QuickApp) => {
    console.log(`Opening ${app.name}`);
    // Handle app navigation here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl h-full max-h-[95vh] m-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 flex-shrink-0">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Quick Apps</h2>
            <p className="text-gray-500 dark:text-gray-400">Access all your applications in one place</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors h-10 w-10"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Apps Grid */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-8 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
              {quickApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleAppClick(app)}
                  className="group cursor-pointer p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <div className={`w-14 h-14 ${app.color} rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-lg`}>
                    <app.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center mb-2 truncate">
                    {app.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {quickApps.length} apps available
          </p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
