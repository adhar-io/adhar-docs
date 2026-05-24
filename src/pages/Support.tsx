import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, Phone, FileText, Send, ArrowRight, Headphones } from "lucide-react";

const supportChannels = [
  { icon: MessageCircle, title: "Live chat", description: "Get instant help from our support team.", cta: "Start chat" },
  { icon: Mail, title: "Email support", description: "Send us a detailed message.", cta: "Send email" },
  { icon: Phone, title: "Phone support", description: "Talk to our experts directly.", cta: "Call now" },
  { icon: FileText, title: "Documentation", description: "Find answers in our docs.", cta: "Browse docs" },
];

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5"><Headphones className="w-3 h-3 mr-1" />Support</span>
            <h1 className="section-heading mt-5 text-foreground">
              We're here to
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">help you succeed.</span>
            </h1>
            <p className="section-subheading mt-6">
              Choose the support option that works best for you — chat, email, phone, or self-serve docs.
            </p>
          </div>
        </section>

        {/* Support channels */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {supportChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <article key={channel.title} className="bg-card p-6 sm:p-7 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{channel.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{channel.description}</p>
                    <button
                      type="button"
                      className="btn-secondary-modern group mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full h-9 text-xs font-medium"
                    >
                      <span>{channel.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact form */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <span className="eyebrow mb-5">Contact</span>
              <h2 className="section-heading mt-5 text-foreground">Send us a message.</h2>
              <p className="section-subheading mt-5">
                Detail your question and our team will reply within one business day.
              </p>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-[var(--shadow-xs)] space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</Label>
                  <Input id="name" placeholder="Your name" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" required className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="subject" className="text-xs font-medium text-muted-foreground">Subject</Label>
                <Input id="subject" placeholder="How can we help?" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="message" className="text-xs font-medium text-muted-foreground">Message</Label>
                <Textarea id="message" placeholder="Describe your issue or question..." rows={6} required className="mt-1.5 resize-none" />
              </div>
              <button
                type="submit"
                className="btn-primary-modern group w-full inline-flex items-center justify-center gap-2 rounded-full h-11 text-[15px] font-medium"
              >
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>Send message</span>
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
