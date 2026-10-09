"use client";

import { SIIdField, SIPhoneFormField, SITextField } from "./SI-fields";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "fullName", label: "Full Name", required: true },
  { key: "faydaId", label: "Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Number", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function IndividualFarmerForm({ values, setValue, hiddenFields = [], errors, onFieldBlur }: SIFormProps) {
  const field = { values, setValue, errors, onFieldBlur };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {!hiddenFields.includes("fullName") && (
        <SITextField {...field} name="fullName" label="Full Name" required placeholder="Enter Full Name" />
      )}

      <SIIdField {...field} name="faydaId" label="Fayda ID" required placeholder="Enter 16-digit Fayda ID" />

      {!hiddenFields.includes("phoneNumber") && (
        <SIPhoneFormField {...field} label="Contact Number" required placeholder="Enter Contact Number" />
      )}

      {!hiddenFields.includes("email") && (
        <SITextField {...field} name="email" type="email" label="Contact Email ID" placeholder="Enter Contact Email ID" />
      )}
    </div>
  );
}
