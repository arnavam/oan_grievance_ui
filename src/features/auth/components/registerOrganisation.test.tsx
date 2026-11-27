// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
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

import { loadSubmitterProfile } from '@/lib/submitterProfile';
import { RegisterForm } from './RegisterForm';

const VALID_PASSWORD = 'Str0ng!Passw0rd';
const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function reachProfileStep(submitterTypeName?: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RegisterForm />
    </NextIntlClientProvider>
  );
  type(/^Full Name/, 'Almaz Tesfaye');
  type(/^Email/, 'almaz@greenhighlands.org');
  type(/^Phone Number/, '0911000000');
  type(/^Password/, VALID_PASSWORD);
  type(/^Confirm Password/, VALID_PASSWORD);
  if (submitterTypeName) fireEvent.click(screen.getByRole('option', { name: submitterTypeName }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Almost done!');
}

const REPRESENTATIVE_FAYDA = /^Representative Fayda ID/;
const CONSENT = /I consent to providing my national ID/;
const FAYDA_ID = '6557092147530500';

// Everything the onboarding screen asks later — none of it belongs on the sign-up step.
const ORGANISATION_LABELS = [
  /^Organisation Name/,
  /^Registration Number/,
  /^Authorised Representative/,
  /^Total Number of Members/,
];

describe('registering an NGO or FPO representative', () => {
  // Braces matter: a function returned from beforeEach is run by vitest as cleanup.
  beforeEach(() => {
    registerUser.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it.each([['NGO'], ['Cooperative / FPO']])(
    'asks a %s for just its representative’s Fayda ID after the Submitter Type, with the ID consent',
    async (optionName) => {
      await reachProfileStep(optionName);

      expect(screen.getByLabelText(REPRESENTATIVE_FAYDA)).toBeInTheDocument();
      expect(screen.getByLabelText(CONSENT)).toBeInTheDocument();
      // Exactly one field besides the type: the organisation's own fields come after first sign-in.
      for (const label of ORGANISATION_LABELS) expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
      expect(screen.getByText(/we'll ask for your organisation's details/i)).toBeInTheDocument();
    }
  );

  it('changes the fields with the type chosen, and does not carry the ID across', async () => {
    await reachProfileStep('NGO');
    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: FAYDA_ID } });

    // The type is chosen on the first step, so changing it means going back.
    const changeTypeTo = (name: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('option', { name }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    };

    changeTypeTo('Individual Farmer');
    expect(screen.queryByLabelText(REPRESENTATIVE_FAYDA)).not.toBeInTheDocument();
    expect(document.getElementById('si-faydaId')).toHaveValue('');

    changeTypeTo('Cooperative / FPO');
    expect(document.getElementById('si-representativeFaydaId')).toHaveValue('');
  });

  it.each([
    ['NGO', 'NGO'],
    ['Cooperative / FPO', 'FPO'],
  ])('registers a %s with its type and the representative’s Fayda ID — and nothing else about the organisation', async (optionName, backendType) => {
    await reachProfileStep(optionName);
    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: FAYDA_ID } });
    fireEvent.click(screen.getByLabelText(CONSENT));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));

    expect(registerUser.mock.calls[0]![0]).toEqual({
      email: 'almaz@greenhighlands.org',
      password: VALID_PASSWORD,
      full_name: 'Almaz Tesfaye',
      phone_number: '+251911000000',
      submitter_type: backendType,
      fayda_id: FAYDA_ID,
    });
    expect(await screen.findByText(/Log in to register your organisation/)).toBeInTheDocument();
  });

  it('remembers the type for the screens that follow, but never the Fayda ID', async () => {
    await reachProfileStep('NGO');
    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: FAYDA_ID } });
    fireEvent.click(screen.getByLabelText(CONSENT));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));

    const saved = loadSubmitterProfile('almaz@greenhighlands.org');
    expect(saved?.submitterType).toBe('ngo');
    expect(saved?.identityValues).not.toHaveProperty('representativeFaydaId');
  });

  it('will not register without the Fayda ID or the consent, or with a malformed ID', async () => {
    await reachProfileStep('NGO');

    // Continue stays off until the national-ID consent is given.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(CONSENT));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getAllByText('This field is required.')).toHaveLength(1);
    expect(document.getElementById('si-representativeFaydaId')).toHaveFocus();

    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/12 or 16 digits/)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("shows the backend's refusal of the Fayda ID on this step, where it can be fixed", async () => {
    registerUser.mockImplementation(async () => {
      throw new Error("A Submitter Profile with dedupe key 'fayda:6557…' is already registered.");
    });
    await reachProfileStep('NGO');
    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: FAYDA_ID } });
    fireEvent.click(screen.getByLabelText(CONSENT));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/);
    // Still on the profile step, with what was typed.
    expect(document.getElementById('si-representativeFaydaId')).toHaveValue(FAYDA_ID);
  });

  it('still registers an individual farmer with their Fayda ID', async () => {
    await reachProfileStep('Individual Farmer');
    fireEvent.click(screen.getByLabelText(CONSENT));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '1234567890123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser.mock.calls[0]![0]).toMatchObject({ submitter_type: 'Individual Farmer', fayda_id: '1234567890123456' });
  });
});
