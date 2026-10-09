'use client';

import { registerUser } from '@/features/auth/api/authApi';
import { submitsOnBehalfOfOthers } from '@/components/submitter-identity/fields';
import { useIdentityErrors } from '@/components/submitter-identity/useIdentityErrors';
import { saveSubmitterProfile } from '@/lib/submitterProfile';
import {
  ACCOUNT_FIELDS,
  validateAccount,
  validateAccountField,
  type AccountField,
  type AccountValues,
} from '@/lib/validation/fieldRules';
import { backendSubmitterTypeFor } from '@/lib/validation/submitterType';
import { focusFirstError, useFieldErrors } from '@/lib/validation/useFieldErrors';
import { stripLeadingZero } from '@/lib/validation/phone';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ACCOUNT_FIELD_IDS, AccountStep } from './register/AccountStep';
import { ProfileStep } from './register/ProfileStep';
import { SuccessStep } from './register/SuccessStep';

// Full Name, Phone and Email are already collected on the account step above
// — the per-type identity forms below (reused as-is from Submit Grievance)
// skip these via `hiddenFields` rather than asking for them twice.
//
// Development Agent has no entry: it collects no profile fields here at all
// (see `submitsOnBehalfOfOthers`) — an agent files for other people, so the
// name/ID/phone/email fields on its form describe the farmer, not the agent.
const ALREADY_COLLECTED_FIELDS_BY_TYPE: Record<string, string[]> = {
  individual: ['fullName', 'phoneNumber', 'email'],
  cooperative: ['fullName', 'phoneNumber', 'email'],
  ngo: ['fullName', 'phoneNumber', 'email'],
  woreda_kebele: ['fullName', 'phoneNumber', 'email'],
};

type RegisterStep = 'account' | 'profile' | 'success';

/**
 * Three-step registration: account credentials, then submitter identity
 * (so Submit Grievance's own Step 1 can be pre-filled later — see
 * submitterProfile.ts), then confirmation. The account itself is created at
 * the end of the second step, not the first: the backend records the
 * submitter type only at registration, so it has to be known by then. This
 * component owns the flow's state and step transitions; each step's own form
 * markup lives in ./register/*Step.tsx.
 */
