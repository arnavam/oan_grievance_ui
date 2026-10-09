// The one submitter type the register form sends to the backend, and the name
// the backend knows it by. Plain module (no React) so the register API route
// can import it too.
//
// The backend profile's `submitter_type` is what login returns as the user's
// type — it drives the header badge, the Profile page and Submit Grievance's
// starting type — and it can only be set when the account is registered; there
// is no endpoint to change it afterwards. Left unsent it defaults to
// "Individual Farmer", which is how every Development Agent used to end up
// showing as a farmer.
//
// Only types the backend can register from the fields this form collects are
// listed. The organisation types (Cooperative, FPO, NGO, Woreda/Kebele Body)
// additionally need a registration number, which registration doesn't send, so
// asking for one of them would make the backend reject the sign-up outright.
// Individual Farmer needs no entry: it is the default.
const BACKEND_TYPE_BY_SUBMITTER_TYPE: Record<string, string> = {
  development_agent: 'Development Agent',
};

/** The backend type name to register `submitterType` as, or undefined to leave it to the backend's default. */
export function backendSubmitterTypeFor(submitterType: string): string | undefined {
  return BACKEND_TYPE_BY_SUBMITTER_TYPE[submitterType];
}

/** Whether `value` is a type name registration may request — the register route refuses anything else. */
export function isRegistrableSubmitterType(value: unknown): value is string {
  return typeof value === 'string' && Object.values(BACKEND_TYPE_BY_SUBMITTER_TYPE).includes(value);
}
