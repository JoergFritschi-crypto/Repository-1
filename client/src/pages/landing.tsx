import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sprout, Brain, Eye, Stethoscope, Star, Check } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Sprout className="w-8 h-8 text-primary" />
              <span className="text-xl font-serif font-bold text-primary">GardenScape Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/api/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Sign In
              </a>
              <Button asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient text-white py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6" data-testid="text-hero-title">
              Design Your Dream Garden with AI
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90" data-testid="text-hero-subtitle">
              Create stunning ornamental gardens with photorealistic visualization, expert plant recommendations, and seasonal planning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="bg-canary text-primary hover:bg-gold" data-testid="button-start-designing">
                <a href="/api/login">Start Your Garden Design</a>
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10" data-testid="button-watch-demo">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4" data-testid="text-features-title">
              Everything You Need to Create Beautiful Gardens
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-subtitle">
              From initial planning to final visualization, our AI-powered tools guide you through every step of garden design.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2" data-testid="text-feature-ai-title">AI Garden Design</h3>
                <p className="text-muted-foreground" data-testid="text-feature-ai-description">
                  Intelligent plant selection and layout optimization based on your garden conditions and preferences.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-2" data-testid="text-feature-3d-title">3D Visualization</h3>
                <p className="text-muted-foreground" data-testid="text-feature-3d-description">
                  See your garden through the seasons with photorealistic AI-generated imagery from multiple angles.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2" data-testid="text-feature-doctor-title">Plant Doctor</h3>
                <p className="text-muted-foreground" data-testid="text-feature-doctor-description">
                  Identify plants, weeds, and diseases with AI-powered image recognition and get expert care advice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4" data-testid="text-pricing-title">
              Choose Your Plan
            </h2>
            <p className="text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
              From hobby gardening to professional landscaping
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2" data-testid="text-plan-free-title">Free</h3>
                <p className="text-3xl font-bold mb-4" data-testid="text-plan-free-price">
                  £0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Basic plant library access</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Plant identification (5/month)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Community support</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild data-testid="button-plan-free">
                  <a href="/api/login">Get Started</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="p-6 border-2 border-primary relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Most Popular
              </Badge>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2" data-testid="text-plan-design-title">Pay-per-Design</h3>
                <p className="text-3xl font-bold mb-4" data-testid="text-plan-design-price">
                  £15<span className="text-lg font-normal text-muted-foreground">/design</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Complete garden design</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">3D seasonal visualization</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Plant shopping list</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" asChild data-testid="button-plan-design">
                  <a href="/api/login">Create Design</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2" data-testid="text-plan-premium-title">Premium</h3>
                <p className="text-3xl font-bold mb-4" data-testid="text-plan-premium-price">
                  £29<span className="text-lg font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Unlimited designs</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Advanced plant database</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Personal plant collection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">AI garden advisor</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-accent mr-2" />
                    <span className="text-sm">Premium dashboard</span>
                  </li>
                </ul>
                <Button variant="secondary" className="w-full" asChild data-testid="button-plan-premium">
                  <a href="/api/login">Start Premium</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sprout className="w-6 h-6" />
                <span className="text-lg font-serif font-bold">GardenScape Pro</span>
              </div>
              <p className="text-sm opacity-90">AI-powered garden design for beautiful ornamental landscapes.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Features</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link href="/garden-properties" className="hover:underline">Garden Design</Link></li>
                <li><Link href="/plant-library" className="hover:underline">Plant Library</Link></li>
                <li><Link href="/plant-doctor" className="hover:underline">Plant Doctor</Link></li>
                <li><span className="text-muted-foreground">3D Visualization</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><span className="text-muted-foreground">Help Center</span></li>
                <li><span className="text-muted-foreground">Contact Us</span></li>
                <li><span className="text-muted-foreground">Community</span></li>
                <li><span className="text-muted-foreground">API Documentation</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><span className="text-muted-foreground">About</span></li>
                <li><span className="text-muted-foreground">Privacy Policy</span></li>
                <li><span className="text-muted-foreground">Terms of Service</span></li>
                <li><span className="text-muted-foreground">Careers</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
            <p className="text-sm opacity-90">&copy; 2024 GardenScape Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
