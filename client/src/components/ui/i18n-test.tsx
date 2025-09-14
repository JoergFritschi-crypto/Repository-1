import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './language-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Separator } from './separator';

export function I18nTest() {
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-2xl mx-auto m-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t('common.settings')} - I18n Test
          <LanguageSelector className="w-40" />
        </CardTitle>
        <CardDescription>
          Testing react-i18next setup with 6 languages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Navigation translations */}
          <div>
            <h3 className="font-semibold mb-2">Navigation</h3>
            <div className="space-y-1 text-sm">
              <div>• {t('navigation.home')}</div>
              <div>• {t('navigation.gardenSetup')}</div>
              <div>• {t('navigation.plantLibrary')}</div>
              <div>• {t('navigation.premium')}</div>
            </div>
          </div>

          {/* Common buttons */}
          <div>
            <h3 className="font-semibold mb-2">Common Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">{t('common.save')}</Button>
              <Button size="sm" variant="outline">{t('common.cancel')}</Button>
              <Button size="sm" variant="outline">{t('common.edit')}</Button>
              <Button size="sm" variant="outline">{t('common.delete')}</Button>
            </div>
          </div>

          {/* Form fields */}
          <div>
            <h3 className="font-semibold mb-2">Form Fields</h3>
            <div className="space-y-1 text-sm">
              <div>• {t('forms.name')}</div>
              <div>• {t('forms.email')}</div>
              <div>• {t('forms.password')}</div>
              <div>• {t('forms.description')}</div>
            </div>
          </div>

          {/* Garden terms */}
          <div>
            <h3 className="font-semibold mb-2">Garden Terms</h3>
            <div className="space-y-1 text-sm">
              <div>• {t('garden.climate')}</div>
              <div>• {t('garden.soilType')}</div>
              <div>• {t('garden.plants')}</div>
              <div>• {t('garden.maintenance')}</div>
            </div>
          </div>

          {/* Seasons */}
          <div>
            <h3 className="font-semibold mb-2">Seasons</h3>
            <div className="space-y-1 text-sm">
              <div>• {t('seasons.spring')}</div>
              <div>• {t('seasons.summer')}</div>
              <div>• {t('seasons.autumn')}</div>
              <div>• {t('seasons.winter')}</div>
            </div>
          </div>

          {/* Climate types */}
          <div>
            <h3 className="font-semibold mb-2">Climate Types</h3>
            <div className="space-y-1 text-sm">
              <div>• {t('climate.tropical')}</div>
              <div>• {t('climate.mediterranean')}</div>
              <div>• {t('climate.temperate')}</div>
              <div>• {t('climate.continental')}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Messages */}
        <div>
          <h3 className="font-semibold mb-2">Sample Messages</h3>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded">
              ✓ {t('messages.saveSuccess')}
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded">
              ✗ {t('messages.saveError')}
            </div>
            <div className="p-2 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded">
              ⚠ {t('forms.required')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default I18nTest;