'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, KeyRound, RefreshCw, Save, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { useCopyFeedback } from '@/components/ui/useCopyFeedback';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { useModalA11y } from '@/components/ui/useModalA11y';
import type { AreaLevel } from '@/features/metadata';
import { useTranslations } from 'next-intl';
import { generateRandomPassword } from '@/lib/validation/password';
import { validateTemporaryPassword } from '@/lib/validation/fieldRules';
import { AnimatedSelect } from './AnimatedSelect';
import { AreaSelect, type AreaChoice } from './AreaSelect';
import { CategoryCoverageField, type CategoryCoverage } from './CategoryCoverageField';
import { resetTemporaryPassword, updateOfficer } from '../api/officerApi';
import { OFFICER_STATUS_OPTIONS, REVIEWER_STATUS_OPTIONS, type Officer } from '../data/officers';
import { useDesignations } from '../hooks/useDesignations';
import { useL2OfficerOptions } from '../hooks/useL2OfficerOptions';
import { useServiceCategoryOptions } from '../hooks/useServiceCategoryOptions';
import type { OfficerBackendStatus, OfficerLevel, OfficerRole } from '../types';

const CATEGORIES_ID = 'edit-officer-categories';

interface EditNodalOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: Officer | null;
  role: OfficerRole;
  /** Required when `role` is `'Officer'`; ignored for a Reviewer. */
  level?: OfficerLevel;
  /** On the first rung only: the rung whose officers this one can report to. Shows the "Reports To" field. */
  supervisorLevel?: OfficerLevel;
  supervisorLabel?: string;
  /** The deepest area this rung is placed at (Kebele for the first rung); none for a Reviewer. */
  areaLevel?: AreaLevel;
  tabLabel?: string;
  onSaved: () => void;
}

/**
 * Updates an officer, department head, or Reviewer via the real `PATCH /api/v1/officers/:officer`
 * endpoint (see `officerApi.ts`). Seeds `reportsTo` from the officer's existing supervisor so
 * an L1's current L2 shows pre-selected rather than blank; leaving the field untouched on
 * save omits `reports_to` from the PATCH body, so the existing supervisor is left alone
 * either way — this only changes what the admin sees, not the save behavior.
 *
 * Caller remounts this on `officer` change (`key={officer?.id ?? 'closed'}`), so the form
 * only needs to seed from `officer` once, at mount.
 */
