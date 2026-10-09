"use client";

import { SIIdField, SIPhoneFormField, SITextField } from "./SI-fields";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "orgName", label: "Organisation Name", required: true },
  { key: "registrationNumber", label: "Registration Number", required: true },
  { key: "representativeName", label: "Authorised Representative", required: true },
  { key: "representativeFaydaId", label: "Representative Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Mobile", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function NGOForm({ values, setValue, hiddenFields = [], errors, onFieldBlur }: SIFormProps) {
  const field = { values, setValue, errors, onFieldBlur };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <SITextField
        {...field}
        name="orgName"
        label="Organisation Name"
        required
        placeholder="Enter Full registered organisation name"
      />

      <SITextField
        {...field}
        name="registrationNumber"
        label="Registration Number"
        required
        placeholder="Enter COOP-XX-2024-XXXX"
      />

      <SITextField
        {...field}
        name="representativeName"
        label="Authorised Representative"
        required
        placeholder="Enter Rep's full name"
      />

      <SIIdField
        {...field}
        name="representativeFaydaId"
        label="Representative Fayda ID"
        required
        placeholder="Enter 16-digit Fayda ID"
      />

      {!hiddenFields.includes("phoneNumber") && (
        <SIPhoneFormField {...field} label="Contact Mobile" required />
      )}

      {!hiddenFields.includes("email") && (
        <SITextField {...field} name="email" type="email" label="Contact Email ID" placeholder="Enter Contact Email ID" />
      )}
    </div>
  );
}
