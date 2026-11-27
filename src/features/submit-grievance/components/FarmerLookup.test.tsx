// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetchApi';
import en from '../../../../messages/en.json';

const { searchFarmer, fetchFarmerDetails, matchFarmerAreas } = vi.hoisted(() => ({
  searchFarmer: vi.fn(),
  fetchFarmerDetails: vi.fn(),
  matchFarmerAreas: vi.fn(),
}));
vi.mock('../api/farmerSearchApi', () => ({ searchFarmer, fetchFarmerDetails }));
vi.mock('../matchFarmerAreas', () => ({ matchFarmerAreas }));

import { FarmerLookup } from './FarmerLookup';

afterEach(cleanup);

const t = en.submitGrievance.identityStep.farmerLookup;
const FAYDA = '1234567890123456';
const FARMER = { registryId: 'REG-1', faydaId: FAYDA, name: 'Abebe Bikila' };
const DETAILS = {
  mobile: '+251911234567',
  email: 'abebe@example.com',
  region: 'Amhara',
  zone: null,
  woreda: null,
  kebele: null,
};

const setIdentityValue = vi.fn();
const onFarmerAreas = vi.fn();

function renderLookup(faydaId = FAYDA, withAreasCallback = true) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FarmerLookup
        faydaId={faydaId}
        setIdentityValue={setIdentityValue}
        onFarmerAreas={withAreasCallback ? onFarmerAreas : undefined}
      />
    </NextIntlClientProvider>
  );
}

const searchButton = () => screen.getByRole('button', { name: t.search });

async function findFarmer() {
  fireEvent.click(searchButton());
  await screen.findByText(t.found);
}

beforeEach(() => {
  searchFarmer.mockReset().mockResolvedValue(FARMER);
  fetchFarmerDetails.mockReset().mockResolvedValue(DETAILS);
  matchFarmerAreas.mockReset().mockResolvedValue({});
  setIdentityValue.mockReset();
  onFarmerAreas.mockReset();
});

describe('FarmerLookup: searching', () => {
  it('only enables the search for a 12- or 16-digit Fayda ID', () => {
    for (const invalid of ['12345', '1234567890123']) {
      const { unmount } = renderLookup(invalid);
      expect(searchButton()).toBeDisabled();
      unmount();
    }

    for (const valid of ['123456789012', FAYDA]) {
      const { unmount } = renderLookup(valid);
      expect(searchButton()).toBeEnabled();
      unmount();
    }
  });

  it('searches with the digits of a formatted ID', async () => {
    renderLookup('1234 5678 9012 3456');
    expect(searchButton()).toBeEnabled();
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchFarmer).toHaveBeenCalledWith(FAYDA));
  });

  it('shows the match for the agent to check, without contact details yet', async () => {
    renderLookup();
    await findFarmer();

    expect(screen.getByText('Abebe Bikila')).toBeInTheDocument();
    expect(screen.getByText(FAYDA)).toBeInTheDocument();
    expect(fetchFarmerDetails).not.toHaveBeenCalled();
    expect(setIdentityValue).not.toHaveBeenCalled();
  });

  it('shows a dash for a farmer the registry has no name for', async () => {
    searchFarmer.mockResolvedValue({ ...FARMER, name: null });
    renderLookup();
    await findFarmer();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('disables the button while searching', async () => {
    searchFarmer.mockReturnValue(new Promise(() => {}));
    renderLookup();
    fireEvent.click(searchButton());
    expect(await screen.findByRole('button', { name: t.searching })).toBeDisabled();
  });

  it('says no farmer was found on a 404', async () => {
    searchFarmer.mockRejectedValue(new ApiError('Not found', undefined, 404));
    renderLookup();
    fireEvent.click(searchButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(t.notFound);
  });

  it('reports any other failure as a failed search', async () => {
    searchFarmer.mockRejectedValue(new ApiError('Server error', undefined, 500));
    renderLookup();
    fireEvent.click(searchButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(t.failed);
  });

  it('treats a non-API error as a failed search, not "not found"', async () => {
    searchFarmer.mockRejectedValue(new Error('network'));
    renderLookup();
    fireEvent.click(searchButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(t.failed);
  });

  it('drops the previous match when searching again', async () => {
    renderLookup();
    await findFarmer();
    searchFarmer.mockRejectedValue(new ApiError('Not found', undefined, 404));
    fireEvent.click(searchButton());

    await screen.findByText(t.notFound);
    expect(screen.queryByText(t.found)).not.toBeInTheDocument();
  });
});

describe('FarmerLookup: using the details', () => {
  it('copies name, split phone and email into the form, and hands over the matched areas', async () => {
    const areas = { region: { id: 'r1', name: 'Amhara', pathCode: 'ET.r1' } };
    matchFarmerAreas.mockResolvedValue(areas);
    renderLookup();
    await findFarmer();
    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));

    await waitFor(() => expect(onFarmerAreas).toHaveBeenCalledWith(areas));
    expect(fetchFarmerDetails).toHaveBeenCalledWith('REG-1');
    expect(setIdentityValue).toHaveBeenCalledWith('farmerName', 'Abebe Bikila');
    expect(setIdentityValue).toHaveBeenCalledWith('phoneCode', '+251');
    expect(setIdentityValue).toHaveBeenCalledWith('phoneNumber', '911234567');
    expect(setIdentityValue).toHaveBeenCalledWith('email', 'abebe@example.com');
    expect(matchFarmerAreas).toHaveBeenCalledWith(DETAILS);
  });

  it('leaves out what the registry does not have', async () => {
    searchFarmer.mockResolvedValue({ ...FARMER, name: null });
    fetchFarmerDetails.mockResolvedValue({ ...DETAILS, mobile: null, email: null });
    renderLookup();
    await findFarmer();
    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));

    await waitFor(() => expect(onFarmerAreas).toHaveBeenCalled());
    expect(setIdentityValue).not.toHaveBeenCalled();
  });

  it('is not a failed fill when the places cannot be matched', async () => {
    matchFarmerAreas.mockRejectedValue(new Error('areas down'));
    renderLookup();
    await findFarmer();
    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));

    await waitFor(() => expect(onFarmerAreas).toHaveBeenCalledWith({}));
    expect(screen.queryByText(t.fillFailed)).not.toBeInTheDocument();
  });

  it('works without an areas callback', async () => {
    renderLookup(FAYDA, false);
    await findFarmer();
    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));

    await waitFor(() => expect(setIdentityValue).toHaveBeenCalledWith('email', 'abebe@example.com'));
    expect(screen.queryByText(t.fillFailed)).not.toBeInTheDocument();
  });

  it('shows an error and fills nothing when the details cannot be fetched, and can retry', async () => {
    fetchFarmerDetails.mockRejectedValueOnce(new Error('down'));
    renderLookup();
    await findFarmer();
    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));

    expect(await screen.findByText(t.fillFailed)).toBeInTheDocument();
    expect(setIdentityValue).not.toHaveBeenCalled();
    expect(onFarmerAreas).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));
    await waitFor(() => expect(onFarmerAreas).toHaveBeenCalled());
    expect(screen.queryByText(t.fillFailed)).not.toBeInTheDocument();
  });

  it('disables the button while filling', async () => {
    fetchFarmerDetails.mockReturnValue(new Promise(() => {}));
    renderLookup();
    await findFarmer();
    fireEvent.click(screen.getByRole('button', { name: t.useDetails }));
    expect(await screen.findByRole('button', { name: t.filling })).toBeDisabled();
  });
});
