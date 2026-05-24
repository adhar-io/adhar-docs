
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Handshake, Users, Globe } from "lucide-react";

const Partners = () => {
  const partnerTypes = [
    {
      title: "Technology Partners",
      icon: Building,
      description: "Leading technology companies that integrate with ADHAR",
      partners: ["AWS", "Google Cloud", "Microsoft Azure", "Docker", "Kubernetes"]
    },
    {
      title: "Solution Partners",
      icon: Handshake,
      description: "Certified partners who implement ADHAR solutions",
      partners: ["Acme Consulting", "TechFlow Solutions", "CloudFirst", "DevOps Pro"]
    },
    {
      title: "Channel Partners",
      icon: Users,
      description: "Partners who resell and distribute ADHAR",
      partners: ["Global Tech", "Enterprise Solutions", "Cloud Resellers", "TechDistro"]
    },
    {
      title: "Regional Partners",
      icon: Globe,
      description: "Local partners providing regional support",
      partners: ["APAC Solutions", "EU Tech Partners", "Americas Cloud", "EMEA Partners"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        {/* Header */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Our Partners
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We work with leading organizations worldwide to deliver exceptional cloud-native solutions.
            </p>
          </div>
        </section>

        {/* Partner Types */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {partnerTypes.map((type) => (
                <Card key={type.title}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <type.icon className="w-8 h-8 text-blue-500" />
                      <CardTitle>{type.title}</CardTitle>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{type.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {type.partners.map((partner) => (
                        <Badge key={partner} variant="secondary">
                          {partner}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Become a Partner CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Card>
              <CardContent className="p-12">
                <h2 className="text-3xl font-bold mb-4">Become a Partner</h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                  Join our partner ecosystem and grow your business with ADHAR
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg">Apply Now</Button>
                  <Button size="lg" variant="outline">Learn More</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Partners;
