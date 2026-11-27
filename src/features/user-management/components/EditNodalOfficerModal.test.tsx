/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import en from '../../../../messages/en.json';
import { makeStore } from '@/store';
import { EditNodalOfficerModal } from './EditNodalOfficerModal';
import { updateOfficer } from '../api/officerApi';
import type { Officer } from '../data/officers';

vi.mock('../api/officerApi', () => ({
  updateOfficer: vi.fn().mockResolvedValue({ officer: { name: 'tigist@example.et' } }),
  resetTemporaryPassword: vi.fn(),
  fetchOfficers: vi.fn().mockResolvedValue({ officers: [], pagination: { total_count: 0 } }),
  fetchServiceCategoryNames: vi.fn().mockResolvedValue(['Inputs', 'Markets']),
  fetchGrievanceTypeNames: vi.fn().mockResolvedValue(['Seed quality']),
}));

vi.mock('../api/positionApi', () => ({
  fetchPositions: vi.fn().mockResolvedValue({
    positions: [{ position_id: 'P1', position_title: 'Crop DA', designation: 'Crop DA', active: true, holders: 0 }],
    total: 1,
  }),
}));

vi.mock('@/features/metadata/api/metadataApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/metadata/api/metadataApi')>()),
  fetchAdministrativeAreas: vi.fn().mockResolvedValue({ areas: [], count: 0, level_name: 'Kebele', parent: null }),
}));

const OFFICER: Officer = {
  id: 'tigist@example.et',
  name: 'Tigist Alemu',
  status: 'Active',
  roleTitle: 'Kebele Nodal Officer',
  department: '-',
  email: 'tigist@example.et',
  phone: '+251911000000',
  region: 'Kebele 01',
  regionId: 'kebele-1',
  tags: ['Inputs'],
  assigned: 0,
  resolved: 0,
  avgTimeDays: 0,
  resolutionRate: 0,
  avatarInitials: 'TA',
  avatarBg: '',
  avatarColor: '',
  mustChangePassword: false,
  reportsTo: null,
  reportsToName: null,
  designation: null,
};

function renderModal(props: Partial<Parameters<typeof EditNodalOfficerModal>[0]> = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Provider store={makeStore()}>
        <EditNodalOfficerModal
          isOpen
          onClose={onClose}
          onSaved={onSaved}
          officer={OFFICER}
          role="Officer"
          level="nodal_officer"
          areaLevel="Kebele"
          tabLabel="Kebele Nodal Officer"
          {...props}
        />
      </Provider>
    </NextIntlClientProvider>
  );
  return { onSaved, onClose };
}

describe('EditNodalOfficerModal', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows the account read-only, with no name, email or phone to type', () => {
    renderModal();
    expect(screen.getByText('Tigist Alemu')).toBeInTheDocument();
    expect(screen.getByText(/tigist@example.et/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter Full Name')).toBeNull();
    expect(screen.queryByPlaceholderText('Enter Phone Number')).toBeNull();
  });

  it('offers the designations and the officer\'s own level of area, seeded with where they sit', async () => {
    renderModal();
    expect(await screen.findByText('Designation')).toBeInTheDocument();
    expect(screen.getByText('Kebele')).toBeInTheDocument();
    expect(screen.queryByText('Region')).toBeNull();
  });

  it('saves the change without re-sending the account\'s own details', async () => {
    const { onSaved, onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(updateOfficer).toHaveBeenCalled());
    const payload = vi.mocked(updateOfficer).mock.calls[0]?.[1];
    expect(payload).toMatchObject({ status: 'Active', service_categories: ['Inputs'] });
    expect(payload).not.toHaveProperty('full_name');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('region');
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('will not save with every category cleared', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Inputs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Select at least one service category.')).toBeInTheDocument();
    expect(updateOfficer).not.toHaveBeenCalled();
  });

  it('does not save while a chosen category has not been added with +', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Service Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Markets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Press + to add the chosen category.')).toBeInTheDocument();
    expect(updateOfficer).not.toHaveBeenCalled();
  });

  it('adds a category from the dropdowns and saves it with the existing ones', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Service Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Markets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add this category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(updateOfficer).toHaveBeenCalled());
    expect(vi.mocked(updateOfficer).mock.calls[0]?.[1]).toMatchObject({ service_categories: ['Inputs', 'Markets'] });
  });
});
