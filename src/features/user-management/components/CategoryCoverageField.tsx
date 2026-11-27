'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGrievanceTypeOptions } from '../hooks/useGrievanceTypeOptions';
import type { CategoryOption } from '../hooks/useServiceCategoryOptions';
import { AnimatedSelect } from './AnimatedSelect';
import { MultiSelectDropdown } from './MultiSelectDropdown';

/** A service category an officer covers, narrowed to some of its grievance types (none = all of them). */
export interface CategoryCoverage {
  category: string;
  types: string[];
}

interface CategoryCoverageFieldProps {
  /** Prefix for the control ids, so two forms on a page never share one. */
  idPrefix: string;
  coverage: CategoryCoverage[];
  onChange: (coverage: CategoryCoverage[]) => void;
  categories: CategoryOption[];
  isCategoriesLoading: boolean;
  /** Told whenever a category is chosen but not yet added with +, so the form can say so on save. */
  onPendingChange?: (hasPending: boolean) => void;
}

/**
 * Service Category dropdown, a Grievance Type multi-select that follows it, and a + button that adds the pair
 * to the list below. Leaving the types empty covers every type of the category; adding a category again merges
 * into its entry.
 */
export function CategoryCoverageField({
  idPrefix,
  coverage,
  onChange,
  categories,
  isCategoriesLoading,
  onPendingChange,
}: CategoryCoverageFieldProps) {
  const t = useTranslations('userManagement.add');
  const [pendingCategory, setPendingCategory] = useState('');
  const [pendingTypes, setPendingTypes] = useState<string[]>([]);
  const { options: typeList, isLoading: isTypesLoading, isError: isTypesError } = useGrievanceTypeOptions(pendingCategory);

  useEffect(() => {
    onPendingChange?.(!!pendingCategory);
  }, [pendingCategory, onPendingChange]);

  // Gone with the form (a different person, a closed popup): nothing is pending any more.
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  const changeCategory = (category: string) => {
    setPendingCategory(category);
    // The types belong to the category they were picked under.
    setPendingTypes([]);
  };

  const add = () => {
    if (!pendingCategory) return;
    const existing = coverage.find((entry) => entry.category === pendingCategory);
    if (!existing) {
      onChange([...coverage, { category: pendingCategory, types: pendingTypes }]);
    } else {
      // An entry covering every type stays that way; otherwise the picks are combined.
      const types = existing.types.length === 0 || pendingTypes.length === 0 ? [] : [...new Set([...existing.types, ...pendingTypes])];
      onChange(coverage.map((entry) => (entry.category === pendingCategory ? { ...entry, types } : entry)));
    }
    setPendingCategory('');
    setPendingTypes([]);
  };

  const remove = (category: string) => onChange(coverage.filter((entry) => entry.category !== category));

  return (
    <>
      {isCategoriesLoading ? (
        <span className="text-sm text-gray-400">{t('categoriesLoading')}</span>
      ) : categories.length === 0 ? (
        <span className="text-sm text-gray-400">{t('categoriesNone')}</span>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-category`} className="text-xs font-medium text-gray-600">{t('categoryLabel')}</label>
            <AnimatedSelect
              id={`${idPrefix}-category`}
              options={categories}
              value={pendingCategory}
              onChange={changeCategory}
              placeholder={t('categoryPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-types`} className="text-xs font-medium text-gray-600">{t('typesLabel')}</label>
            <MultiSelectDropdown
              id={`${idPrefix}-types`}
              options={typeList}
              values={pendingTypes}
              onChange={setPendingTypes}
              disabled={!pendingCategory}
              placeholder={!pendingCategory ? t('typesWaiting') : isTypesLoading ? t('typesLoading') : t('typesPlaceholder')}
              emptyLabel={isTypesError ? t('typesFailed') : t('typesNone')}
              summarize={(count) => t('typesSelected', { count })}
            />
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!pendingCategory}
            aria-label={t('addCoverage')}
            title={t('addCoverage')}
            className="h-[42px] w-[42px] flex items-center justify-center rounded-lg bg-[#16A34A] text-white hover:bg-[#15803d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {coverage.some((entry) => entry.types.length > 0) && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('typesNotSaved')}</p>
      )}

      {coverage.length > 0 && (
        <ul className="flex flex-col gap-2 pt-1" aria-label={t('serviceCategories')}>
          {coverage.map((entry) => (
            <li
              key={entry.category}
              className="flex items-start justify-between gap-3 rounded-lg border border-[#16A34A]/40 bg-[#16A34A]/5 px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-semibold text-gray-900">{entry.category}</span>
                <div className="flex flex-wrap gap-1.5">
                  {entry.types.length > 0 ? (
                    entry.types.map((type) => (
                      <span key={type} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
                        {type}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-[#16A34A]/10 px-2 py-0.5 text-xs font-medium text-[#15803d]">{t('allTypes')}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(entry.category)}
                aria-label={t('removeCoverage', { category: entry.category })}
                className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-red-50 hover:text-red-500"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
