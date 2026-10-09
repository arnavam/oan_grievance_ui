'use client';

import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { forgotPassword } from '@/features/auth/api/authApi';
import { validateEmail } from '@/lib/validation/fieldRules';
import { CheckCircle2, Mail, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

/**
 * Step 1 of a password reset: ask for the account's email, then hand over to
 * `/reset-password` where the emailed key and the new password are entered.
 * Only mounted while open, so the state below resets on every fresh open.
 * Starts empty on purpose — it is not seeded from the login form.
 */
export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Shown under the field; `errorMessage` above is for a failed request.
  const [emailError, setEmailError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Only mounted while open (see the doc comment above), so mount/unmount
  // doubles as open/close: restore focus to whatever opened this on unmount,
  // and keep Tab from leaving the dialog into the obscured page behind it
  // while it's open.
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const emailProblem = validateEmail(email);
    setEmailError(emailProblem);
    if (emailProblem) {
      document.getElementById('forgot-email')?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await forgotPassword(email.trim());
      setIsSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Portalled to <body> so the overlay can't be clipped or stacked under the
  // card it was opened from (PortalShell's card is `overflow-hidden`).
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
        aria-labelledby="forgot-password-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
          <h2 id="forgot-password-title" className="text-[18px] font-bold text-[#1F2937]">
            Forgot Password
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

        <div className="p-6">
          {isSent ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-[18px] font-bold text-gray-900 mb-2">Check your email</h3>
              <p className="text-[14px] text-gray-500 mb-6">
                If an account exists for <span className="font-semibold text-gray-700">{email.trim()}</span>, we&apos;ve
                sent it password reset instructions.
              </p>
              <Button
                type="button"
                size="none"
                className="w-full py-3 text-[14px]"
                onClick={() => {
                  onClose();
                  router.push('/reset-password');
                }}
              >
                Enter reset key
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <p className="text-[14px] text-gray-500">
                Enter the email address you sign in with and we&apos;ll send you instructions to reset your password.
              </p>

              {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}

              <div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[14px] font-bold text-[#1F2937]">Email Address</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="forgot-email"
                      type="email"
                      autoFocus
                      autoComplete="off"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // Re-check as they type while it's showing an error, so it clears the moment it's fixed.
                        if (emailError) setEmailError(validateEmail(e.target.value));
                      }}
                      onBlur={() => setEmailError(validateEmail(email))}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? errorIdFor('forgot-email') : undefined}
                      placeholder="you@example.com"
                      className={`w-full pl-11 pr-4 py-3 border border-[#D1D5DB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] text-[14px] transition-all ${INVALID_INPUT_STYLES}`}
                    />
                  </div>
                </label>
                {emailError && <FieldError id={errorIdFor('forgot-email')}>{emailError}</FieldError>}
              </div>

              <Button
                type="submit"
                size="none"
                isLoading={isSubmitting}
                className="w-full py-3 text-[14px]"
              >
                Send Reset Instructions
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
