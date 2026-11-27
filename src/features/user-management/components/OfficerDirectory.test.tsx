/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import en from '../../../../messages/en.json';
import { loginThunk } from '@/features/auth/store/authSlice';
import { makeStore } from '@/store';
import { OfficerDirectory } from './OfficerDirectory';

const LADDER = vi.hoisted(() => [
  { level_code: 'nodal_officer', level_name: 'Kebele Nodal Officer', level_order: 10, is_active: true },
  { level_code: 'senior_nodal_officer', level_name: 'Woreda Nodal Officer', level_order: 20, is_active: true },
  { level_code: 'zonal_head', level_name: 'Zonal Head', level_order: 25, is_active: true },
  { level_code: 'department_head', level_name: 'Regional Bureau Head', level_order: 30, is_active: true },
  { level_code: 'review_officer', level_name: 'Review Officer', level_order: 910, is_active: false },
]);
vi.mock('../hooks/useRoleLevels', () => ({
  useRoleLevels: () => ({ levels: LADDER, isLoaded: true }),
  resetRoleLevelsCache: () => {},
}));

const currentSearchParams = new URLSearchParams();
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn((url: string) => {
    const query = url.split('?')[1] ?? '';
    const newParams = new URLSearchParams(query);
    Array.from(currentSearchParams.keys()).forEach((key) => currentSearchParams.delete(key));
    newParams.forEach((val, key) => currentSearchParams.set(key, val));
  }),
};
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/user-management',
  useSearchParams: () => currentSearchParams,
}));

function officerRecord(overrides: Record<string, unknown> = {}) {
  return {
    name: 'officer@example.et',
    full_name: 'Tigist Alemu',
    role: 'Officer',
    designation: 'Department Head',
    level: 'L4',
    department: 'Finance',
    email: 'officer@example.et',
    phone: null,
    must_change_password: false,
    region: null,
    region_name: null,
    status: 'Active',
    service_categories: ['Inputs'],
    reports_to: null,
    reports_to_name: null,
    assignments: [],
    ...overrides,
  };
}

function listData(officers: ReturnType<typeof officerRecord>[], totalCount = officers.length, page = 1) {
  const totalPages = Math.max(1, Math.ceil(totalCount / 9));
  return {
    officers,
    pagination: { page, page_size: 9, total_count: totalCount, total_pages: totalPages, has_next: page < totalPages, has_prev: page > 1 },
  };
}

const fetchOfficers = vi.hoisted(() => vi.fn().mockResolvedValue({ officers: [], pagination: { page: 1, page_size: 9, total_count: 0, total_pages: 1, has_next: false, has_prev: false } }));
const fetchOfficerStatistics = vi.hoisted(() => vi.fn().mockRejectedValue(new Error('Not Found')));
const fetchOfficerStatusCounts = vi.hoisted(() => vi.fn().mockResolvedValue({ active: 0, on_leave: 0, inactive: 0, total: 0 }));
vi.mock('../api/officerApi', () => ({
  fetchOfficers,
  fetchOfficerStatistics,
  fetchOfficerStatusCounts,
  fetchOfficerCandidates: vi.fn().mockResolvedValue({ candidates: [] }),
  fetchServiceCategoryNames: vi.fn().mockResolvedValue(['Inputs', 'Markets']),
}));

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
  Array.from(currentSearchParams.keys()).forEach((key) => currentSearchParams.delete(key));
});

/** `role` seeds the store with a signed-in user holding that role, as `loginThunk` would. */
function renderDirectory(role?: string) {
  const store = makeStore();
  if (role) {
    store.dispatch({ type: loginThunk.fulfilled.type, payload: { email: 'user@example.et', roles: [role] } });
  }
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Provider store={store}>
        <OfficerDirectory />
      </Provider>
    </NextIntlClientProvider>
  );
}

