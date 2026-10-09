'use client';

import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { ForgotPasswordModal } from '@/features/auth/components/ForgotPasswordModal';
import { SetInitialPasswordModal } from '@/features/auth/components/SetInitialPasswordModal';
import { homeRouteForRoles } from '@/features/auth/rbac';
import { loginThunk } from '@/features/auth/store/authSlice';
import { AUTH_MESSAGES } from '@/lib/authMessages';
import { validateEmail, validateLoginPassword } from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors, type FieldErrors } from '@/lib/validation/useFieldErrors';
import { useAppDispatch } from '@/store/hooks';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type LoginField = 'email' | 'password';

const LOGIN_FIELD_ORDER: ReadonlyArray<{ key: LoginField; id: string }> = [
  { key: 'email', id: 'login-email' },
  { key: 'password', id: 'login-password' },
];

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);

  // Read via `window.location` rather than `useSearchParams()` — this page is
  // otherwise fully static, and `useSearchParams()` would force it (and
  // everything above it) into a Suspense-gated client render just to notice a
  // query param that's only ever present after `proxy.ts` redirects here (or
  // after a completed password reset).
  // Has to be an effect: `window` doesn't exist during this client
  // component's server render, so it can't be read in a `useState`
  // initializer or during render itself.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'idle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(AUTH_MESSAGES.sessionExpiredIdle);
    } else if (reason === 'reset') {
      setSuccessMessage(AUTH_MESSAGES.passwordResetSuccess);
    }
  }, []);

  const fieldErrors = useFieldErrors<LoginField>();

  const validators: Record<LoginField, (value: string) => string | null> = {
    email: validateEmail,
    password: validateLoginPassword,
  };

  // Checked when a field loses focus, and re-checked as it's edited while it
  // is showing an error — so the message clears the moment it's fixed.
  const changeField = (field: LoginField, value: string, apply: (value: string) => void) => {
    apply(value);
    if (fieldErrors.errors[field]) fieldErrors.setError(field, validators[field](value));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: FieldErrors<LoginField> = {};
    const emailError = validators.email(email);
    const passwordError = validators.password(password);
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    fieldErrors.setAll(errors);
    if (emailError || passwordError) {
      focusFirstError(LOGIN_FIELD_ORDER, errors);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await dispatch(loginThunk({ usr: email.trim(), pwd: password, rememberMe }));

    if (loginThunk.fulfilled.match(result)) {
      const returnUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('returnUrl') : null;
      const safeReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;
      router.push(safeReturnUrl || homeRouteForRoles(result.payload.roles ?? []));
      return;
    }

    // A correct temporary password answers this distinct message (see authMessages.ts and
    // the login route's own PASSWORD_CHANGE_REQUIRED branch) — route it to the dedicated
    // modal instead of the generic error banner, since "fix your password and email" isn't
    // the actual problem here.
    if (result.payload === AUTH_MESSAGES.passwordChangeRequired) {
      setShowSetPasswordModal(true);
    } else {
      setErrorMessage(result.payload ?? 'Something went wrong. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full px-0 sm:px-0 max-w-lg mx-auto w-full">
      <div className="w-full flex flex-col items-center text-center mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold text-[#1F2937] mb-2 tracking-tight">Welcome Back</h2>
        <p className="text-[#6B7280] text-[14px] sm:text-[15px] font-medium px-2 sm:px-0 w-full sm:w-auto sm:whitespace-nowrap md:whitespace-normal mx-auto">Sign in to manage and track grievances.</p>
      </div>

      {errorMessage && <ErrorAlert className="mb-6">{errorMessage}</ErrorAlert>}
      {successMessage && (
        <p role="status" className="w-full mb-6 text-[14px] font-medium text-[#166534] bg-[#F4FDF7] border border-[#16A34A]/20 rounded-xl px-4 py-3">
          {successMessage}
        </p>
      )}

      {/* noValidate: the browser's own required/email bubbles would pre-empt the inline messages below. */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6" autoComplete="off" noValidate>
        <div className="flex flex-col gap-5">
          <div>
            <label className="flex flex-col gap-2.5">
              <span className="text-[14px] font-semibold text-[#374151]">Email</span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                  <User size={18} strokeWidth={2} />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => changeField('email', e.target.value, setEmail)}
                  onBlur={() => fieldErrors.setError('email', validateEmail(email))}
                  aria-invalid={fieldErrors.errors.email ? true : undefined}
                  aria-describedby={fieldErrors.errors.email ? errorIdFor('login-email') : undefined}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm ${INVALID_INPUT_STYLES}`}
                />
              </div>
            </label>
            {fieldErrors.errors.email && (
              <FieldError id={errorIdFor('login-email')}>{fieldErrors.errors.email}</FieldError>
            )}
          </div>

          <div>
            <label className="flex flex-col gap-2.5">
              <span className="text-[14px] font-semibold text-[#374151]">Password</span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Lock size={18} strokeWidth={2} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  value={password}
                  onChange={(e) => changeField('password', e.target.value, setPassword)}
                  onBlur={() => fieldErrors.setError('password', validateLoginPassword(password))}
                  aria-invalid={fieldErrors.errors.password ? true : undefined}
                  aria-describedby={fieldErrors.errors.password ? errorIdFor('login-password') : undefined}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm ${INVALID_INPUT_STYLES}`}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {fieldErrors.errors.password && (
              <FieldError id={errorIdFor('login-password')}>{fieldErrors.errors.password}</FieldError>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2.5 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="peer appearance-none w-5 h-5 border-2 border-[#D1D5DB] rounded-[6px] bg-white checked:bg-[#16A34A] checked:border-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 transition-all duration-300 cursor-pointer hover:border-[#16A34A]/50 active:scale-90 checked:scale-110"
              />
              <svg
                className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[14px] font-medium text-[#4B5563] group-hover:text-[#1F2937] transition-colors">
              Remember me
            </span>
          </label>
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-[14px] font-bold text-[#16A34A] hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          size="none"
          isLoading={isLoading}
          className="w-full py-4 text-[14px] space-x-2 active:scale-[0.98]"
        >
          <span className="font-semibold">{isLoading ? 'Signing in…' : 'Sign In'}</span>
          {!isLoading && <ArrowRight size={18} strokeWidth={2.5} />}
        </Button>

        <div className="text-center text-[14px] font-medium text-[#6B7280]">
          New to the portal?{' '}
          <Link href="/register" className="text-[#16A34A] font-bold hover:underline">
            Register account
          </Link>
        </div>
      </form>

      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}
      {showSetPasswordModal && (
        <SetInitialPasswordModal
          email={email.trim()}
          onClose={() => setShowSetPasswordModal(false)}
          onDone={() => {
            setShowSetPasswordModal(false);
            setPassword('');
            setSuccessMessage(AUTH_MESSAGES.passwordResetSuccess);
          }}
        />
      )}
    </div>
  );
}
