/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { loginThunk } from '@/features/auth/store/authSlice';
import { makeStore } from '@/store';
import { OfficerDirectory } from './OfficerDirectory';

const fetchOfficers = vi.hoisted(() => vi.fn().mockRejectedValue(new Error('Not Found')));
const fetchOfficerStatistics = vi.hoisted(() => vi.fn().mockRejectedValue(new Error('Not Found')));
vi.mock('../api/officerApi', () => ({ fetchOfficers, fetchOfficerStatistics }));

const fetchAdministrativeAreas = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    areas: [{ area_id: 'region-ET02', area_name: 'Afar', code: 'ET02', path_code: 'ET.ET02', level_name: 'Region', parent_administrative_area: 'ETH', is_group: 1, depth: 2 }],
    count: 1,
    level_name: 'Region',
    parent: null,
  })
);
vi.mock('@/features/metadata/api/metadataApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/metadata/api/metadataApi')>()),
  fetchAdministrativeAreas,
}));

afterEach(() => {
  vi.clearAllMocks();
});

/** `role` seeds the store with a signed-in user holding that role, as `loginThunk` would. */
function renderDirectory(role?: string) {
  const store = makeStore();
  if (role) {
    store.dispatch({ type: loginThunk.fulfilled.type, payload: { email: 'user@example.et', roles: [role] } });
  }
  return render(
    <Provider store={store}>
      <OfficerDirectory />
    </Provider>
  );
}

describe('OfficerDirectory', () => {
  it('defaults to the Admin tab, showing its officers and status counts', () => {
    renderDirectory();

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeTruthy();
    expect(screen.getByText('Tigist Alemu')).toBeTruthy();
    expect(screen.getByText('20 Active')).toBeTruthy();
    expect(screen.getByText('5 On Leave')).toBeTruthy();
    expect(screen.getByText('5 Inactive')).toBeTruthy();
  });

  it('switches tabs to show a different officer list and description', () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('tab', { name: /Nodal Officers \(L1\)/ }));

    expect(screen.getByRole('heading', { name: 'Nodal Officers (L1)' })).toBeTruthy();
    expect(screen.queryByText('Tigist Alemu')).toBeNull();
  });

  it('has a Reviewer tab with its own dummy, read-only-flavored officers', () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('tab', { name: /Reviewer/ }));

    expect(screen.getByRole('heading', { name: 'Reviewer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Reviewer' })).toBeTruthy();
    expect(screen.queryByText('Tigist Alemu')).toBeNull();
  });

  it('filters the current tab by search query', () => {
    renderDirectory();

    fireEvent.change(screen.getByPlaceholderText('Search officers...'), { target: { value: 'Tigist' } });

    expect(screen.getByText('Tigist Alemu')).toBeTruthy();
    expect(screen.queryByText('Dawit Haile')).toBeNull();
  });

  it('paginates results and advances to the next page', () => {
    const { container } = renderDirectory();

    expect(container.textContent).toContain('Showing 9 of 30 Admins lists');
    expect(screen.queryByText('Abel Dereje')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(screen.getByText('Abel Dereje')).toBeTruthy();
  });

  it('opens the add-officer modal with a tab-specific title', () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('button', { name: 'Add Admin' }));

    expect(screen.getByRole('heading', { name: 'Add Admin' })).toBeTruthy();
  });

  it('opens the advanced filters drawer with Category, Regions, and Status fields', () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('button', { name: /Advanced Filters/ }));

    expect(screen.getByRole('heading', { name: 'Advanced Filters' })).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Regions')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset Filters' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Apply Filters/ })).toBeTruthy();
  });

  it('shows a loading state then an error for the API-backed Nodal Officers tab when the list itself fails', async () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('tab', { name: /Nodal Officers \(L1\)/ }));

    expect(await screen.findByText('Not Found')).toBeTruthy();
  });

  it('still renders the officer list when only the statistics endpoint fails', async () => {
    const woredaOfficer = {
      name: 'woreda.officer@example.et',
      full_name: 'Woreda Officer',
      designation: 'Woreda Grievance Officer',
      level: 'L1',
      department: 'Woreda Agriculture Office',
      email: 'woreda.officer@example.et',
      phone: null,
      must_change_password: false,
      region: null,
      region_name: null,
      status: 'Active',
      service_categories: ['Inputs'],
      reports_to: null,
      reports_to_name: null,
      assignments: [],
    };
    // `page_size: 1` is the tab-badge count probe (useOfficerCount); the full page fetch
    // (useOfficerList) is what the test actually cares about — distinguishing by that
    // param, rather than call order, keeps this robust to how many count probes fire.
    fetchOfficers.mockImplementation((params: { page_size?: number }) =>
      params?.page_size === 1
        ? Promise.resolve({ officers: [], pagination: { page: 1, page_size: 1, total_count: 1, total_pages: 1, has_next: false, has_prev: false } })
        : Promise.resolve({
            officers: [woredaOfficer],
            pagination: { page: 1, page_size: 9, total_count: 1, total_pages: 1, has_next: false, has_prev: false },
          })
    );

    renderDirectory();
    fireEvent.click(screen.getByRole('tab', { name: /Nodal Officers \(L1\)/ }));

    expect(await screen.findByText('Woreda Officer')).toBeTruthy();
    expect(screen.queryByText('Not Found')).toBeNull();
  });

  it('hides the Add and Edit controls for a signed-in Grievance Review Officer', () => {
    renderDirectory('Grievance Review Officer');

    expect(screen.queryByRole('button', { name: 'Add Admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Tigist Alemu' })).toBeNull();
    // Still fully readable — only the write controls are gone.
    expect(screen.getByText('Tigist Alemu')).toBeTruthy();
  });

  it('shows the Add and Edit controls for a role other than Review Officer', () => {
    renderDirectory('Grievance Admin');

    expect(screen.getByRole('button', { name: 'Add Admin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit Tigist Alemu' })).toBeTruthy();
  });

  it('filters the API-backed Nodal Officers tab by the region area id, not its display name', async () => {
    fetchOfficers.mockResolvedValue({
      officers: [],
      pagination: { page: 1, page_size: 9, total_count: 0, total_pages: 1, has_next: false, has_prev: false },
    });

    renderDirectory();
    fireEvent.click(screen.getByRole('tab', { name: /Nodal Officers \(L1\)/ }));
    await screen.findByRole('button', { name: /Advanced Filters/ });

    fireEvent.click(screen.getByRole('button', { name: /Advanced Filters/ }));
    fireEvent.click(await screen.findByText('Select Regions'));
    fireEvent.click(await screen.findByText('Afar'));

    // The backend stores an officer's region as an area id — officers are never found by
    // searching on the display name, which is all the filter UI shows the admin.
    await screen.findByText(/Afar/);
    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'region-ET02' }),
      expect.anything()
    );
    expect(fetchOfficers).not.toHaveBeenCalledWith(expect.objectContaining({ region: 'Afar' }), expect.anything());
  });
});
