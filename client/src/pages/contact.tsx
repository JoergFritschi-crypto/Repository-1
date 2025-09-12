import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-8">Contact Us</h1>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Get help with technical issues, billing questions, or general inquiries.
              </p>
              <Button className="w-full" asChild>
                <a href="mailto:support@gardenscape.pro">Send Email</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Community Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Connect with other gardeners and get advice from our community.
              </p>
              <Button variant="outline" className="w-full">
                Join Community
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">How do I create my first garden design?</h3>
              <p className="text-muted-foreground text-sm">
                Start by clicking "Start Designing" from the homepage. You'll be guided through setting up 
                your garden properties, selecting plants, and creating your layout.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">What's included in the premium plans?</h3>
              <p className="text-muted-foreground text-sm">
                Premium plans include unlimited designs, advanced plant database access, seasonal garden imagery, 
                and priority support. Check our pricing page for detailed comparisons.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">How accurate is the plant identification?</h3>
              <p className="text-muted-foreground text-sm">
                Our AI-powered plant identification is highly accurate but works best with clear, 
                well-lit photos. For best results, capture the entire plant including leaves and flowers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}