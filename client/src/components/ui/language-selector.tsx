import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className={className} data-testid="language-selector">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue>
            {supportedLanguages[i18n.language as keyof typeof supportedLanguages] || 'English'}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(supportedLanguages).map(([code, name]) => (
          <SelectItem key={code} value={code} data-testid={`language-option-${code}`}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default LanguageSelector;