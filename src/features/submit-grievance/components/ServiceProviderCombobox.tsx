"use client";

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  searchServiceProviders,
  type ServiceProviderOption,
  type ServiceProviderRef,
} from '../api/serviceProviderApi';

const SEARCH_DEBOUNCE_MS = 300;

interface ServiceProviderComboboxProps {
  id: string;
  value: ServiceProviderRef | null;
  onChange: (value: ServiceProviderRef | null) => void;
}

/** The provider's place in the directory: its type and area, when it has them. */
function describe(option: ServiceProviderOption): string {
  return [option.type, option.area?.path_label].filter(Boolean).join(' · ');
}

/**
 * Searchable dropdown over the backend's service-provider directory. Typing queries the
 * directory (debounced); only a listed provider can be chosen, since the grievance stores
 * its ID. The field is optional: clear it, or leave it empty if the provider is not listed.
 * ARIA combobox pattern — arrow keys move, Enter picks, Escape closes.
 */
export function ServiceProviderCombobox({ id, value, onChange }: ServiceProviderComboboxProps) {
  const t = useTranslations('submitGrievance.serviceProvider');
  const listId = useId();
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [options, setOptions] = useState<ServiceProviderOption[]>([]);
  // The query the current options answer, and whether it failed; loading is derived from it not matching yet.
  const [result, setResult] = useState<{ query: string; failed: boolean } | null>(null);
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    searchServiceProviders(debounced, controller.signal)
      .then((items) => {
        setOptions(items);
        setResult({ query: debounced, failed: false });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setOptions([]);
        setResult({ query: debounced, failed: true });
      });
    return () => controller.abort();
  }, [debounced, isOpen]);

  const pick = (option: ServiceProviderOption) => {
    onChange({ id: option.id, name: option.name });
    setText('');
    setIsOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActive((i) => (i + 1) % Math.max(options.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === 'Enter' && isOpen && active >= 0) {
      // Picking an option must not also submit the form.
      event.preventDefault();
      const option = options[active];
      if (option) pick(option);
    } else if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  const status = result?.query !== debounced ? 'loading' : result.failed ? 'error' : 'idle';

  // While a provider is chosen and the list is closed the input shows its name; typing starts a new search.
  const shown = value && !isOpen ? value.name : text;

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={100}
        value={shown}
        placeholder={t('placeholder')}
        onChange={(e) => {
          setText(e.target.value);
          setIsOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          setText('');
          setIsOpen(true);
        }}
        onBlur={() => {
          // Text that was never picked is not a selection, so do not leave it looking like one.
          setIsOpen(false);
          setText('');
        }}
        onKeyDown={onKeyDown}
        className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 pl-4 pr-16 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        {value && (
          <button
            type="button"
            aria-label={t('clear')}
            onClick={() => onChange(null)}
            className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <span aria-hidden="true" className="flex w-8 items-center justify-center text-gray-400">
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </div>
      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('listLabel')}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[240px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {status === 'loading' && options.length === 0 && (
            <li role="presentation" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('searching')}
            </li>
          )}
          {status === 'error' && (
            <li role="presentation" className="px-4 py-2.5 text-sm text-red-600">
              {t('loadError')}
            </li>
          )}
          {status === 'idle' && options.length === 0 && (
            <li role="presentation" className="px-4 py-2.5 text-sm text-gray-500">
              {t('noMatch')}
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.id === value?.id}
              // mousedown, not click: the input's blur would close the list before a click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-4 py-2 transition-colors ${
                option.id === value?.id
                  ? 'bg-[#F0FDF4] text-[#16A34A]'
                  : index === active
                    ? 'bg-gray-50'
                    : 'hover:bg-gray-50'
              }`}
            >
              <span className="block text-[15px] font-medium text-gray-800">{option.name}</span>
              {describe(option) && <span className="block text-xs text-gray-500">{describe(option)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
