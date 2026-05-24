
import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Shield, 
  Globe, 
  Cpu, 
  Cloud, 
  Rocket,
  Database,
  Lock
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Deploy in under 2 minutes with zero-config setup",
    accent: "from-yellow-400 to-orange-400"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC2 Type II compliant with end-to-end encryption",
    accent: "from-green-400 to-emerald-400"
  },
  {
    icon: Globe,
    title: "Multi-Cloud Ready",
    description: "Works seamlessly across AWS, GCP, Azure, and more",
    accent: "from-blue-400 to-cyan-400"
  },
  {
    icon: Cpu,
    title: "AI-Powered",
    description: "Intelligent resource optimization and auto-scaling",
    accent: "from-purple-400 to-violet-400"
  },
  {
    icon: Cloud,
    title: "Cloud Native",
    description: "Built on Kubernetes with GitOps workflows",
    accent: "from-indigo-400 to-blue-400"
  },
  {
    icon: Rocket,
    title: "DevOps Automation",
    description: "Automated CI/CD pipelines with zero downtime deployments",
    accent: "from-pink-400 to-rose-400"
  },
  {
    icon: Database,
    title: "Data Management",
    description: "Integrated backup, monitoring, and disaster recovery",
    accent: "from-teal-400 to-green-400"
  },
  {
    icon: Lock,
    title: "Compliance Ready",
    description: "GDPR, HIPAA, and PCI DSS compliance built-in",
    accent: "from-red-400 to-pink-400"
  }
];

const FeaturesRotator = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const featureInterval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length);
        setIsTransitioning(false);
      }, 200);
    }, 4500);
    
    return () => {
      clearInterval(featureInterval);
    };
  }, []);

  const currentAccent = features[currentFeature].accent;

  return (
    <div className="mb-12 h-32 flex items-center justify-center px-4">
      <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="relative group">
          {/* Enhanced background with smoother gradient border effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${currentAccent} opacity-15 rounded-3xl blur-2xl transition-all duration-700 group-hover:opacity-25 group-hover:blur-3xl scale-110`}></div>
          
          <div className="relative flex items-center justify-center space-x-8 bg-white/98 dark:bg-gray-800/98 backdrop-blur-xl rounded-3xl px-12 py-8 shadow-2xl border border-white/30 dark:border-gray-700/40 hover:shadow-3xl transition-all duration-700 transform hover:scale-[1.02] will-change-transform">
            {/* Enhanced icon with smoother styling */}
            <div className="flex-shrink-0 relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${currentAccent} opacity-20 rounded-2xl blur-lg transition-all duration-700`}></div>
              <div className="relative w-18 h-18 bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center shadow-xl border border-gray-200/60 dark:border-gray-600/60 transition-all duration-500">
                {React.createElement(features[currentFeature].icon, { 
                  className: `w-10 h-10 bg-gradient-to-r ${currentAccent} bg-clip-text text-transparent transition-all duration-500 ${isTransitioning ? 'scale-75 opacity-50' : 'scale-100 opacity-100'}` 
                })}
              </div>
            </div>
            
            {/* Enhanced content with better typography and transitions */}
            <div className={`text-left max-w-md transition-all duration-400 ease-out ${isTransitioning ? 'opacity-50 translate-x-3' : 'opacity-100 translate-x-0'}`}>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight leading-tight">
                {features[currentFeature].title}
              </h3>
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                {features[currentFeature].description}
              </p>
            </div>
            
            {/* Enhanced progress indicators with smoother interactions */}
            <div className="flex flex-col space-y-2 ml-8">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-500 hover:scale-125 transform will-change-transform ${
                    index === currentFeature 
                      ? `bg-gradient-to-r ${currentAccent} shadow-lg scale-110` 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 scale-100'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Enhanced floating accent elements with smoother animations */}
          <div className={`absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r ${currentAccent} opacity-40 rounded-full blur-sm animate-pulse transition-all duration-700`}></div>
          <div className={`absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r ${currentAccent} opacity-30 rounded-full blur-sm animate-pulse transition-all duration-700`} style={{ animationDelay: '1.5s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesRotator;
