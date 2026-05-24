import React, { useState } from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Send,
  Github,
  Twitter,
  Linkedin,
  Headphones,
  FileText,
  Users,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'General Question',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: '', email: '', subject: '', category: 'General Question', message: '' });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help with technical questions",
      contact: "support@adhar.io",
      response: "Within 24 hours",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Phone,
      title: "Sales Inquiries",
      description: "Speak with our sales team",
      contact: "+1 (555) 123-4567",
      response: "Business hours",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team",
      contact: "Available in app",
      response: "Real-time",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Users,
      title: "Community",
      description: "Join our developer community",
      contact: "Discord & GitHub",
      response: "Community driven",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const offices = [
    {
      city: "Singapore",
      address: "123 Innovation Drive, Suite 400",
      timezone: "SGT (UTC+8)",
      type: "Headquarters",
      icon: "🏢"
    },
    {
      city: "India",
      address: "456 Tech Boulevard",
      timezone: "IST (UTC+5:30)",
      type: "Engineering Hub",
      icon: "💻"
    },
    {
      city: "USA",
      address: "789 Digital Street, EC2A 4BX",
      timezone: "EST (UTC-5)",
      type: "European Office",
      icon: "🌍"
    }
  ];

  const supportCategories = [
    { label: "Technical Support", icon: Zap },
    { label: "Billing & Pricing", icon: FileText },
    { label: "Partnership Inquiry", icon: Users },
    { label: "General Question", icon: MessageCircle }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="max-w-4xl mx-auto text-center relative">
            <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20 animate-fade-in-up">
              <Headphones className="w-3 h-3 mr-1" />
              Get in Touch
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                We're Here to Help
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up">
              Have questions? Need support? Want to partner with us? 
              Our team is ready to assist you.
            </p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {contactMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <Card 
                    key={index} 
                    className="group text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 hover:border-primary/30 overflow-hidden bg-card/80 backdrop-blur-sm"
                  >
                    <div className={`h-1 w-full bg-gradient-to-r ${method.gradient}`}></div>
                    <CardHeader>
                      <div className="flex justify-center mb-4">
                        <div className={`p-4 rounded-xl bg-gradient-to-r ${method.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <CardTitle className="text-lg mb-2">{method.title}</CardTitle>
                      <CardDescription className="text-sm mb-4">{method.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold text-foreground mb-2">{method.contact}</p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{method.response}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Form & Offices */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4 text-foreground">Send Us a Message</h2>
                  <p className="text-muted-foreground">
                    Fill out the form and we'll get back to you as soon as possible.
                  </p>
                </div>
                <Card className="border-2 bg-card/80 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <select
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        >
                          {supportCategories.map((cat) => (
                            <option key={cat.label} value={cat.label}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={6}
                          className="mt-1"
                        />
                      </div>

                      <Button type="submit" size="lg" className="w-full group">
                        <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                        Send Message
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Offices */}
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4 text-foreground">Our Offices</h2>
                  <p className="text-muted-foreground">
                    Visit us at one of our global locations.
                  </p>
                </div>
                <div className="space-y-6">
                  {offices.map((office, index) => (
                    <Card 
                      key={index} 
                      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/30 bg-card/80 backdrop-blur-sm"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-3xl">{office.icon}</span>
                              <CardTitle className="text-xl">{office.city}</CardTitle>
                            </div>
                            <Badge variant="secondary" className="text-xs">{office.type}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 text-muted-foreground">
                            <MapPin className="w-4 h-4 mt-1 text-primary" />
                            <p className="text-sm">{office.address}</p>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <Clock className="w-4 h-4 text-primary" />
                            <p className="text-sm">{office.timezone}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Social Links */}
                  <Card className="border-2 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Connect With Us</CardTitle>
                      <CardDescription>Follow us on social media</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        <Button variant="outline" size="icon" className="hover:text-primary hover:border-primary">
                          <Github className="w-5 h-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="hover:text-primary hover:border-primary">
                          <Twitter className="w-5 h-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="hover:text-primary hover:border-primary">
                          <Linkedin className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Looking for Quick Answers?</h2>
            <p className="text-muted-foreground mb-8">
              Check out our FAQ section for answers to common questions
            </p>
            <Button size="lg" variant="outline">
              View FAQ
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
