// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';

const registerUser = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/features/auth/api/authApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/api/authApi')>()),
  registerUser: (...args: unknown[]) => registerUser(...args),
}));

import { IndividualFarmerForm } from '@/components/submitter-identity/SI-IndividualFarmerForm';
import { makeStore } from '@/store';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

afterEach(cleanup);

function renderRegister() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RegisterForm />
    </NextIntlClientProvider>
  );
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const VALID_PASSWORD = 'Str0ng!Passw0rd';

/** Fills the register account step with valid values and continues to the profile step. */
async function completeAccountStep(submitterTypeName?: string) {
  type(/^Full Name/, 'Abebe Bikila');
  type(/^Email/, 'abebe@example.com');
  type(/^Phone Number/, '0911000000');
  type(/^Password/, VALID_PASSWORD);
  type(/^Confirm Password/, VALID_PASSWORD);
  if (submitterTypeName) fireEvent.click(screen.getByRole('option', { name: submitterTypeName }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  if (!submitterTypeName) return; // stays here: the type is required
  await screen.findByText('Almost done!');
}

const LOCAL = { key: 'local', label: 'Email and password', iconUrl: null };
const STAFF = { key: 'staff', label: 'Sign in as staff', iconUrl: null };
const AGENT = { key: 'agent', label: 'Sign in as agent', iconUrl: null };

function renderLoginWith(providers: React.ComponentProps<typeof LoginForm>['providers']) {
  return render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <LoginForm providers={providers} />
      </NextIntlClientProvider>
    </Provider>
  );
}

describe('LoginForm login options', () => {
  it('shows the password form and one button per IAM option, in order', () => {
    renderLoginWith([LOCAL, STAFF, AGENT]);
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    const labels = screen.getAllByRole('button', { name: /^Sign in as/ }).map((b) => b.textContent);
    expect(labels).toEqual(['Sign in as staff', 'Sign in as agent']);
  });

  it('shows no password form without a local option', () => {
    renderLoginWith([STAFF]);
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in as staff' })).toBeInTheDocument();
  });

  it('says so when no option is configured', () => {
    renderLoginWith([]);
    expect(screen.getByText('No sign-in method is configured. Contact an administrator.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
  });

  it('falls back to the password form alone when the options could not be listed', () => {
    renderLoginWith(null);
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sign in as/ })).not.toBeInTheDocument();
  });
});

describe('LoginForm after an IAM sign-in with no access here', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/login?reason=no_access');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  const renderLogin = () => renderLoginWith([LOCAL, STAFF]);

  it('offers to end the single sign-on session, and says so when it cannot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, redirectTo: null })));
    global.fetch = fetchMock;
    renderLogin();

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out and use a different account' }));

    expect(
      await screen.findByText('Could not sign you out of the staff account. Sign out from the registry, then try again.')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
    expect(screen.queryByRole('button', { name: 'Sign out and use a different account' })).not.toBeInTheDocument();
  });

  it('clears the message when the identity provider was signed out server-side', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true, redirectTo: null, providerLoggedOut: true })));
    renderLogin();

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out and use a different account' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Sign out and use a different account' })).not.toBeInTheDocument()
    );
    expect(screen.queryByText(/Could not sign you out/)).not.toBeInTheDocument();
    expect(screen.queryByText(/has no access/)).not.toBeInTheDocument();
  });

  it('does not offer it for other sign-in failures', () => {
    window.history.replaceState(null, '', '/login?reason=login_failed');
    renderLogin();
    expect(screen.queryByRole('button', { name: 'Sign out and use a different account' })).not.toBeInTheDocument();
  });
});

describe('LoginForm inline validation', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  const renderLogin = () =>
    render(
      <Provider store={makeStore()}>
        <NextIntlClientProvider locale="en" messages={en}>
          <LoginForm providers={null} />
        </NextIntlClientProvider>
      </Provider>
    );

  it('shows a message under each empty field on submit, focuses the first, and sends nothing', () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(document.getElementById('login-email')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('login-password')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('login-email')).toHaveFocus();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ties each message to its input for assistive tech', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const email = document.getElementById('login-email')!;
    const described = document.getElementById(email.getAttribute('aria-describedby')!);
    expect(described).toHaveTextContent('Enter your email address.');
  });

  it('checks an email when it loses focus, and clears the message as soon as it is fixed', () => {
    renderLogin();
    const email = document.getElementById('login-email')!;

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);
    expect(screen.getByText('Enter a valid email address, e.g. name@example.com.')).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'abebe@example.com' } });
    expect(screen.queryByText('Enter a valid email address, e.g. name@example.com.')).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('turns off the browser’s own validation bubbles so these messages are the ones shown', () => {
    const { container } = renderLogin();
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });
});

