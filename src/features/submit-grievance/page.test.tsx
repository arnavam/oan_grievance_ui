// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { loginThunk, type User } from '@/features/auth/store/authSlice';
import { ApiError } from '@/lib/api/fetchApi';
import SubmitGrievancePage from './page';
import { makeStore } from './testFixtures';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => '/submit-grievance',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock('@/lib/drafts', () => ({
  loadDraft: vi.fn().mockImplementation(() => Promise.reject(new ApiError('Not found', undefined, 404))),
  discardDraft: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  currentSearch = '';
});

const mockUser: User = {
  email: 'agent@example.com',
  roles: ['Grievance Submitter'],
  full_name: 'Tigist Agent',
  mobile_no: '+251911000000',
  fayda_id: 'ET-FAYDA-111',
  type: 'Individual Farmer',
};

function renderPage(preloadedUser: User = mockUser) {
  const store = makeStore();
  store.dispatch({
    type: loginThunk.fulfilled.type,
    payload: preloadedUser,
  });

  return render(
    <Provider store={store}>
      <NextIntlClientProvider locale="en" messages={en}>
        <SubmitGrievancePage />
      </NextIntlClientProvider>
    </Provider>
  );
}

describe('SubmitGrievancePage URL step filter', () => {
  it('renders Step 1 by default when no step parameter is present', async () => {
    currentSearch = '';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Submitter Identity', { selector: 'h3' })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Provide essential details about your grievance/).length).toBeGreaterThan(0);
  });

  it('renders Step 2 (Grievance Details) directly when URL has ?step=2', async () => {
    currentSearch = 'step=2';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Grievance Details', { selector: 'h3' })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Provide essential details about your grievance/).length).toBeGreaterThan(0);
  });

  it('sends ?step=3 back to Step 2 when the grievance details are still empty', async () => {
    currentSearch = 'step=3';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Grievance Details', { selector: 'h3' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Review & Submit', { selector: 'h3' })).not.toBeInTheDocument();
    // A separate effect from the one that renders Step 2 is what calls replace() — waiting
    // for it independently (rather than assuming it already happened by the time the DOM
    // waitFor above resolved) is what makes this deterministic instead of a timing race.
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/submit-grievance?step=2', { scroll: false });
    });
  });

  it('pushes the new step to the URL when Next is clicked', async () => {
    currentSearch = 'step=1';
    renderPage();

    const nextBtn = await screen.findByRole('button', { name: /Save & Continue/i });
    fireEvent.click(nextBtn);

    expect(pushMock).toHaveBeenCalledWith('/submit-grievance?step=2', { scroll: false });
  });

  it('pushes the previous step to the URL when Back is clicked', async () => {
    currentSearch = 'step=2';
    renderPage();

    const backButtons = await screen.findAllByRole('button', { name: /Back/i });
    if (backButtons[0]) {
      fireEvent.click(backButtons[0]);
    }

    expect(pushMock).toHaveBeenCalledWith('/submit-grievance?step=1', { scroll: false });
  });

  it('runs loadDraft only once on mount and does not refetch during step navigation', async () => {
    const { loadDraft } = await import('@/lib/drafts');
    currentSearch = 'step=1';
    renderPage();

    const nextBtn = await screen.findByRole('button', { name: /Save & Continue/i });
    fireEvent.click(nextBtn);

    expect(loadDraft).toHaveBeenCalledTimes(1);
  });
});
