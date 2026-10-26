// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { makeStore } from '@/store';
import { RoleChooser, type RoleChooserProps } from './RoleChooser';

const assign = vi.fn();

function renderRoleChooser(props: RoleChooserProps = {}) {
  return render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <RoleChooser {...props} />
      </NextIntlClientProvider>
    </Provider>
  );
}

describe('RoleChooser', () => {
  beforeEach(() => {
    assign.mockClear();
    vi.stubGlobal('location', {
      ...window.location,
      search: '',
      href: 'http://localhost:3000/login',
      assign,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders the welcome heading and subtitle, and no partner banks', () => {
    renderRoleChooser();

    expect(screen.getByRole('heading', { level: 2, name: /welcome to the portal/i })).toBeInTheDocument();
    expect(
      screen.getByText(/select your role to access the grievance management portal/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/partner banks/i)).not.toBeInTheDocument();
  });

  it('renders all 4 role choices with correct titles and descriptions', () => {
    renderRoleChooser();

    expect(screen.getByText('Farmer Applicant')).toBeInTheDocument();
    expect(screen.getByText('Submit and track your agricultural grievances')).toBeInTheDocument();

    expect(screen.getByText('Organisation Login')).toBeInTheDocument();
    expect(screen.getByText('Submit and track grievances for NGOs, cooperatives, and FPOs')).toBeInTheDocument();

    expect(screen.getByText('Development Agent')).toBeInTheDocument();
    expect(screen.getByText('Assist farmers and submit grievances from the field')).toBeInTheDocument();

    expect(screen.getByText('Staff Login')).toBeInTheDocument();
    expect(screen.getByText('Triage, investigate, and resolve grievance cases')).toBeInTheDocument();
  });

  it('calls login API with param "bene" when Farmer Applicant is selected', () => {
    const onLogin = vi.fn();
    renderRoleChooser({ onLogin });

    const nextStepButton = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextStepButton);

    expect(onLogin).toHaveBeenCalledWith('bene');
  });

  it('calls login API with param "local" when Organisation Login is selected', () => {
    const onLogin = vi.fn();
    renderRoleChooser({ onLogin });

    const orgRadio = screen.getByLabelText(/organisation login/i);
    fireEvent.click(orgRadio);

    const nextStepButton = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextStepButton);

    expect(onLogin).toHaveBeenCalledWith('local');
  });

  it('calls login API with param "agent" when Development Agent is selected', () => {
    const onLogin = vi.fn();
    renderRoleChooser({ onLogin });

    const agentRadio = screen.getByLabelText(/development agent/i);
    fireEvent.click(agentRadio);

    const nextStepButton = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextStepButton);

    expect(onLogin).toHaveBeenCalledWith('agent');
  });

  it('calls login API with param "staff" when Staff Login is selected', () => {
    const onLogin = vi.fn();
    renderRoleChooser({ onLogin });

    const staffRadio = screen.getByLabelText(/staff login/i);
    fireEvent.click(staffRadio);

    const nextStepButton = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextStepButton);

    expect(onLogin).toHaveBeenCalledWith('staff');
  });

  it('navigates to /api/auth/iam/login?key=staff via window.location.assign by default', () => {
    renderRoleChooser();

    const staffRadio = screen.getByLabelText(/staff login/i);
    fireEvent.click(staffRadio);

    const nextStepButton = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextStepButton);

    expect(assign).toHaveBeenCalledWith(`/api/auth/iam/login?key=staff&origin=${encodeURIComponent(window.location.origin)}`);
  });

  it('navigates to /api/auth/iam/login?key=beneficiary when provider key is beneficiary', () => {
    renderRoleChooser({
      providers: [{ key: 'beneficiary', label: 'National ID (eSignet)', iconUrl: null }],
    });

    const nextStepButton = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextStepButton);

    expect(assign).toHaveBeenCalledWith(`/api/auth/iam/login?key=beneficiary&origin=${encodeURIComponent(window.location.origin)}`);
  });

  it('shows idle notice when reason=idle is present in the URL', () => {
    vi.stubGlobal('location', {
      ...window.location,
      search: '?reason=idle',
      href: 'http://localhost:3000/login?reason=idle',
      assign,
    });
    renderRoleChooser();

    expect(screen.getByText(/signed out for inactivity/i)).toBeInTheDocument();
  });
});
