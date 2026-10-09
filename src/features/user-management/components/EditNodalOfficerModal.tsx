'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, KeyRound, RefreshCw, Save, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PhoneField } from '@/components/ui/PhoneField';
import { useCopyFeedback } from '@/components/ui/useCopyFeedback';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { fetchGrievanceOptionsThunk, selectDepartmentOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatToE164, splitPhoneNumber } from '@/lib/validation/phone';
import { generateRandomPassword } from '@/lib/validation/password';
import { validateFullName, validateOptionalLocalPhone, validateRequired, validateTemporaryPassword } from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors } from '@/lib/validation/useFieldErrors';
import { AnimatedSelect } from './AnimatedSelect';
import { resetTemporaryPassword, updateOfficer } from '../api/officerApi';
import type { Officer } from '../data/officers';
import { useL2OfficerOptions } from '../hooks/useL2OfficerOptions';
import { useWiredCategoryOptions } from '../hooks/useWiredCategoryOptions';
import type { OfficerBackendStatus, OfficerLevel } from '../types';

const STATUS_OPTIONS: OfficerBackendStatus[] = ['Active', 'On Leave', 'Inactive'];

type FormField = 'fullName' | 'phoneNumber' | 'designation' | 'department' | 'serviceCategories';

const FIELD_IDS: Record<FormField, string> = {
  fullName: 'edit-officer-full-name',
  phoneNumber: 'edit-officer-phone',
  designation: 'edit-officer-designation',
  department: 'edit-officer-department',
  serviceCategories: 'edit-officer-categories',
};

const FIELD_ORDER: Array<{ key: FormField; id: string }> = (Object.keys(FIELD_IDS) as FormField[]).map((key) => ({
  key,
  id: FIELD_IDS[key],
}));

interface EditNodalOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: Officer | null;
  level: OfficerLevel;
  onSaved: () => void;
}

/**
 * Updates an officer via the real `PATCH /api/v1/officers/:officer` endpoint (see
 * `officerApi.ts`). Seeds `reportsTo` from the officer's existing supervisor so an L1's
 * current L2 shows pre-selected rather than blank; leaving the field untouched on save
 * omits `reports_to` from the PATCH body, so the existing supervisor is left alone either
 * way — this only changes what the admin sees, not the save behavior.
 *
 * Caller remounts this on `officer` change (`key={officer?.id ?? 'closed'}`), so the form
 * only needs to seed from `officer` once, at mount — same convention as `EditOfficerModal`.
 */
