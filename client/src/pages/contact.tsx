import Navigation from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-8">{t('contact.pageTitle')}</h1>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                {t('contact.emailSupport.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {t('contact.emailSupport.description')}
              </p>
              <Button className="w-full" asChild>
                <a href="mailto:support@gardenscape.pro">{t('contact.emailSupport.button')}</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                {t('contact.communitySupport.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {t('contact.communitySupport.description')}
              </p>
              <Button variant="outline" className="w-full">
                {t('contact.communitySupport.button')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              {t('contact.faq.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('contact.faq.questions.firstDesign.question')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('contact.faq.questions.firstDesign.answer')}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('contact.faq.questions.premiumPlans.question')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('contact.faq.questions.premiumPlans.answer')}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('contact.faq.questions.plantIdentification.question')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('contact.faq.questions.plantIdentification.answer')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}