
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Star, CheckCircle, MessageSquare } from "lucide-react";
import { pricingPlans } from "@/data/landingPageData";

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50">
            <Award className="w-4 h-4 mr-2" />
            Enterprise Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Transparent, Scalable Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Start free and scale with confidence. No hidden fees, no vendor lock-in. 
            Enterprise features available from day one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-blue-500 shadow-2xl md:scale-105 bg-white dark:bg-gray-800 dark:border-blue-400' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 shadow-lg">
                    <Star className="w-4 h-4 mr-2" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center p-8">
                <CardTitle className="text-2xl font-bold mb-4 dark:text-white">{plan.name}</CardTitle>
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.price}
                  {plan.period && <span className="text-lg text-gray-600 dark:text-gray-400 font-normal">{plan.period}</span>}
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600'} shadow-lg`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 dark:text-gray-300 mb-6">Need a custom solution? We're here to help.</p>
          <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-400 dark:text-gray-200">
            <MessageSquare className="w-5 h-5 mr-2" />
            Contact Enterprise Sales
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