describe('Register — account step', () => {
  beforeEach(() => {
    registerUser.mockReset();
  });

  it('reports every invalid field at once, focuses the first, and does not move on', () => {
    renderRegister();
    fireEvent.click(screen.getByRole('option', { name: 'Individual Farmer' }));
    fireEvent.mouseDown(document.body); // a real click elsewhere closes the dropdown

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your phone number.')).toBeInTheDocument();
    expect(screen.getByText('Enter a password.')).toBeInTheDocument();
    expect(screen.getByText('Re-enter your password to confirm it.')).toBeInTheDocument();
    expect(document.getElementById('register-full-name')).toHaveFocus();
    expect(screen.queryByText('Almost done!')).not.toBeInTheDocument();
  });

  it('rejects a name that is only spaces, and one over the backend’s 140-character limit', () => {
    renderRegister();
    const name = document.getElementById('register-full-name')!;

    fireEvent.change(name, { target: { value: '     ' } });
    fireEvent.blur(name);
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();

    fireEvent.change(name, { target: { value: 'A'.repeat(141) } });
    expect(screen.getByText('Full name must be 140 characters or fewer.')).toBeInTheDocument();

    fireEvent.change(name, { target: { value: 'A'.repeat(140) } });
    expect(screen.queryByText(/140 characters or fewer/)).not.toBeInTheDocument();
  });

  it('shows a password mismatch under the confirmation, and clears it when the password is changed to match', () => {
    renderRegister();

    type(/^Password/, VALID_PASSWORD);
    fireEvent.change(document.getElementById('register-confirm-password')!, { target: { value: 'different' } });
    fireEvent.blur(document.getElementById('register-confirm-password')!);
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    // Editing the *password* to match re-checks the confirmation too.
    fireEvent.change(document.getElementById('register-password')!, { target: { value: 'different' } });
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
  });

  it('shows the first unmet password rule under the password', () => {
    renderRegister();
    const password = document.getElementById('register-password')!;

    fireEvent.change(password, { target: { value: 'short' } });
    fireEvent.blur(password);
    expect(screen.getByText('Password must be between 8 and 128 characters long.')).toBeInTheDocument();
  });

  it('creates no account on this step — that happens at the end of the profile step', async () => {
    renderRegister();
    await completeAccountStep();
    expect(registerUser).not.toHaveBeenCalled();
  });
});

