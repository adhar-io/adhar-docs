
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, CheckCircle } from "lucide-react";
import { features } from "@/data/landingPageData";

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-0">
            <Workflow className="w-4 h-4 mr-2" />
            Platform Features
          </Badge>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
            Enterprise-Grade Capabilities
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Transform your development workflow with comprehensive tools designed for modern, 
            cloud-native applications that scale globally.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-500 border-0 hover:-translate-y-2 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 flex-shrink-0 rounded-2xl bg-gradient-to-r ${feature.gradient} p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <CardDescription className="text-muted-foreground text-base leading-relaxed mb-6">
                  {feature.description}
                </CardDescription>
                <div className="space-y-3">
                  {feature.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 mr-3 text-green-500 flex-shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
