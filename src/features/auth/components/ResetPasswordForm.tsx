'use client';

import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PasswordRequirements } from '@/components/ui/PasswordRequirements';
import { resetPassword } from '@/features/auth/api/authApi';
import {
  validateNewPassword,
  validatePasswordConfirmation,
  validateRequired,
} from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors, type FieldErrors } from '@/lib/validation/useFieldErrors';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const INPUT_CLASS =
  'w-full pl-10 pr-12 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm';

type ResetField = 'resetKey' | 'newPassword' | 'confirmPassword';

const RESET_FIELD_IDS: Record<ResetField, string> = {
  resetKey: 'reset-key',
  newPassword: 'reset-new-password',
  confirmPassword: 'reset-confirm-password',
};

const RESET_FIELD_ORDER: ReadonlyArray<{ key: ResetField; id: string }> = (
  ['resetKey', 'newPassword', 'confirmPassword'] as const
).map((key) => ({ key, id: RESET_FIELD_IDS[key] }));

interface ResetValues {
  resetKey: string;
  newPassword: string;
  confirmPassword: string;
}

function validateResetField(field: ResetField, values: ResetValues): string | null {
  switch (field) {
    case 'resetKey':
      return validateRequired(values.resetKey, 'Enter the reset key from your email.');
    case 'newPassword':
      return validateNewPassword(values.newPassword);
    case 'confirmPassword':
      return validatePasswordConfirmation(values.newPassword, values.confirmPassword);
  }
}

/**
 * Step 2 of a password reset: the key from the reset email plus the new
 * password. The key is prefilled from `?key=` when the page is reached from a
 * link, and can be pasted in by hand when it isn't.
 */
export function ResetPasswordForm() {
  const router = useRouter();

  const [resetKey, setResetKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // For a failed request (the key was already used, the service is down);
  // problems with one field go under that field via `fieldErrors`.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fieldErrors = useFieldErrors<ResetField>();

  const values: ResetValues = { resetKey, newPassword, confirmPassword };

  // Read via `window.location` rather than `useSearchParams()`, for the same
  // reason as LoginForm: it would force this page into a Suspense-gated client
  // render just to notice one optional query param. Has to be an effect —
  // `window` doesn't exist during this component's server render.
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key');
    if (key) {
      // Seeding state from the URL is exactly what this effect is for (see the
      // doc comment above) — there's no non-effect way to read `window` here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetKey(key);
    }
  }, []);

  const checkField = (field: ResetField, next: ResetValues = values) => {
    fieldErrors.setError(field, validateResetField(field, next));
  };

  // A field already showing an error is re-checked as it's edited, so the
  // message goes away the moment it's fixed. Changing the new password also
  // re-checks a confirmation that was showing a mismatch.
  const changeField = (field: ResetField, value: string, apply: (value: string) => void) => {
    apply(value);
    const next = { ...values, [field]: value };
    if (fieldErrors.errors[field]) checkField(field, next);
    if (field === 'newPassword' && fieldErrors.errors.confirmPassword) checkField('confirmPassword', next);
  };

  const a11y = (field: ResetField) => {
    const id = RESET_FIELD_IDS[field];
    const message = fieldErrors.errors[field];
    return {
      id,
      'aria-invalid': message ? (true as const) : undefined,
      'aria-describedby': message ? errorIdFor(id) : undefined,
      onBlur: () => checkField(field),
    };
  };

  const fieldError = (field: ResetField) => {
    const message = fieldErrors.errors[field];
    return message ? <FieldError id={errorIdFor(RESET_FIELD_IDS[field])}>{message}</FieldError> : null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: FieldErrors<ResetField> = {};
    for (const { key } of RESET_FIELD_ORDER) {
      const message = validateResetField(key, values);
      if (message) errors[key] = message;
    }
    fieldErrors.setAll(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(RESET_FIELD_ORDER, errors);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await resetPassword(resetKey.trim(), newPassword);
      router.push('/login?reason=reset');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[460px] mx-auto w-full flex-grow flex flex-col justify-center">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Reset Password</h2>
        <p className="text-gray-500 text-lg font-medium leading-relaxed px-4">
          Enter the key from your reset email and choose a new password.
        </p>
      </div>

      {errorMessage && <ErrorAlert className="mb-6">{errorMessage}</ErrorAlert>}

      {/* noValidate: the browser's own required bubbles would pre-empt the inline messages below. */}
      <form onSubmit={handleSubmit} className="space-y-5 mb-8" autoComplete="off" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={RESET_FIELD_IDS.resetKey} className="text-[14px] font-bold text-gray-700">
            Reset Key
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <KeyRound className="w-5 h-5" />
            </span>
            <input
              {...a11y('resetKey')}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={resetKey}
              onChange={(e) => changeField('resetKey', e.target.value, setResetKey)}
              placeholder="Paste the key from your email"
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
          </div>
          {fieldError('resetKey')}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={RESET_FIELD_IDS.newPassword} className="text-[14px] font-bold text-gray-700">
            New Password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              {...a11y('newPassword')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => changeField('newPassword', e.target.value, setNewPassword)}
              placeholder="••••••••"
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldError('newPassword')}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={RESET_FIELD_IDS.confirmPassword} className="text-[14px] font-bold text-gray-700">
            Confirm New Password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              {...a11y('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => changeField('confirmPassword', e.target.value, setConfirmPassword)}
              placeholder="••••••••"
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
          </div>
          {fieldError('confirmPassword')}
        </div>

        <PasswordRequirements password={newPassword} />

        <Button type="submit" size="none" isLoading={isLoading} className="w-full py-4 text-[14px] mt-4">
          <span className="font-semibold">{isLoading ? 'Resetting…' : 'Reset Password'}</span>
        </Button>
      </form>

      <p className="text-center text-gray-600 font-medium">
        Remembered it?{' '}
        <Link href="/login" className="text-[#16A34A] hover:text-[#15803d] font-bold">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
