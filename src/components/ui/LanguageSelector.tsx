'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchSubmitterOptionsThunk,
  selectPreferredLanguageOptions,
  selectSelectedLanguage,
  setSelectedLanguage,
} from '@/features/metadata';

/**
 * Shared LanguageSelector component used consistently across both the
 * dashboard Header and the Auth PortalShell card.
 */
export function LanguageSelector() {
  const dispatch = useAppDispatch();
  const dynamicLanguages = useAppSelector(selectPreferredLanguageOptions);
  const metadataStatus = useAppSelector((state) => state.metadata.submitterOptionsStatus);
  const selectedCode = useAppSelector(selectSelectedLanguage);

  useEffect(() => {
    if (metadataStatus === 'idle') {
      void dispatch(fetchSubmitterOptionsThunk());
    }
  }, [dispatch, metadataStatus]);

  const languages = dynamicLanguages;
  const activeLanguage =
    languages.find((l) => l.code === selectedCode) ||
    languages[0] ||
    { code: 'en', label: 'English', flag: '🇺🇸', flagUrl: '/images/flags/us.svg' };

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Language, ${activeLanguage.label}`}
        onClick={() => {
          if (languages.length > 0) {
            setIsOpen(!isOpen);
          }
        }}
        className={`flex items-center gap-2 border rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer shadow-xs focus:outline-none ${
          isOpen
            ? 'border-[#16A34A] bg-[#16A34A]/5 text-[#16A34A]'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
        }`}
      >
        <span className="flex items-center justify-center w-5 h-3.5 shrink-0 overflow-hidden rounded-xs">
          {activeLanguage.flagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeLanguage.flagUrl} alt="" width={20} height={14} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base leading-none">{activeLanguage.flag}</span>
          )}
        </span>
        <span className="text-sm font-medium">{activeLanguage.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#16A34A]' : ''
          }`}
        />
      </button>

      {isOpen && languages.length > 0 && (
        <div
          role="menu"
          aria-label="Language"
          className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50 py-1"
        >
          {languages.map((lang) => (
            <button
              type="button"
              key={lang.code}
              role="menuitemradio"
              aria-checked={activeLanguage.code === lang.code}
              onClick={() => {
                dispatch(setSelectedLanguage(lang.code));
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors ${
                activeLanguage.code === lang.code ? 'font-bold text-[#16A34A] bg-[#16A34A]/5' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-5 h-3.5 shrink-0 overflow-hidden rounded-xs">
                  {lang.flagUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lang.flagUrl} alt="" width={20} height={14} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base leading-none">{lang.flag}</span>
                  )}
                </span>
                <span>{lang.label}</span>
              </span>
              {activeLanguage.code === lang.code && <Check className="w-4 h-4 text-[#16A34A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
