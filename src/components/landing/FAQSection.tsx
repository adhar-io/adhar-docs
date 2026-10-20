import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqs } from "@/data/landingPageData";
import SectionHeader from "./SectionHeader";

const FAQSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="faq" aria-labelledby="faq-heading" className="relative section-padding container-padding bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-3xl mx-auto">
        <SectionHeader id="faq-heading" eyebrow="FAQ" title="Questions," titleMuted="answered.">
          The short version. The docs have the details.
        </SectionHeader>

        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            const id = `faq-panel-${index}`;
            return (
              <div key={faq.question} className={`transition-colors ${open ? "bg-muted/30" : ""}`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left text-base font-medium text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div id={id} role="region" hidden={!open} className="px-5 sm:px-6 pb-6 -mt-1">
                  <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