describe('Register — profile step', () => {
  beforeEach(() => {
    registerUser.mockReset();
  });

  it('asks for a submitter type before leaving the account step, under the dropdown', async () => {
    renderRegister();
    await completeAccountStep(); // no type chosen

    expect(screen.getByText('Select a submitter type to continue.')).toBeInTheDocument();
    expect(document.getElementById('register-submitter-type')).toHaveFocus();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('shows required and malformed ID messages under the field itself, and creates no account until they are fixed', async () => {
    renderRegister();
    await completeAccountStep('Individual Farmer');
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
    expect(document.getElementById('si-faydaId')).toHaveFocus();
    expect(registerUser).not.toHaveBeenCalled();

    const fayda = document.getElementById('si-faydaId')!;
    fireEvent.change(fayda, { target: { value: 'ab' } });
    expect(screen.getByText('Enter a valid Fayda ID: 12 or 16 digits.')).toBeInTheDocument();

    fireEvent.change(fayda, { target: { value: '1234567890123456' } });
    expect(screen.queryByText(/Enter a valid Fayda ID/)).not.toBeInTheDocument();
  });

  it('shows no fields for a Development Agent, and registers them with that type', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep('Development Agent (on behalf)');

    expect(document.getElementById('si-faydaId')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/I consent to providing my national ID/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'abebe@example.com', submitter_type: 'Development Agent' })
    );
    expect(await screen.findByText('Account Created!')).toBeInTheDocument();
  });

  it('registers an individual farmer with that type and their Fayda ID', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep('Individual Farmer');
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '1234567890123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_type: 'Individual Farmer', fayda_id: '1234567890123456' })
    );
  });

  it('sends no Fayda ID for a Development Agent, who has none to give', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep('Development Agent (on behalf)');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser.mock.calls[0]![0]).not.toHaveProperty('fayda_id');
  });

  it('registers a Woreda/Kebele Body under the default type, with its official’s Fayda ID', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep('Woreda/Kebele Body');
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-officeName')!, { target: { value: 'Bole Woreda Office' } });
    fireEvent.change(document.getElementById('si-adminZone')!, { target: { value: 'Addis Ababa' } });
    fireEvent.change(document.getElementById('si-responsibleOfficial')!, { target: { value: 'Tigist Bekele' } });
    fireEvent.change(document.getElementById('si-officialFaydaId')!, { target: { value: '6557092147530500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    const fields = registerUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(fields).not.toHaveProperty('submitter_type');
    expect(fields.fayda_id).toBe('6557092147530500');
  });

  it('registers an NGO under its own type with its representative’s Fayda ID alone', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep('NGO');
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: '6557092147530500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    const fields = registerUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(fields.submitter_type).toBe('NGO');
    expect(fields.fayda_id).toBe('6557092147530500');
    expect(fields).not.toHaveProperty('registration_number');
  });
  it('stays on the profile step with our own message when the Fayda ID is already registered, keeping what was typed — never the backend’s dedupe-key wording', async () => {
    const message = "A Submitter Profile with dedupe key 'fayda:6557…' is already registered under another account.";
    registerUser.mockImplementation(async () => {
      throw new Error(message);
    });
    renderRegister();
    await completeAccountStep('Individual Farmer');
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '6557092147530500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This Fayda ID is already registered to another account.');
    expect(alert).not.toHaveTextContent(/dedupe|Submitter Profile|6557…/);
    expect(screen.getByText('Almost done!')).toBeInTheDocument();
    expect(document.getElementById('si-faydaId')).toHaveValue('6557092147530500');
  });

  it('returns to the account step with our own message when the backend’s duplicate is the phone number', async () => {
    registerUser.mockImplementation(async () => {
      throw new Error("A Submitter Profile with dedupe key 'phone:+2519110…' is already registered.");
    });
    renderRegister();
    await completeAccountStep('Individual Farmer');
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '6557092147530500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('These details are already registered to another account.');
    expect(alert).not.toHaveTextContent(/dedupe/);
    expect(screen.queryByText('Almost done!')).not.toBeInTheDocument();
  });

  it('clears that message once the next attempt goes through', async () => {
    registerUser.mockRejectedValueOnce(new Error("Submitter Type 'Development Agent' does not exist."));
    registerUser.mockResolvedValueOnce(undefined);
    renderRegister();
    await completeAccountStep('Development Agent (on behalf)');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Submitter Type/);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Account Created!')).toBeInTheDocument();
  });

  it('returns to the account step with the backend’s message if registration is rejected', async () => {
    // Rejects when called (not up front), the way the real request does.
    registerUser.mockImplementation(async () => {
      throw new Error('An account with this email already exists.');
    });
    renderRegister();
    await completeAccountStep('Development Agent (on behalf)');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Full Name/)).toHaveValue('Abebe Bikila');
  });
});

describe('Submitter identity form fields', () => {
  it('shows a field’s message under it and marks it invalid for assistive tech', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <IndividualFarmerForm
          values={{}}
          setValue={vi.fn()}
          errors={{ faydaId: 'Enter a valid Fayda ID: 12 or 16 digits.' }}
        />
      </NextIntlClientProvider>
    );

    const fayda = document.getElementById('si-faydaId')!;
    expect(fayda).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(fayda.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Enter a valid Fayda ID'
    );
    // Fields without an error are untouched.
    expect(document.getElementById('si-fullName')).not.toHaveAttribute('aria-invalid');
  });

  it('reports a field when it loses focus, so the caller can validate it', () => {
    const onFieldBlur = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <IndividualFarmerForm values={{}} setValue={vi.fn()} onFieldBlur={onFieldBlur} />
      </NextIntlClientProvider>
    );

    fireEvent.blur(document.getElementById('si-fullName')!);
    fireEvent.blur(document.getElementById('si-faydaId')!);

    expect(onFieldBlur).toHaveBeenNthCalledWith(1, 'fullName');
    expect(onFieldBlur).toHaveBeenNthCalledWith(2, 'faydaId');
  });
});
