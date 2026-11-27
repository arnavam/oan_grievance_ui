import { fetchApi } from '@/lib/api/fetchApi';
import { z } from 'zod';

// `GET /api/v1/submitters/search` and `/search/details` (oan_grievance_service,
// api/v1/submitter.py): a Development Agent finds a farmer in the Farmer Registry
// by Fayda ID, then pulls the contact details to pre-fill the identity step.
// Any field the registry lacks is null.

const foundSchema = z.object({
  registry_id: z.string(),
  fayda_id: z.string(),
  submitter_name: z.string().nullish(),
});

const detailsSchema = z.object({
  contact_mobile: z.string().nullish(),
  contact_email: z.string().nullish(),
  region: z.string().nullish(),
  zone: z.string().nullish(),
  woreda: z.string().nullish(),
  kebele: z.string().nullish(),
});

export interface RegistryFarmer {
  registryId: string;
  faydaId: string;
  name: string | null;
}

export interface RegistryFarmerDetails {
  mobile: string | null;
  email: string | null;
  /** Place names as the registry holds them, not area ids. */
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
}

/** The farmer registered under this 12- or 16-digit Fayda ID. Rejects with an `ApiError` (404 when there is none). */
export async function searchFarmer(faydaId: string): Promise<RegistryFarmer> {
  const data = await fetchApi<{ farmer: unknown }>(
    `/api/v1/submitters/search?fayda_id=${encodeURIComponent(faydaId)}`,
    { method: 'GET' }
  );
  const farmer = foundSchema.parse(data.farmer);
  return { registryId: farmer.registry_id, faydaId: farmer.fayda_id, name: farmer.submitter_name ?? null };
}

/** Phone, email and place names of a farmer `searchFarmer` found. */
export async function fetchFarmerDetails(registryId: string): Promise<RegistryFarmerDetails> {
  const data = await fetchApi<{ farmer: unknown }>(
    `/api/v1/submitters/search/details?registry_id=${encodeURIComponent(registryId)}`,
    { method: 'GET' }
  );
  const farmer = detailsSchema.parse(data.farmer);
  return {
    mobile: farmer.contact_mobile ?? null,
    email: farmer.contact_email ?? null,
    region: farmer.region ?? null,
    zone: farmer.zone ?? null,
    woreda: farmer.woreda ?? null,
    kebele: farmer.kebele ?? null,
  };
}
