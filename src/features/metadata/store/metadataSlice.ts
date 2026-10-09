import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  fetchGrievanceOptions,
  fetchSubmitterOptions,
} from '../api/metadataApi';
import type {
  GrievanceOptionsData,
  GrievanceOptionsQueryParams,
  SubmitterOptionsData,
  SubmitterOptionsQueryParams,
} from '../types';

/**
 * The only part of the store these selectors read. Typing them against this
 * instead of the whole `RootState` lets a caller holding just the metadata
 * slice pass `{ metadata }` without an `as RootState` cast — a cast that would
 * hide a selector later reaching into another slice. A full `RootState` still
 * satisfies it, so `useSelector(selectX)` call sites are unaffected.
 */
export type MetadataRootState = Pick<RootState, 'metadata'>;

export interface MetadataState {
  submitterOptions: SubmitterOptionsData | null;
  submitterOptionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  submitterOptionsError: string | null;

  grievanceOptions: GrievanceOptionsData | null;
  grievanceOptionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  grievanceOptionsError: string | null;

  selectedLanguage?: string;
}

const initialState: MetadataState = {
  submitterOptions: null,
  submitterOptionsStatus: 'idle',
  submitterOptionsError: null,

  grievanceOptions: null,
  grievanceOptionsStatus: 'idle',
  grievanceOptionsError: null,

  selectedLanguage: 'en',
};

export const fetchSubmitterOptionsThunk = createAsyncThunk<
  SubmitterOptionsData,
  SubmitterOptionsQueryParams | undefined,
  { rejectValue: string }
>('metadata/fetchSubmitterOptions', async (params, { rejectWithValue }) => {
  try {
    return await fetchSubmitterOptions(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch submitter options';
    return rejectWithValue(msg);
  }
});

export const fetchGrievanceOptionsThunk = createAsyncThunk<
  GrievanceOptionsData,
  GrievanceOptionsQueryParams | undefined,
  { rejectValue: string }
>('metadata/fetchGrievanceOptions', async (params, { rejectWithValue }) => {
  try {
    return await fetchGrievanceOptions(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch grievance options';
    return rejectWithValue(msg);
  }
});

const metadataSlice = createSlice({
  name: 'metadata',
  initialState,
  reducers: {
    clearMetadataErrors(state) {
      state.submitterOptionsError = null;
      state.grievanceOptionsError = null;
    },
    setSelectedLanguage(state, action: PayloadAction<string>) {
      state.selectedLanguage = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Submitter Options
    builder.addCase(fetchSubmitterOptionsThunk.pending, (state) => {
      state.submitterOptionsStatus = 'loading';
      state.submitterOptionsError = null;
    });
    builder.addCase(
      fetchSubmitterOptionsThunk.fulfilled,
      (state, action: PayloadAction<SubmitterOptionsData>) => {
        state.submitterOptionsStatus = 'succeeded';
        state.submitterOptions = action.payload;
      }
    );
    builder.addCase(fetchSubmitterOptionsThunk.rejected, (state, action) => {
      state.submitterOptionsStatus = 'failed';
      state.submitterOptionsError = action.payload ?? 'Error loading submitter options';
    });

    // Grievance Options
    builder.addCase(fetchGrievanceOptionsThunk.pending, (state) => {
      state.grievanceOptionsStatus = 'loading';
      state.grievanceOptionsError = null;
    });
    builder.addCase(
      fetchGrievanceOptionsThunk.fulfilled,
      (state, action: PayloadAction<GrievanceOptionsData>) => {
        state.grievanceOptionsStatus = 'succeeded';
        state.grievanceOptions = action.payload;
      }
    );
    builder.addCase(fetchGrievanceOptionsThunk.rejected, (state, action) => {
      state.grievanceOptionsStatus = 'failed';
      state.grievanceOptionsError = action.payload ?? 'Error loading grievance options';
    });

    // Matchers must be added AFTER all addCase calls in Redux Toolkit
    // User Preferred Language from auth/me or login (matched by action type to preserve feature isolation)
    builder.addMatcher(
      (action): action is PayloadAction<{ preferred_language?: string }> =>
        action.type === 'auth/getMe/fulfilled' || action.type === 'auth/login/fulfilled',
      (state, action) => {
        if (action.payload?.preferred_language) {
          state.selectedLanguage = action.payload.preferred_language;
        }
      }
    );
  },
});

export const { clearMetadataErrors, setSelectedLanguage } = metadataSlice.actions;
export const metadataReducer = metadataSlice.reducer;

// --- Selectors ---

export const selectSelectedLanguage = (state: MetadataRootState): string =>
  state.metadata.selectedLanguage || 'en';

/** Normalizes backend submitter type string to internal key if needed */
export function normalizeSubmitterType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('farmer') || lower === 'ind' || lower === 'individual') return 'individual';
  if (lower.includes('coop') || lower.includes('fpo') || lower === 'cooperative') return 'cooperative';
  if (lower.includes('ngo')) return 'ngo';
  if (lower.includes('woreda') || lower.includes('kebele') || lower.includes('body')) return 'woreda_kebele';
  if (lower.includes('development') || lower.includes('agent') || lower === 'da') return 'development_agent';
  return raw;
}

/** Normalizes backend submission channel string to internal key if needed */
export function normalizeSubmissionChannel(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'web' || lower.includes('web')) return 'web';
  if (lower === 'app' || lower.includes('mobile app') || lower === 'mobile') return 'mobile';
  if (lower.includes('mobile call') || lower === 'call' || (lower.includes('call') && !lower.includes('ivr'))) return 'call';
  if (lower.includes('ivr') || lower.includes('helpline')) return 'ivr';
  if (lower.includes('officer') || lower.includes('assisted') || lower.includes('da') || lower.includes('development')) return 'field_officer';
  return lower.replace(/\s+/g, '_');
}

