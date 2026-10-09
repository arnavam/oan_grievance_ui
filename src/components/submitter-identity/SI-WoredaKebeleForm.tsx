"use client";

import { SIIdField, SIPhoneFormField, SITextField } from "./SI-fields";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "officeName", label: "Woreda / Kebele Office Name", required: true },
  { key: "adminZone", label: "Administrative Zone", required: true },
  { key: "responsibleOfficial", label: "Responsible Official", required: true },
  { key: "officialFaydaId", label: "Official's Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Mobile", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function WoredaKebeleForm({ values, setValue, hiddenFields = [], errors, onFieldBlur }: SIFormProps) {
  const field = { values, setValue, errors, onFieldBlur };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <SITextField
        {...field}
        name="officeName"
        label="Woreda / Kebele Office Name"
        required
        placeholder="Enter Woreda or Kebele office name"
      />

      <SITextField
        {...field}
        name="adminZone"
        label="Administrative Zone"
        required
        placeholder="Enter the zone this office administers"
      />

      <SITextField
        {...field}
        name="responsibleOfficial"
        label="Responsible Official"
        required
        placeholder="Enter official's full name"
      />

      <SIIdField
        {...field}
        name="officialFaydaId"
        label="Official's Fayda ID"
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
