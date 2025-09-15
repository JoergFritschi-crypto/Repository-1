import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, MoreVertical, Shield, Sprout, Stethoscope, Crown, Plus, LogOut, ChevronRight } from "lucide-react";
import { GardenScapeIcon, PlantLibraryIcon, PlantDoctorIcon, PremiumIcon, DashboardIcon } from "@/components/ui/brand-icons";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSelector from "./LanguageSelector";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  
  // Get the actual user (not affected by tier testing)
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  // Check if testing mode is active
  const isTestingMode = !!sessionStorage.getItem('tierTestingMode');
  const isActualAdmin = user?.isAdmin === true;

  const navigationItems = [
    { href: "/home", label: t('mainNavigation.dashboard'), icon: DashboardIcon },
    { href: "/plant-library", label: t('mainNavigation.plantLibrary'), icon: PlantLibraryIcon, brandIcon: true },
    { href: "/plant-doctor", label: t('mainNavigation.plantDoctor'), icon: PlantDoctorIcon, brandIcon: true },
    { href: "/premium", label: t('mainNavigation.premium'), icon: PremiumIcon, brandIcon: true },
  ];

  return (
    <nav 
      className="sticky top-0 z-50 border-b-2 border-[#004025] bg-white"
      role="navigation"
      aria-label="Main navigation"
    >
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
            
            <Link 
              href={user ? "/home" : "/"} 
              className="flex items-center space-x-2 group transition-transform duration-200 hover:scale-105" 
              data-testid="link-home"
              aria-label={t('mainNavigation.homeAriaLabel')}
            >
              <GardenScapeIcon className="w-7 h-7 transition-transform duration-200 group-hover:rotate-12" />
              <span className="text-lg font-serif font-semibold text-[#004025] group-hover:text-[#004025]/80">GardenScape Pro</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-3 ml-6">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium transition-all duration-200 px-3 py-1.5 rounded-md border group relative",
                      isActive
                        ? "bg-[#004025] text-white border-[#004025] shadow-md"
                        : "text-[#004025] hover:bg-[#004025]/10 border-transparent hover:border-[#004025] hover:shadow-sm hover:scale-105"
                    )}
                    data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#FFD700] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            <LanguageSelector variant="desktop" />
            <Button 
              size="sm" 
              className="h-8 text-xs bg-[#004025] hover:bg-[#004025]/90 border-2 border-[#004025] transition-all duration-200 hover:scale-105 hover:shadow-md group" 
              asChild 
              data-testid="button-new-garden"
              aria-label={t('mainNavigation.newGardenAriaLabel')}
            >
              <Link href="/garden-properties" className="text-white hover:text-white focus:text-white flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-90" />
                {t('mainNavigation.newGarden')}
              </Link>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 text-xs border-2 border-[#004025] text-[#004025] hover:bg-[#004025]/10 transition-all duration-200 hover:scale-105 hover:shadow-sm group" 
              asChild 
              data-testid="button-logout"
              aria-label={t('mainNavigation.signOutAriaLabel')}
            >
              <a href="/api/logout" className="link-reset flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                {t('mainNavigation.signOut')}
              </a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label={mobileMenuOpen ? t('mainNavigation.closeMenuAriaLabel') : t('mainNavigation.openMenuAriaLabel')}
              aria-expanded={mobileMenuOpen}
              className="transition-all duration-200 hover:scale-105"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 transition-transform duration-200 rotate-90" />
              ) : (
                <Menu className="w-5 h-5 transition-transform duration-200" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden border-t-2 border-[#004025] py-3 animate-in slide-in-from-top-2 duration-200" 
            data-testid="mobile-menu"
            role="menu"
          >
            <div className="flex flex-col space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between text-sm font-medium transition-all duration-200 py-3 px-4 rounded-md border mx-2 group",
                      isActive
                        ? "bg-[#004025] text-white border-[#004025] shadow-md"
                        : "text-[#004025] hover:bg-[#004025]/10 border-transparent hover:border-[#004025] hover:shadow-sm"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-link-${item.label.toLowerCase().replace(' ', '-')}`}
                    aria-label={item.label}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2">
                      {item.label === t('mainNavigation.premium') ? (
                        <div className="bg-white rounded-sm p-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      "group-hover:translate-x-0.5"
                    )} />
                  </Link>
                );
              })}
              <div className="border-t-2 border-[#004025] pt-3 mt-3 space-y-2 px-2">
                <LanguageSelector 
                  variant="mobile" 
                  onLanguageChange={() => setMobileMenuOpen(false)} 
                />
                <Button 
                  asChild 
                  className="w-full bg-[#004025] hover:bg-[#004025]/90 transition-all duration-200 hover:shadow-md" 
                  onClick={() => setMobileMenuOpen(false)} 
                  data-testid="mobile-button-new-garden"
                >
                  <Link href="/garden-properties" className="text-white hover:text-white focus:text-white flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('mainNavigation.newGarden')}
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  asChild 
                  className="w-full border-2 border-[#004025] text-[#004025] hover:bg-[#004025]/10 transition-all duration-200" 
                  data-testid="mobile-button-logout"
                >
                  <a href="/api/logout" className="link-reset flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    {t('mainNavigation.signOut')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
