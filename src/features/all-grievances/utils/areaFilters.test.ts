import { describe, expect, it } from 'vitest';
import { EMPTY_GRIEVANCE_FILTERS } from '../types';
import { setAreaSelection } from './areaFilters';

const oromia = { id: 'region-ET04', name: 'Oromia', pathCode: 'ET.ET04' };
const amhara = { id: 'region-ET03', name: 'Amhara', pathCode: 'ET.ET03' };
const basona = { id: 'woreda-ET040101', name: 'Basona Werana', pathCode: 'ET.ET04.ET0401.ET040101' };
const dessie = { id: 'woreda-ET030201', name: 'Dessie Zuria', pathCode: 'ET.ET03.ET0302.ET030201' };
const basonaKebele = { id: 'kebele-ET040101001', name: '01', pathCode: 'ET.ET04.ET0401.ET040101.ET040101001' };
const dessieKebele = { id: 'kebele-ET030201001', name: '01', pathCode: 'ET.ET03.ET0302.ET030201.ET030201001' };

const selected = {
  ...EMPTY_GRIEVANCE_FILTERS,
  regions: [oromia, amhara],
  woredas: [basona, dessie],
  kebeles: [basonaKebele, dessieKebele],
};

describe('setAreaSelection', () => {
  it('drops the woredas and kebeles under a region that is unticked, keeping the rest', () => {
    const next = setAreaSelection(selected, 'regions', [oromia]);
    expect(next.woredas).toEqual([basona]);
    expect(next.kebeles).toEqual([basonaKebele]);
  });

  it('keeps a same-named kebele only under the woreda it belongs to', () => {
    const next = setAreaSelection(selected, 'woredas', [dessie]);
    expect(next.kebeles).toEqual([dessieKebele]);
  });

  it('clears everything below when no region is left', () => {
    const next = setAreaSelection(selected, 'regions', []);
    expect(next).toMatchObject({ regions: [], woredas: [], kebeles: [] });
  });

  it('leaves the levels above alone when a lower level changes', () => {
    const next = setAreaSelection(selected, 'kebeles', []);
    expect(next.regions).toEqual(selected.regions);
    expect(next.woredas).toEqual(selected.woredas);
  });
});
