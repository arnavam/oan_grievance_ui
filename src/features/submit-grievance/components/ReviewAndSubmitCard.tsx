import { useState } from "react";
import { FileText, Info, Save, ArrowRight, ArrowLeft, User, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ID_FIELD_KEYS, SI_FIELDS_BY_TYPE } from "@/components/submitter-identity/fields";
import { saveDraft, type SaveDraftPayload } from "@/lib/drafts";
import { activeWizardAttachments, type WizardAttachment } from "@/lib/attachments";
import { logger } from "@/lib/logger";
import { PHONE_NUMBER_E164_REGEX } from "@/lib/validation/phone";
import { useAppSelector } from "@/store/hooks";
import {
  selectGrievanceTypeOptions,
  selectServiceCategoryOptions,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
  type AreaRef,
} from "@/features/metadata";
import { submitErrorMessage, submitGrievance, type SubmitGrievanceResult } from "../api/submitGrievanceApi";

interface ReviewAndSubmitCardProps {
  onBack: () => void;
  /** Called once the backend has accepted the grievance (or recognised a retry of one it already has). */
  onSubmitted: (result: SubmitGrievanceResult) => void;
  /** Already shaped for `POST /api/v1/drafts` (and, with `consent_given` added, `/api/v1/grievances`) — see page.tsx's `draftPayload`. */
  draftPayload: SaveDraftPayload;
  submitterType: string;
  submissionChannel: string;
  identityValues: Record<string, string>;
  serviceCategory: string;
  grievanceType: string;
  region: AreaRef | null;
  zone: AreaRef | null;
  woreda: AreaRef | null;
  kebele: AreaRef | null;
  description: string;
  desiredOutcome?: string;
  serviceProvider?: string;
  attachments: WizardAttachment[];
}

function labelFor(options: { value: string; label: string }[], value: string): string {
  return (
    options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.label.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.value === value)?.label ||
    value
  );
}

/**
 * `phoneNumber` isn't always the bare local digits `phoneCode` is meant to
 * prefix — for a signed-in user it's seeded straight from `user.mobile_no`
 * (see page.tsx), already in full E.164 form, with `phoneCode` never set at
 * all. Blindly prepending `phoneCode || "+251"` to that would double up
 * the country code ("+251 +251912345678"). Prepending only when the value
 * isn't already in international form (checked via the same
 * PHONE_NUMBER_E164_REGEX phone.ts's own E.164 detection uses, rather than
 * a bare `startsWith("+")` guess) covers both shapes correctly.
 */
function formatPhoneForDisplay(phoneNumber: string | undefined, phoneCode: string | undefined): string {
  if (!phoneNumber) return "";
  if (PHONE_NUMBER_E164_REGEX.test(phoneNumber)) return phoneNumber;
  return `${phoneCode || "+251"} ${phoneNumber}`;
}

