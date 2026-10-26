'use client';

import { SessionEndedNotice } from '@/components/auth/SessionEndedNotice';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LoginForm, type LoginOptionButton } from '@/features/auth/components/LoginForm';
import { performLogout } from '@/features/auth/logout';
import { AUTH_MESSAGES } from '@/lib/authMessages';
import { safeReturnPath } from '@/lib/returnPath';
import { useAppDispatch } from '@/store/hooks';
import { ArrowLeft, ArrowRight, Building2, CheckCircle, LogOut, ShieldCheck, Tractor, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export interface RoleChoice {
  id: string;
  key: 'bene' | 'local' | 'agent' | 'staff';
  icon: LucideIcon;
  iconWrapper: string;
  iconColor: string;
  titleKey: 'roleFarmerTitle' | 'roleOrgTitle' | 'roleAgentTitle' | 'roleStaffTitle';
  descriptionKey: 'roleFarmerDesc' | 'roleOrgDesc' | 'roleAgentDesc' | 'roleStaffDesc';
}

/**
 * The four login options exposed by oan_auth_service:
 *  - `bene`: Farmer Applicant (eSignet IAM)
 *  - `local`: Organisation Login (Local credentials)
 *  - `agent`: Development Agent (Agent IAM)
 *  - `staff`: Staff Login (Staff IAM)
 */
export const ROLE_CHOICES: readonly RoleChoice[] = [
  {
    id: 'farmer',
    key: 'bene',
    icon: Tractor,
    iconWrapper: 'bg-[#E8F8EE]',
    iconColor: 'text-[#16A34A]',
    titleKey: 'roleFarmerTitle',
    descriptionKey: 'roleFarmerDesc',
  },
  {
    id: 'org',
    key: 'local',
    icon: Building2,
    iconWrapper: 'bg-blue-50',
    iconColor: 'text-blue-600',
    titleKey: 'roleOrgTitle',
    descriptionKey: 'roleOrgDesc',
  },
  {
    id: 'dev-agent',
    key: 'agent',
    icon: Users,
    iconWrapper: 'bg-[#FFF4E5]',
    iconColor: 'text-orange-500',
    titleKey: 'roleAgentTitle',
    descriptionKey: 'roleAgentDesc',
  },
  {
    id: 'staff',
    key: 'staff',
    icon: ShieldCheck,
    iconWrapper: 'bg-[#F5F3FF]',
    iconColor: 'text-purple-600',
    titleKey: 'roleStaffTitle',
    descriptionKey: 'roleStaffDesc',
  },
];

export interface RoleChooserProps {
  providers?: LoginOptionButton[] | null;
  /** Custom handler for calling the login API (e.g. for testing) */
  onLogin?: (key: string) => void;
}

export function RoleChooser({ providers, onLogin }: RoleChooserProps = {}) {
  const t = useTranslations('login');
  const [role, setRole] = useState(ROLE_CHOICES[0]!.id);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  // A role the backend offers no identity-provider login for signs in with email and password.
  const [passwordLogin, setPasswordLogin] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'login_failed') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(AUTH_MESSAGES.iamSignInFailed);
    } else if (reason === 'login_unavailable') {
      setErrorMessage(AUTH_MESSAGES.iamSignInUnavailable);
    } else if (reason === 'login_not_offered') {
      setErrorMessage(AUTH_MESSAGES.iamSignInNotOffered);
    } else if (reason === 'token_too_large') {
      setErrorMessage(AUTH_MESSAGES.iamTokenTooLarge);
    } else if (reason === 'no_access') {
      setErrorMessage(AUTH_MESSAGES.iamSignInNoAccess);
      setNoAccess(true);
    }
  }, []);

  // Ends the single sign-on session so another account can be tried; if the
  // provider session could not be ended, say so rather than pretend it worked.
  const switchAccount = async () => {
    setIsSwitchingAccount(true);
    const { redirected, providerLoggedOut } = await performLogout(dispatch, null);
    if (redirected) return;
    setIsSwitchingAccount(false);
    setNoAccess(false);
    setErrorMessage(providerLoggedOut ? null : t('switchAccountFailed'));
  };

  const handleSignInSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const choice = ROLE_CHOICES.find((c) => c.id === role) ?? ROLE_CHOICES[0]!;
    setIsRedirecting(true);

    if (onLogin) {
      onLogin(choice.key);
      return;
    }

    const offered = (key: string) => providers?.some((p) => p.key === key) ?? true;
    const resolvedKey =
      choice.id === 'farmer'
        ? (providers?.find((p) => p.key === 'bene' || p.key === 'beneficiary')?.key ?? choice.key)
        : (providers?.find((p) => p.key === choice.key)?.key ?? choice.key);

    // The organisation card is the local form itself. Another role the backend does not list (and a
    // listing we did get) has no identity provider to send the user to, so fall back to the form too.
    if (choice.key === 'local' || !offered(resolvedKey)) {
      setIsRedirecting(false);
      setPasswordLogin(true);
      return;
    }

    const params = new URLSearchParams({ key: resolvedKey, origin: window.location.origin });
    const returnUrl = typeof window !== 'undefined'
      ? safeReturnPath(new URLSearchParams(window.location.search).get('returnUrl'))
      : null;
    if (returnUrl) params.set('returnUrl', returnUrl);

    // A route handler that answers with a redirect to the identity provider, not a page — router.push can't follow it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/iam/login?${params.toString()}`);
  };

  if (passwordLogin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        <LoginForm providers={null} />
        <button
          type="button"
          onClick={() => setPasswordLogin(false)}
          className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[#6B7280] hover:text-[#1F2937] focus:outline-none focus-visible:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('backToRoles')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-0 sm:px-0 max-w-lg mx-auto w-full">
      <SessionEndedNotice />

      {errorMessage && <ErrorAlert className="mb-6">{errorMessage}</ErrorAlert>}
      {noAccess && (
        <div className="w-full mb-6 flex flex-col gap-3">
          <p className="text-[13px] text-[#6B7280]">{t('switchAccountHint')}</p>
          <Button
            type="button"
            variant="outline"
            size="none"
            isLoading={isSwitchingAccount}
            onClick={() => void switchAccount()}
            className="w-full py-3 text-[14px] space-x-2"
          >
            {!isSwitchingAccount && <LogOut size={18} strokeWidth={2.25} aria-hidden="true" />}
            <span className="font-semibold">{isSwitchingAccount ? t('switchingAccount') : t('switchAccount')}</span>
          </Button>
        </div>
      )}

      <div className="w-full flex flex-col items-center text-center mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold text-[#1F2937] mb-2 tracking-tight">
          {t('welcomeTitle')}
        </h2>
        <p className="text-[#6B7280] text-[14px] sm:text-[15px] font-medium px-2 sm:px-0 w-full sm:w-auto sm:whitespace-nowrap md:whitespace-normal mx-auto">
          {t('welcomeSubtitle')}
        </p>
      </div>

      {/* Role Selectors */}
      <div className="w-full space-y-4 mb-8">
        {ROLE_CHOICES.map((choice) => {
          const isSelected = role === choice.id;
          const Icon = choice.icon;
          const title = t(choice.titleKey);
          const description = t(choice.descriptionKey);

          return (
            <label
              key={choice.id}
              className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 group focus-within:border-[#16A34A] focus-within:ring-1 focus-within:ring-[#16A34A] ${
                isSelected
                  ? 'border-[#16A34A] bg-white ring-1 ring-[#16A34A]'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full ${choice.iconWrapper} flex items-center justify-center mr-4 shrink-0 overflow-hidden`}
              >
                <Icon className={`w-6 h-6 ${choice.iconColor}`} aria-hidden="true" />
              </div>
              <div className="flex-grow">
                <div className="font-bold text-gray-900 text-[15px]">{title}</div>
                <div className="text-[14px] text-gray-500 font-medium mt-0.5">{description}</div>
              </div>
              <input
                type="radio"
                name="role"
                value={choice.id}
                checked={isSelected}
                onChange={() => setRole(choice.id)}
                className="sr-only"
              />
              <div className="relative w-6 h-6 flex items-center justify-center shrink-0" aria-hidden="true">
                {isSelected ? (
                  <CheckCircle className="w-6 h-6 text-[#16A34A] transition-transform duration-200 scale-100" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 transition-colors duration-200" />
                )}
              </div>
            </label>
          );
        })}
      </div>

      <form className="w-full mb-10" onSubmit={handleSignInSubmit}>
        <Button
          type="submit"
          size="none"
          isLoading={isRedirecting}
          className="w-full py-4 text-[14px] space-x-2 active:scale-[0.98]"
        >
          <span className="font-semibold">{isRedirecting ? 'Redirecting…' : t('nextStep')}</span>
          {!isRedirecting && <ArrowRight size={18} strokeWidth={2.5} />}
        </Button>
      </form>
    </div>
  );
}
