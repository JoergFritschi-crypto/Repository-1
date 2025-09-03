import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sprout, Brain, Eye, Stethoscope, Star, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import gardenImage from '@assets/generated_images/Mixed_perennial_garden_scene_5872224a.png';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  
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
              {!isAuthenticated ? (
                <>
                  <a href="/api/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Sign In
                  </a>
                  <Button asChild data-testid="button-get-started">
                    <a href="/api/login">Get Started</a>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                  <Button asChild data-testid="button-go-to-dashboard">
                    <Link href="/garden-properties">New Garden</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden">
        <img 
          src={gardenImage} 
          alt="Beautiful perennial garden with yarrow, daylilies, catmint and more" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" data-testid="text-hero-title">
                Design Your Dream Garden with AI
              </h1>
              <p className="text-lg mb-6 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" data-testid="text-hero-subtitle">
                Professional garden design tools with expert plant knowledge
              </p>
              <div className="flex gap-3">
                <Button asChild size="lg" className="btn-gold shadow-xl hover:shadow-2xl transition-all duration-300" data-testid="button-start-designing">
                  {!isAuthenticated ? (
                    <a href="/api/login">Start Designing</a>
                  ) : (
                    <Link href="/garden-properties">Start Designing</Link>
                  )}
                </Button>
                <Button variant="outline" size="lg" className="bg-white/90 hover:bg-white text-primary border-0 shadow-xl hover:shadow-2xl transition-all duration-300" data-testid="button-watch-demo">
                  View Examples
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-3" data-testid="text-features-title">
              Professional Garden Design Tools
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto" data-testid="text-features-subtitle">
              AI-powered tools for every step of garden planning
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
            <h2 className="text-2xl font-serif font-bold text-foreground mb-3" data-testid="text-pricing-title">
              Simple Pricing
            </h2>
            <p className="text-base text-muted-foreground" data-testid="text-pricing-subtitle">
              Choose the plan that works for you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2" data-testid="text-plan-free-title">Free</h3>
                <p className="text-3xl font-bold mb-4" data-testid="text-plan-free-price">
                  $0<span className="text-lg font-normal text-muted-foreground">/month</span>
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
                  {!isAuthenticated ? (
                    <a href="/api/login">Get Started</a>
                  ) : (
                    <Link href="/">Go to Dashboard</Link>
                  )}
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
                  $6<span className="text-lg font-normal text-muted-foreground">/design</span>
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
                  {!isAuthenticated ? (
                    <a href="/api/login">Create Design</a>
                  ) : (
                    <Link href="/garden-properties">Create Design</Link>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2" data-testid="text-plan-premium-title">Premium</h3>
                <p className="text-3xl font-bold mb-4" data-testid="text-plan-premium-price">
                  $12<span className="text-lg font-normal text-muted-foreground">/month</span>
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
                  {!isAuthenticated ? (
                    <a href="/api/login">Start Premium</a>
                  ) : (
                    <Link href="/premium">View Premium</Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
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
                <li><Link href="/premium" className="hover:underline">Premium Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><span className="text-muted-foreground">Privacy Policy</span></li>
                <li><span className="text-muted-foreground">Terms of Service</span></li>
                <li><span className="text-muted-foreground">Contact</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center">
            <p className="text-sm opacity-90">&copy; 2024 GardenScape Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
