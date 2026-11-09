'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PhoneField } from '@/components/ui/PhoneField';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { fetchGrievanceOptionsThunk, selectCategoryFilterOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatToE164 } from '@/lib/validation/phone';
import {
  validateEmail,
  validateFullName,
  validateOptionalLocalPhone,
} from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors } from '@/lib/validation/useFieldErrors';
import { AnimatedSelect } from './AnimatedSelect';
import { createOfficer, fetchOfficerCandidates } from '../api/officerApi';
import { OFFICER_STATUS_OPTIONS, REVIEWER_STATUS_OPTIONS } from '../data/officers';
import { useL2OfficerOptions } from '../hooks/useL2OfficerOptions';
import type { OfficerBackendStatus, OfficerCandidate, OfficerLevel, OfficerRole } from '../types';

type FormField = 'fullName' | 'email' | 'phoneNumber' | 'serviceCategories';

const FIELD_IDS: Record<FormField, string> = {
  fullName: 'add-officer-full-name',
  email: 'add-officer-email',
  phoneNumber: 'add-officer-phone',
  serviceCategories: 'add-officer-categories',
};

const FIELD_ORDER: Array<{ key: FormField; id: string }> = (Object.keys(FIELD_IDS) as FormField[]).map((key) => ({
  key,
  id: FIELD_IDS[key],
}));

interface AddNodalOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: OfficerRole;
  /** Required when `role` is `'Officer'`; ignored (and never sent) for a Reviewer. */
  level?: OfficerLevel;
  tabLabel: string;
  onCreated: () => void;
}

/**
 * Creates an officer, department head, or Reviewer via the real `POST /api/v1/officers`
 * endpoint (see `officerApi.ts`). A Reviewer needs no designation, level, or supervisor —
 * see `CreateOfficerPayload`'s own doc comment (STG-443) for exactly which fields each role
 * requires or rejects. The backend takes no password: `email` must already belong to a login
 * (identity provider or onboarding), otherwise it answers 404.
 */
export function AddNodalOfficerModal({ isOpen, onClose, role, level, tabLabel, onCreated }: AddNodalOfficerModalProps) {
  const isReviewer = role === 'Reviewer';
  const dispatch = useAppDispatch();
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  const { areas: regionAreas } = useAreas({ level: 'Region' });
  const { options: supervisorOptions } = useL2OfficerOptions(isOpen && level === 'L1');

  useEffect(() => {
    if (grievanceOptionsStatus === 'idle') {
      void dispatch(fetchGrievanceOptionsThunk());
    }
  }, [dispatch, grievanceOptionsStatus]);

  // Logins that already hold the officer role but sit on no desk (e.g. onboarded at the identity
  // provider): picking one fills the name and email. Best-effort — without it the form still works.
  const [candidates, setCandidates] = useState<OfficerCandidate[]>([]);
  const [candidate, setCandidate] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    fetchOfficerCandidates({ role }, { signal: controller.signal })
      .then((data) => setCandidates(data.candidates ?? []))
      .catch(() => setCandidates([]));
    return () => controller.abort();
  }, [isOpen, role]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+251');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const allCategoryOptions = useAppSelector(selectCategoryFilterOptions);
  const isCategoriesLoading = grievanceOptionsStatus === 'loading';
  const categoryList = allCategoryOptions;
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState<string>('Active');
  const [reportsTo, setReportsTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { errors: fieldErrors, setError, setAll } = useFieldErrors<FormField>();

  const validateField = (field: FormField): string | null => {
    switch (field) {
      case 'fullName':
        return validateFullName(fullName);
      case 'email':
        return validateEmail(email);
      case 'phoneNumber':
        return validateOptionalLocalPhone(phoneNumber, countryCode);
      case 'serviceCategories':
        return serviceCategories.length > 0 ? null : 'Select at least one service category.';
    }
  };

  const pickCandidate = (name: string) => {
    setCandidate(name);
    const picked = candidates.find((c) => c.name === name);
    if (!picked) return;
    setFullName(picked.full_name);
    setEmail(picked.email);
    setAll({});
  };

  const resetForm = () => {
    setCandidate('');
    setFullName('');
    setEmail('');
    setCountryCode('+251');
    setPhoneNumber('');
    setServiceCategories([]);
    setRegion('');
    setStatus('Active');
    setReportsTo('');
    setFormError(null);
    setAll({});
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, handleClose);

  if (!isOpen) return null;

  const toggleCategory = (value: string) => {
    setServiceCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
    setError('serviceCategories', null);
  };

  const handleAdd = async () => {
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
      await createOfficer({
        role,
        full_name: fullName,
        designation: null,
        level: isReviewer ? null : level,
        department: null,
        email,
        service_categories: serviceCategories,
        phone: phoneNumber ? formatToE164(phoneNumber, countryCode) : null,
        region: region || null,
        status: status as OfficerBackendStatus,
        reports_to: level === 'L1' && reportsTo ? reportsTo : null,
      });
      onCreated();
      resetForm();
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create officer. Please try again.');
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
        aria-labelledby="add-nodal-officer-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 id="add-nodal-officer-title" className="text-xl font-bold text-gray-900">Add {tabLabel}</h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110">
            <X size={20} />
          </button>
        </div>

        {/* noValidate: the browser's own required/email bubbles would pre-empt the inline messages below. */}
        <form className="contents" onSubmit={(e) => { e.preventDefault(); void handleAdd(); }} noValidate>
          <div className="p-8 overflow-visible flex flex-col gap-6">
            {formError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
            )}

            <fieldset className="contents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {candidates.length > 0 && (
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="add-officer-candidate" className="text-sm font-bold text-gray-900">
                    Existing account
                  </label>
                  <AnimatedSelect
                    id="add-officer-candidate"
                    options={candidates.map((c) => ({ value: c.name, label: `${c.full_name} (${c.email})` }))}
                    value={candidate}
                    onChange={pickCandidate}
                    placeholder="Pick an account that already has the role, or fill the form below"
                  />
                </div>
              )}
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
                <label htmlFor={FIELD_IDS.email} className="text-sm font-bold text-gray-900">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('email')}
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email ID"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('email')}
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
                <AnimatedSelect
                  options={isReviewer ? REVIEWER_STATUS_OPTIONS : OFFICER_STATUS_OPTIONS}
                  value={status}
                  onChange={setStatus}
                  placeholder="Select Status"
                />
              </div>

              {level === 'L1' && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-900">Reports To (L2 officer)</label>
                  <AnimatedSelect
                    options={supervisorOptions}
                    value={reportsTo}
                    onChange={setReportsTo}
                    placeholder="Optional"
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
                {isCategoriesLoading ? (
                  <span className="text-sm text-gray-400">Loading categories…</span>
                ) : categoryList.length === 0 ? (
                  <span className="text-sm text-gray-400">
                    No service categories available. Create a category first.
                  </span>
                ) : (
                  categoryList.map((option) => (
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
            </fieldset>
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            <>
                <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60"
                >
                  <Save size={18} />
                  {isSubmitting ? 'Adding…' : 'Add'}
                </button>
              </>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
