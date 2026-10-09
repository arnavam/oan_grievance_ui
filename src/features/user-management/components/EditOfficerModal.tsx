'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PhoneField } from '@/components/ui/PhoneField';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { fetchGrievanceOptionsThunk, selectDepartmentOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatToE164, splitPhoneNumber } from '@/lib/validation/phone';
import { validateEmail, validateFullName, validateOptionalLocalPhone, validateRequired } from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors } from '@/lib/validation/useFieldErrors';
import { AnimatedSelect } from './AnimatedSelect';
import { useWiredCategoryOptions } from '../hooks/useWiredCategoryOptions';
import type { Officer, OfficerStatus } from '../data/officers';

interface EditOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: Officer | null;
  onSave: (officer: Officer) => void;
}

const STATUS_OPTIONS: OfficerStatus[] = ['Active', 'On Leave', 'Inactive'];

type FormField = 'name' | 'email' | 'phoneNumber' | 'roleTitle' | 'department' | 'serviceCategories';

const FIELD_IDS: Record<FormField, string> = {
  name: 'edit-admin-full-name',
  email: 'edit-admin-email',
  phoneNumber: 'edit-admin-phone',
  roleTitle: 'edit-admin-role-title',
  department: 'edit-admin-department',
  serviceCategories: 'edit-admin-categories',
};

const FIELD_ORDER: Array<{ key: FormField; id: string }> = (Object.keys(FIELD_IDS) as FormField[]).map((key) => ({
  key,
  id: FIELD_IDS[key],
}));

/**
 * Caller remounts this on `officer` change (`key={officer?.id ?? 'closed'}`),
 * so the form only ever needs to seed from `officer` once, at mount.
 */
export function EditOfficerModal({ isOpen, onClose, officer, onSave }: EditOfficerModalProps) {
  const dispatch = useAppDispatch();
  const departmentOptions = useAppSelector(selectDepartmentOptions);
  const { areas: regionAreas } = useAreas({ level: 'Region' });
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  useEffect(() => {
    if (grievanceOptionsStatus === 'idle') {
      void dispatch(fetchGrievanceOptionsThunk());
    }
  }, [dispatch, grievanceOptionsStatus]);

  const initialPhone = officer && officer.phone !== '-' ? splitPhoneNumber(officer.phone) : { phoneCode: '+251', phoneNumber: '' };

  const [name, setName] = useState(officer?.name ?? '');
  const [roleTitle, setRoleTitle] = useState(officer?.roleTitle ?? '');
  const [department, setDepartment] = useState(officer?.department ?? '');
  const [serviceCategories, setServiceCategories] = useState<string[]>(officer?.tags ?? []);
  const { options: categoryOptions, isLoading: isCategoryOptionsLoading } = useWiredCategoryOptions(department);
  const [email, setEmail] = useState(officer?.email ?? '');
  const [countryCode, setCountryCode] = useState(initialPhone.phoneCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.phoneNumber);
  const [region, setRegion] = useState(officer?.region ?? '');
  const [status, setStatus] = useState<string>(officer?.status ?? 'Active');
  const { errors: fieldErrors, setError, setAll } = useFieldErrors<FormField>();
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);

  if (!isOpen || !officer) return null;

  const validateField = (field: FormField): string | null => {
    switch (field) {
      case 'name':
        return validateFullName(name);
      case 'email':
        return email.trim() ? validateEmail(email) : null;
      case 'phoneNumber':
        return validateOptionalLocalPhone(phoneNumber, countryCode);
      case 'roleTitle':
        return validateRequired(roleTitle, 'Enter a role title.');
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

  const handleSave = () => {
    const errors = Object.fromEntries(
      FIELD_ORDER.map(({ key }) => [key, validateField(key)]).filter(([, message]) => message)
    );
    if (Object.keys(errors).length > 0) {
      setAll(errors);
      focusFirstError(FIELD_ORDER, errors);
      return;
    }

    onSave({
      ...officer,
      name,
      roleTitle,
      department,
      email,
      phone: phoneNumber ? formatToE164(phoneNumber, countryCode) : '-',
      region,
      tags: serviceCategories,
      status: status as OfficerStatus,
      avatarInitials:
        name
          .split(' ')
          .map((part) => part[0])
          .filter(Boolean)
          .join('')
          .toUpperCase()
          .slice(0, 2) || officer.avatarInitials,
    });
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
        aria-labelledby="edit-officer-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 id="edit-officer-title" className="text-xl font-bold text-gray-900">Edit Officer</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110">
            <X size={20} />
          </button>
        </div>

        {/* noValidate: the browser's own required/email bubbles would pre-empt the inline messages below. */}
        <form className="contents" onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
          <div className="p-8 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.name} className="text-sm font-bold text-gray-900">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('name')}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Full Name"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('name')}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.email} className="text-sm font-bold text-gray-900">
                  Email ID
                </label>
                <input
                  {...a11y('email')}
                  type="email"
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
                  options={regionAreas.map((area) => area.area_name)}
                  value={region}
                  onChange={setRegion}
                  placeholder="Select Region"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.roleTitle} className="text-sm font-bold text-gray-900">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('roleTitle')}
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Enter Role Title"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('roleTitle')}
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
                <label className="text-sm font-bold text-gray-900">
                  Status <span className="text-red-500">*</span>
                </label>
                <AnimatedSelect options={STATUS_OPTIONS} value={status} onChange={setStatus} placeholder="Select Status" />
              </div>
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
            </div>
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
