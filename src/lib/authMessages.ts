// User-facing copy for authentication failures.
//
// Deliberately uniform: a sign-in response must not reveal which half of the
// pair was wrong, nor whether the account exists at all, or the login form
// becomes an account-enumeration oracle. The real reason is still logged
// server-side by whatever route returns one of these.
export const AUTH_MESSAGES = {
  invalidCredentials: 'Incorrect email or password. Please check your credentials and try again.',
  passwordChangeRequired: 'You must set your own password before signing in. Use the temporary password you were given to set a new one.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  sessionExpiredIdle: 'You were signed out due to inactivity. Please sign in again.',
  signInUnavailable: 'We could not sign you in right now. Please try again shortly.',
  iamSignInFailed: 'Sign-in failed. Please try again.',
  iamSignInUnavailable: 'Sign-in is temporarily unavailable. Please try again shortly.',
  iamSignInNotOffered: 'This sign-in method is not available.',
  iamSignInNoAccess: 'Your account has no access to the grievance portal. Ask an administrator to grant you a role.',
  wrongPortal: 'These credentials are not valid for this sign-in option. Please use the one meant for your account.',
  iamTokenTooLarge: 'Your account has too many roles to sign in here. Contact an administrator.',
  passwordResetSuccess: 'Your password has been reset. Please sign in with your new password.',
  tooManyAttempts: 'Too many attempts. Please wait a moment and try again.',
  unexpected: 'Something went wrong. Please try again.',
} as const;
