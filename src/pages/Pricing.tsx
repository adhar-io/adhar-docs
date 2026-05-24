import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Download, Cloud, Building2, Github, Zap, Shield, HeartHandshake, GraduationCap, Sparkles } from "lucide-react";
import { pricingPlans } from '@/data/landingPageData';

const Pricing = () => {
  const benefits = [
    {
      icon: Github,
      title: "100% Open Source",
      description: "All code is open source. Contribute, customize, and deploy anywhere without restrictions."
    },
    {
      icon: Shield,
      title: "No Vendor Lock-in",
      description: "Own your infrastructure. Migrate freely between self-hosted and cloud options anytime."
    },
    {
      icon: HeartHandshake,
      title: "Community Driven",
      description: "Active community support, regular updates, and transparent roadmap development."
    },
    {
      icon: GraduationCap,
      title: "Enterprise Ready",
      description: "Production-grade platform trusted by enterprises. Scale from startup to global deployment."
    }
  ];

  const getIcon = (name: string) => {
    if (name === "Open Source") return Download;
    if (name === "Adhar Cloud") return Cloud;
    return Building2;
  };

  const getGradient = (name: string) => {
    if (name === "Open Source") return "from-green-500 to-emerald-500";
    if (name === "Adhar Cloud") return "from-blue-500 to-purple-500";
    return "from-orange-500 to-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
          
          <div className="max-w-5xl mx-auto text-center relative">
            <Badge className="mb-6 px-5 py-2 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Open Source & Cloud Pricing
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Choose Your Path
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
              Start with our <span className="font-semibold text-foreground">free forever open source platform</span> or upgrade to managed cloud with premium features. Scale to enterprise when you're ready.
            </p>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              All development happens in open source. No hidden features, no tricks.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12">
              {pricingPlans.map((plan, index) => {
                const Icon = getIcon(plan.name);
                const isPopular = plan.popular;
                const isOpenSource = plan.name === "Open Source";
                
                return (
                  <Card 
                    key={index} 
                    className={`relative transition-all duration-300 hover:shadow-2xl ${
                      isPopular 
                        ? 'border-primary shadow-lg lg:scale-105' 
                        : isOpenSource
                        ? 'border-green-500/50 bg-gradient-to-b from-green-500/5 to-transparent'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {/* Highlight Badge */}
                    {plan.highlight && (
                      <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 z-10`}>
                        <Badge className={`px-4 py-1 ${
                          isPopular 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                            : isOpenSource
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                            : 'bg-gradient-to-r from-orange-600 to-red-600'
                        } text-white shadow-lg`}>
                          {plan.highlight}
                        </Badge>
                      </div>
                    )}

                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(plan.name)} opacity-5 rounded-lg overflow-hidden -z-10`}></div>

                    <CardHeader className="relative text-center pb-8 pt-10">
                      <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${getGradient(plan.name)} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-3xl font-bold mb-2">{plan.name}</CardTitle>
                      <CardDescription className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                        {plan.subtitle}
                      </CardDescription>
                      <div className="text-5xl font-bold mb-2">
                        {plan.price}
                        {plan.period && <span className="text-lg text-muted-foreground font-normal ml-1">{plan.period}</span>}
                      </div>
                      <p className="text-muted-foreground leading-relaxed px-2">{plan.description}</p>
                    </CardHeader>

                    <CardContent className="relative">
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <Check className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isPopular ? 'text-blue-500' : isOpenSource ? 'text-green-500' : 'text-primary'
                            }`} />
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button 
                        className={`w-full ${
                          isPopular
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                            : isOpenSource
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                            : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                        } text-white shadow-lg`}
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Why Choose ADHAR?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Built on open source principles, designed for enterprise scale
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="text-center border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl mb-2">{benefit.title}</CardTitle>
                      <CardDescription className="leading-relaxed">{benefit.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: "Is the Open Source version really free forever?",
                  a: "Yes! The open source version is 100% free forever with no restrictions. All features are included, and all development happens in the open. You can self-host on any infrastructure without limitations."
                },
                {
                  q: "What's the difference between Open Source and Adhar Cloud?",
                  a: "Both have the same core features. Adhar Cloud adds a premium UI, AI-powered automation, fully managed infrastructure, priority support, training programs, and automatic updates. Choose Open Source if you want to manage it yourself, or Cloud for a hassle-free experience."
                },
                {
                  q: "Can I migrate from Open Source to Cloud later?",
                  a: "Absolutely! There's no vendor lock-in. You can migrate between self-hosted and cloud at any time. We provide migration tools and support to make the transition seamless."
                },
                {
                  q: "What does Enterprise include?",
                  a: "Enterprise is fully customized to your needs: custom integrations, dedicated setup (cloud or on-premise), white-labeling, custom feature development, dedicated support manager, and flexible SLA agreements. Pricing is tailored to your requirements."
                },
                {
                  q: "Do you offer training and certification?",
                  a: "Yes! Adhar Cloud and Enterprise plans include comprehensive training programs and certification courses. We help your team become ADHAR experts with hands-on workshops and documentation."
                }
              ].map((faq, index) => (
                <Card key={index} className="border-border">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{faq.q}</CardTitle>
                    <CardDescription className="text-base leading-relaxed mt-2">{faq.a}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Download the open source version, start a cloud trial, or talk to sales about enterprise needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
                <Download className="w-5 h-5 mr-2" />
                Download Open Source
              </Button>
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <Zap className="w-5 h-5 mr-2" />
                Start Cloud Trial
              </Button>
              <Button size="lg" variant="outline" className="border-2">
                <Building2 className="w-5 h-5 mr-2" />
                Contact Sales
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