export function RegisterForm() {
  const t = useTranslations('register.profile');
  const [step, setStep] = useState<RegisterStep>('account');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+251');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // A problem with the account as a whole (e.g. the email is already
  // registered). Problems with one field go under that field instead.
  const [error, setError] = useState<string | null>(null);
  const accountErrors = useFieldErrors<AccountField>();

  const [submitterType, setSubmitterType] = useState('');
  const [identityValues, setIdentityValues] = useState<Record<string, string>>({});
  const identity = useIdentityErrors({
    submitterType,
    values: identityValues,
    hiddenFields: ALREADY_COLLECTED_FIELDS_BY_TYPE[submitterType] ?? [],
    requiredMessage: t('fieldRequired'),
  });
  // Lifted out of ProfileStep (rather than local state there) specifically
  // so switching submitter type can reset it here alongside identityValues —
  // consent given for one national-ID field (e.g. Fayda ID) must not carry
  // over silently to a different one after a mid-step type change (e.g.
  // Individual -> Cooperative swaps in representativeFaydaId).
  const [consentChecked, setConsentChecked] = useState(false);

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
    identity.clear();
    setConsentChecked(false);
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
    identity.revalidateIfShowing(key, value);
    // The phone country isn't a validated field itself, but it changes what
    // "valid" means for phoneNumber (see validateLocalPhone) — re-check a
    // phoneNumber error already showing against the newly selected country.
    if (key === 'phoneCode' && identity.errors.phoneNumber) {
      identity.validateField('phoneNumber', { ...identityValues, phoneCode: value });
    }
  };

  // --- Account step: inline validation ---------------------------------------
  const accountValues: AccountValues = { fullName, email, phoneNumber, password, confirmPassword, countryCode };

  const checkAccountField = (field: AccountField, values: AccountValues = accountValues) => {
    accountErrors.setError(field, validateAccountField(field, values));
  };

  // A field already showing an error is re-checked as it's edited, so the
  // message goes away the moment it's fixed. Changing the password also
  // re-checks a confirmation that was showing a mismatch.
  const changeAccountField = (field: AccountField, value: string, apply: (value: string) => void) => {
    apply(value);
    const next = { ...accountValues, [field]: value };
    if (accountErrors.errors[field]) checkAccountField(field, next);
    if (field === 'password' && accountErrors.errors.confirmPassword) checkAccountField('confirmPassword', next);
  };

  // The dial-code picker isn't itself a validated field, but it changes what
  // "valid" means for phoneNumber (see validateLocalPhone) — re-check a
  // phone error already showing so switching country doesn't leave a stale
  // Ethiopia-specific message under a number that's fine for the new country.
  const handleCountryCodeChange = (value: string) => {
    setCountryCode(value);
    if (accountErrors.errors.phoneNumber) {
      checkAccountField('phoneNumber', { ...accountValues, countryCode: value });
    }
  };

  // Validates only — the account is not created here. It is created once the
  // submitter type has been chosen (see `createAccount`), because the backend
  // can record that type only at registration and has no way to change it
  // afterwards.
  const handleAccountSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validateAccount(accountValues);
    accountErrors.setAll(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(
        ACCOUNT_FIELDS.map((key) => ({ key, id: ACCOUNT_FIELD_IDS[key] })),
        errors
      );
      return;
    }

    setError(null);
    setStep('profile');
  };

  // Registers the account with the type chosen on the profile step. Any
  // failure (email already taken, a rule only the backend knows) is a problem
  // with what was entered on the account step, so it returns there with the
  // message and everything typed still in place.
  const createAccount = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const backendType = backendSubmitterTypeFor(submitterType);
      await registerUser({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone_number: `${countryCode}${stripLeadingZero(phoneNumber)}`,
        ...(backendType ? { submitter_type: backendType } : {}),
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('account');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (isLoading) return;

    const hiddenFields = ALREADY_COLLECTED_FIELDS_BY_TYPE[submitterType] ?? [];
    // The type dropdown is checked with the identity fields so a missing type
    // and missing fields are all reported at once, first bad one focused.
    const typeCheck = {
      key: 'submitterType',
      id: 'register-submitter-type',
      message: submitterType ? null : 'Select a submitter type to continue.',
    };

    let profileToSave: { submitterType: string; identityValues: Record<string, string> };

    if (submitsOnBehalfOfOthers(submitterType)) {
      // Nothing to validate and nothing of the agent's own worth remembering
      // beyond their type — Submit Grievance asks for the farmer's/NGO's
      // details per grievance instead.
      identity.clear();
      profileToSave = { submitterType, identityValues: {} };
    } else {
      if (!identity.validateAll([typeCheck])) return;
      // Submit Grievance's own Step 1 isn't pre-filterable to just the "new"
      // fields the way this page is — it always shows the full per-type form.
      // Folding the account-step fields in here too (under the same keys those
      // forms already use) means that page comes back genuinely pre-filled
      // rather than just missing a few fields, since name/phone aren't
      // otherwise available after login (the JWT only carries email + roles).
      // Only for the fields this type actually treats as "the registrant's
      // own" — see ALREADY_COLLECTED_FIELDS_BY_TYPE.
      profileToSave = {
        submitterType,
        identityValues: {
          ...identityValues,
          ...(hiddenFields.includes('fullName') ? { fullName: fullName.trim() } : {}),
          ...(hiddenFields.includes('phoneNumber')
            ? { phoneCode: countryCode, phoneNumber: stripLeadingZero(phoneNumber) }
            : {}),
          ...(hiddenFields.includes('email') ? { email: email.trim() } : {}),
        },
      };
    }

    setError(null);
    // Saved only once the account really exists, so a rejected sign-up doesn't
    // leave a profile snapshot behind for an email that never got registered.
    if (!(await createAccount())) return;
    saveSubmitterProfile(email, profileToSave);
    setStep('success');
  };

  if (step === 'profile') {
    return (
      <ProfileStep
        submitterType={submitterType}
        onSubmitterTypeChange={handleSubmitterTypeChange}
        identityValues={identityValues}
        setIdentityValue={setIdentityValue}
        hiddenFields={ALREADY_COLLECTED_FIELDS_BY_TYPE[submitterType] ?? []}
        errors={identity.errors}
        onFieldBlur={(key) => identity.validateField(key)}
        consentChecked={consentChecked}
        onConsentChange={setConsentChecked}
        isSubmitting={isLoading}
        onBack={() => setStep('account')}
        onSubmit={handleProfileSubmit}
      />
    );
  }

  if (step === 'success') {
    return <SuccessStep />;
  }

  return (
    <AccountStep
      fullName={fullName}
      setFullName={(value) => changeAccountField('fullName', value, setFullName)}
      email={email}
      setEmail={(value) => changeAccountField('email', value, setEmail)}
      countryCode={countryCode}
      setCountryCode={handleCountryCodeChange}
      phoneNumber={phoneNumber}
      setPhoneNumber={(value) => changeAccountField('phoneNumber', value, setPhoneNumber)}
      password={password}
      setPassword={(value) => changeAccountField('password', value, setPassword)}
      confirmPassword={confirmPassword}
      setConfirmPassword={(value) => changeAccountField('confirmPassword', value, setConfirmPassword)}
      isLoading={isLoading}
      error={error}
      fieldErrors={accountErrors.errors}
      onFieldBlur={(field) => checkAccountField(field)}
      onSubmit={handleAccountSubmit}
    />
  );
}
