/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import en from '../../../../messages/en.json';
import { makeStore } from '@/store';
import { AddNodalOfficerModal } from './AddNodalOfficerModal';
import { createOfficer, fetchOfficerCandidates } from '../api/officerApi';

const CANDIDATE = { name: 'abebe@example.et', full_name: 'Abebe Bikila', email: 'abebe@example.et', phone: '+251911000000', delegated: false };

vi.mock('../api/officerApi', () => ({
  createOfficer: vi.fn().mockResolvedValue({
    officer: { name: 'depthead@example.et' },
    message: 'Officer created successfully',
  }),
  fetchOfficerCandidates: vi.fn().mockResolvedValue({
    candidates: [
      { name: 'abebe@example.et', full_name: 'Abebe Bikila', email: 'abebe@example.et', phone: '+251911000000', delegated: false },
    ],
  }),
  fetchCategoryAssignments: vi.fn().mockResolvedValue({ assignments: [], pagination: {} }),
  fetchOfficers: vi.fn().mockResolvedValue({ officers: [], pagination: { total_count: 0 } }),
  fetchServiceCategoryNames: vi.fn().mockResolvedValue(['Inputs', 'Markets']),
  fetchGrievanceTypeNames: vi.fn().mockResolvedValue(['Seed quality', 'Fertiliser shortage']),
}));

vi.mock('../api/positionApi', () => ({
  fetchPositions: vi.fn().mockResolvedValue({
    positions: [
      { position_id: 'P1', position_title: 'Crop DA', designation: 'Crop DA', role_level: 'nodal_officer', active: true, holders: 0 },
      { position_id: 'P2', position_title: 'Old post', designation: 'Old post', role_level: 'nodal_officer', active: false, holders: 0 },
    ],
    total: 2,
  }),
}));

vi.mock('@/features/metadata/api/metadataApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/metadata/api/metadataApi')>()),
  fetchAdministrativeAreas: vi.fn().mockResolvedValue({
    areas: [],
    count: 0,
    level_name: 'Region',
    parent: null,
  }),
  fetchGrievanceOptions: vi.fn().mockResolvedValue({
    departments: [{ department_id: 'DEP-1', department_name: 'Ministry of Agriculture' }],
    service_categories: [
      { category_id: 'CAT-1', category_name: 'Inputs', is_active: true },
      { category_id: 'CAT-2', category_name: 'Markets', is_active: true },
    ],
    statuses: [],
    grievance_types: [],
    submission_channels: [],
  }),
}));

function renderModal(props: Partial<Parameters<typeof AddNodalOfficerModal>[0]> = {}) {
  const store = makeStore();
  const onCreated = vi.fn();
  const onClose = vi.fn();

  render(
    <NextIntlClientProvider locale="en" messages={en}>
    <Provider store={store}>
      <AddNodalOfficerModal
        isOpen={true}
        onClose={onClose}
        role="Officer"
        level="department_head"
        tabLabel="Category Admin"
        onCreated={onCreated}
        {...props}
      />
    </Provider>
    </NextIntlClientProvider>
  );

  return { store, onCreated, onClose };
}

/** Types in the search box and picks the account the service answers with. */
async function pickUser() {
  const search = screen.getByRole('combobox');
  fireEvent.change(search, { target: { value: 'abebe' } });
  fireEvent.click(await screen.findByRole('button', { name: /Abebe Bikila/ }));
}

