import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supportedLanguages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  variant?: "desktop" | "mobile";
  onLanguageChange?: () => void;
}

export default function LanguageSelector({ 
  variant = "desktop", 
  onLanguageChange 
}: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  
  const currentLanguage = i18n.language;
  const currentLanguageName = supportedLanguages[currentLanguage as keyof typeof supportedLanguages] || "English";
  
  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    onLanguageChange?.();
  };

  if (variant === "mobile") {
    return (
      <div className="px-2 py-1">
        <div className="text-xs font-medium text-[#004025] mb-2">
          {t('mainNavigation.language')}
        </div>
        <div className="space-y-1">
          {Object.entries(supportedLanguages).map(([code, name]) => {
            const isActive = currentLanguage === code;
            return (
              <Button
                key={code}
                variant="ghost"
                size="sm"
                onClick={() => handleLanguageChange(code)}
                className={cn(
                  "w-full justify-start text-xs transition-all duration-200",
                  isActive
                    ? "bg-[#004025] text-white hover:bg-[#004025]/90"
                    : "text-[#004025] hover:bg-[#004025]/10"
                )}
                data-testid={`mobile-language-${code}`}
                aria-label={t('mainNavigation.switchLanguage', { language: name })}
                aria-current={isActive ? "true" : undefined}
              >
                <Globe className="w-3 h-3 mr-2" />
                <span>{name}</span>
                {isActive && (
                  <span className="ml-auto text-[10px] bg-[#FFD700] text-[#004025] px-1 py-0.5 rounded text-black">
                    ✓
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-sm font-medium text-muted-foreground hover:text-primary border-2 border-transparent hover:bg-[#004025]/10 hover:border-[#004025] transition-all duration-200 hover:scale-105 hover:shadow-sm"
          data-testid="button-language-selector"
          aria-label={t('mainNavigation.languageSelector')}
          aria-expanded="false"
        >
          <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="hidden sm:inline font-medium">{currentLanguageName}</span>
          <span className="sm:hidden font-medium">{currentLanguage.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {t('mainNavigation.language')}
          </div>
        </div>
        {Object.entries(supportedLanguages).map(([code, name]) => {
          const isActive = currentLanguage === code;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={cn(
                "cursor-pointer flex items-center justify-between transition-colors duration-200",
                isActive && "bg-[#004025]/10 text-[#004025] font-medium"
              )}
              data-testid={`dropdown-language-${code}`}
              aria-label={t('mainNavigation.switchLanguage', { language: name })}
            >
              <div className="flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                <span>{name}</span>
              </div>
              {isActive && (
                <span className="text-xs bg-[#FFD700] text-[#004025] px-1.5 py-0.5 rounded font-bold">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}