import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@/features/auth/store/authSlice';
import { metadataReducer, type MetadataState } from '@/features/metadata/store/metadataSlice';
import { areaQueryArgs, areasApi } from '@/features/metadata/api/areasApi';
import { toAreaRef } from '@/features/metadata/areaRef';
import type { AdministrativeArea } from '@/features/metadata/types';

// Reference data shared by the submit-grievance component tests: the areas
// and dropdown options the wizard's selects are populated from, in a store
// that looks as if they have already been loaded.

export const region: AdministrativeArea = {
  area_id: 'region-ET04', area_name: 'Oromia', code: 'ET04', path_code: 'ET.ET04',
  level_name: 'Region', is_group: 1, depth: 2,
};
export const zone: AdministrativeArea = {
  area_id: 'zone-ET0401', area_name: 'North Shewa', code: 'ET0401', path_code: 'ET.ET04.ET0401',
  level_name: 'Zone', parent_administrative_area: 'region-ET04', is_group: 1, depth: 3,
};
export const woreda: AdministrativeArea = {
  area_id: 'woreda-ET040101', area_name: 'Basona Werana', code: 'ET040101', path_code: 'ET.ET04.ET0401.ET040101',
  level_name: 'Woreda', parent_administrative_area: 'zone-ET0401', is_group: 0, depth: 4,
};
export const kebele: AdministrativeArea = {
  area_id: 'kebele-ET040101001', area_name: 'Kebele 01', code: 'ET040101001', path_code: 'ET.ET04.ET0401.ET040101.ET040101001',
  level_name: 'Kebele', parent_administrative_area: 'woreda-ET040101', is_group: 0, depth: 5,
};

/** A store holding that reference data, with every load already marked as succeeded. */
export function makeStore(overrides: Partial<MetadataState> = {}) {
  const metadata: MetadataState = {
    submitterOptions: {
      submitter_types: [{ type_name: 'Individual Farmer', code: 'IND', description: 'Farmer' }],
      submission_types: [{ type_name: 'Web Portal', code: 'WEB', description: '' }],
      preferred_languages: [],
      service_categories: [{ category_name: 'Inputs', code: '001', sort_order: 1 }],
      grievance_types: [{ grievance_type_id: 'GTYPE-00001', type_name: 'Fertilizer Shortage', service_category: 'Inputs' }],
    },
    submitterOptionsStatus: 'succeeded',
    submitterOptionsError: null,
    grievanceOptions: null,
    grievanceOptionsStatus: 'idle',
    grievanceOptionsError: null,
    selectedLanguage: 'en',
    ...overrides,
  };
  const store = configureStore({
    reducer: { auth: authReducer, metadata: metadataReducer, [areasApi.reducerPath]: areasApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(areasApi.middleware),
    preloadedState: { metadata },
  });
  store.dispatch(
    areasApi.util.upsertQueryEntries([
      { endpointName: 'getAreas', arg: areaQueryArgs('Region'), value: [region] },
      { endpointName: 'getAreas', arg: areaQueryArgs('Zone', [region.area_id]), value: [zone] },
      { endpointName: 'getAreas', arg: areaQueryArgs('Woreda', [zone.area_id]), value: [woreda] },
      { endpointName: 'getAreas', arg: areaQueryArgs('Kebele', [woreda.area_id]), value: [kebele] },
    ])
  );
  return store;
}

/** The fixture areas as the wizard holds them once selected. */
export const regionRef = toAreaRef(region);
export const zoneRef = toAreaRef(zone);
export const woredaRef = toAreaRef(woreda);
export const kebeleRef = toAreaRef(kebele);
