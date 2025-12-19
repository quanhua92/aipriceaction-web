import * as React from 'react'
import { useTranslation } from '@/hooks/useTranslation'

export function AIDescription() {
  const { t } = useTranslation()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          {t('common.aiContext.pageDescription.title')}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          {t('common.aiContext.pageDescription.subtitle')}
        </p>
      </div>

      {/* Main Description */}
      <div className="text-center">
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
          {t('common.aiContext.pageDescription.mainDescription')}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <div className="flex items-start space-x-3 p-4 rounded-lg bg-card/50 border">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
            <span className="text-green-600 text-xs font-bold">1</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1">{t('common.aiContext.pageDescription.features.multiTicker.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('common.aiContext.pageDescription.features.multiTicker.description')}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-lg bg-card/50 border">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <span className="text-blue-600 text-xs font-bold">2</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1">{t('common.aiContext.pageDescription.features.flexibleIntervals.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('common.aiContext.pageDescription.features.flexibleIntervals.description')}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-lg bg-card/50 border">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
            <span className="text-purple-600 text-xs font-bold">3</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1">{t('common.aiContext.pageDescription.features.customTemplates.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('common.aiContext.pageDescription.features.customTemplates.description')}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-lg bg-card/50 border">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
            <span className="text-orange-600 text-xs font-bold">4</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1">{t('common.aiContext.pageDescription.features.copyToClipboard.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('common.aiContext.pageDescription.features.copyToClipboard.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Get Started Call-to-Action */}
      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {t('common.aiContext.pageDescription.getStarted')}
        </p>
      </div>
    </div>
  )
}