'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Step 3 of registration — confirmation. */
export function SuccessStep() {
  const t = useTranslations('register.success');

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-200 mb-2">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h3>
        <p className="text-gray-500 font-medium">{t('body')}</p>
      </div>
      <Link
        href="/login"
        className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-4 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] shadow-sm flex items-center justify-center"
      >
        {t('proceedToLogin')}
      </Link>
    </div>
  );
}
