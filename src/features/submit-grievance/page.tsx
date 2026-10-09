"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { selectUser } from "@/features/auth/store/authSlice";
import {
  normalizeSubmissionChannel,
  normalizeSubmitterType,
  selectServiceCategoryOptions,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
  type AreaRef,
} from "@/features/metadata";
import { buildInitialIdentityValues, identityAfterReset, resolveInitialSubmitterType } from "./initialIdentity";
import { buildSaveDraftPayload } from "./draftPayload";
import { firstIncompleteStep, type WizardStep } from "./wizardSteps";
import { loadSubmitterProfile } from "@/lib/submitterProfile";
import { discardDraft, loadDraft } from "@/lib/drafts";
import { splitPhoneNumber } from "@/lib/validation/phone";
import { SCAN_STATUS, type ScanStatus, type WizardAttachment } from "@/lib/attachments";
import { ApiError } from "@/lib/api/fetchApi";
import { logger } from "@/lib/logger";
import { useAppSelector } from "@/store/hooks";
import type { SubmitGrievanceResult } from "./api/submitGrievanceApi";
import { Stepper } from "./components/Stepper";
import { SubmitterIdentityCard } from "./components/SubmitterIdentityCard";
import { GrievanceDetailsCard } from "./components/GrievanceDetailsCard";
import { ReviewAndSubmitCard } from "./components/ReviewAndSubmitCard";
import { GrievanceSubmittedCard } from "./components/GrievanceSubmittedCard";
import { SubmitGrievanceHeader } from "./components/TopHeader";

function labelFor(options: { value: string; label: string }[], value: string): string {
  return (
    options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.label.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.value === value)?.label ||
    value
  );
}

/** A draft's saved area, as a selection — null when the draft has none at that level. */
function draftAreaRef(id: string | undefined, name: string | undefined): AreaRef | null {
  return id && name ? { id, name, pathCode: "" } : null;
}

