import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { metadataService } from './metadataApi';

describe('metadataService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('exposes all four metadata endpoints on metadataService', () => {
    expect(typeof metadataService.getSubmitterOptions).toBe('function');
    expect(typeof metadataService.getAdministrativeAreas).toBe('function');
    expect(typeof metadataService.getAdministrativeAreaAncestors).toBe('function');
    expect(typeof metadataService.getGrievanceOptions).toBe('function');
  });

  it('calls submitters options endpoint and unwraps data', async () => {
    const mockData = {
      submitter_types: [{ type_name: 'Individual Farmer', code: 'IND', description: 'Farmer' }],
      submission_types: [{ type_name: 'Web Portal', code: 'WEB', description: 'Web' }],
      preferred_languages: [{ code: 'en', label: 'English' }],
      service_categories: [{ category_name: 'Inputs', code: 'INPT', sort_order: 1 }],
      grievance_types: [
        { grievance_type_id: 'gt-1', type_name: 'Fertilizer Shortage', service_category: 'Inputs' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: mockData }),
    } as Response);

    const result = await metadataService.getSubmitterOptions({ service_category: 'Inputs' });
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const calledUrl = (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(calledUrl).toContain('/api/proxy/api/v1/submitters/options?service_category=Inputs');
  });

  it('calls administrative areas endpoint with query params', async () => {
    const mockAreas = {
      areas: [
        {
          area_id: 'area-1',
          area_name: 'Oromia',
          code: 'ET-OR',
          path_code: 'ET.ET04',
          level_name: 'Region',
          is_group: 1,
          depth: 1,
        },
      ],
      count: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockAreas }),
    } as Response);

    const result = await metadataService.getAdministrativeAreas({ level_name: 'Region', limit: 10 });
    expect(result).toEqual(mockAreas);

    const calledUrl = (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(calledUrl).toContain('/api/proxy/api/v1/administrative-areas?level_name=Region&limit=10');
  });

  it('serializes multiple parents as comma-separated list in query params', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { areas: [], count: 0 } }),
    } as Response);

    await metadataService.getAdministrativeAreas({
      parent: ['zone-ET1401', 'zone-ET1402'],
      level_name: 'Woreda',
    });

    const calledUrl = (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(calledUrl).toContain('/api/proxy/api/v1/administrative-areas?parent=zone-ET1401%2Czone-ET1402&level_name=Woreda');
  });
});
