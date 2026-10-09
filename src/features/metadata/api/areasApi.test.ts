import { describe, expect, it } from 'vitest';
import { areaQueryArgs } from './areasApi';

describe('areaQueryArgs', () => {
  it('normalizes parents so the same selection in any order hits one cache entry', () => {
    expect(areaQueryArgs('Woreda', ['region-ET04', 'region-ET03', 'region-ET04'])).toEqual(
      areaQueryArgs('Woreda', ['region-ET03', 'region-ET04'])
    );
  });

  it('trims the search term', () => {
    expect(areaQueryArgs('Kebele', ['woreda-1'], '  01 ').search).toBe('01');
  });
});