export function EditNodalOfficerModal({ isOpen, onClose, officer, level, onSaved }: EditNodalOfficerModalProps) {
  const dispatch = useAppDispatch();
  const departmentOptions = useAppSelector(selectDepartmentOptions);
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  const { areas: regionAreas } = useAreas({ level: 'Region' });
  const { options: supervisorOptions } = useL2OfficerOptions(isOpen && level === 'L1');

  useEffect(() => {
    if (grievanceOptionsStatus === 'idle') {
      void dispatch(fetchGrievanceOptionsThunk());
    }
  }, [dispatch, grievanceOptionsStatus]);

  const initialPhone = officer && officer.phone !== '-' ? splitPhoneNumber(officer.phone) : { phoneCode: '+251', phoneNumber: '' };

  const [fullName, setFullName] = useState(officer?.name ?? '');
  const [countryCode, setCountryCode] = useState(initialPhone.phoneCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.phoneNumber);
  const [designation, setDesignation] = useState(officer?.roleTitle ?? '');
  const [department, setDepartment] = useState(officer?.department ?? '');
  const [serviceCategories, setServiceCategories] = useState<string[]>(officer?.tags ?? []);
  const { options: categoryOptions, isLoading: isCategoryOptionsLoading } = useWiredCategoryOptions(department);
  // Seeded directly from the officer's own area id (not by re-matching `officer.region`'s
  // display label against the loaded area list) — that match used to fail silently whenever
  // the backend had no region_name to show, leaving `region` blank and wiping the officer's
  // real region on save. Safe to read synchronously: the caller remounts this component on
  // `officer` change (see this file's own doc comment), so there's no stale-officer risk.
  const [region, setRegion] = useState(officer?.regionId ?? '');
  const [status, setStatus] = useState<string>(officer?.status ?? 'Active');
  const [reportsTo, setReportsTo] = useState(officer?.reportsTo ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { errors: fieldErrors, setError, setAll } = useFieldErrors<FormField>();

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

  const validateField = (field: FormField): string | null => {
    switch (field) {
      case 'fullName':
        return validateFullName(fullName);
      case 'phoneNumber':
        return validateOptionalLocalPhone(phoneNumber, countryCode);
      case 'designation':
        return validateRequired(designation, 'Enter a designation.');
      case 'department':
        return validateRequired(department, 'Select a department.');
      case 'serviceCategories':
        return serviceCategories.length > 0 ? null : 'Select at least one service category.';
    }
  };

  const toggleCategory = (value: string) => {
    setServiceCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
    setError('serviceCategories', null);
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
      setPasswordIssuedMessage('New temporary password issued. The officer must set their own before signing in.');
      onSaved();
    } catch (err) {
      setTempPasswordError(err instanceof ApiError ? err.message : 'Failed to issue a new temporary password. Please try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleSave = async () => {
    const errors = Object.fromEntries(
      FIELD_ORDER.map(({ key }) => [key, validateField(key)]).filter(([, message]) => message)
    );
    if (Object.keys(errors).length > 0) {
      setAll(errors);
      focusFirstError(FIELD_ORDER, errors);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await updateOfficer(officer.id, {
        full_name: fullName,
        designation,
        department,
        phone: phoneNumber ? formatToE164(phoneNumber, countryCode) : null,
        region: region || null,
        status: status as OfficerBackendStatus,
        service_categories: serviceCategories,
        ...(level === 'L1' && reportsTo ? { reports_to: reportsTo } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update officer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: FormField) => {
    const message = fieldErrors[field];
    return message ? <FieldError id={errorIdFor(FIELD_IDS[field])}>{message}</FieldError> : null;
  };
  const a11y = (field: FormField) => {
    const id = FIELD_IDS[field];
    const message = fieldErrors[field];
    return {
      id,
      'aria-invalid': message ? (true as const) : undefined,
      'aria-describedby': message ? errorIdFor(id) : undefined,
      onBlur: () => setError(field, validateField(field)),
    };
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
          <h2 id="edit-nodal-officer-title" className="text-xl font-bold text-gray-900">Edit Officer</h2>
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
              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.fullName} className="text-sm font-bold text-gray-900">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('fullName')}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter Full Name"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('fullName')}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">Email ID</label>
                <input
                  type="email"
                  value={officer.email}
                  disabled
                  className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.phoneNumber} className="text-sm font-bold text-gray-900">
                  Phone
                </label>
                <PhoneField
                  id={FIELD_IDS.phoneNumber}
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  placeholder="Enter Phone Number"
                  invalid={!!fieldErrors.phoneNumber}
                  describedBy={fieldErrors.phoneNumber ? errorIdFor(FIELD_IDS.phoneNumber) : undefined}
                  onBlur={() => setError('phoneNumber', validateField('phoneNumber'))}
                />
                {fieldError('phoneNumber')}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.designation} className="text-sm font-bold text-gray-900">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('designation')}
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Enter Designation"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('designation')}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.department} className="text-sm font-bold text-gray-900">
                  Department <span className="text-red-500">*</span>
                </label>
                <AnimatedSelect
                  options={departmentOptions.map((o) => o.label)}
                  value={department}
                  onChange={(value) => {
                    setDepartment(value);
                    setError('department', null);
                    // The wired category list is department-specific — a category picked
                    // for the old department may not even have a desk under the new one.
                    setServiceCategories([]);
                    setError('serviceCategories', null);
                  }}
                  placeholder="Select Department"
                />
                {fieldError('department')}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">Region</label>
                <AnimatedSelect
                  options={regionAreas.map((area) => ({ value: area.area_id, label: area.area_name }))}
                  value={region}
                  onChange={setRegion}
                  placeholder="Select Region"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">
                  Status <span className="text-red-500">*</span>
                </label>
                <AnimatedSelect options={STATUS_OPTIONS} value={status} onChange={setStatus} placeholder="Select Status" />
              </div>

              {level === 'L1' && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-900">Reports To (L2 officer)</label>
                  <AnimatedSelect
                    options={supervisorOptions}
                    value={reportsTo}
                    onChange={setReportsTo}
                    placeholder="Leave blank to keep current"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label id={`${FIELD_IDS.serviceCategories}-label`} className="text-sm font-bold text-gray-900">
                Service Categories <span className="text-red-500">*</span>
              </label>
              <div
                id={FIELD_IDS.serviceCategories}
                role="group"
                aria-labelledby={`${FIELD_IDS.serviceCategories}-label`}
                aria-describedby={fieldErrors.serviceCategories ? errorIdFor(FIELD_IDS.serviceCategories) : undefined}
                className="flex flex-wrap gap-2"
              >
                {!department ? (
                  <span className="text-sm text-gray-400">Select a department first.</span>
                ) : isCategoryOptionsLoading ? (
                  <span className="text-sm text-gray-400">Loading categories…</span>
                ) : categoryOptions.length === 0 ? (
                  <span className="text-sm text-gray-400">No service category is routed to this department yet.</span>
                ) : (
                  categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleCategory(option.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        serviceCategories.includes(option.value)
                          ? 'bg-[#16A34A] text-white border-[#16A34A]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
              {fieldError('serviceCategories')}
              {formError?.toLowerCase().includes('category assignment') && (
                <p className="text-xs text-red-600">{formError}</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-3">
              {!isIssuingPassword ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Sign-in</span>
                    <span className="text-xs text-gray-500">
                      {officer.mustChangePassword
                        ? 'Awaiting first sign-in — the officer still holds a temporary password.'
                        : 'Officer has set their own password.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openIssuePassword}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-white transition-colors"
                  >
                    <KeyRound size={14} />
                    Issue New Temporary Password
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-900">New Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTempPassword}
                      onChange={(e) => {
                        setNewTempPassword(e.target.value);
                        setTempPasswordError(null);
                      }}
                      aria-invalid={tempPasswordError ? true : undefined}
                      placeholder="At least 8 characters, a letter and a number"
                      className={`flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-700 placeholder:text-gray-400 transition-colors bg-white ${INVALID_INPUT_STYLES}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewTempPassword(generateRandomPassword());
                        setTempPasswordError(null);
                      }}
                      aria-label="Generate a new password"
                      className="p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyNewPassword(newTempPassword)}
                      aria-label="Copy password"
                      className="p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
                    >
                      {isPasswordCopied ? <Check size={16} className="text-[#16A34A]" /> : <Copy size={16} />}
                    </button>
                  </div>
                  {tempPasswordError && <p className="text-xs text-red-600">{tempPasswordError}</p>}
                  {passwordIssuedMessage && <p className="text-xs text-[#16A34A] font-medium">{passwordIssuedMessage}</p>}
                  <p className="text-xs text-gray-400">
                    This ends the officer&apos;s current sessions. Tell them the new password directly — it isn&apos;t emailed.
                  </p>
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setIsIssuingPassword(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                    >
                      {passwordIssuedMessage ? 'Close' : 'Cancel'}
                    </button>
                    {!passwordIssuedMessage && (
                      <button
                        type="button"
                        onClick={() => void handleIssuePassword()}
                        disabled={isSubmittingPassword}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803d] rounded-lg transition-colors disabled:opacity-60"
                      >
                        {isSubmittingPassword ? 'Issuing…' : 'Issue Password'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Save size={18} />
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
