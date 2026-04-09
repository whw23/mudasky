'use client'

/**
 * 联系表单组件。
 * 联系我们页面右侧的在线留言表单。
 */

import { useTranslations } from 'next-intl'

/** 联系表单 */
export function ContactForm() {
  const t = useTranslations('Contact')

  return (
    <div>
      <h2 className="text-2xl font-bold">{t('formTitle')}</h2>
      <div className="mx-auto mt-3 h-0.5 w-12 bg-primary lg:mx-0" />
      <p className="mt-4 leading-relaxed text-muted-foreground">
        {t('formDesc')}
      </p>
      <form className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium">{t('nameLabel')}</label>
          <input
            type="text"
            placeholder={t('namePlaceholder')}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('emailFormLabel')}</label>
          <input
            type="email"
            placeholder={t('emailFormPlaceholder')}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('phoneFormLabel')}</label>
          <input
            type="tel"
            placeholder={t('phoneFormPlaceholder')}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('messageLabel')}</label>
          <textarea
            rows={5}
            placeholder={t('messagePlaceholder')}
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {t('submitButton')}
        </button>
      </form>
    </div>
  )
}