export const selectSubmitterTypeOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.submitterOptions?.submitter_types],
  (backendTypes): Array<{ value: string; label: string }> => {
    if (backendTypes && backendTypes.length > 0) {
      return backendTypes.map((t) => ({
        value: normalizeSubmitterType(t.type_name || t.code),
        label: t.type_name,
      }));
    }
    return [];
  }
);

export const selectPreferredLanguageOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.submitterOptions?.preferred_languages],
  (backendLangs): Array<{ code: string; label: string; flag: string; flagUrl: string }> => {
    if (backendLangs && backendLangs.length > 0) {
      const flagMap: Record<string, string> = {
        en: '🇺🇸',
        am: '🇪🇹',
        om: '🇪🇹',
        ti: '🇪🇹',
        so: '🇸🇴',
        ar: '🇸🇦',
      };
      const flagUrlMap: Record<string, string> = {
        en: '/images/flags/us.svg',
        am: '/images/flags/et.svg',
        om: '/images/flags/et.svg',
        ti: '/images/flags/et.svg',
        so: '/images/flags/et.svg',
        ar: '/images/flags/et.svg',
      };
      return backendLangs.map((lang) => {
        const codeLower = lang.code.toLowerCase();
        return {
          code: lang.code,
          label: lang.label,
          flag: flagMap[codeLower] || '🌐',
          flagUrl: flagUrlMap[codeLower] || '/images/flags/et.svg',
        };
      });
    }
    return [];
  }
);

export const selectSubmissionChannelOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.submission_types ??
      state.metadata.grievanceOptions?.submission_channels,
  ],
  (backendChannels): Array<{ value: string; label: string }> => {
    if (backendChannels && backendChannels.length > 0) {
      const seen = new Set<string>();
      const options: Array<{ value: string; label: string }> = [];

      for (const c of backendChannels) {
        const name = typeof c === 'string' ? c : c.type_name;
        const code = typeof c === 'object' && c.code ? c.code : undefined;
        const baseVal = normalizeSubmissionChannel(code || name);
        let val = baseVal;
        let counter = 1;
        while (seen.has(val)) {
          val = `${baseVal}_${counter++}`;
        }
        seen.add(val);
        options.push({
          value: val,
          label: name,
        });
      }
      return options;
    }
    return [];
  }
);

export const selectServiceCategoryOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.service_categories ??
      state.metadata.grievanceOptions?.service_categories,
  ],
  (backendCategories): Array<{ value: string; label: string }> => {
    if (backendCategories && backendCategories.length > 0) {
      return backendCategories.map((c) => ({
        value: c.category_name,
        label: c.category_name,
      }));
    }
    return [];
  }
);

export const selectGrievanceTypeOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.grievance_types ??
      state.metadata.grievanceOptions?.grievance_types,
    (_state: MetadataRootState, selectedCategory?: string) => selectedCategory,
  ],
  (backendTypes, selectedCategory): Array<{ value: string; label: string }> => {
    if (backendTypes && backendTypes.length > 0) {
      let filtered = backendTypes;
      if (selectedCategory) {
        const matchCat = selectedCategory.toLowerCase();
        filtered = backendTypes.filter(
          (t) => t.service_category.toLowerCase() === matchCat
        );
      }
      // Unlike submission channel/submitter type/service category (each of
      // those doctypes autonames on its own display field, so the name IS the
      // label), Grievance Type autonames "format:GTYPE-{#####}" — its `name`
      // is a generated id, never the type_name. Sending the display text as
      // `grievance_type` (a Link field to Grievance Type) makes the backend
      // 404 with "Could not find Grievance Type: <label>" the moment a draft
      // is saved or the case is submitted, since Frappe validates a Link
      // field's value against the target doctype's actual `name`, not any of
      // its other fields.
      return filtered.map((t) => ({
        value: t.grievance_type_id,
        label: t.type_name,
      }));
    }

    return [];
  }
);

/**
 * Filter option lists for the grievance list screen.
 *
 * `value` is what the list API (`GET /api/v1/grievances`) expects for the matching query
 * parameter; `label` is what the user sees. The two differ for statuses, whose display
 * labels are translated server-side. The "All" pseudo-option is added by the dropdown
 * itself rather than living in the data.
 *
 * Memoized with `createSelector` so the array identity stays stable across renders.
 */
export const selectStatusFilterOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.grievanceOptions?.statuses],
  (statuses): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();
    for (const s of statuses ?? []) {
      if (s.status && !map.has(s.status)) {
        map.set(s.status, s.label || s.status);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }
);

export const selectDepartmentOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.grievanceOptions?.departments],
  (departments): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();
    for (const d of departments ?? []) {
      if (d.department_name && !map.has(d.department_name)) {
        map.set(d.department_name, d.department_name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }
);

export const selectCategoryFilterOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.service_categories ??
      state.metadata.grievanceOptions?.service_categories,
  ],
  (categories): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();
    for (const c of categories ?? []) {
      if (c.category_name && !map.has(c.category_name)) {
        map.set(c.category_name, c.category_name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }
);