describe('OfficerDirectory', () => {
  it('defaults to the first rung of the ladder (role Officer, level nodal_officer) and shows its officers', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));

    renderDirectory();

    expect(screen.getByRole('heading', { name: 'Kebele Nodal Officer' })).toBeTruthy();
    expect(await screen.findByText('Tigist Alemu')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(expect.objectContaining({ role: 'Officer', level: 'nodal_officer' }), expect.anything());
  });

  it('switches tabs to show a different officer list and description', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));
    renderDirectory();
    await screen.findByText('Tigist Alemu');

    fetchOfficers.mockResolvedValue(listData([officerRecord({ full_name: 'Bureau Head', level: 'L4' })]));
    fireEvent.click(screen.getByRole('tab', { name: /Regional Bureau Head/ }));

    expect(screen.getByRole('heading', { name: 'Regional Bureau Head' })).toBeTruthy();
    expect(await screen.findByText('Bureau Head')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(expect.objectContaining({ role: 'Officer', level: 'department_head' }), expect.anything());
  });

  it('has a tab for every active rung of the ladder, junior to senior, then the Reviewer tab', () => {
    renderDirectory();

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\(.*\)/, '').trim())).toEqual([
      'Kebele Nodal Officer',
      'Woreda Nodal Officer',
      'Zonal Head',
      'Regional Bureau Head',
      'Reviewer',
    ]);
  });

  it('lists Zonal Heads by their level code, with no statistics (that endpoint only knows L1 and L2)', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord({ full_name: 'Zone Lead', level: 'L3' })]));
    renderDirectory();
    fireEvent.click(screen.getByRole('tab', { name: /Zonal Head/ }));

    expect(screen.getByRole('heading', { name: 'Zonal Head' })).toBeTruthy();
    expect(await screen.findByText('Zone Lead')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(expect.objectContaining({ role: 'Officer', level: 'zonal_head' }), expect.anything());
    expect(fetchOfficerStatistics).not.toHaveBeenCalledWith(expect.objectContaining({ level: 'L3' }), expect.anything());
  });

  it('queries the Reviewer tab with no level at all', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord({ full_name: 'Review Officer One', role: 'Reviewer', level: null, designation: null })]));

    renderDirectory();
    fireEvent.click(screen.getByRole('tab', { name: /Reviewer/ }));

    expect(screen.getByRole('heading', { name: 'Reviewer' })).toBeTruthy();
    expect(await screen.findByText('Review Officer One')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Reviewer', level: undefined }),
      expect.anything()
    );
  });

  it('opens the add-officer modal with a tab-specific title', () => {
    renderDirectory();

    fireEvent.click(screen.getByRole('button', { name: 'Add Kebele Nodal Officer' }));

    expect(screen.getByRole('heading', { name: 'Add Kebele Nodal Officer' })).toBeTruthy();
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

  it('shows a loading state then an error when the list itself fails', async () => {
    fetchOfficers.mockRejectedValue(new Error('Not Found'));

    renderDirectory();

    expect(await screen.findByText('Not Found')).toBeTruthy();
  });

  it('still renders the officer list when only the statistics endpoint fails', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord({ full_name: 'Woreda Officer', level: 'L1' })]));
    fetchOfficerStatistics.mockRejectedValue(new Error('Not Found'));

    renderDirectory();

    expect(await screen.findByText('Woreda Officer')).toBeTruthy();
    expect(screen.queryByText('Not Found')).toBeNull();
  });

  it('hides the Add/Edit controls and the Reviewer tab for a signed-in Grievance Review Officer', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));

    renderDirectory('Grievance Review Officer');

    expect(screen.queryByRole('button', { name: 'Add Kebele Nodal Officer' })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Reviewer/ })).toBeNull();
    // Still fully readable — only the write controls (and the admin-only Reviewer tab) are gone.
    expect(await screen.findByText('Tigist Alemu')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
  });

  it('shows the Add and Edit controls, and the Reviewer tab, for a role other than Review Officer', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));

    renderDirectory('Grievance Admin');

    expect(screen.getByRole('button', { name: 'Add Kebele Nodal Officer' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Reviewer/ })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Edit Tigist Alemu' })).toBeTruthy();
  });

  it('filters the current tab by search query, sent as the server-side q param', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));

    renderDirectory();
    await screen.findByText('Tigist Alemu');

    fireEvent.change(screen.getByPlaceholderText('Search officers...'), { target: { value: 'Tigist' } });

    await waitFor(() =>
      expect(fetchOfficers).toHaveBeenCalledWith(expect.objectContaining({ q: 'Tigist' }), expect.anything())
    );
  });

  it('paginates by sending the clicked page number as the server-side page param', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()], 30));

    const { container } = renderDirectory();
    await screen.findByText('Tigist Alemu');
    expect(container.textContent).toContain('Showing 1 of 30 Kebele Nodal Officers lists');

    fetchOfficers.mockResolvedValue(listData([officerRecord({ full_name: 'Abel Dereje' })], 30, 2));
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(await screen.findByText('Abel Dereje')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), expect.anything());
  });

  it('filters the officers by the region area id, not its display name', async () => {
    fetchOfficers.mockResolvedValue({
      officers: [],
      pagination: { page: 1, page_size: 9, total_count: 0, total_pages: 1, has_next: false, has_prev: false },
    });

    renderDirectory();
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

  it('activates tab specified in ?tab query param when valid', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord({ full_name: 'Senior Officer', level: 'L2' })]));
    currentSearchParams.set('tab', 'senior_nodal_officer');

    renderDirectory();

    expect(screen.getByRole('heading', { name: 'Woreda Nodal Officer' })).toBeTruthy();
    expect(await screen.findByText('Senior Officer')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Officer', level: 'senior_nodal_officer' }),
      expect.anything()
    );
  });

  it.each([
    ['admin', 'Regional Bureau Head', 'department_head'],
    ['nodal-l1', 'Kebele Nodal Officer', 'nodal_officer'],
    ['nodal-l2', 'Woreda Nodal Officer', 'senior_nodal_officer'],
  ])('still opens the tab an older link names, ?tab=%s', async (legacyId, heading, level) => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));
    currentSearchParams.set('tab', legacyId);

    renderDirectory();

    expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    expect(await screen.findByText('Tigist Alemu')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(expect.objectContaining({ role: 'Officer', level }), expect.anything());
  });

  it('safely falls back to the first tab when ?tab is a prototype property or invalid', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));
    currentSearchParams.set('tab', 'constructor');

    renderDirectory();

    expect(screen.getByRole('heading', { name: 'Kebele Nodal Officer' })).toBeTruthy();
    expect(await screen.findByText('Tigist Alemu')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Officer', level: 'nodal_officer' }),
      expect.anything()
    );
  });

  it('prevents Grievance Review Officer from accessing the Reviewer tab via ?tab=reviewer', async () => {
    fetchOfficers.mockResolvedValue(listData([officerRecord()]));
    currentSearchParams.set('tab', 'reviewer');

    renderDirectory('Grievance Review Officer');

    // UI guard enforces visibleTabs restriction; falls back to the default visible tab (the first rung)
    expect(screen.getByRole('heading', { name: 'Kebele Nodal Officer' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /Reviewer/ })).toBeNull();
    expect(await screen.findByText('Tigist Alemu')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Officer', level: 'nodal_officer' }),
      expect.anything()
    );
    expect(fetchOfficers).not.toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Reviewer' }),
      expect.anything()
    );
  });

  it('allows an Admin to open the Reviewer tab via ?tab=reviewer', async () => {
    fetchOfficers.mockResolvedValue(
      listData([officerRecord({ full_name: 'Review Officer One', role: 'Reviewer', level: null, designation: null })])
    );
    currentSearchParams.set('tab', 'reviewer');

    renderDirectory('Grievance Admin');

    expect(screen.getByRole('heading', { name: 'Reviewer' })).toBeTruthy();
    expect(await screen.findByText('Review Officer One')).toBeTruthy();
    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Reviewer', level: undefined }),
      expect.anything()
    );
  });
});
