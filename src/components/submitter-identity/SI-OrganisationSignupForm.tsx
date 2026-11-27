"use client";

import { SIIdField } from "./SI-fields";
import type { SIFormProps } from "./SI-types";

/**
 * What an NGO or FPO is asked at sign-up: just its representative's Fayda ID,
 * like an Individual Farmer is asked for their own. The organisation itself —
 * name, registration number, authorised representative, address, contacts — is
 * collected once, on the "Complete Registration" screen shown at first sign-in.
 */
export function OrganisationSignupForm({ values, setValue, errors, onFieldBlur }: SIFormProps) {
  return (
    <div className="mt-6">
      <SIIdField
        values={values}
        setValue={setValue}
        errors={errors}
        onFieldBlur={onFieldBlur}
        name="representativeFaydaId"
        label="Representative Fayda ID"
        required
      />
    </div>
  );
}
