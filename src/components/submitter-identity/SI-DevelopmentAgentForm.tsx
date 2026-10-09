"use client";

import { Info } from "lucide-react";
import { SIIdField, SIPhoneFormField, SITextField } from "./SI-fields";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "farmerName", label: "Farmer Name (on behalf of)", required: true },
  { key: "faydaId", label: "Fayda ID", required: true },
  { key: "phoneNumber", label: "Farmer's Contact Mobile", required: true },
  { key: "email", label: "Farmer's Contact Email ID", required: false },
];

export function DevelopmentAgentForm({ values, setValue, hiddenFields = [], errors, onFieldBlur }: SIFormProps) {
  const field = { values, setValue, errors, onFieldBlur };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <SITextField
        {...field}
        name="farmerName"
        label="Farmer Name (on behalf of)"
        required
        placeholder="Enter Full name"
      />

      <SIIdField {...field} name="faydaId" label="Fayda ID" required placeholder="Enter 16-digit Fayda ID" />

      {/* Info Message Box */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex items-start gap-2.5 shadow-sm">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[13px] text-blue-600 leading-snug">
          You are submitting on behalf of a farmer. Your Officer ID will be recorded for audit purposes. The farmer remains the primary grievance owner.
        </p>
      </div>

      {/* Empty div for right column to keep layout structure */}
      <div className="hidden md:block"></div>

      {!hiddenFields.includes("phoneNumber") && (
        <SIPhoneFormField {...field} label="Farmer's Contact Mobile" required />
      )}

      {!hiddenFields.includes("email") && (
        <SITextField
          {...field}
          name="email"
          type="email"
          label="Farmer's Contact Email ID"
          placeholder="Enter Contact Email ID"
        />
      )}
    </div>
  );
}
