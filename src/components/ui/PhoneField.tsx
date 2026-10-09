'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { isEthiopianDialCode, PHONE_NUMBER_LENGTH, toDigitsOnly } from '@/lib/validation/phone';

/** The longest local number `GENERIC_LOCAL_PHONE_REGEX` (phone.ts) accepts for a non-Ethiopian country. */
const GENERIC_LOCAL_PHONE_MAX_LENGTH = 14;

export interface CountryCodeOption {
  code: string;
  country: string;
  /** A local SVG, where one exists (see public/images/flags/). */
  flagUrl?: string;
  /** Emoji fallback for a country with no SVG asset — see LanguageSelector.tsx for the same flagUrl-then-flag pattern. */
  flag?: string;
}

export const DEFAULT_COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+251', country: 'Ethiopia', flagUrl: '/images/flags/et.svg', flag: '🇪🇹' },
  { code: '+254', country: 'Kenya', flagUrl: '/images/flags/ke.svg', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flagUrl: '/images/flags/tz.svg', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flagUrl: '/images/flags/ug.svg', flag: '🇺🇬' },
  { code: '+250', country: 'Rwanda', flagUrl: '/images/flags/rw.svg', flag: '🇷🇼' },
  { code: '+252', country: 'Somalia', flagUrl: '/images/flags/so.svg', flag: '🇸🇴' },
  { code: '+253', country: 'Djibouti', flagUrl: '/images/flags/dj.svg', flag: '🇩🇯' },
  { code: '+258', country: 'Mozambique', flagUrl: '/images/flags/mz.svg', flag: '🇲🇿' },
  { code: '+1', country: 'United States', flagUrl: '/images/flags/us.svg', flag: '🇺🇸' },
];

export interface PhoneFieldProps {
  countryCode: string;
  setCountryCode: (code: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  /** Caps the digits the input accepts. Defaults to the selected country's own limit (10 for Ethiopia, 14 for everywhere else — see `GENERIC_LOCAL_PHONE_REGEX`) when omitted. */
  maxLength?: number;
  className?: string;
  /** Set when the field has a validation error: red border, and `aria-invalid` for assistive tech. */
  invalid?: boolean;
  /** The id of the error message shown for this field, wired up as `aria-describedby`. */
  describedBy?: string;
  /** Fired when the number input loses focus — where the form validates on blur. */
  onBlur?: () => void;
}

/**
 * Shared PhoneField component providing a country-code dialling dropdown (+251 default)
 * and an integrated digit-validated phone number input.
 */
export function PhoneField({
  countryCode,
  setCountryCode,
  phoneNumber,
  setPhoneNumber,
  placeholder = 'Enter phone number',
  required = false,
  disabled = false,
  id,
  name,
  maxLength,
  className = '',
  invalid = false,
  describedBy,
  onBlur,
}: PhoneFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const effectiveMaxLength =
    maxLength ?? (isEthiopianDialCode(countryCode) ? PHONE_NUMBER_LENGTH : GENERIC_LOCAL_PHONE_MAX_LENGTH);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active =
    DEFAULT_COUNTRY_CODES.find((c) => c.code === countryCode) || {
      code: countryCode || '+251',
      country: 'Ethiopia',
      flagUrl: '/images/flags/et.svg',
      flag: '🇪🇹',
    };

  return (
    <div
      data-invalid={invalid ? 'true' : undefined}
      className={`flex shadow-xs rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[#16A34A]/20 focus-within:border-[#16A34A] data-[invalid=true]:border-red-500 data-[invalid=true]:focus-within:border-red-500 data-[invalid=true]:focus-within:ring-red-500/20 transition-colors relative bg-white ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      } ${className}`}
    >
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Country code, ${active.country} ${active.code}`}
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-50 rounded-l-lg px-3 py-2.5 border-r border-gray-300 flex items-center gap-1.5 cursor-pointer h-full hover:bg-gray-100 transition-colors focus:outline-none"
        >
          <span className="flex items-center justify-center w-4 h-3 shrink-0 overflow-hidden rounded-xs">
            {active.flagUrl ? (
              // next/image's overhead (loader, blur placeholder) isn't worth it for
              // a fixed 18x13 decorative icon from a small local sprite set.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.flagUrl} alt="" width={18} height={13} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm leading-none">{active.flag}</span>
            )}
          </span>
          <span className="text-gray-700 text-sm font-medium">{active.code}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Country code"
            className="absolute top-full left-0 mt-1 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden"
          >
            <ul className="max-h-48 overflow-y-auto py-1">
              {DEFAULT_COUNTRY_CODES.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={countryCode === c.code}
                    onClick={() => {
                      setCountryCode(c.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                      countryCode === c.code ? 'bg-gray-50 text-[#16A34A] font-bold' : 'text-gray-700 font-medium'
                    }`}
                  >
                    <span className="flex items-center justify-center w-4 h-3 shrink-0 overflow-hidden rounded-xs">
                      {c.flagUrl ? (
                        // Same fixed-size decorative icon as the trigger button above.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.flagUrl} alt="" width={18} height={13} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm leading-none">{c.flag}</span>
                      )}
                    </span>
                    <span>{c.country} ({c.code})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <input
        type="tel"
        inputMode="numeric"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        maxLength={effectiveMaxLength}
        value={phoneNumber}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onBlur={onBlur}
        onChange={(e) => {
          let digits = toDigitsOnly(e.target.value);
          const codeDigits = toDigitsOnly(countryCode);
          if (codeDigits && digits.startsWith(codeDigits) && digits.length >= codeDigits.length + 8) {
            digits = digits.slice(codeDigits.length);
          }
          setPhoneNumber(digits.slice(0, effectiveMaxLength));
        }}
        placeholder={placeholder}
        className="flex-1 bg-white text-gray-800 py-2.5 px-3.5 rounded-r-lg focus:outline-none text-sm placeholder:text-gray-400 font-medium"
      />
    </div>
  );
}
