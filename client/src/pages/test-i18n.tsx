import Navigation from "@/components/layout/navigation";
import { I18nTest } from "@/components/ui/i18n-test";

function TestI18n() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8">
        <I18nTest />
      </div>
    </div>
  );
}

export default TestI18n;