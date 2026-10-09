'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, RefreshCw, Save, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PhoneField } from '@/components/ui/PhoneField';
import { useCopyFeedback } from '@/components/ui/useCopyFeedback';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { fetchGrievanceOptionsThunk, selectDepartmentOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatToE164 } from '@/lib/validation/phone';
import { generateRandomPassword } from '@/lib/validation/password';
import {
  validateEmail,
  validateFullName,
  validateOptionalLocalPhone,
  validateRequired,
  validateTemporaryPassword,
} from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors } from '@/lib/validation/useFieldErrors';
import { AnimatedSelect } from './AnimatedSelect';
import { createOfficer } from '../api/officerApi';
import { useL2OfficerOptions } from '../hooks/useL2OfficerOptions';
import { useWiredCategoryOptions } from '../hooks/useWiredCategoryOptions';
import type { OfficerBackendStatus, OfficerLevel } from '../types';

const STATUS_OPTIONS: OfficerBackendStatus[] = ['Active', 'On Leave', 'Inactive'];

type FormField = 'fullName' | 'email' | 'phoneNumber' | 'password' | 'designation' | 'department' | 'serviceCategories';

const FIELD_IDS: Record<FormField, string> = {
  fullName: 'add-officer-full-name',
  email: 'add-officer-email',
  phoneNumber: 'add-officer-phone',
  password: 'add-officer-password',
  designation: 'add-officer-designation',
  department: 'add-officer-department',
  serviceCategories: 'add-officer-categories',
};

const FIELD_ORDER: Array<{ key: FormField; id: string }> = (Object.keys(FIELD_IDS) as FormField[]).map((key) => ({
  key,
  id: FIELD_IDS[key],
}));

interface AddNodalOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: OfficerLevel;
  tabLabel: string;
  onCreated: () => void;
}

/**
 * Creates an officer via the real `POST /api/v1/officers` endpoint (see `officerApi.ts`).
 * `temporary_password` is required by the backend: the officer can't sign in with it directly
 * (login answers 403 `PASSWORD_CHANGE_REQUIRED`) — they replace it via
 * `POST /api/v1/auth/password/initial` first. If `email` already belongs to a login, that
 * login's existing password is left alone instead — the response `message` says so, and this
 * form holds the success screen open on that specific message rather than auto-closing, so
 * the admin doesn't hand the officer a password that silently won't work.
 */
export function AddNodalOfficerModal({ isOpen, onClose, level, tabLabel, onCreated }: AddNodalOfficerModalProps) {
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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+251');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState(() => generateRandomPassword());
  const { isCopied: isPasswordCopied, copy: copyPassword, reset: resetPasswordCopied } = useCopyFeedback();
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const { options: categoryOptions, isLoading: isCategoryOptionsLoading } = useWiredCategoryOptions(department);
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState<string>('Active');
  const [reportsTo, setReportsTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordUnusedWarning, setPasswordUnusedWarning] = useState<string | null>(null);
  const { errors: fieldErrors, setError, setAll } = useFieldErrors<FormField>();

  const validateField = (field: FormField): string | null => {
    switch (field) {
      case 'fullName':
        return validateFullName(fullName);
      case 'email':
        return validateEmail(email);
      case 'phoneNumber':
        return validateOptionalLocalPhone(phoneNumber, countryCode);
      case 'password':
        return validateTemporaryPassword(password);
      case 'designation':
        return validateRequired(designation, 'Enter a designation.');
      case 'department':
        return validateRequired(department, 'Select a department.');
      case 'serviceCategories':
        return serviceCategories.length > 0 ? null : 'Select at least one service category.';
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setCountryCode('+251');
    setPhoneNumber('');
    setPassword(generateRandomPassword());
    resetPasswordCopied();
    setDesignation('');
    setDepartment('');
    setServiceCategories([]);
    setRegion('');
    setStatus('Active');
    setReportsTo('');
    setFormError(null);
    setPasswordUnusedWarning(null);
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
      const result = await createOfficer({
        full_name: fullName,
        designation,
        level,
        department,
        email,
        service_categories: serviceCategories,
        temporary_password: password,
        phone: phoneNumber ? formatToE164(phoneNumber, countryCode) : null,
        region: region || null,
        status: status as OfficerBackendStatus,
        reports_to: level === 'L1' && reportsTo ? reportsTo : null,
      });
      onCreated();
      // The officer was still created successfully — only the temporary password above
      // wasn't applied, because `email` already had a login. Hold the modal open on that
      // warning instead of closing, so the admin doesn't go hand it to the officer.
      if (result.message?.includes('existing password is unchanged')) {
        setPasswordUnusedWarning(result.message);
      } else {
        resetForm();
        onClose();
      }
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
            {passwordUnusedWarning && (
              <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <p className="font-semibold">Officer created — but don&apos;t share the temporary password above.</p>
                <p className="mt-1">{passwordUnusedWarning}</p>
              </div>
            )}

            <fieldset disabled={!!passwordUnusedWarning} className="contents">
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
                <label htmlFor={FIELD_IDS.password} className="text-sm font-bold text-gray-900">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    {...a11y('password')}
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters, a letter and a number"
                    className={`flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPassword(generateRandomPassword());
                      setError('password', null);
                    }}
                    aria-label="Generate a new password"
                    className="p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyPassword(password)}
                    aria-label="Copy password"
                    className="p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    {isPasswordCopied ? <Check size={16} className="text-[#16A34A]" /> : <Copy size={16} />}
                  </button>
                </div>
                {fieldError('password') ?? (
                  <p className="text-xs text-gray-400">
                    Tell the officer this directly (in person or by phone) — it isn&apos;t emailed. They&apos;ll be required to replace it before they can sign in.
                  </p>
                )}
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
                  placeholder="e.g. Inputs Quality Grievance Officer"
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
            </fieldset>
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            {passwordUnusedWarning ? (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              >
                Done
              </button>
            ) : (
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
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
