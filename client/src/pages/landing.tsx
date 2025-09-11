import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, MoreVertical, Shield } from "lucide-react";
import { GardenScapeIcon, GardenDesignIcon, SeasonIcon, PlantDoctorIcon, PlantLibraryIcon } from "@/components/ui/brand-icons";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import gardenImage from '@assets/generated_images/Mixed_perennial_garden_scene_5872224a.png';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  
  // Get the actual user (not affected by tier testing)
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  // Check if testing mode is active
  const isTestingMode = !!sessionStorage.getItem('tierTestingMode');
  const isActualAdmin = user?.isAdmin === true;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Admin menu - only visible to admins */}
              {isActualAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-2 h-8 w-8"
                      data-testid="button-admin-menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>{isTestingMode ? "Admin (Testing)" : "Admin Panel"}</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <div className="flex items-center space-x-2">
                <GardenScapeIcon className="w-8 h-8" />
                <span className="text-xl font-serif font-bold text-primary">GardenScape Pro</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <a href="/api/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" title="Already have an account? Sign in here">
                    Sign In
                  </a>
                  <Button asChild data-testid="button-get-started" title="New to GardenScape? Start your free account">
                    <a href="/api/login">Get Started Free</a>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/home" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" title="View your gardens, stats, and recent activity">
                    Dashboard
                  </Link>
                  <Button asChild data-testid="button-go-to-dashboard" title="Start creating a new garden design">
                    <Link href="/garden-properties">+ New Garden</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[550px] overflow-hidden">
        <img 
          src={gardenImage} 
          alt="Beautiful perennial garden with yarrow, daylilies, catmint and more" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-serif font-bold mb-3 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" data-testid="text-hero-title">
                Design Your Dream Garden with AI
              </h1>
              <p className="text-base mb-6 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" data-testid="text-hero-subtitle">
                Professional garden design tools with expert plant knowledge
              </p>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <Button asChild size="lg" className="bg-white/90 hover:bg-white text-primary border-0 shadow-lg hover:shadow-xl transition-all duration-300 w-full h-16" data-testid="button-start-designing">
                      {!isAuthenticated ? (
                        <a href="/api/login" className="flex items-center justify-center gap-2 h-full">
                          <GardenDesignIcon className="w-5 h-5" />
                          Create Your Garden
                        </a>
                      ) : (
                        <Link href="/garden-properties" className="flex items-center justify-center gap-2 h-full">
                          <GardenDesignIcon className="w-5 h-5" />
                          Create Your Garden
                        </Link>
                      )}
                    </Button>
                    <p className="text-sm text-white/80 mt-1 text-center sm:text-left">Start designing with AI guidance</p>
                  </div>
                  <div className="flex-1">
                    <Button variant="outline" size="lg" className="bg-white/90 hover:bg-white text-primary border-0 shadow-lg hover:shadow-xl transition-all duration-300 w-full h-16" data-testid="button-watch-demo" asChild>
                      {!isAuthenticated ? (
                        <a href="/api/login" className="flex items-center justify-center gap-2 h-full">
                          <PlantLibraryIcon className="w-5 h-5" />
                          Browse Plants
                        </a>
                      ) : (
                        <Link href="/plant-library" className="flex items-center justify-center gap-2 h-full">
                          <PlantLibraryIcon className="w-5 h-5" />
                          Browse Plants
                        </Link>
                      )}
                    </Button>
                    <p className="text-sm text-white/80 mt-1 text-center sm:text-left">Explore our plant library</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    ✨ Get personalized plant recommendations • 🎨 Design with professional tools • 📱 Save and share your creations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-serif font-bold text-foreground mb-2" data-testid="text-features-title">
              Professional Garden Design Tools
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto" data-testid="text-features-subtitle">
              AI-powered tools for every step of garden planning
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <GardenDesignIcon className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold mb-1" data-testid="text-feature-ai-title">AI Garden Design</h3>
                <p className="text-xs text-muted-foreground" data-testid="text-feature-ai-description">
                  Intelligent plant selection and layout optimization based on your garden conditions
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="w-14 h-14 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <SeasonIcon className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold mb-1" data-testid="text-feature-3d-title">3D Visualization</h3>
                <p className="text-xs text-muted-foreground" data-testid="text-feature-3d-description">
                  See your garden through the seasons with AI-generated imagery
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <PlantDoctorIcon className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold mb-1" data-testid="text-feature-doctor-title">Plant Doctor</h3>
                <p className="text-xs text-muted-foreground" data-testid="text-feature-doctor-description">
                  Identify plants and diseases with AI-powered image recognition
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-serif font-bold text-foreground mb-2" data-testid="text-pricing-title">
              Simple Pricing
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-pricing-subtitle">
              Choose the plan that works for you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto items-start">
            <Card className="h-full relative">
              <CardContent className="pt-6 pb-4 px-4 h-full flex flex-col">
                <h3 className="text-base font-semibold mb-1" data-testid="text-plan-free-title">Free</h3>
                <p className="text-xl font-bold mb-3" data-testid="text-plan-free-price">
                  $0<span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-1 mb-4 flex-1">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Basic plant library access</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Plant identification (5/month)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Community support</span>
                  </li>
                </ul>
                <Button size="sm" variant="outline" className="w-full mt-auto" asChild data-testid="button-plan-free">
                  {!isAuthenticated ? (
                    <a href="/api/login">Get Started</a>
                  ) : (
                    <Link href="/home">Go to Dashboard</Link>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full relative">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-xs">
                Most Popular
              </Badge>
              <CardContent className="pt-6 pb-4 px-4 h-full flex flex-col">
                <h3 className="text-base font-semibold mb-1" data-testid="text-plan-design-title">Pay-per-Design</h3>
                <p className="text-xl font-bold mb-3" data-testid="text-plan-design-price">
                  $6<span className="text-sm font-normal text-muted-foreground">/design</span>
                </p>
                <ul className="space-y-1 mb-4 flex-1">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Complete garden design</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">3D seasonal visualization</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Plant shopping list</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Priority support</span>
                  </li>
                </ul>
                <Button size="sm" className="w-full mt-auto bg-primary hover:bg-primary/90" asChild data-testid="button-plan-design">
                  {!isAuthenticated ? (
                    <a href="/api/login">Create Design</a>
                  ) : (
                    <Link href="/garden-properties">Create Design</Link>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full relative">
              <CardContent className="pt-6 pb-4 px-4 h-full flex flex-col">
                <h3 className="text-base font-semibold mb-1" data-testid="text-plan-premium-title">Premium</h3>
                <p className="text-xl font-bold mb-3" data-testid="text-plan-premium-price">
                  $12<span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-1 mb-4 flex-1">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Unlimited designs</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Advanced plant database</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Personal plant collection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">AI garden advisor</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">Premium dashboard</span>
                  </li>
                </ul>
                <Button size="sm" variant="secondary" className="w-full mt-auto" asChild data-testid="button-plan-premium">
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
                <GardenScapeIcon className="w-6 h-6" />
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
