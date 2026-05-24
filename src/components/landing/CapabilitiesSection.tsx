
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Star, CheckCircle } from "lucide-react";
import { capabilities } from "@/data/landingPageData";

const CapabilitiesSection = () => {
  return (
    <section id="capabilities" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-accent/10 text-accent border-accent/20">
            <Server className="w-4 h-4 mr-2" />
            Platform Capabilities
          </Badge>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
            Built for Enterprise Scale
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Harness the power of Kubernetes with enterprise-grade capabilities designed for modern, 
            cloud-native applications that scale globally.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {capabilities.map((capability, index) => (
            <Card key={index} className={`${capability.color} border-2 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden relative group ${capability.highlight ? 'ring-2 ring-primary/50' : ''}`}>
              {capability.highlight && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="w-3 h-3 mr-1" />
                    Foundation
                  </Badge>
                </div>
              )}
              <CardContent className="p-8 relative z-10">
                <div className="flex items-start space-x-6">
                  <div className={`w-16 h-16 rounded-xl ${capability.highlight ? 'bg-primary' : 'bg-muted'} shadow-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <capability.icon className={`w-8 h-8 ${capability.highlight ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-foreground">{capability.title}</h3>
                      <Badge variant="secondary" className="text-xs font-semibold">{capability.stats}</Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{capability.description}</p>
                    {capability.highlight && (
                      <div className="mt-4 flex items-center text-sm text-primary">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span className="font-medium">Core Platform Foundation</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesSection;
