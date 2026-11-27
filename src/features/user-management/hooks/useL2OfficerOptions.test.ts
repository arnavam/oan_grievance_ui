/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fetchOfficers } from '../api/officerApi';
import { useL2OfficerOptions } from './useL2OfficerOptions';

vi.mock('../api/officerApi', () => ({
  fetchOfficers: vi.fn(),
}));

const officer = (name: string) => ({ name, full_name: name.toUpperCase() });

describe('useL2OfficerOptions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('asks once per category, keeping a name with spaces whole', async () => {
    vi.mocked(fetchOfficers).mockResolvedValue({ officers: [officer('a')] } as never);

    renderHook(() => useL2OfficerOptions(true, 'senior_nodal_officer', 'ET.ET04.ET0401', true, ['Crop Production', 'Markets'], true));

    await waitFor(() => expect(fetchOfficers).toHaveBeenCalledTimes(2));
    const asked = vi.mocked(fetchOfficers).mock.calls.map(([params]) => params?.service_category);
    expect(asked).toEqual(['Crop Production', 'Markets']);
  });

  it('lists only supervisors who cover every category', async () => {
    vi.mocked(fetchOfficers).mockImplementation((params) =>
      Promise.resolve({
        officers: params?.service_category === 'Inputs' ? [officer('a'), officer('b')] : [officer('b')],
      } as never)
    );

    const { result } = renderHook(() =>
      useL2OfficerOptions(true, 'senior_nodal_officer', 'ET.ET04.ET0401', true, ['Inputs', 'Markets'], true)
    );

    await waitFor(() => expect(result.current.options).toEqual([{ value: 'b', label: 'B' }]));
  });

  it('waits for an area and a category before asking', () => {
    renderHook(() => useL2OfficerOptions(true, 'senior_nodal_officer', undefined, true, [], true));
    renderHook(() => useL2OfficerOptions(true, 'senior_nodal_officer', 'ET.ET04', true, [], true));
    expect(fetchOfficers).not.toHaveBeenCalled();
  });
});
