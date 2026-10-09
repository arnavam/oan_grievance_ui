import { describe, it, expect } from 'vitest';
import { selectGrievanceTypeOptions, type MetadataRootState, type MetadataState } from './metadataSlice';

function createMockRootState(metadataOverrides: Partial<MetadataState> = {}): MetadataRootState {
  return {
    metadata: {
      submitterOptions: null,
      submitterOptionsStatus: 'idle',
      submitterOptionsError: null,
      grievanceOptions: null,
      grievanceOptionsStatus: 'idle',
      grievanceOptionsError: null,
      ...metadataOverrides,
    },
  };
}

describe('selectGrievanceTypeOptions', () => {
  // Grievance Type autonames "format:GTYPE-{#####}" on the backend — its
  // `name` (what the grievance_type Link field must hold) is a generated id,
  // never the type_name. Sending the display text 404s the moment a draft is
  // saved or a case is submitted: "Could not find Grievance Type: <label>".
  // Unlike this one, submission channel/submitter type/service category each
  // autoname on their own display field, so their value IS their label —
  // don't "fix" this one to match those without checking the doctype first.
  it('uses grievance_type_id as the value and the display name as the label', () => {
    const state = createMockRootState({
      submitterOptions: {
        submitter_types: [],
        submission_types: [],
        preferred_languages: [],
        service_categories: [],
        grievance_types: [
          { grievance_type_id: 'GTYPE-00001', type_name: 'Fertilizer Shortage', service_category: 'Inputs' },
        ],
      },
    });

    expect(selectGrievanceTypeOptions(state)).toEqual([
      { value: 'GTYPE-00001', label: 'Fertilizer Shortage' },
    ]);
  });
});
