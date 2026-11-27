'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api';
import { errorIdFor, FieldError } from '@/components/ui/FieldError';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { useModalA11y } from '@/components/ui/useModalA11y';
import type { AreaLevel } from '@/features/metadata';
import { AnimatedSelect } from './AnimatedSelect';
import { AreaSelect, type AreaChoice } from './AreaSelect';
import { CategoryCoverageField, type CategoryCoverage } from './CategoryCoverageField';
import { UserSearchField } from './UserSearchField';
import { createOfficer } from '../api/officerApi';
import { useDesignations } from '../hooks/useDesignations';
import { useL2OfficerOptions } from '../hooks/useL2OfficerOptions';
import { useServiceCategoryOptions } from '../hooks/useServiceCategoryOptions';
import type { OfficerBackendStatus, OfficerCandidate, OfficerLevel, OfficerRole } from '../types';

type FormField = 'user' | 'location' | 'serviceCategories';

const FIELD_IDS: Record<FormField, string> = {
  user: 'add-officer-user',
  location: 'add-officer-location',
  serviceCategories: 'add-officer-categories',
};

const NO_CHOICE: AreaChoice = { area: null, parentPath: null };
interface AddNodalOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: OfficerRole;
  /** Required when `role` is `'Officer'`; ignored (and never sent) for a Reviewer. */
  level?: OfficerLevel;
  /** On the first rung only: the rung whose officers this one can report to. Shows the "Reports To" field. */
  supervisorLevel?: OfficerLevel;
  supervisorLabel?: string;
  /** The deepest area this rung is placed at (Kebele for the first rung); none for a Reviewer. */
  areaLevel?: AreaLevel;
  tabLabel: string;
  onCreated: () => void;
}

/**
 * Places a registered account on a rung via `POST /api/v1/officers`. The admin searches for the person
 * (`GET /officers/candidates`) instead of typing their details; once chosen, the form asks for what the
 * tab needs: the designation (the service's positions for that level), the location down to the level the
 * rung works at, who they report to (officers of the area above, in that area), and the categories they
 * cover. The backend takes no password: the account already exists with its own login.
 */