export default function SubmitGrievancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current step from URL query parameter (?step=1, ?step=2, ?step=3)
  // so refreshing or sharing preserving current step without defaulting to step 1.
  const stepParam = searchParams.get("step");
  const parsedStep = stepParam ? parseInt(stepParam, 10) : NaN;
  const requestedStep = (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 3 ? parsedStep : 1) as WizardStep;

  const goToStep = useCallback(
    (targetStep: number, replace = false) => {
      const clamped = Math.min(Math.max(targetStep, 1), 3);
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(clamped));
      const newUrl = `${pathname}?${params.toString()}`;
      if (replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  // Pre-fills Step 1 from the signed-in user's profile (name, Fayda ID,
  // phone, submitter type), so they aren't asked for the same details
  // twice.
  const user = useAppSelector(selectUser);

  const savedProfile = useMemo(
    () => (user?.email ? loadSubmitterProfile(user.email) : null),
    [user]
  );

  // What the backend returned once the grievance has been filed (ticket
  // number, status, SLA date, ...). Its presence is what puts the page into
  // the "submitted" state.
  const [submitted, setSubmitted] = useState<SubmitGrievanceResult | null>(null);

  // Identifies this wizard session's Grievance Draft on the backend — needed
  // before any attachment can be uploaded, since `submit_document` requires
  // the draft to already exist for whichever `client_uuid` it's given.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());
  const [resumedDraft, setResumedDraft] = useState(false);
  // "Discard draft" is destructive (the backend deletes the draft and its
  // uploads), so it takes a second click to confirm rather than firing at once.
  const [discardState, setDiscardState] = useState<"idle" | "confirming" | "discarding">("idle");
  const [discardError, setDiscardError] = useState<string | null>(null);

  // Step 1 — Submitter Identity
  const [submitterType, setSubmitterType] = useState(() => resolveInitialSubmitterType(user, savedProfile));
  const [submissionChannel, setSubmissionChannel] = useState(() => (user ? "web" : ""));
  const [identityValues, setIdentityValues] = useState<Record<string, string>>(() =>
    buildInitialIdentityValues(user, savedProfile, resolveInitialSubmitterType(user, savedProfile))
  );

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
  };

  // Step 2 — Grievance Details
  const [serviceCategory, setServiceCategory] = useState("");
  const [grievanceType, setGrievanceType] = useState("");
  const [region, setRegion] = useState<AreaRef | null>(null);
  const [zone, setZone] = useState<AreaRef | null>(null);
  const [woreda, setWoreda] = useState<AreaRef | null>(null);
  const [kebele, setKebele] = useState<AreaRef | null>(null);
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  // The attachment list — lifted up here (not kept local to
  // GrievanceDetailsCard) for two reasons: page.tsx conditionally unmounts
  // that component on every Step 1<->2 navigation (`{currentStep === 2 &&
  // <GrievanceDetailsCard .../>}`), which would otherwise reset this on
  // every Back/Next; and Step 3's review card needs to know about it too,
  // including for a resumed draft's attachments, which have no local `File`
  // blob to read a name off.
  const [attachments, setAttachments] = useState<WizardAttachment[]>([]);

  // Guards every draft-dependent action (uploading, saving) until the
  // initial resume check below has settled.
  const [draftCheckDone, setDraftCheckDone] = useState(false);

  const goToStepRef = useRef(goToStep);
  useEffect(() => {
    goToStepRef.current = goToStep;
  });

  // Resume the caller's saved draft, if one exists, strictly once on mount.
  useEffect(() => {
    let cancelled = false;
    loadDraft()
      .then((draft) => {
        if (cancelled) return;
        if (draft.client_submission_uuid) {
          setClientUuid(draft.client_submission_uuid);
        } else if (draft.client_uuid) {
          setClientUuid(draft.client_uuid);
        }
        if (draft.submitter_type) setSubmitterType(normalizeSubmitterType(draft.submitter_type));
        if (draft.submission_channel) setSubmissionChannel(normalizeSubmissionChannel(draft.submission_channel));
        setIdentityValues((prev) => {
          if (!draft.submitter_name && !draft.contact_mobile && !draft.contact_email) return prev;
          const next = { ...prev };
          if (draft.submitter_name) next.fullName = draft.submitter_name;
          if (draft.phone_number) {
            next.phoneNumber = draft.phone_number;
            next.phoneCode = draft.country_code || prev.phoneCode || "+251";
          } else if (draft.contact_mobile) {
            const parsed = splitPhoneNumber(draft.contact_mobile);
            next.phoneCode = parsed.phoneCode || prev.phoneCode || "+251";
            next.phoneNumber = parsed.phoneNumber;
          }
          if (draft.contact_email) next.email = draft.contact_email;
          return next;
        });
        if (draft.service_category) setServiceCategory(draft.service_category);
        if (draft.grievance_type) setGrievanceType(draft.grievance_type);
        const h = draft.administrative_hierarchy;
        setRegion(draftAreaRef(h?.region_id, h?.region));
        setZone(draftAreaRef(h?.zone_id, h?.zone));
        setWoreda(draftAreaRef(h?.woreda_id, h?.woreda));
        setKebele(draftAreaRef(h?.kebele_id, h?.kebele));
        if (draft.description) setDescription(draft.description);
        if (draft.desired_outcome) setDesiredOutcome(draft.desired_outcome);
        if (draft.associated_service_provider) setServiceProvider(draft.associated_service_provider);
        if (draft.attachments && draft.attachments.length > 0) {
          const validScanStatuses: string[] = Object.values(SCAN_STATUS);
          // Every resumed attachment is kept, not just the ones with a
          // scan_status this build recognizes — it still exists (and still
          // counts toward the backend's MAX_ATTACHMENTS_PER_CASE) either
          // way. Dropping the unrecognized ones used to undercount what the
          // backend actually has, letting the user pick more files than the
          // real remaining capacity allowed.
          const resumedAttachments: WizardAttachment[] = draft.attachments.map((a) => {
            const scanStatus = validScanStatuses.includes(a.scan_status) ? (a.scan_status as ScanStatus) : null;
            return {
              key: a.name,
              attachmentId: a.name,
              file: null,
              fileName: a.file_name,
              scanStatus,
              // The backend doesn't report how many checks a scan has
              // already been through, so a resumed Pending attachment's
              // give-up count restarts at 0 here rather than picking up
              // wherever it really was — a best-effort baseline rather than
              // nothing, still bounded going forward. See
              // scanPollAttempts's doc comment.
              scanPollAttempts: 0,
              uploadState: "idle",
              error: null,
            };
          });
          setAttachments(resumedAttachments);
        }
        if (!stepParam && (h?.region || h?.woreda || draft.service_category || draft.description)) {
          goToStepRef.current(2, true);
        }
        setResumedDraft(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) return; // no saved draft — the normal case
        logger.error("Failed to load saved draft:", error);
      })
      .finally(() => {
        if (!cancelled) setDraftCheckDone(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The step shown is the URL's, clamped to the furthest one the wizard's
  // data allows — opening `?step=3` directly, or reloading it once the
  // in-memory data is gone, lands on the first step that still needs work.
  const currentStep = Math.min(
    requestedStep,
    firstIncompleteStep({
      submitterType, submissionChannel, identityValues,
      serviceCategory, grievanceType, region, zone, woreda, description,
    })
  ) as WizardStep;

  // Keeps the URL in step with the clamp above, so Back and reload agree with what's shown.
  useEffect(() => {
    if (draftCheckDone && !submitted && stepParam && requestedStep !== currentStep) {
      goToStep(currentStep, true);
    }
  }, [draftCheckDone, submitted, stepParam, requestedStep, currentStep, goToStep]);

  const handleNext = () => {
    goToStep(Math.min(currentStep + 1, 3));
  };

  const handleBack = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmitted = (result: SubmitGrievanceResult) => {
    setSubmitted(result);
    // The wizard's data is gone once it's filed — drop `?step=` so a reload
    // starts a fresh Step 1 rather than an empty Review & Submit.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("step");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetDraftFields = () => {
    setServiceCategory("");
    setGrievanceType("");
    setRegion(null);
    setZone(null);
    setWoreda(null);
    setKebele(null);
    setDescription("");
    setDesiredOutcome("");
    setServiceProvider("");
    setAttachments([]);
    // A fresh draft for the next grievance — reusing the old clientUuid
    // would let the new, supposedly-empty wizard resume the previous
    // grievance's already-submitted draft.
    setClientUuid(crypto.randomUUID());
    setResumedDraft(false);
  };

  const handleReset = () => {
    setSubmitted(null);
    goToStep(1, true);
    setIdentityValues((prev) => identityAfterReset(submitterType, prev));
    resetDraftFields();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiscardDraft = async () => {
    setDiscardState("discarding");
    setDiscardError(null);
    try {
      await discardDraft(clientUuid);
    } catch (error) {
      logger.error("Failed to discard draft:", error);
      setDiscardError("We could not discard your draft. Please try again.");
      setDiscardState("idle");
      return;
    }
    resetDraftFields();
    if (currentStep > 2) {
      goToStep(2, true);
    }
    setDiscardState("idle");
  };

  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const serviceCategories = useAppSelector(selectServiceCategoryOptions);

  const draftPayload = buildSaveDraftPayload({
    clientSubmissionUuid: clientUuid,
    submissionChannelLabel: submissionChannel ? labelFor(submissionChannels, submissionChannel) : undefined,
    submitterType,
    submitterTypeLabel: submitterType ? labelFor(submitterTypes, submitterType) : undefined,
    identityValues,
    userFullName: user?.full_name,
    userMobile: user?.mobile_no,
    userEmail: user?.email,
    administrativeAreaId: (kebele ?? woreda)?.id,
    kebele: kebele?.name,
    serviceCategoryLabel: serviceCategory ? labelFor(serviceCategories, serviceCategory) : undefined,
    grievanceType,
    associatedServiceProvider: serviceProvider,
    description,
    desiredOutcome,
  });

  if (submitted) {
    return (
      <div className="font-sans pb-2">
        <GrievanceSubmittedCard result={submitted} onReset={handleReset} />
      </div>
    );
  }

  if (!draftCheckDone) {
    return (
      <div className="flex flex-col gap-6 font-sans pb-2">
        <SubmitGrievanceHeader />
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans pb-2">
      {/* Back Button */}
      {currentStep > 1 && (
        <div className="flex items-center -mb-2">
          <button 
            onClick={() => {
               if (currentStep > 1) {
                  handleBack();
               }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-[15px] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
            Back
          </button>
        </div>
      )}

      {/* Page Header */}
      <SubmitGrievanceHeader />

      {resumedDraft && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-[#0b8535]">
          <div className="flex items-center justify-between gap-3">
            <span>Resumed your saved draft — your grievance details are filled back in.</span>
            <div className="flex shrink-0 items-center gap-2">
              {discardState === "idle" ? (
                <button
                  onClick={() => setDiscardState("confirming")}
                  className="rounded-lg px-2 py-1 font-semibold hover:bg-green-100"
                >
                  Discard draft
                </button>
              ) : (
                <>
                  <span className="font-semibold">Delete this draft?</span>
                  <button
                    onClick={handleDiscardDraft}
                    disabled={discardState === "discarding"}
                    className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {discardState === "discarding" ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setDiscardState("idle")}
                    disabled={discardState === "discarding"}
                    className="rounded-lg px-2 py-1 font-semibold hover:bg-green-100 disabled:opacity-60"
                  >
                    Keep
                  </button>
                </>
              )}
              <button
                onClick={() => setResumedDraft(false)}
                aria-label="Dismiss"
                className="rounded-lg p-1 hover:bg-green-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {discardError && (
            <p role="alert" className="mt-2 font-medium text-red-700">
              {discardError}
            </p>
          )}
        </div>
      )}

      {/* Stepper */}
      <Stepper currentStep={currentStep} onStepClick={(step) => goToStep(step)} />

      {/* Main Content Area */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <SubmitterIdentityCard
            onNext={handleNext}
            draftPayload={draftPayload}
            submitterType={submitterType}
            setSubmitterType={handleSubmitterTypeChange}
            submissionChannel={submissionChannel}
            setSubmissionChannel={setSubmissionChannel}
            identityValues={identityValues}
            setIdentityValue={setIdentityValue}
          />
        )}
        {currentStep === 2 && (
          <GrievanceDetailsCard
            onNext={handleNext}
            onBack={handleBack}
            clientUuid={clientUuid}
            submitterType={submitterType}
            submissionChannel={submissionChannel}
            identityValues={identityValues}
            userFullName={user?.full_name}
            userMobile={user?.mobile_no}
            userEmail={user?.email}
            serviceCategory={serviceCategory}
            setServiceCategory={setServiceCategory}
            grievanceType={grievanceType}
            setGrievanceType={setGrievanceType}
            region={region}
            setRegion={setRegion}
            zone={zone}
            setZone={setZone}
            woreda={woreda}
            setWoreda={setWoreda}
            kebele={kebele}
            setKebele={setKebele}
            description={description}
            setDescription={setDescription}
            desiredOutcome={desiredOutcome}
            setDesiredOutcome={setDesiredOutcome}
            serviceProvider={serviceProvider}
            setServiceProvider={setServiceProvider}
            attachments={attachments}
            setAttachments={setAttachments}
          />
        )}
        {currentStep === 3 && (
          <ReviewAndSubmitCard
            onBack={handleBack}
            onSubmitted={handleSubmitted}
            draftPayload={draftPayload}
            submitterType={submitterType}
            submissionChannel={submissionChannel}
            identityValues={identityValues}
            serviceCategory={serviceCategory}
            grievanceType={grievanceType}
            region={region}
            zone={zone}
            woreda={woreda}
            kebele={kebele}
            description={description}
            desiredOutcome={desiredOutcome}
            serviceProvider={serviceProvider}
            attachments={attachments}
          />
        )}
      </div>
    </div>
  );
}
