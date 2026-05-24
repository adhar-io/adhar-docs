
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown } from "lucide-react";
import { faqs } from "@/data/landingPageData";

const FAQSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
            <FileText className="w-4 h-4 mr-2" />
            Frequently Asked Questions
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to Know
          </h2>
          <p className="text-xl text-muted-foreground">
            Get answers to common questions about ADHAR platform
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-border hover:shadow-lg transition-all duration-300">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors p-6"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-left font-semibold text-foreground">{faq.question}</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 text-muted-foreground ${openFaq === index ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {openFaq === index && (
                <CardContent className="pt-0 pb-6 px-6">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