/** Picks a service category (and, optionally, some of its grievance types), then presses +. */
async function addCategory(name: string, types: string[] = []) {
  fireEvent.click(await screen.findByRole('button', { name: 'Service Category' }));
  fireEvent.click(await screen.findByRole('option', { name }));
  if (types.length > 0) {
    fireEvent.click(await screen.findByRole('button', { name: 'Grievance Types' }));
    for (const type of types) fireEvent.click(await screen.findByRole('option', { name: type }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Add this category' }));
}

describe('AddNodalOfficerModal', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('asks for a registered user to search for, not a name, email or phone to type', async () => {
    renderModal();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    // Focusing the box lists no one until something is typed.
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(fetchOfficerCandidates).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Enter Full Name')).toBeNull();
    expect(screen.queryByPlaceholderText('Enter Email ID')).toBeNull();
    expect(screen.queryByPlaceholderText('Enter Phone Number')).toBeNull();
    // Nothing else is asked until someone is chosen.
    expect(screen.queryByText('Service Categories')).toBeNull();

    await pickUser();
    await waitFor(() => expect(fetchOfficerCandidates).toHaveBeenCalledWith({ role: 'Officer', q: 'abebe' }, expect.anything()));
    expect(screen.getByText('Service Categories')).toBeInTheDocument();
  });

  it('creates the officer from the chosen account and the picked categories', async () => {
    const { onCreated, onClose } = renderModal({ level: 'department_head' });

    await pickUser();
    await addCategory('Inputs');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(createOfficer).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Officer',
          level: 'department_head',
          full_name: CANDIDATE.full_name,
          email: CANDIDATE.email,
          phone: CANDIDATE.phone,
          department: null,
          service_categories: ['Inputs'],
          region: null,
          reports_to: null,
        })
      );
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('lets the admin add several categories, each narrowed to some grievance types', async () => {
    renderModal({ level: 'department_head' });
    await pickUser();

    // Types wait for a category.
    expect(screen.getByRole('button', { name: 'Grievance Types' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add this category' })).toBeDisabled();

    await addCategory('Inputs', ['Seed quality']);
    await addCategory('Markets');
    expect(screen.getByText('Inputs')).toBeInTheDocument();
    expect(screen.getByText('Seed quality')).toBeInTheDocument();
    expect(screen.getByText('Markets')).toBeInTheDocument();
    expect(screen.getByText('All types')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Markets' }));
    expect(screen.queryByText('Markets')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(createOfficer).toHaveBeenCalledWith(expect.objectContaining({ service_categories: ['Inputs'] })));
  });

  it('asks the admin to press + when a category is chosen but not added', async () => {
    renderModal({ level: 'department_head' });
    await pickUser();
    fireEvent.click(await screen.findByRole('button', { name: 'Service Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Inputs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Press + to add the chosen category.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
  });

  it('does not save while a chosen category has not been added with +, even if another was', async () => {
    renderModal({ level: 'department_head' });
    await pickUser();
    await addCategory('Inputs');
    fireEvent.click(await screen.findByRole('button', { name: 'Service Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Markets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Press + to add the chosen category.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
  });

  it('says plainly that picked grievance types are not saved', async () => {
    renderModal({ level: 'department_head' });
    await pickUser();
    expect(screen.queryByText(/not saved yet/)).toBeNull();

    await addCategory('Inputs', ['Seed quality']);
    expect(screen.getByText(/Grievance types are not saved yet/)).toBeInTheDocument();
  });

  it('does not submit until a user is chosen', async () => {
    const { onCreated } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Select a user.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it.each([
    ['a first-rung officer', { role: 'Officer' as const, level: 'nodal_officer', tabLabel: 'Kebele Nodal Officer' }],
    ['a Reviewer', { role: 'Reviewer' as const, level: undefined, tabLabel: 'Reviewer' }],
  ])('requires a service category for %s and does not submit without one', async (_name, props) => {
    const { onCreated } = renderModal(props);

    await pickUser();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Select at least one service category.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('asks a Kebele officer for the whole location, down to the Kebele, and their designation', async () => {
    const { onCreated } = renderModal({
      level: 'nodal_officer',
      tabLabel: 'Kebele Nodal Officer',
      areaLevel: 'Kebele',
      supervisorLevel: 'senior_nodal_officer',
      supervisorLabel: 'Woreda Nodal Officer',
    });

    await pickUser();

    expect(screen.getByText('Kebele')).toBeInTheDocument();
    expect(screen.queryByText('Region')).toBeNull();
    expect(screen.queryByText('Zone')).toBeNull();
    expect(screen.queryByText('Woreda')).toBeNull();
    expect(await screen.findByText('Designation')).toBeInTheDocument();
    expect(screen.getByText('Reports To (Woreda Nodal Officer)')).toBeInTheDocument();

    await addCategory('Inputs');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Choose a location.')).toBeInTheDocument();
    expect(createOfficer).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('stops a Zonal Head\'s location at the Zone', async () => {
    renderModal({ level: 'zonal_head', tabLabel: 'Zonal Head', areaLevel: 'Zone' });
    await pickUser();

    expect(screen.getByText('Zone')).toBeInTheDocument();
    expect(screen.queryByText('Region')).toBeNull();
    expect(screen.queryByText('Woreda')).toBeNull();
    expect(screen.queryByText('Kebele')).toBeNull();
  });

  it('asks a Reviewer for no location or designation', async () => {
    renderModal({ role: 'Reviewer', level: undefined, tabLabel: 'Reviewer' });
    await pickUser();

    expect(screen.queryByText('Region')).toBeNull();
    expect(screen.queryByText('Designation')).toBeNull();
  });
});