export function AddNodalOfficerModal({
  isOpen,
  onClose,
  role,
  level,
  supervisorLevel,
  supervisorLabel,
  areaLevel,
  tabLabel,
  onCreated,
}: AddNodalOfficerModalProps) {
  const t = useTranslations('userManagement.add');
  const isReviewer = role === 'Reviewer';

  const [user, setUser] = useState<OfficerCandidate | null>(null);
  const [designation, setDesignation] = useState('');
  const [location, setLocation] = useState<AreaChoice>(NO_CHOICE);
  const [reportsTo, setReportsTo] = useState('');
  const [coverage, setCoverage] = useState<CategoryCoverage[]>([]);
  const [hasPendingCategory, setHasPendingCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});

  const needsLocation = !isReviewer && !!areaLevel;
  const { designations } = useDesignations(isOpen && !!user && !isReviewer, level);
  const { options: supervisorOptions } = useL2OfficerOptions(
    isOpen && !!user && !!supervisorLevel,
    supervisorLevel,
    location.parentPath ?? undefined,
    true,
    coverage.map((entry) => entry.category),
    true
  );
  // Every category there is, whether or not it has a desk yet.
  const { options: categoryList, isLoading: isCategoriesLoading } = useServiceCategoryOptions(undefined);

  const resetForm = () => {
    setUser(null);
    setDesignation('');
    setLocation(NO_CHOICE);
    setReportsTo('');
    setCoverage([]);
    setHasPendingCategory(false);
    setFormError(null);
    setErrors({});
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, handleClose);

  if (!isOpen) return null;

  const pickUser = (candidate: OfficerCandidate | null) => {
    setUser(candidate);
    setErrors((prev) => ({ ...prev, user: undefined }));
    if (!candidate) {
      // What was chosen below belonged to that person.
      setDesignation('');
      setLocation(NO_CHOICE);
      setReportsTo('');
      setCoverage([]);
      setHasPendingCategory(false);
    }
  };

  const changeLocation = (choice: AreaChoice) => {
    setLocation(choice);
    // The supervisors are those of the area above; a different one makes the old pick stale.
    setReportsTo('');
    setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const changeCoverage = (next: CategoryCoverage[]) => {
    setCoverage(next);
    if (next.length > 0) setErrors((prev) => ({ ...prev, serviceCategories: undefined }));
  };

  const handleAdd = async () => {
    const found: Partial<Record<FormField, string>> = {};
    if (!user) found.user = t('userRequired');
    if (user && needsLocation && !location.area) found.location = t('locationRequired');
    if (user && (coverage.length === 0 || hasPendingCategory)) {
      found.serviceCategories = hasPendingCategory ? t('categoryNotAdded') : t('categoriesRequired');
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = (['user', 'location', 'serviceCategories'] as const).find((key) => found[key]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await createOfficer({
        role,
        full_name: user.full_name,
        level: isReviewer ? null : level,
        department: null,
        email: user.email,
        // The service places an officer on whole categories; the type picks only narrow what the admin intended.
        service_categories: coverage.map((entry) => entry.category),
        phone: user.phone || null,
        designation: designation || null,
        region: location.area?.id ?? null,
        // A new officer always starts Active; an admin changes it later from Edit.
        status: 'Active' satisfies OfficerBackendStatus,
        reports_to: supervisorLevel && supervisorOptions.some((option) => option.value === reportsTo) ? reportsTo : null,
      });
      onCreated();
      resetForm();
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: FormField) =>
    errors[field] ? <FieldError id={errorIdFor(FIELD_IDS[field])}>{errors[field]}</FieldError> : null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-nodal-officer-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 id="add-nodal-officer-title" className="text-xl font-bold text-gray-900">{t('addTitle', { tab: tabLabel })}</h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110">
            <X size={20} />
          </button>
        </div>

        {/* noValidate: the browser's own bubbles would pre-empt the inline messages below. */}
        <form className="contents" onSubmit={(e) => { e.preventDefault(); void handleAdd(); }} noValidate>
          <div className="p-8 overflow-visible flex flex-col gap-6">
            {formError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor={FIELD_IDS.user} className="text-sm font-bold text-gray-900">
                {t('findUser')} <RequiredMark />
              </label>
              <UserSearchField
                id={FIELD_IDS.user}
                role={role}
                selected={user}
                onSelect={pickUser}
                invalid={!!errors.user}
                describedBy={errors.user ? errorIdFor(FIELD_IDS.user) : undefined}
              />
              {fieldError('user')}
            </div>

            {user && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {!isReviewer && (
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label htmlFor="add-officer-designation" className="text-sm font-bold text-gray-900">
                        {t('designation')}
                      </label>
                      <AnimatedSelect
                        id="add-officer-designation"
                        options={designations}
                        value={designation}
                        onChange={setDesignation}
                        placeholder={designations.length > 0 ? t('designationPlaceholder') : t('noDesignations')}
                      />
                    </div>
                  )}

                  {needsLocation && areaLevel && (
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label htmlFor={FIELD_IDS.location} className="text-sm font-bold text-gray-900">
                        {t(`area${areaLevel}`)} <RequiredMark />
                      </label>
                      <AreaSelect
                        id={FIELD_IDS.location}
                        level={areaLevel}
                        onChange={changeLocation}
                        invalid={!!errors.location}
                        describedBy={errors.location ? errorIdFor(FIELD_IDS.location) : undefined}
                      />
                      {fieldError('location')}
                    </div>
                  )}
                </div>

                <div
                  id={FIELD_IDS.serviceCategories}
                  role="group"
                  tabIndex={-1}
                  aria-labelledby={`${FIELD_IDS.serviceCategories}-label`}
                  aria-describedby={errors.serviceCategories ? errorIdFor(FIELD_IDS.serviceCategories) : undefined}
                  className="flex flex-col gap-2"
                >
                  <span id={`${FIELD_IDS.serviceCategories}-label`} className="text-sm font-bold text-gray-900">
                    {t('serviceCategories')} <RequiredMark />
                  </span>
                  <CategoryCoverageField
                    idPrefix="add-officer"
                    coverage={coverage}
                    onChange={changeCoverage}
                    categories={categoryList}
                    isCategoriesLoading={isCategoriesLoading}
                    onPendingChange={setHasPendingCategory}
                  />
                  {fieldError('serviceCategories')}
                </div>

                {supervisorLevel && (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="add-officer-reports-to" className="text-sm font-bold text-gray-900">
                      {t('reportsTo', { supervisor: supervisorLabel ?? '' })}
                    </label>
                    <AnimatedSelect
                      id="add-officer-reports-to"
                      options={supervisorOptions}
                      value={supervisorOptions.some((option) => option.value === reportsTo) ? reportsTo : ''}
                      onChange={setReportsTo}
                      placeholder={
                        !location.area
                          ? t('reportsToWaiting')
                          : coverage.length === 0
                            ? t('reportsToNeedsCategories')
                            : t('reportsToPlaceholder')
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Save size={18} />
              {isSubmitting ? t('adding') : t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
