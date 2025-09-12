import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, MoreVertical, Shield } from "lucide-react";
import { GardenScapeIcon } from "@/components/ui/brand-icons";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get the actual user (not affected by tier testing)
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  // Check if testing mode is active
  const isTestingMode = !!sessionStorage.getItem('tierTestingMode');
  const isActualAdmin = user?.isAdmin === true;

  const navigationItems = [
    { href: "/welcome", label: "Welcome" },
    { href: "/home", label: "Dashboard" },
    { href: "/plant-library", label: "Plant Library" },
    { href: "/plant-doctor", label: "Plant Doctor" },
    { href: "/premium", label: "Premium" },
    { href: "/icon-gallery", label: "Icon Gallery" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[#004025] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center">
            {/* Admin menu - only visible to admins */}
            {isActualAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 h-7 w-7"
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
            
            <Link href={user ? "/home" : "/"} className="flex items-center space-x-2" data-testid="link-home">
              <GardenScapeIcon className="w-7 h-7" />
              <span className="text-lg font-serif font-semibold text-[#004025]">GardenScape Pro</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-4 ml-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-xs font-medium transition-all duration-200 px-3 py-1.5 rounded-md border",
                    location === item.href
                      ? "bg-[#004025] text-white border-[#004025]"
                      : "text-[#004025] hover:bg-[#004025]/10 border-transparent hover:border-[#004025]"
                  )}
                  data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            <Button size="sm" className="h-8 text-xs bg-[#004025] hover:bg-[#004025]/90 border-2 border-[#004025]" asChild data-testid="button-new-garden">
              <Link href="/garden-properties" className="text-white hover:text-white focus:text-white">New Garden</Link>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs border-2 border-[#004025] text-[#004025] hover:bg-[#004025]/10" asChild data-testid="button-logout">
              <a href="/api/logout" className="link-reset">Sign Out</a>
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
          <div className="md:hidden border-t-2 border-[#004025] py-3" data-testid="mobile-menu">
            <div className="flex flex-col space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-xs font-medium transition-all duration-200 py-2 px-3 rounded-md border",
                    location === item.href
                      ? "bg-[#004025] text-white border-[#004025]"
                      : "text-[#004025] hover:bg-[#004025]/10 border-transparent hover:border-[#004025]"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`mobile-link-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t-2 border-[#004025] pt-3 mt-3 space-y-2">
                <Button asChild className="w-full bg-[#004025] hover:bg-[#004025]/90" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-button-new-garden">
                  <Link href="/garden-properties" className="text-white hover:text-white focus:text-white">New Garden</Link>
                </Button>
                <Button variant="outline" asChild className="w-full" data-testid="mobile-button-logout">
                  <a href="/api/logout" className="link-reset">Sign Out</a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
