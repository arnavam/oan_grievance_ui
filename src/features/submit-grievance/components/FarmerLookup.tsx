"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, UserCheck } from "lucide-react";
import { ApiError } from "@/lib/api/fetchApi";
import { splitPhoneNumber } from "@/lib/validation/phone";
import { FAYDA_ID_PATTERN } from "@/lib/validation/registerSubmitter";
import { matchFarmerAreas, type FarmerAreas } from "../matchFarmerAreas";
import { fetchFarmerDetails, searchFarmer, type RegistryFarmer } from "../api/farmerSearchApi";

interface FarmerLookupProps {
  faydaId: string;
  setIdentityValue: (key: string, value: string) => void;
  /** Receives the areas the farmer's registry location matched, for the grievance-details step. */
  onFarmerAreas?: (areas: FarmerAreas) => void;
}

/**
 * Lets a Development Agent look the farmer up by the Fayda ID typed above and, once they have
 * checked the match (name, phone), copy the registry's details into the identity form.
 */
export function FarmerLookup({ faydaId, setIdentityValue, onFarmerAreas }: FarmerLookupProps) {
  const t = useTranslations("submitGrievance.identityStep.farmerLookup");
  const [status, setStatus] = useState<"idle" | "searching" | "found" | "notFound" | "failed">("idle");
  const [filling, setFilling] = useState(false);
  const [fillFailed, setFillFailed] = useState(false);
  const [farmer, setFarmer] = useState<RegistryFarmer | null>(null);

  const digits = faydaId.replace(/\D/g, "");
  const canSearch = FAYDA_ID_PATTERN.test(digits) && status !== "searching";

  const handleSearch = async () => {
    setStatus("searching");
    setFarmer(null);
    try {
      setFarmer(await searchFarmer(digits));
      setStatus("found");
    } catch (error) {
      setStatus(error instanceof ApiError && error.status === 404 ? "notFound" : "failed");
    }
  };

  const handleUse = async () => {
    if (!farmer) return;
    setFilling(true);
    setFillFailed(false);
    try {
      const details = await fetchFarmerDetails(farmer.registryId);
      if (farmer.name) setIdentityValue("farmerName", farmer.name);
      if (details.mobile) {
        const { phoneCode, phoneNumber } = splitPhoneNumber(details.mobile);
        setIdentityValue("phoneCode", phoneCode);
        setIdentityValue("phoneNumber", phoneNumber);
      }
      if (details.email) setIdentityValue("email", details.email);
      // A place that can't be matched only leaves step 2's pickers for the agent; it is not a failed fill.
      onFarmerAreas?.(await matchFarmerAreas(details).catch(() => ({})));
    } catch {
      setFillFailed(true);
    } finally {
      setFilling(false);
    }
  };

  // The agent confirms the farmer by these two; the contact details are fetched on "Use these details".
  const details: Array<[string, string | null | undefined]> = [
    [t("faydaId"), farmer?.faydaId],
    [t("name"), farmer?.name],
  ];

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void handleSearch()}
        disabled={!canSearch}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#16A34A] text-sm font-semibold text-[#0b8535] hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search className="w-4 h-4" />
        {status === "searching" ? t("searching") : t("search")}
      </button>

      {status === "notFound" && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {t("notFound")}
        </p>
      )}
      {status === "failed" && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {t("failed")}
        </p>
      )}

      {status === "found" && farmer && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0b8535]">
            <UserCheck className="w-4 h-4" />
            {t("found")}
          </p>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => void handleUse()}
            disabled={filling}
            className="mt-3 px-4 py-2 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#10883c] transition-colors disabled:opacity-50"
          >
            {filling ? t("filling") : t("useDetails")}
          </button>
          {fillFailed && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {t("fillFailed")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
