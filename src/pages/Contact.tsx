import React, { useState } from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  FileText,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Github, Twitter, Linkedin } from '@/components/brand-icons';
import { useToast } from '@/components/ui/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'General Question',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Lightweight client-side validation with actionable feedback.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'Check your email address',
        description: 'Please enter a valid email so we can reply.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate the network request until a real endpoint is wired up.
      await new Promise((resolve) => setTimeout(resolve, 900));
      toast({
        title: 'Message sent',
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: '', email: '', subject: '', category: 'General Question', message: '' });
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Your message could not be sent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email support',
      description: 'Get help with technical questions',
      contact: 'support@adhar.io',
      response: 'Within 24 hours',
    },
    {
      icon: Phone,
      title: 'Sales inquiries',
      description: 'Speak with our sales team',
      contact: '+1 (555) 123-4567',
      response: 'Business hours',
    },
    {
      icon: MessageCircle,
      title: 'Live chat',
      description: 'Chat with our support team',
      contact: 'Available in app',
      response: 'Real-time',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Join our developer community',
      contact: 'Discord & GitHub',
      response: 'Community driven',
    },
  ];

  const offices = [
    { city: 'Singapore', address: '123 Innovation Drive, Suite 400', timezone: 'SGT (UTC+8)', type: 'Headquarters' },
    { city: 'India', address: '456 Tech Boulevard', timezone: 'IST (UTC+5:30)', type: 'Engineering hub' },
    { city: 'United Kingdom', address: '789 Digital Street, London EC2A 4BX', timezone: 'GMT (UTC+0)', type: 'European office' },
  ];

  const supportCategories = [
    { label: 'Technical Support', icon: Zap },
    { label: 'Billing & Pricing', icon: FileText },
    { label: 'Partnership Inquiry', icon: Users },
    { label: 'General Question', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5">Contact</span>
            <h1 className="section-heading mt-5 text-foreground">We're here to help.</h1>
            <p className="section-subheading mt-6">
              Have questions? Need support? Want to partner with us? Our team is ready to assist.
            </p>
          </div>
        </section>

        {/* Contact methods */}
        <section className="container-padding pb-16">
          <div className="max-width-content">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60">
              {contactMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <article key={index} className="bg-card p-6 transition-colors hover:bg-muted/30">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-[var(--shadow-xs)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{method.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{method.description}</p>
                    <p className="mt-5 font-medium text-foreground text-sm">{method.contact}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{method.response}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Form & Offices */}
        <section className="relative section-padding container-padding bg-muted/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-width-content">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
              {/* Form */}
              <div>
                <span className="eyebrow mb-5">Message</span>
                <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Send us a message.</h2>
                <p className="mt-3 text-muted-foreground">
                  Fill out the form and we'll get back to you as soon as possible.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-[var(--shadow-xs)]">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-xs font-medium text-muted-foreground">Category</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      {supportCategories.map((cat) => (
                        <option key={cat.label} value={cat.label}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-xs font-medium text-muted-foreground">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-xs font-medium text-muted-foreground">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={6}
                      className="mt-1.5"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="btn-primary-modern group w-full inline-flex items-center justify-center gap-2 rounded-full h-11 text-[15px] font-medium disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        <span>Send message</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Offices + social */}
              <div>
                <span className="eyebrow mb-5">Offices</span>
                <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Our offices.</h2>
                <p className="mt-3 text-muted-foreground">
                  Visit us at one of our global locations.
                </p>

                <div className="mt-8 space-y-3">
                  {offices.map((office, index) => (
                    <article key={index} className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-[var(--shadow-xs)] transition-colors hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-foreground tracking-tight">{office.city}</h3>
                          <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {office.type}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/80 flex-shrink-0" />
                          <span>{office.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/80 flex-shrink-0" />
                          <span>{office.timezone}</span>
                        </div>
                      </div>
                    </article>
                  ))}

                  <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-[var(--shadow-xs)]">
                    <h3 className="text-base font-semibold text-foreground tracking-tight">Connect with us</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Follow us on social media.</p>
                    <div className="mt-4 flex gap-1.5">
                      {[
                        { Icon: Github, label: 'GitHub', href: 'https://github.com/adhar-io/adhar' },
                        { Icon: Twitter, label: 'Twitter / X', href: 'https://twitter.com/adhar_io' },
                        { Icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/company/adhar-io' },
                      ].map(({ Icon, label, href }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label={`Follow ADHAR on ${label}`}
                        >
                          <Icon className="w-4 h-4" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ teaser */}
        <section className="relative section-padding container-padding">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="max-w-3xl mx-auto text-center">
            <span className="eyebrow mb-5">FAQ</span>
            <h2 className="section-heading mt-5 text-foreground">Looking for quick answers?</h2>
            <p className="section-subheading mt-5">
              Check out our FAQ for answers to common questions.
            </p>
            <div className="mt-8">
              <button
                type="button"
                className="btn-secondary-modern group inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[15px] font-medium"
              >
                <span>View FAQ</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <CheckCircle2 className="w-0 h-0 opacity-0" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
