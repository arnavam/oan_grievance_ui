'use client';

import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PasswordRequirements } from '@/components/ui/PasswordRequirements';
import { setInitialPassword } from '@/features/auth/api/authApi';
import { validateNewPassword, validatePasswordConfirmation, validateRequired } from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors, type FieldErrors } from '@/lib/validation/useFieldErrors';
import { Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const INPUT_CLASS =
  'w-full pl-10 pr-12 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm';

type SetPasswordField = 'temporaryPassword' | 'newPassword' | 'confirmPassword';

const FIELD_IDS: Record<SetPasswordField, string> = {
  temporaryPassword: 'set-initial-temp-password',
  newPassword: 'set-initial-new-password',
  confirmPassword: 'set-initial-confirm-password',
};

const FIELD_ORDER: ReadonlyArray<{ key: SetPasswordField; id: string }> = (
  ['temporaryPassword', 'newPassword', 'confirmPassword'] as const
).map((key) => ({ key, id: FIELD_IDS[key] }));

interface SetPasswordValues {
  temporaryPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function validateField(field: SetPasswordField, values: SetPasswordValues): string | null {
  switch (field) {
    case 'temporaryPassword':
      return validateRequired(values.temporaryPassword, 'Enter the temporary password you were given.');
    case 'newPassword': {
      const message = validateNewPassword(values.newPassword);
      if (message) return message;
      // Mirrors the backend's own check (set_initial_password) — catching it here gives
      // an answer before the round trip instead of after.
      if (values.temporaryPassword && values.newPassword === values.temporaryPassword) {
        return 'Choose a password different from the temporary one.';
      }
      return null;
    }
    case 'confirmPassword':
      return validatePasswordConfirmation(values.newPassword, values.confirmPassword);
  }
}

interface SetInitialPasswordModalProps {
  /** Prefilled from whatever the officer just typed on the login form. */
  email: string;
  onClose: () => void;
  /** Called after the password is set — the caller sends them back to a fresh sign-in. */
  onDone: () => void;
}

/**
 * Opened when sign-in answers `403 PASSWORD_CHANGE_REQUIRED`: the account's temporary
 * password verified correctly but can't be used to sign in directly (see
 * `docs/officer-management-api.md` §8 in `oan_grievance_service`). Calls
 * `POST /api/v1/auth/password/initial` via the same-origin `/api/auth/set-initial-password`
 * proxy — guest-reachable, no token, the temporary password itself proves identity.
 */
export function SetInitialPasswordModal({ email, onClose, onDone }: SetInitialPasswordModalProps) {
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fieldErrors = useFieldErrors<SetPasswordField>();
  const dialogRef = useRef<HTMLDivElement>(null);

  const values: SetPasswordValues = { temporaryPassword, newPassword, confirmPassword };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const checkField = (field: SetPasswordField, next: SetPasswordValues = values) => {
    fieldErrors.setError(field, validateField(field, next));
  };

  const changeField = (field: SetPasswordField, value: string, apply: (value: string) => void) => {
    apply(value);
    const next = { ...values, [field]: value };
    if (fieldErrors.errors[field]) checkField(field, next);
    // Changing either password re-checks the other's "must differ" / "must match" rule.
    if (field === 'temporaryPassword' && fieldErrors.errors.newPassword) checkField('newPassword', next);
    if (field === 'newPassword' && fieldErrors.errors.confirmPassword) checkField('confirmPassword', next);
  };

  const a11y = (field: SetPasswordField) => {
    const id = FIELD_IDS[field];
    const message = fieldErrors.errors[field];
    return {
      id,
      'aria-invalid': message ? (true as const) : undefined,
      'aria-describedby': message ? errorIdFor(id) : undefined,
      onBlur: () => checkField(field),
    };
  };

  const fieldError = (field: SetPasswordField) => {
    const message = fieldErrors.errors[field];
    return message ? <FieldError id={errorIdFor(FIELD_IDS[field])}>{message}</FieldError> : null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: FieldErrors<SetPasswordField> = {};
    for (const { key } of FIELD_ORDER) {
      const message = validateField(key, values);
      if (message) errors[key] = message;
    }
    fieldErrors.setAll(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(FIELD_ORDER, errors);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await setInitialPassword(email, temporaryPassword, newPassword);
      onDone();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Portalled to <body>, same reasoning as ForgotPasswordModal: the overlay can't be
  // clipped by the login card it was opened from.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-initial-password-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] flex flex-col overflow-hidden max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
          <h2 id="set-initial-password-title" className="text-[18px] font-bold text-[#1F2937]">
            Set Your Password
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-[14px] text-gray-500 mb-5">
            You&apos;re signing in to <span className="font-semibold text-gray-700">{email}</span> for the first time.
            Enter the temporary password you were given, then choose one only you know.
          </p>

          {errorMessage && <ErrorAlert className="mb-5">{errorMessage}</ErrorAlert>}

          {/* noValidate: the browser's own required bubbles would pre-empt the inline messages below. */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor={FIELD_IDS.temporaryPassword} className="text-[14px] font-bold text-gray-700">
                Temporary Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  {...a11y('temporaryPassword')}
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="off"
                  autoFocus
                  value={temporaryPassword}
                  onChange={(e) => changeField('temporaryPassword', e.target.value, setTemporaryPassword)}
                  placeholder="The password you were given"
                  className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
                />
              </div>
              {fieldError('temporaryPassword')}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={FIELD_IDS.newPassword} className="text-[14px] font-bold text-gray-700">
                New Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  {...a11y('newPassword')}
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => changeField('newPassword', e.target.value, setNewPassword)}
                  placeholder="••••••••"
                  className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((shown) => !shown)}
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
                >
                  {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldError('newPassword')}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={FIELD_IDS.confirmPassword} className="text-[14px] font-bold text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  {...a11y('confirmPassword')}
                  type={showPasswords ? 'text' : 'password'}
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

            <Button type="submit" size="none" isLoading={isSubmitting} className="w-full py-3 text-[14px]">
              <span className="font-semibold">{isSubmitting ? 'Setting password…' : 'Set Password'}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
