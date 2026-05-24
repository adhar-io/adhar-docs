
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mail, Phone, FileText } from "lucide-react";

const Support = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      <Navigation />
      
      <main className="pt-20">
        {/* Header */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Get Support
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We're here to help you succeed with ADHAR. Choose the support option that works best for you.
            </p>
          </div>
        </section>

        {/* Support Options */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              <Card className="text-center">
                <CardHeader>
                  <MessageCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <CardTitle>Live Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Get instant help from our support team
                  </p>
                  <Button className="w-full">Start Chat</Button>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Mail className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <CardTitle>Email Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Send us a detailed message
                  </p>
                  <Button variant="outline" className="w-full">Send Email</Button>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Phone className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <CardTitle>Phone Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Talk to our experts directly
                  </p>
                  <Button variant="outline" className="w-full">Call Now</Button>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <FileText className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <CardTitle>Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Find answers in our docs
                  </p>
                  <Button variant="outline" className="w-full">Browse Docs</Button>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Send us a Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input type="email" placeholder="your@email.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input placeholder="How can we help?" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea placeholder="Describe your issue or question..." rows={5} />
                </div>
                <Button className="w-full">Send Message</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
