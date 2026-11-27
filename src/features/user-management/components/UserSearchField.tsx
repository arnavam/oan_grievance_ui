'use client';

import { useEffect, useId, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { fetchOfficerCandidates } from '../api/officerApi';
import type { OfficerCandidate, OfficerRole } from '../types';

const SEARCH_DEBOUNCE_MS = 300;
/** Nothing is listed until the admin has typed this much, so focusing the box shows no one. */
const MIN_QUERY_LENGTH = 2;

interface UserSearchFieldProps {
  id: string;
  role: OfficerRole;
  /** The chosen account; the search box turns into a card showing who it is. */
  selected: OfficerCandidate | null;
  onSelect: (candidate: OfficerCandidate | null) => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Finds a registered account by name or email (`GET /api/v1/officers/candidates?q=`), so the admin
 * picks a person instead of typing their details. Their name, email and phone come from the account.
 */
export function UserSearchField({ id, role, selected, onSelect, invalid, describedBy }: UserSearchFieldProps) {
  const t = useTranslations('userManagement.add');
  const listId = useId();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<OfficerCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const searched = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (selected || !isOpen || searched.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setFailed(false);
    fetchOfficerCandidates({ role, q: searched || undefined }, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResults(data.candidates ?? []);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResults([]);
        setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [role, searched, isOpen, selected]);

  const showList = isOpen && query.trim().length >= MIN_QUERY_LENGTH;

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 border border-[#16A34A]/40 bg-[#16A34A]/5 rounded-lg px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{selected.full_name}</p>
          <p className="text-xs text-gray-500 truncate">
            {selected.email}
            {selected.phone ? ` · ${selected.phone}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery('');
          }}
          aria-label={t('changeUser')}
          className="text-gray-400 hover:text-red-500 p-1 rounded-full shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        placeholder={t('searchPlaceholder')}
        className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors aria-invalid:border-red-400"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {isLoading || searched !== query.trim() ? (
            <li className="px-4 py-3 text-sm text-gray-400">{t('searching')}</li>
          ) : failed ? (
            <li className="px-4 py-3 text-sm text-red-600">{t('searchFailed')}</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">{t('noUsers')}</li>
          ) : (
            results.map((candidate) => (
              <li key={candidate.name} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(candidate);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <span className="block text-sm font-medium text-gray-900">{candidate.full_name}</span>
                  <span className="block text-xs text-gray-500">{candidate.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
