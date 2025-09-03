import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { GardenScapeIcon } from "@/components/ui/brand-icons";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { href: "/welcome", label: "Welcome" },
    { href: "/", label: "Dashboard" },
    { href: "/plant-library", label: "Plant Library" },
    { href: "/plant-doctor", label: "Plant Doctor" },
    { href: "/premium", label: "Premium" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <GardenScapeIcon className="w-8 h-8" />
              <span className="text-xl font-serif font-bold text-primary">GardenScape Pro</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6 ml-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-all duration-200 px-2 py-1 rounded-md",
                    location === item.href
                      ? "text-canary bg-primary/10 font-semibold"
                      : "text-muted-foreground hover:text-canary hover:bg-canary/10"
                  )}
                  data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild data-testid="button-new-garden">
              <Link href="/garden-properties">New Garden</Link>
            </Button>
            <Button variant="outline" asChild data-testid="button-logout">
              <a href="/api/logout">Sign Out</a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4" data-testid="mobile-menu">
            <div className="flex flex-col space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-all duration-200 py-2 px-3 rounded-md",
                    location === item.href
                      ? "text-canary bg-primary/10 font-semibold"
                      : "text-muted-foreground hover:text-canary hover:bg-canary/10"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`mobile-link-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-border pt-3 mt-3 space-y-2">
                <Button asChild className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-button-new-garden">
                  <Link href="/garden-properties">New Garden</Link>
                </Button>
                <Button variant="outline" asChild className="w-full" data-testid="mobile-button-logout">
                  <a href="/api/logout">Sign Out</a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