export function EditNodalOfficerModal({ isOpen, onClose, officer, role, level, supervisorLevel, supervisorLabel, areaLevel, tabLabel, onSaved }: EditNodalOfficerModalProps) {
  const t = useTranslations('userManagement.add');
  const isReviewer = role === 'Reviewer';
  // Where the officer sits now, until a different area is picked; the supervisors then narrow to that area's parent.
  const [location, setLocation] = useState<AreaChoice | null>(null);
  // The officer's categories as they stand; their grievance types are not kept by the service, so each covers all of its types.
  const [coverage, setCoverage] = useState<CategoryCoverage[]>(() => (officer?.tags ?? []).map((category) => ({ category, types: [] })));
  const [hasPendingCategory, setHasPendingCategory] = useState(false);
  const { options: supervisorOptions } = useL2OfficerOptions(
    isOpen && !!supervisorLevel,
    supervisorLevel,
    location?.parentPath ?? undefined,
    true,
    coverage.map((entry) => entry.category)
  );
  const { designations } = useDesignations(isOpen && !isReviewer, level);

  const [designation, setDesignation] = useState(officer?.designation ?? '');
  // Every category there is, whether or not it has a desk yet.
  const { options: categoryList, isLoading: isCategoriesLoading } = useServiceCategoryOptions(undefined);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(officer?.status ?? 'Active');
  // Only a supervisor the admin picks here is sent; the current one is otherwise left as it is.
  const [reportsTo, setReportsTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isIssuingPassword, setIsIssuingPassword] = useState(false);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [tempPasswordError, setTempPasswordError] = useState<string | null>(null);
  const { isCopied: isPasswordCopied, copy: copyNewPassword } = useCopyFeedback();
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordIssuedMessage, setPasswordIssuedMessage] = useState<string | null>(null);

  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, () => {
    if (!isSubmitting) onClose();
  });

  if (!isOpen || !officer) return null;

  const changeCoverage = (next: CategoryCoverage[]) => {
    setCoverage(next);
    if (next.length > 0) setCategoriesError(null);
  };

  const openIssuePassword = () => {
    setNewTempPassword(generateRandomPassword());
    setTempPasswordError(null);
    setPasswordIssuedMessage(null);
    setIsIssuingPassword(true);
  };

  const handleIssuePassword = async () => {
    const message = validateTemporaryPassword(newTempPassword);
    if (message) {
      setTempPasswordError(message);
      return;
    }

    setIsSubmittingPassword(true);
    setTempPasswordError(null);
    try {
      await resetTemporaryPassword(officer.id, { temporary_password: newTempPassword });
      setPasswordIssuedMessage(t('passwordIssued'));
      onSaved();
    } catch (err) {
      setTempPasswordError(err instanceof ApiError ? err.message : t('passwordIssueFailed'));
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleSave = async () => {
    if (coverage.length === 0 || hasPendingCategory) {
      setCategoriesError(hasPendingCategory ? t('categoryNotAdded') : t('categoriesRequired'));
      document.getElementById(CATEGORIES_ID)?.focus();
      return;
    }

    const supervisorChosen = !!supervisorLevel && !!reportsTo;
    if (supervisorChosen && !supervisorOptions.some((option) => option.value === reportsTo)) {
      // Picked, then the area or categories changed (or the list is still loading): do not drop it silently.
      setFormError(t('supervisorUnavailable'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await updateOfficer(officer.id, {
        // The account's name, email and phone belong to the account, so they are not sent from here.
        ...(designation && designation !== (officer.designation ?? '') ? { designation } : {}),
        ...(location?.area ? { region: location.area.id } : {}),
        status: status as OfficerBackendStatus,
        // The service places an officer on whole categories; the type picks only narrow what the admin intended.
        service_categories: coverage.map((entry) => entry.category),
        ...(supervisorChosen ? { reports_to: reportsTo } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-nodal-officer-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 id="edit-nodal-officer-title" className="text-xl font-bold text-gray-900">{t('editTitle', { tab: tabLabel ?? t('officerFallback') })}</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* noValidate: the browser's own required/email bubbles would pre-empt the inline messages below. */}
        <form className="contents" onSubmit={(e) => { e.preventDefault(); void handleSave(); }} noValidate>
          <div className="p-8 overflow-visible flex flex-col gap-6">
            {formError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col gap-1 md:col-span-2 border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5">
                <p className="text-sm font-semibold text-gray-900">{officer.name}</p>
                <p className="text-xs text-gray-500">
                  {officer.email}
                  {officer.phone && officer.phone !== '-' ? ` · ${officer.phone}` : ''}
                </p>
              </div>

              {!isReviewer && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-officer-designation" className="text-sm font-bold text-gray-900">
                    {t('designation')}
                  </label>
                  <AnimatedSelect
                    id="edit-officer-designation"
                    options={designation && !designations.includes(designation) ? [designation, ...designations] : designations}
                    value={designation}
                    onChange={setDesignation}
                    placeholder={designations.length > 0 ? t('designationPlaceholder') : t('noDesignations')}
                  />
                </div>
              )}

              {!isReviewer && areaLevel && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-officer-location" className="text-sm font-bold text-gray-900">
                    {t(`area${areaLevel}`)}
                  </label>
                  <AreaSelect
                    id="edit-officer-location"
                    level={areaLevel}
                    initial={officer.regionId ? { id: officer.regionId, name: officer.region, pathCode: '' } : null}
                    onChange={setLocation}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">
                  {t('statusLabel')} <RequiredMark />
                </label>
                <AnimatedSelect
                  options={isReviewer ? REVIEWER_STATUS_OPTIONS : OFFICER_STATUS_OPTIONS}
                  value={status}
                  onChange={setStatus}
                  placeholder={t('statusPlaceholder')}
                />
              </div>

              {supervisorLevel && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-officer-reports-to" className="text-sm font-bold text-gray-900">{t('reportsTo', { supervisor: supervisorLabel ?? '' })}</label>
                  <AnimatedSelect
                    id="edit-officer-reports-to"
                    options={supervisorOptions}
                    value={supervisorOptions.some((option) => option.value === reportsTo) ? reportsTo : ''}
                    onChange={setReportsTo}
                    placeholder={
                      !location?.area
                        ? t('reportsToKeep', { current: officer.reportsToName || officer.reportsTo || '' })
                        : coverage.length === 0
                          ? t('reportsToNeedsCategories')
                          : t('reportsToPlaceholder')
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span id={`${CATEGORIES_ID}-label`} className="text-sm font-bold text-gray-900">
                {t('serviceCategories')} <RequiredMark />
              </span>
              <div
                id={CATEGORIES_ID}
                role="group"
                tabIndex={-1}
                aria-labelledby={`${CATEGORIES_ID}-label`}
                aria-describedby={categoriesError ? errorIdFor(CATEGORIES_ID) : undefined}
                className="flex flex-col gap-2"
              >
              <CategoryCoverageField
                idPrefix="edit-officer"
                coverage={coverage}
                onChange={changeCoverage}
                categories={categoryList}
                isCategoriesLoading={isCategoriesLoading}
                onPendingChange={setHasPendingCategory}
              />
              </div>
              {categoriesError && <FieldError id={errorIdFor(CATEGORIES_ID)}>{categoriesError}</FieldError>}
              {formError?.toLowerCase().includes('category assignment') && (
                <p className="text-xs text-red-600">{formError}</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-3">
              {!isIssuingPassword ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{t('signIn')}</span>
                    <span className="text-xs text-gray-500">
                      {officer.mustChangePassword
                        ? t('awaitingFirstSignInNote')
                        : t('ownPasswordSet')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openIssuePassword}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-white transition-colors"
                  >
                    <KeyRound size={14} />
                    {t('issueNewPassword')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-900">{t('newTempPasswordLabel')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTempPassword}
                      onChange={(e) => {
                        setNewTempPassword(e.target.value);
                        setTempPasswordError(null);
                      }}
                      aria-invalid={tempPasswordError ? true : undefined}
                      placeholder={t('tempPasswordPlaceholder')}
                      className={`flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-700 placeholder:text-gray-400 transition-colors bg-white ${INVALID_INPUT_STYLES}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewTempPassword(generateRandomPassword());
                        setTempPasswordError(null);
                      }}
                      aria-label={t('generatePassword')}
                      className="p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyNewPassword(newTempPassword)}
                      aria-label={t('copyPassword')}
                      className="p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
                    >
                      {isPasswordCopied ? <Check size={16} className="text-[#16A34A]" /> : <Copy size={16} />}
                    </button>
                  </div>
                  {tempPasswordError && <p className="text-xs text-red-600">{tempPasswordError}</p>}
                  {passwordIssuedMessage && <p className="text-xs text-[#16A34A] font-medium">{passwordIssuedMessage}</p>}
                  <p className="text-xs text-gray-400">
                    {t('passwordNote')}
                  </p>
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setIsIssuingPassword(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                    >
                      {passwordIssuedMessage ? t('close') : t('cancel')}
                    </button>
                    {!passwordIssuedMessage && (
                      <button
                        type="button"
                        onClick={() => void handleIssuePassword()}
                        disabled={isSubmittingPassword}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803d] rounded-lg transition-colors disabled:opacity-60"
                      >
                        {isSubmittingPassword ? t('issuing') : t('issuePassword')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Save size={18} />
              {isSubmitting ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
