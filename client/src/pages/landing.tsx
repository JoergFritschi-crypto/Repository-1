import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, MoreVertical, Shield, LogOut } from "lucide-react";
import { GardenScapeIcon, GardenDesignIcon, SeasonIcon, PlantDoctorIcon, PlantLibraryIcon, PremiumIcon, DashboardIcon } from "@/components/ui/brand-icons";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSelector from "@/components/layout/LanguageSelector";
import gardenImage from '@assets/generated_images/Mixed_perennial_garden_scene_5872224a.png';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  
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
                        <span>{isTestingMode ? t('landing.navigation.adminTesting') : t('landing.navigation.adminPanel')}</span>
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
              <LanguageSelector />
              {!isAuthenticated ? (
                <>
                  <a href="/api/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" title={t('landing.navigation.signInTooltip')}>
                    {t('landing.navigation.signIn')}
                  </a>
                  <Button asChild data-testid="button-get-started" title={t('landing.navigation.getStartedTooltip')}>
                    <a href="/api/login">{t('landing.navigation.getStartedFree')}</a>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/home" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1" title={t('landing.navigation.dashboardTooltip')}>
                    <DashboardIcon className="w-3.5 h-3.5" />
                    {t('landing.navigation.dashboard')}
                  </Link>
                  <Button asChild data-testid="button-new-garden" title={t('landing.navigation.newGardenTooltip')}>
                    <Link href="/garden-properties">{t('landing.navigation.newGarden')}</Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    data-testid="button-logout"
                    title={t('landing.navigation.signOutTooltip')}
                  >
                    <a href="/api/logout" className="link-reset flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5" />
                      {t('landing.navigation.signOut')}
                    </a>
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
          alt={t('landing.hero.imageAlt')} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-serif font-bold mb-3 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" data-testid="text-hero-title">
                {t('landing.hero.title')}
              </h1>
              <p className="text-base mb-6 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" data-testid="text-hero-subtitle">
                {t('landing.hero.subtitle')}
              </p>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <Button asChild className="bg-white/90 hover:bg-white text-primary border-2 border-primary hover:border-primary/30 shadow-lg hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 w-full h-8 px-3 text-xs font-medium hover:scale-110 hover:-translate-y-1" data-testid="button-start-designing">
                      {!isAuthenticated ? (
                        <a href="/api/login" className="flex items-center justify-center gap-1 h-full link-reset">
                          <GardenDesignIcon className="w-3.5 h-3.5" />
                          {t('landing.hero.createGarden')}
                        </a>
                      ) : (
                        <Link href="/garden-properties" className="flex items-center justify-center gap-1 h-full link-reset">
                          <GardenDesignIcon className="w-3.5 h-3.5" />
                          {t('landing.hero.createGarden')}
                        </Link>
                      )}
                    </Button>
                    <p className="text-sm text-white/80 mt-1 text-center sm:text-left">{t('landing.hero.createDescription')}</p>
                  </div>
                  <div className="flex-1">
                    <Button variant="outline" asChild className="bg-white/90 hover:bg-white text-primary border-2 border-primary hover:border-primary/30 shadow-lg hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 w-full h-8 px-3 text-xs font-medium hover:scale-110 hover:-translate-y-1" data-testid="button-watch-demo">
                      {!isAuthenticated ? (
                        <a href="/api/login" className="flex items-center justify-center gap-1 h-full link-reset">
                          <PlantLibraryIcon className="w-3.5 h-3.5" />
                          {t('landing.hero.browsePlants')}
                        </a>
                      ) : (
                        <Link href="/plant-library" className="flex items-center justify-center gap-1 h-full link-reset">
                          <PlantLibraryIcon className="w-3.5 h-3.5" />
                          {t('landing.hero.browsePlants')}
                        </Link>
                      )}
                    </Button>
                    <p className="text-sm text-white/80 mt-1 text-center sm:text-left">{t('landing.hero.browseDescription')}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {t('landing.hero.benefits')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-serif font-bold text-foreground mb-2" data-testid="text-pricing-title">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-pricing-subtitle">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto items-start">
            <Card className="h-full relative">
              <CardContent className="pt-6 pb-4 px-4 h-full flex flex-col">
                <PlantLibraryIcon className="w-6 h-6 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1 text-center" data-testid="text-plan-free-title">{t('landing.pricing.free.title')}</h3>
                <p className="text-xl font-bold mb-3 text-primary" data-testid="text-plan-free-price">
                  {t('landing.pricing.free.price')}
                </p>
                <ul className="space-y-1 mb-4 flex-1">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.free.feature1')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.free.feature2')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.free.feature3')}</span>
                  </li>
                </ul>
                <Button size="sm" variant="secondary" className="w-full mt-auto hover:bg-secondary/80 hover:shadow-md transition-all duration-300" asChild data-testid="button-plan-free">
                  {!isAuthenticated ? (
                    <a href="/api/login">{t('landing.pricing.free.button')}</a>
                  ) : (
                    <Link href="/home" className="link-reset">{t('landing.pricing.free.buttonAuth')}</Link>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full relative">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-xs">
                {t('landing.pricing.mostPopular')}
              </Badge>
              <CardContent className="pt-6 pb-4 px-4 h-full flex flex-col">
                <GardenDesignIcon className="w-6 h-6 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1 text-center" data-testid="text-plan-design-title">{t('landing.pricing.design.title')}</h3>
                <p className="text-xl font-bold mb-3" data-testid="text-plan-design-price">
                  {t('landing.pricing.design.price')}<span className="text-sm font-normal text-muted-foreground">{t('landing.pricing.design.priceUnit')}</span>
                </p>
                <ul className="space-y-1 mb-4 flex-1">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.design.feature1')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.design.feature2')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.design.feature3')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.design.feature4')}</span>
                  </li>
                </ul>
                <Button size="sm" variant="secondary" className="w-full mt-auto hover:bg-secondary/80 hover:shadow-md transition-all duration-300" asChild data-testid="button-plan-design">
                  {!isAuthenticated ? (
                    <a href="/api/login">{t('landing.pricing.design.button')}</a>
                  ) : (
                    <Link href="/garden-properties" className="link-reset">{t('landing.pricing.design.button')}</Link>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full relative">
              <CardContent className="pt-6 pb-4 px-4 h-full flex flex-col">
                <PremiumIcon className="w-6 h-6 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1 text-center" data-testid="text-plan-premium-title">{t('landing.pricing.premium.title')}</h3>
                <p className="text-xl font-bold mb-3" data-testid="text-plan-premium-price">
                  {t('landing.pricing.premium.price')}<span className="text-sm font-normal text-muted-foreground">{t('landing.pricing.premium.priceUnit')}</span>
                </p>
                <ul className="space-y-1 mb-4 flex-1">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.premium.feature1')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.premium.feature2')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.premium.feature3')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.premium.feature4')}</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-accent mr-1 flex-shrink-0" />
                    <span className="text-xs">{t('landing.pricing.premium.feature5')}</span>
                  </li>
                </ul>
                <Button size="sm" variant="secondary" className="w-full mt-auto hover:bg-secondary/80 hover:shadow-md transition-all duration-300" asChild data-testid="button-plan-premium">
                  {!isAuthenticated ? (
                    <a href="/api/login">{t('landing.pricing.premium.button')}</a>
                  ) : (
                    <Link href="/premium" className="link-reset">{t('landing.pricing.premium.buttonAuth')}</Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-serif font-bold text-foreground mb-2" data-testid="text-features-title">
              {t('landing.features.title')}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto" data-testid="text-features-subtitle">
              {t('landing.features.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="pt-4 pb-4 px-4">
                <GardenDesignIcon className="w-8 h-8 mx-auto mb-3" />
                <h3 className="text-sm font-semibold mb-1" data-testid="text-feature-ai-title">{t('landing.features.aiDesign.title')}</h3>
                <p className="text-xs text-muted-foreground" data-testid="text-feature-ai-description">
                  {t('landing.features.aiDesign.description')}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4 px-4">
                <SeasonIcon className="w-8 h-8 mx-auto mb-3" />
                <h3 className="text-sm font-semibold mb-1" data-testid="text-feature-seasonal-title">{t('landing.features.seasonal.title')}</h3>
                <p className="text-xs text-muted-foreground" data-testid="text-feature-seasonal-description">
                  {t('landing.features.seasonal.description')}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4 px-4">
                <PlantDoctorIcon className="w-8 h-8 mx-auto mb-3" />
                <h3 className="text-sm font-semibold mb-1" data-testid="text-feature-doctor-title">{t('landing.features.plantDoctor.title')}</h3>
                <p className="text-xs text-muted-foreground" data-testid="text-feature-doctor-description">
                  {t('landing.features.plantDoctor.description')}
                </p>
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
              <p className="text-sm opacity-90">{t('landing.footer.description')}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t('landing.footer.featuresTitle')}</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link href="/garden-properties" className="hover:underline">{t('landing.footer.gardenDesign')}</Link></li>
                <li><Link href="/plant-library" className="hover:underline">{t('landing.footer.plantLibrary')}</Link></li>
                <li><Link href="/plant-doctor" className="hover:underline">{t('landing.footer.plantDoctor')}</Link></li>
                <li><Link href="/premium" className="hover:underline">{t('landing.footer.premiumFeatures')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t('landing.footer.legalTitle')}</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link href="/privacy" className="hover:underline transition-colors">{t('landing.footer.privacyPolicy')}</Link></li>
                <li><Link href="/terms" className="hover:underline transition-colors">{t('landing.footer.termsOfService')}</Link></li>
                <li><Link href="/contact" className="hover:underline transition-colors">{t('landing.footer.contact')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center">
            <p className="text-sm opacity-90">{t('landing.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