export function ReviewAndSubmitCard({
  onBack,
  onSubmitted,
  draftPayload,
  submitterType,
  submissionChannel,
  identityValues,
  serviceCategory,
  grievanceType,
  region,
  zone,
  woreda,
  kebele,
  description,
  desiredOutcome,
  serviceProvider,
  attachments,
}: ReviewAndSubmitCardProps) {
  const [consentChecked, setConsentChecked] = useState(false);
  // A failed upload never reached the backend and isn't part of what gets
  // submitted — see activeWizardAttachments. Computed once and reused below
  // rather than re-filtering the same array at each call site.
  const activeAttachments = activeWizardAttachments(attachments);
  // Same national-ID field set fields.ts validates as a Fayda ID (imported
  // as ID_FIELD_KEYS) — masked here by default too, same reveal-on-explicit-
  // action pattern as SIMaskedIdField and the Profile page's MaskedField.
  // Without this, a value that only reaches this screen via the
  // localStorage-persisted submitter profile (representativeFaydaId/
  // officialFaydaId have no other source) would show up in cleartext on a
  // review screen the user never typed it into this session.
  const [revealedIdFields, setRevealedIdFields] = useState<Set<string>>(new Set());
  const toggleReveal = (key: string) =>
    setRevealedIdFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const serviceCategories = useAppSelector(selectServiceCategoryOptions);
  const grievanceTypes = useAppSelector((state) =>
    selectGrievanceTypeOptions(state, serviceCategory)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSubmit = async () => {
    // The button is already disabled without consent or mid-request; this
    // covers a second click landing before React has re-rendered it disabled.
    if (!consentChecked || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitGrievance({ ...draftPayload, consent_given: 1 });
      onSubmitted(result);
    } catch (error) {
      logger.error("Failed to submit grievance:", error);
      setSubmitError(submitErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setDraftSaveState("saving");
    try {
      await saveDraft(draftPayload);
      setDraftSaveState("saved");
    } catch (error) {
      setDraftSaveState("error");
      logger.error("Failed to save draft:", error);
    }
  };

  const location = [region, zone, woreda, kebele].flatMap((a) => (a ? [a.name] : [])).join(", ") || "Not provided";
  const identityFields = SI_FIELDS_BY_TYPE[submitterType] || [];

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">


      {/* Top Card - Review Header */}
      <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
            <FileText className="w-6 h-6 text-[#0b8535]" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-gray-900">Review & Submit</h3>
            <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
            Step 3 of 3
          </span>
        </div>
      </div>




      {/* Main Content Card */}
      <div className="p-6 pb-8 space-y-6">
          {/* Ticket Number Alert */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <User className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900 mb-0.5">Your ticket number is issued when you submit</p>
              <p className="text-sm font-medium text-gray-500">You will use it to track this grievance.</p>
            </div>
          </div>

          {/* Details Summary */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Submitter Type</p>
                <p className="text-[15px] font-semibold text-gray-900">{labelFor(submitterTypes, submitterType) || "Not provided"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Channel</p>
                <p className="text-[15px] font-semibold text-gray-900">{labelFor(submissionChannels, submissionChannel) || "Not provided"}</p>
              </div>
              {identityFields
                .filter((field) => field.key !== "phoneCode")
                .map((field) => {
                  const value = field.key === "phoneNumber"
                    ? formatPhoneForDisplay(identityValues.phoneNumber, identityValues.phoneCode)
                    : identityValues[field.key] || "";
                  const isIdField = ID_FIELD_KEYS.includes(field.key);
                  const revealed = revealedIdFields.has(field.key);
                  return (
                    <div key={field.key}>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{field.label}</p>
                      {isIdField && value ? (
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-gray-900">
                            {revealed ? value : "•".repeat(Math.max(value.length, 8))}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleReveal(field.key)}
                            aria-label={revealed ? `Hide ${field.label}` : `Show ${field.label}`}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[15px] font-semibold text-gray-900">{value || "Not provided"}</p>
                      )}
                    </div>
                  );
                })}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Category</p>
                <p className="text-[15px] font-semibold text-gray-900">{labelFor(serviceCategories, serviceCategory) || "Not provided"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Grievance Type</p>
                <p className="text-[15px] font-semibold text-gray-900">{labelFor(grievanceTypes, grievanceType) || "Not provided"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                <p className="text-[15px] font-semibold text-gray-900">{location}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-[15px] font-semibold text-gray-900">{description || "Not provided"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Provider / Office</p>
                <p className="text-[15px] font-semibold text-gray-900">{serviceProvider?.trim() || "Not provided"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Desired Outcome</p>
                <p className="text-[15px] font-semibold text-gray-900">{desiredOutcome?.trim() || "Not provided"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Attachments ({activeAttachments.length})
                </p>
                {activeAttachments.length > 0 ? (
                  <ul className="space-y-0.5">
                    {activeAttachments.map((a) => (
                      <li key={a.key} className="text-[15px] font-semibold text-gray-900">
                        {a.fileName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] font-semibold text-gray-900">No files attached</p>
                )}
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div 
            className="flex items-start gap-3 mt-4 cursor-pointer group"
            onClick={() => setConsentChecked(!consentChecked)}
          >
            <div className="relative mt-0.5 flex-shrink-0">
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-300 ${
                consentChecked 
                  ? 'bg-[#16A34A] border-2 border-[#16A34A] shadow-[0_0_8px_rgba(22,163,74,0.4)]' 
                  : 'border-2 border-gray-300 bg-white group-hover:border-[#16A34A]'
              }`}>
                <Check className={`w-3.5 h-3.5 text-white transition-all duration-300 ${
                  consentChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`} strokeWidth={4} />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-600 leading-relaxed select-none">
              I consent to this grievance being shared with the relevant department for resolution. I confirm the information above is true and accurate to the best of my knowledge.
            </span>
          </div>
        </div>

      {/* Footer Actions */}
      <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] rounded-b-xl mt-auto">
        {submitError && <ErrorAlert id="review-submit-error" className="mb-4">{submitError}</ErrorAlert>}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-3 mr-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
              Previous
            </button>
            <Info className="w-4 h-4 text-blue-600 mr-1.5" />
            <span>All fields marked <span className="text-red-500">*</span> are required</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={draftSaveState === "saving" || isSubmitting}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {draftSaveState === "saving" ? (
                <Loader2 className="w-4 h-4 text-[#0b8535] animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-[#0b8535]" />
              )}
              {draftSaveState === "saved" ? "Saved" : draftSaveState === "error" ? "Retry Save" : "Save Draft"}
            </button>
            <button
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-5 py-3 text-white rounded-lg text-sm font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 ${consentChecked
                ? "bg-[#16A34A] hover:bg-[#10883c] focus:ring-[#0b8535]/50"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
                }`}
              disabled={!consentChecked || isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Submit Grievance"}
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
