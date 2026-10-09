"use client";

import React, { useEffect, useState, useRef, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { FileText, Info, Save, ArrowRight, ArrowLeft, Eye, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { FileDropzone, FileRow } from "@/components/ui/FileDropzone";
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from "@/components/ui/FieldError";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/validation/fieldRules";
import { focusFirstError, useFieldErrors, type FieldErrors } from "@/lib/validation/useFieldErrors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSubmitterOptionsThunk,
  selectGrievanceTypeOptions,
  selectServiceCategoryOptions,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
  toAreaRef,
  useAreas,
  type AdministrativeArea,
  type AreaRef,
} from "@/features/metadata";
import { AnimatedSelect } from "@/components/submitter-identity/SI-Dropdown";
import {
  getAttachments,
  uploadAttachments,
  deleteAttachment,
  activeWizardAttachments,
  fetchAttachmentBlobUrl,
  SCAN_STATUS,
  MAX_ATTACHMENTS_PER_CASE,
  type WizardAttachment,
  type AttachmentRow,
} from "@/lib/attachments";
import { saveDraft } from "@/lib/drafts";
import { buildSaveDraftPayload } from "../draftPayload";
import { getDescriptionError, getDetailsErrors, type DetailsField } from "../wizardSteps";
import { useRealtimeEvent } from "@/lib/realtime";
import { logger } from "@/lib/logger";

function isPdf(item: WizardAttachment): boolean {
  return item.file?.type === "application/pdf" || /\.pdf$/i.test(item.fileName);
}

function isAudio(item: WizardAttachment): boolean {
  return Boolean(item.file?.type.startsWith("audio/")) || /\.(mp3|wav|ogg|m4a)$/i.test(item.fileName);
}

function canPreviewAttachment(item: WizardAttachment): boolean {
  if (item.uploadState === "uploading" || item.uploadState === "error") return false;
  if (item.file) return true;
  return Boolean(item.attachmentId && item.scanStatus === SCAN_STATUS.CLEAN);
}

function previewTooltip(item: WizardAttachment): string | undefined {
  if (item.uploadState === "uploading") return "Upload in progress…";
  if (item.uploadState === "error") return "Upload failed";
  if (item.scanStatus === SCAN_STATUS.PENDING) return "Scanning for malware… preview will be available once clean";
  if (item.scanStatus === SCAN_STATUS.INFECTED || item.scanStatus === SCAN_STATUS.FAILED) {
    return "Preview unavailable for unverified or infected files";
  }
  if (!item.file && !item.attachmentId) return "Preview unavailable";
  return undefined;
}

/** The line under an uploaded file's name — mirrors `scanStatusBadge`'s if-chain shape rather than a nested ternary. */
function attachmentStatusIndicator(item: WizardAttachment): ReactElement {
  const { uploadState, scanStatus } = item;
  if (uploadState === "error") {
    return (
      <>
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        <span className="text-red-600">{item.error ?? "Upload failed"}</span>
      </>
    );
  }
  if (uploadState === "uploading") {
    return <span className="text-gray-500">Uploading…</span>;
  }
  if (scanStatus === SCAN_STATUS.CLEAN) {
    return (
      <>
        <div className="w-2 h-2 rounded-full bg-[#16A34A]"></div>
        <span className="text-[#16A34A]">Uploaded · scan clean</span>
      </>
    );
  }
  if (scanStatus === SCAN_STATUS.INFECTED) {
    return (
      <>
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        <span className="text-red-600">Failed malware scan · not usable as evidence</span>
      </>
    );
  }
  if (scanStatus === SCAN_STATUS.FAILED) {
    return (
      <>
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        <span className="text-red-600">Scan didn&apos;t complete · remove and try again</span>
      </>
    );
  }
  if (scanStatus === SCAN_STATUS.PENDING) {
    return (
      <>
        <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
        <span className="text-amber-600">Scanning for malware…</span>
      </>
    );
  }
  // `scanStatus` is null: a resumed draft attachment whose backend
  // scan_status wasn't one this build recognizes (see page.tsx's draft-load
  // mapping) — not "Pending", so it never enters the poll loop and must not
  // claim to be scanning; that loop would never resolve or time it out,
  // leaving a spinner running forever for a status this UI simply doesn't
  // know how to read.
  return (
    <>
      <Info className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-gray-500">Status unavailable · reload to check again</span>
    </>
  );
}

function labelFor(options: { value: string; label: string }[], value: string): string {
  return (
    options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.label.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.value === value)?.label ||
    value
  );
}
function areaOptions(areas: AdministrativeArea[]): Array<{ value: string; label: string }> {
  return areas.map((a) => ({ value: a.area_id, label: a.area_name }));
}

function findAreaRef(areas: AdministrativeArea[], id: string): AreaRef | null {
  const area = areas.find((a) => a.area_id === id);
  return area ? toAreaRef(area) : null;
}

interface GrievanceDetailsCardProps {
  onNext: () => void;
  onBack: () => void;
  clientUuid: string;
  /** Step 1's fields — read-only here, folded into this step's own Save Draft payload so it can't overwrite them (drafts.ts's `saveDraft` replaces the whole payload). */
  submitterType: string;
  submissionChannel: string;
  identityValues: Record<string, string>;
  /** The signed-in account's own profile — the fallback `buildSaveDraftPayload` uses when `identityValues` doesn't have a name/mobile/email of its own. */
  userFullName?: string | null;
  userMobile?: string | null;
  userEmail?: string | null;
  serviceCategory: string;
  setServiceCategory: (value: string) => void;
  grievanceType: string;
  setGrievanceType: (value: string) => void;
  region: AreaRef | null;
  setRegion: (value: AreaRef | null) => void;
  zone: AreaRef | null;
  setZone: (value: AreaRef | null) => void;
  woreda: AreaRef | null;
  setWoreda: (value: AreaRef | null) => void;
  kebele: AreaRef | null;
  setKebele: (value: AreaRef | null) => void;
  description: string;
  setDescription: (value: string) => void;
  /** What the submitter would like done about it — optional. Sent as `desired_outcome`. */
  desiredOutcome: string;
  setDesiredOutcome: (value: string) => void;
  /** The store, cooperative, bank or market the grievance is about — optional. Sent as `associated_service_provider`. */
  serviceProvider: string;
  setServiceProvider: (value: string) => void;
  // The attachment list — owned by page.tsx, not local state here, so it
  // survives this component unmounting on every Step 1<->2 navigation and so
  // Step 3's review card can see it too. A resumed draft's attachments come
  // back through this same lifted state, with no local `File` blob to read a
  // name off or preview.
  attachments: WizardAttachment[];
  setAttachments: (updater: WizardAttachment[] | ((prev: WizardAttachment[]) => WizardAttachment[])) => void;
}

/** Where "focus the first invalid field" looks, in form order. */
const DETAILS_FIELD_ORDER: ReadonlyArray<{ key: DetailsField; id: string }> = [
  { key: "serviceCategory", id: "service-category" },
  { key: "grievanceType", id: "grievance-type" },
  { key: "region", id: "grievance-region" },
  { key: "zone", id: "grievance-zone" },
  { key: "woreda", id: "grievance-woreda" },
  { key: "description", id: "grievance-description" },
];

// The malware scan is asynchronous (queued for ClamAV, see scanning.py's
// `enqueue_scan_attachment`) — the upload response's "Pending" never updates
// itself, so something has to ask again. ClamAV's own scan is fast; this just
// needs to catch up with a background queue, not a slow external service.
const SCAN_POLL_INTERVAL_MS = 3000;
// ~2 minutes: long enough to ride out a busy queue, short enough that a
// truly stuck scan (a down/unconfigured scanner — see scanning.py's
// "fail closed" note) doesn't poll forever in an abandoned tab.
const SCAN_POLL_MAX_ATTEMPTS = 40;

export function GrievanceDetailsCard({
  onNext,
  onBack,
  clientUuid,
  submitterType,
  submissionChannel,
  identityValues,
  userFullName,
  userMobile,
  userEmail,
  serviceCategory,
  setServiceCategory,
  grievanceType,
  setGrievanceType,
  region,
  setRegion,
  zone,
  setZone,
  woreda,
  setWoreda,
  kebele,
  setKebele,
  description,
  setDescription,
  desiredOutcome,
  setDesiredOutcome,
  serviceProvider,
  setServiceProvider,
  attachments,
  setAttachments,
}: GrievanceDetailsCardProps) {
  const t = useTranslations("submitGrievance.detailsStep");
  const tDocs = useTranslations("supportingDocuments");
  const dispatch = useAppDispatch();
  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const dynamicServiceCategories = useAppSelector(selectServiceCategoryOptions);
  const dynamicGrievanceTypes = useAppSelector((state) =>
    selectGrievanceTypeOptions(state, serviceCategory)
  );
  const metadataStatus = useAppSelector((state) => state.metadata.submitterOptionsStatus);

  const regions = useAreas({ level: "Region" });
  const zones = useAreas({ level: "Zone", parents: region ? [region.id] : [] });
  const woredas = useAreas({ level: "Woreda", parents: zone ? [zone.id] : [] });
  const kebeles = useAreas({ level: "Kebele", parents: woreda ? [woreda.id] : [] });

  useEffect(() => {
    if (metadataStatus === "idle") {
      void dispatch(fetchSubmitterOptionsThunk());
    }
  }, [dispatch, metadataStatus]);

  // Which attachment's preview modal is open, if any — null when closed.
  const [previewItem, setPreviewItem] = useState<WizardAttachment | null>(null);
  // `error` is for problems that aren't tied to one field (too many files
  // picked at once, a whole-batch upload failure). A missing or malformed
  // field is shown under that field instead — see `fieldErrors`; a single
  // file's own upload/scan problem is shown on that file's row instead — see
  // `attachmentStatusIndicator`.
  const [error, setError] = useState<string | null>(null);
  const fieldErrors = useFieldErrors<DetailsField>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // `submit_document` with a `client_uuid` requires the Grievance Draft to
  // already exist server-side — this fires once, right before the first
  // upload, rather than on every file selection.
  const draftEnsuredRef = useRef(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // The post-upload auto-save (currentDraftPayload, below) fires from
  // inside an async handler that can outlive several renders — an upload
  // takes up to UPLOAD_TIMEOUT_MS (60s). Reading the Step 2 fields directly
  // (as plain closure variables) would capture whatever they were when that
  // upload *started*, silently discarding any edit made while it was still
  // in flight when the auto-save finally runs. Synced in an effect (not
  // mutated during render — the React Compiler here forbids that, since it
  // breaks the compiler's purity assumptions) so it always points at the
  // latest values regardless of when the callback holding it was created.
  const latestFieldsRef = useRef({
    serviceCategory, grievanceType, region, zone, woreda, kebele, description, desiredOutcome, serviceProvider,
  });
  useEffect(() => {
    latestFieldsRef.current = {
      serviceCategory, grievanceType, region, zone, woreda, kebele, description, desiredOutcome, serviceProvider,
    };
  });

  // Generates an object URL for previewing the selected attachment —
  // either from an in-memory File for a freshly picked item, or by streaming
  // the clean attachment bytes from the backend for an item resumed from draft.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!previewItem) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    let activeUrl: string | null = null;

    setPreviewLoading(true);
    setPreviewError(null);

    if (previewItem.file) {
      const url = URL.createObjectURL(previewItem.file);
      activeUrl = url;
      setPreviewUrl(url);
      setPreviewLoading(false);
    } else if (previewItem.attachmentId && previewItem.scanStatus === SCAN_STATUS.CLEAN) {
      fetchAttachmentBlobUrl(previewItem.attachmentId, false)
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          activeUrl = url;
          setPreviewUrl(url);
          setPreviewLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          logger.error("Failed to fetch attachment preview:", err);
          setPreviewError("Could not load preview for this attachment.");
          setPreviewLoading(false);
        });
    } else {
      setPreviewLoading(false);
    }

    return () => {
      cancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [previewItem]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // "Saved"/"Retry Save" is a snapshot of the save that already happened —
  // without this, editing a field right after a successful save leaves the
  // button reading "Saved" indefinitely while the new edit sits unsaved,
  // telling the user something true about the past and false about the
  // present. Adjusted during render rather than in an effect (React's own
  // recommended pattern for "reset state when an input changes" —
  // https://react.dev/learn/you-might-not-need-an-effect — an effect here
  // would just cause an extra render pass to do the same thing) by
  // comparing against a snapshot of the last render's tracked fields. Only
  // resets away from a settled state (saved/error); doesn't touch "saving"
  // itself. The joined file names, not `attachmentId`/`scanStatus`, are the
  // attachment signal here — that changes exactly when a file is picked,
  // removed, or the draft resumes some, without also firing mid-upload as
  // `scanStatus` transitioning Pending -> Clean would.
  const draftPayloadSnapshot = JSON.stringify([
    serviceCategory, grievanceType, region, zone, woreda, kebele, description, desiredOutcome, serviceProvider,
    attachments.map((a) => a.fileName),
  ]);
  const [lastDraftPayloadSnapshot, setLastDraftPayloadSnapshot] = useState(draftPayloadSnapshot);
  if (draftPayloadSnapshot !== lastDraftPayloadSnapshot) {
    setLastDraftPayloadSnapshot(draftPayloadSnapshot);
    if (draftSaveState === "saved" || draftSaveState === "error") setDraftSaveState("idle");
  }

  // Shared by the explicit Save Draft button, the implicit ensure-before-
  // first-upload save, and the auto-save right after a successful upload —
  // all three need the same current-field snapshot, so whichever fires
  // doesn't overwrite one of the others' (or a resumed draft's) data with a
  // stale or empty payload. Reads `latestFieldsRef` rather than the render's
  // own closure — see that ref's doc comment for why. The attachment itself
  // is never part of this: the backend tracks it separately (Grievance
  // Attachment rows keyed by `client_uuid`), associated the moment
  // `uploadAttachments` succeeds, not through this draft-save payload.
  const currentDraftPayload = () => {
    const fields = latestFieldsRef.current;
    return buildSaveDraftPayload({
      clientSubmissionUuid: clientUuid,
      submissionChannelLabel: submissionChannel ? labelFor(submissionChannels, submissionChannel) : undefined,
      submitterType,
      submitterTypeLabel: submitterType ? labelFor(submitterTypes, submitterType) : undefined,
      identityValues,
      userFullName,
      userMobile,
      userEmail,
      administrativeAreaId: (fields.kebele ?? fields.woreda)?.id,
      kebele: fields.kebele?.name,
      serviceCategoryLabel: fields.serviceCategory ? labelFor(dynamicServiceCategories, fields.serviceCategory) : undefined,
      grievanceType: fields.grievanceType,
      associatedServiceProvider: fields.serviceProvider,
      description: fields.description,
      desiredOutcome: fields.desiredOutcome,
    });
  };

  const handleSaveDraft = async () => {
    setDraftSaveState("saving");
    try {
      await saveDraft(currentDraftPayload());
      draftEnsuredRef.current = true;
      setDraftSaveState("saved");
    } catch (saveError) {
      setDraftSaveState("error");
      logger.error("Failed to save draft:", saveError);
    }
  };

  // The message for the description field, or null if it's fine. Also used
  // as the user types into a field that is already showing one.
  const detailsMessages = {
    required: t("fieldRequired"),
    descriptionTooShort: (count: number) => t("descriptionTooShort", { min: MIN_DESCRIPTION_LENGTH, count }),
  };
  const descriptionErrorFor = (value: string): string | null => getDescriptionError(value, detailsMessages);

  const handleNext = () => {
    const errors: FieldErrors<DetailsField> = getDetailsErrors(
      { serviceCategory, grievanceType, region, zone, woreda, description },
      detailsMessages
    );

    fieldErrors.setAll(errors);
    if (Object.keys(errors).length > 0) {
      setError(null);
      focusFirstError(DETAILS_FIELD_ORDER, errors);
      return;
    }
    const infected = attachments.find((a) => a.scanStatus === SCAN_STATUS.INFECTED);
    if (infected) {
      setError(`Remove "${infected.fileName}" — it failed the malware scan — before continuing.`);
      return;
    }
    const failedScan = attachments.find((a) => a.scanStatus === SCAN_STATUS.FAILED);
    if (failedScan) {
      setError(`"${failedScan.fileName}"'s malware scan couldn't complete. Remove it and try uploading again.`);
      return;
    }
    if (attachments.some((a) => a.scanStatus === SCAN_STATUS.PENDING)) {
      setError("Still scanning attachment(s) for malware — this takes a few seconds, please wait.");
      return;
    }
    setError(null);
    // "Save & Continue" saves: without this a reload or a closed tab on the
    // next step lost everything typed here unless Save Draft had been clicked
    // or a file uploaded. Skipped when the draft is already known to be
    // persisted and unchanged since (`draftEnsuredRef` plus `draftSaveState`
    // "saved" — the same signal the snapshot check above resets to "idle" on
    // any edit): uploading a file already fires two of these saves back to
    // back, and clicking Save & Continue right after shouldn't add a third
    // near-identical one. Not awaited when it does run — a slow connection
    // (this app's explicit target) shouldn't hold up moving on, and a failed
    // save is logged the same way the upload path's auto-save is; the
    // explicit Save Draft button remains for anyone who wants to see it
    // confirmed.
    if (!draftEnsuredRef.current || draftSaveState !== "saved") {
      saveDraft(currentDraftPayload())
        .then(() => {
          draftEnsuredRef.current = true;
        })
        .catch((saveError) => logger.error("Failed to save draft on continue:", saveError));
    }
    onNext();
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // The backend caps a case at MAX_ATTACHMENTS_PER_CASE total — trim a
    // bulk selection that would blow past it rather than sending it and
    // letting the whole batch 400. A row stuck at uploadState "error" never
    // reached the backend, so it doesn't hold a slot here either — see
    // activeWizardAttachments.
    const remainingSlots = MAX_ATTACHMENTS_PER_CASE - activeWizardAttachments(attachments).length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS_PER_CASE} files per grievance. Remove one before adding another.`);
      return;
    }
    const filesToUpload = files.slice(0, remainingSlots);
    setError(
      files.length > filesToUpload.length
        ? `Only ${remainingSlots} more file(s) could be added (max ${MAX_ATTACHMENTS_PER_CASE} per grievance) — the rest were skipped.`
        : null
    );

    const pending: WizardAttachment[] = filesToUpload.map((file) => ({
      key: crypto.randomUUID(),
      attachmentId: null,
      file,
      fileName: file.name,
      scanStatus: null,
      scanPollAttempts: 0,
      uploadState: "uploading",
      error: null,
    }));
    const pendingKeys = new Set(pending.map((item) => item.key));
    setAttachments((prev) => [...prev, ...pending]);

    try {
      if (!draftEnsuredRef.current) {
        await saveDraft(currentDraftPayload());
        draftEnsuredRef.current = true;
      }

      const results = await uploadAttachments({ files: filesToUpload, clientUuid });
      // The backend returns one result per file, in the same order it
      // received them — matched back to `pending` by position. A missing
      // entry (the response array came back shorter than the files sent)
      // is treated as a failure for that file rather than left at
      // "uploading" forever with no error and no way to recover but a
      // reload.
      const succeededKeys = new Set<string>();
      setAttachments((prev) =>
        prev.map((item) => {
          const idx = pending.findIndex((p) => p.key === item.key);
          if (idx === -1) return item;
          const result = results[idx];
          if (!result) {
            return { ...item, uploadState: "error", error: "The server didn't confirm this upload — try again." };
          }
          succeededKeys.add(item.key);
          return {
            ...item,
            attachmentId: result.attachment,
            scanStatus: result.scan_status,
            scanPollAttempts: 0,
            uploadState: "idle",
          };
        })
      );
      if (succeededKeys.size === 0) return;

      // Persist the attachments' identities onto the draft right away, not
      // only when the user separately clicks Save Draft — otherwise
      // reloading right after an upload (the common case) would resume the
      // form fields but "forget" the files were ever attached. Awaited
      // (uploadState becomes "persisting", keeping Remove and Save &
      // Continue disabled for this batch) rather than fire-and-forget:
      // Remove issues its own saveDraft to clear an attachment, and if that
      // resolved before this one, this call's later-arriving response could
      // race it. Sequencing the two removes the race instead of trying to
      // win it. Only the entries that actually succeeded above go through
      // this — one that came back errored has no attachmentId to persist,
      // and must keep showing its error rather than being flipped through
      // "persisting" back to a silent "idle".
      draftEnsuredRef.current = true;
      setAttachments((prev) =>
        prev.map((item) => (succeededKeys.has(item.key) ? { ...item, uploadState: "persisting" } : item))
      );
      try {
        await saveDraft(currentDraftPayload());
      } catch (saveError) {
        logger.error("Failed to persist the attachments onto the draft:", saveError);
      } finally {
        setAttachments((prev) =>
          prev.map((item) => (succeededKeys.has(item.key) ? { ...item, uploadState: "idle" } : item))
        );
      }
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Could not upload the file(s). Please try again.";
      setAttachments((prev) =>
        prev.map((item) => (pendingKeys.has(item.key) ? { ...item, uploadState: "error", error: message } : item))
      );
    }
  };

  const handleRemoveAttachment = (key: string) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    const itemToRemove = attachments.find((item) => item.key === key);
    setAttachments((prev) => prev.filter((item) => item.key !== key));

    if (itemToRemove?.attachmentId) {
      try {
        await deleteAttachment(itemToRemove.attachmentId);
      } catch (deleteError) {
        logger.error("Failed to delete attachment from server:", deleteError);
      }
    }
  };

  // A failed upload never reached the backend, so it shouldn't count toward
  // the cap or the badge — see activeWizardAttachments. Rendered separately
  // below from `attachments` itself so the failed row still shows in the
  // picker's own list for the user to see and remove.
  const activeAttachments = activeWizardAttachments(attachments);

  // Polls while any attachment's scan is still in flight — see
  // SCAN_POLL_INTERVAL_MS's doc comment for why this can't just wait for a
  // push. One `getAttachments` call per tick covers every pending item at
  // once. Stops itself once nothing is left Pending, or this step unmounts;
  // a resumed draft's already-scanned attachments never start this at all,
  // since their scanStatus arrives non-Pending from page.tsx's draft-load in
  // the first place.
  const pendingAttachmentIds = attachments
    .filter((a) => a.scanStatus === SCAN_STATUS.PENDING && a.attachmentId)
    .map((a) => a.attachmentId as string);
  const pendingAttachmentKey = pendingAttachmentIds.join(",");

  useEffect(() => {
    if (pendingAttachmentIds.length === 0) return;

    let cancelled = false;
    // Guards against a round-trip that outlives one interval tick — this app
    // explicitly targets slow/unreliable connections (see UPLOAD_TIMEOUT_MS's
    // own comment above), where a single `getAttachments` call can easily run
    // longer than SCAN_POLL_INTERVAL_MS. Without this, a slow tick doesn't
    // pause the interval, so the next tick's call stacks another identical
    // request on top of it instead of waiting. It also means a slow
    // connection completes fewer checks per minute, so the real wall-clock
    // time before SCAN_POLL_MAX_ATTEMPTS gives up self-extends, rather than
    // being a fixed deadline regardless of how many checks actually ran.
    let inFlight = false;
    // Counted here, synchronously in plain JS, not purely through repeated
    // setAttachments round-trips — a tick's count has to be reliably known
    // before the *next* tick fires (as soon as SCAN_POLL_INTERVAL_MS later),
    // which a value only ever read back out of React state can't guarantee
    // land before then. Seeded once, from each attachment's own
    // `scanPollAttempts` (see its doc comment) as of right now, and written
    // back onto the lifted attachment every tick — so a remount (page.tsx
    // unmounts this component on every Step 1<->2 navigation) picks up
    // close to where this run left off instead of restarting at 0, without
    // the counting itself depending on state timing.
    const attemptsById = new Map(
      attachments
        .filter((a) => a.attachmentId && pendingAttachmentIds.includes(a.attachmentId))
        .map((a) => [a.attachmentId as string, a.scanPollAttempts])
    );

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;

      let rows: AttachmentRow[] | null = null;
      try {
        rows = await getAttachments(clientUuid);
      } catch (pollError) {
        logger.error("Failed to check attachment scan status:", pollError);
      } finally {
        inFlight = false;
      }
      if (cancelled) return;

      // Derived from `rows` (this tick's fetch) against the id set this
      // effect started watching, not from the `setAttachments` updater
      // below: React doesn't guarantee that callback runs synchronously, so
      // a flag set inside it can't be trusted immediately after. A failed
      // fetch (rows still null) leaves every watched id "still pending" —
      // unknown, not resolved — so it still counts as a completed check
      // toward giving up, rather than stalling the count.
      const stillPendingIds = pendingAttachmentIds.filter((id) => {
        if (!rows) return true;
        const row = rows.find((r) => r.name === id);
        return !row || row.scan_status === SCAN_STATUS.PENDING;
      });
      const timedOutIds: string[] = [];
      for (const id of stillPendingIds) {
        const next = (attemptsById.get(id) ?? 0) + 1;
        attemptsById.set(id, next);
        if (next >= SCAN_POLL_MAX_ATTEMPTS) timedOutIds.push(id);
      }
      if (timedOutIds.length > 0) {
        logger.error(`Scan status still Pending for [${timedOutIds.join(",")}] after ${SCAN_POLL_MAX_ATTEMPTS} checks — giving up.`);
      }

      setAttachments((prev) =>
        prev.map((item) => {
          if (
            item.scanStatus !== SCAN_STATUS.PENDING ||
            !item.attachmentId ||
            !pendingAttachmentIds.includes(item.attachmentId)
          ) {
            return item;
          }
          if (timedOutIds.includes(item.attachmentId)) {
            // Otherwise the wizard is stuck showing "Scanning for
            // malware…" and a disabled Continue forever, with no
            // explanation — treating a scan that never resolved the same
            // as one that failed reuses the existing Failed
            // messaging/remove-and-retry guidance rather than adding a
            // third "stuck" state nobody built UI for.
            return { ...item, scanStatus: SCAN_STATUS.FAILED };
          }
          const row = rows?.find((r) => r.name === item.attachmentId);
          if (row && row.scan_status !== SCAN_STATUS.PENDING) {
            return { ...item, scanStatus: row.scan_status };
          }
          const attempts = attemptsById.get(item.attachmentId);
          return attempts != null ? { ...item, scanPollAttempts: attempts } : item;
        })
      );

      if (stillPendingIds.every((id) => timedOutIds.includes(id))) {
        clearInterval(intervalId);
      }
    };

    const intervalId = setInterval(() => void poll(), SCAN_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the pending id set (pendingAttachmentKey), not the attachments array itself, so a scan resolving elsewhere doesn't restart this poll loop.
  }, [pendingAttachmentKey, clientUuid, setAttachments]);

  // The scan verdict is also pushed to the uploader over the realtime socket
  // (AsyncAPI `attachment_scanned`), which settles a pending row as soon as
  // the scanner does. The poll above stays as the fallback for a socket that
  // is down or disabled: events missed while disconnected are never replayed.
  useRealtimeEvent("attachment_scanned", (event) => {
    setAttachments((prev) =>
      prev.map((item) =>
        item.attachmentId === event.attachment && item.scanStatus === SCAN_STATUS.PENDING
          ? { ...item, scanStatus: event.scan_status }
          : item
      )
    );
  });

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
        {/* Card Header */}
        <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
              <FileText className="w-6 h-6 text-[#0b8535]" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-gray-900">Grievance Details</h3>
              <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
              Step 2 of 3
            </span>
          </div>
        </div>

        {/* Card Body - Form Fields */}
        <div className="p-6 pb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Category */}
            <div>
              <label htmlFor="service-category" className="block text-sm font-semibold text-gray-800 mb-2">
                Service Category <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="service-category"
                options={dynamicServiceCategories}
                placeholder="Select category"
                value={serviceCategory}
                onChange={(cat) => {
                  setServiceCategory(cat);
                  setGrievanceType("");
                  fieldErrors.setError("serviceCategory", null);
                }}
                invalid={!!fieldErrors.errors.serviceCategory}
                describedBy={fieldErrors.errors.serviceCategory ? errorIdFor("service-category") : undefined}
              />
              {fieldErrors.errors.serviceCategory && (
                <FieldError id={errorIdFor("service-category")}>{fieldErrors.errors.serviceCategory}</FieldError>
              )}
            </div>

            {/* Grievance Type */}
            <div>
              <label htmlFor="grievance-type" className="block text-sm font-semibold text-gray-800 mb-2">
                Grievance Type <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-type"
                options={dynamicGrievanceTypes}
                placeholder="Select grievance type"
                value={grievanceType}
                onChange={(type) => {
                  setGrievanceType(type);
                  fieldErrors.setError("grievanceType", null);
                }}
                invalid={!!fieldErrors.errors.grievanceType}
                describedBy={fieldErrors.errors.grievanceType ? errorIdFor("grievance-type") : undefined}
              />
              {fieldErrors.errors.grievanceType && (
                <FieldError id={errorIdFor("grievance-type")}>{fieldErrors.errors.grievanceType}</FieldError>
              )}
            </div>

            {/* Region */}
            <div>
              <label htmlFor="grievance-region" className="block text-sm font-semibold text-gray-800 mb-2">
                Region <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-region"
                options={areaOptions(regions.areas)}
                placeholder={regions.isLoading ? "Loading regions..." : "Select region"}
                value={region?.id ?? ""}
                onChange={(id) => {
                  setRegion(findAreaRef(regions.areas, id));
                  setZone(null);
                  setWoreda(null);
                  setKebele(null);
                  fieldErrors.setError("region", null);
                }}
                invalid={!!fieldErrors.errors.region}
                describedBy={fieldErrors.errors.region ? errorIdFor("grievance-region") : undefined}
              />
              {fieldErrors.errors.region && (
                <FieldError id={errorIdFor("grievance-region")}>{fieldErrors.errors.region}</FieldError>
              )}
            </div>

            {/* Zone / Sub-city */}
            <div>
              <label htmlFor="grievance-zone" className="block text-sm font-semibold text-gray-800 mb-2">
                Zone / Sub-city <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-zone"
                options={areaOptions(zones.areas)}
                placeholder={
                  !region
                    ? "Select region first"
                    : zones.isLoading
                    ? "Loading zones..."
                    : zones.areas.length === 0
                    ? "No zones available"
                    : "Select Zone / Sub-city"
                }
                value={zone?.id ?? ""}
                onChange={(id) => {
                  setZone(findAreaRef(zones.areas, id));
                  setWoreda(null);
                  setKebele(null);
                  fieldErrors.setError("zone", null);
                }}
                disabled={!region || zones.isLoading}
                invalid={!!fieldErrors.errors.zone}
                describedBy={fieldErrors.errors.zone ? errorIdFor("grievance-zone") : undefined}
              />
              {fieldErrors.errors.zone && (
                <FieldError id={errorIdFor("grievance-zone")}>{fieldErrors.errors.zone}</FieldError>
              )}
            </div>

            {/* Woreda */}
            <div>
              <label htmlFor="grievance-woreda" className="block text-sm font-semibold text-gray-800 mb-2">
                Woreda <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-woreda"
                options={areaOptions(woredas.areas)}
                placeholder={
                  !zone
                    ? "Select zone first"
                    : woredas.isLoading
                    ? "Loading woredas..."
                    : woredas.areas.length === 0
                    ? "No woredas available"
                    : "Select Woreda"
                }
                value={woreda?.id ?? ""}
                onChange={(id) => {
                  setWoreda(findAreaRef(woredas.areas, id));
                  setKebele(null);
                  fieldErrors.setError("woreda", null);
                }}
                disabled={!zone || woredas.isLoading}
                invalid={!!fieldErrors.errors.woreda}
                describedBy={fieldErrors.errors.woreda ? errorIdFor("grievance-woreda") : undefined}
              />
              {fieldErrors.errors.woreda && (
                <FieldError id={errorIdFor("grievance-woreda")}>{fieldErrors.errors.woreda}</FieldError>
              )}
            </div>

            {/* Kebele / Village */}
            <div>
              <label htmlFor="grievance-kebele" className="block text-sm font-semibold text-gray-800 mb-2">
                Kebele / Village
              </label>
              <AnimatedSelect
                id="grievance-kebele"
                options={areaOptions(kebeles.areas)}
                placeholder={
                  !woreda
                    ? "Select woreda first"
                    : kebeles.isLoading
                    ? "Loading kebeles..."
                    : kebeles.areas.length === 0
                    ? "No kebeles available"
                    : "Select Kebele / Village"
                }
                value={kebele?.id ?? ""}
                onChange={(id) => setKebele(findAreaRef(kebeles.areas, id))}
                disabled={!woreda || kebeles.isLoading}
              />
            </div>
          </div>

          {/* Service Provider / Branch / Office Name */}
          <div>
            <label htmlFor="grievance-service-provider" className="block text-sm font-semibold text-gray-800 mb-2">
              Service Provider / Branch / Office Name
            </label>
            <input
              id="grievance-service-provider"
              type="text"
              // The backend stores this in a 140-character field.
              maxLength={140}
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              placeholder="Enter Input store, cooperative, bank, or market name (if applicable)"
              className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="grievance-description" className="block text-sm font-semibold text-gray-800 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="grievance-description"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                // Re-check as they type while it's showing an error, so it clears the moment it's long enough.
                if (fieldErrors.errors.description) {
                  fieldErrors.setError("description", descriptionErrorFor(e.target.value));
                }
              }}
              onBlur={() => fieldErrors.setError("description", descriptionErrorFor(description))}
              aria-invalid={fieldErrors.errors.description ? true : undefined}
              aria-describedby={fieldErrors.errors.description ? errorIdFor("grievance-description") : undefined}
              placeholder="Describe the issue clearly — what happened, when, where, and who was involved. Include dates, amounts, and reference numbers where available."
              className={`w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y ${INVALID_INPUT_STYLES}`}
            />
            {fieldErrors.errors.description && (
              <FieldError id={errorIdFor("grievance-description")}>{fieldErrors.errors.description}</FieldError>
            )}
          </div>

          {/* Desired Outcome */}
          <div>
            <label htmlFor="grievance-desired-outcome" className="block text-sm font-semibold text-gray-800 mb-2">
              Desired Outcome
            </label>
            <textarea
              id="grievance-desired-outcome"
              rows={3}
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              placeholder="What is the expected resolution for this grievance?"
              className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y"
            />
          </div>

          {/* Supporting Documents / Evidence */}
          <div>
            <FileDropzone
              label={
                <span className="text-sm font-semibold text-gray-800">
                  Supporting Documents / Evidence{" "}
                  {activeAttachments.length > 0 && `(${activeAttachments.length}/${MAX_ATTACHMENTS_PER_CASE})`}
                </span>
              }
              prompt={tDocs.rich("prompt", {
                strong: (chunks) => <span className="font-bold text-emerald-700">{chunks}</span>,
              })}
              hint={t("documentsHint", { max: MAX_ATTACHMENTS_PER_CASE })}
              inputLabel={tDocs("label")}
              accept=".jpg,.jpeg,.png,.pdf,.mp3"
              disabled={activeAttachments.length >= MAX_ATTACHMENTS_PER_CASE}
              onFiles={handleFiles}
            >
              {attachments.length > 0 && (
                <ul className="mt-4 flex flex-col gap-3">
                  {attachments.map((item) => (
                    <FileRow
                      key={item.key}
                      name={item.fileName}
                      icon={
                        item.uploadState === "uploading" ? (
                          <Loader2 className="h-4 w-4 shrink-0 text-[#16A34A] animate-spin" aria-hidden="true" />
                        ) : undefined
                      }
                      detail={attachmentStatusIndicator(item)}
                      actions={
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            disabled={!canPreviewAttachment(item)}
                            aria-label={`Preview ${item.fileName}`}
                            title={previewTooltip(item)}
                            className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye className="w-5 h-5 text-blue-500" />
                          </button>
                          <button
                            onClick={handleRemoveAttachment(item.key)}
                            disabled={item.uploadState === "uploading" || item.uploadState === "persisting"}
                            aria-label={`Remove ${item.fileName}`}
                            title={
                              item.uploadState === "uploading" || item.uploadState === "persisting"
                                ? "Wait for the upload to finish before removing it"
                                : undefined
                            }
                            className="p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      }
                    />
                  ))}
                </ul>
              )}
            </FileDropzone>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] rounded-b-xl">
          {error && <ErrorAlert id="grievance-details-error" className="mb-4">{error}</ErrorAlert>}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-5 py-3 mr-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
                Back
              </button>
              <Info className="w-4 h-4 text-blue-600 mr-1.5" />
              <span>All fields marked <span className="text-red-500">*</span> are required</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={draftSaveState === "saving"}
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
                onClick={handleNext}
                disabled={attachments.some(
                  (a) =>
                    a.uploadState === "uploading" ||
                    a.uploadState === "persisting" ||
                    a.scanStatus === SCAN_STATUS.INFECTED ||
                    a.scanStatus === SCAN_STATUS.FAILED ||
                    a.scanStatus === SCAN_STATUS.PENDING
                )}
                className="flex items-center gap-2 px-5 py-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#10883c] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b8535]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {previewItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 id="preview-modal-title" className="text-lg font-bold text-gray-900 truncate pr-4">
                {previewItem.fileName}
              </h3>
              <button
                type="button"
                aria-label="Close preview"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewItem(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 bg-gray-50/50 flex justify-center items-center overflow-auto max-h-[75vh]">
              {previewLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="w-10 h-10 text-[#16A34A] animate-spin mb-3" />
                  <p className="text-sm font-medium">Loading preview…</p>
                </div>
              ) : previewError ? (
                <div className="py-12 flex flex-col items-center justify-center text-red-600">
                  <AlertTriangle className="w-12 h-12 mb-3 text-red-500" />
                  <p className="text-sm font-semibold">{previewError}</p>
                </div>
              ) : previewUrl ? (
                isPdf(previewItem) ? (
                  <iframe
                    src={previewUrl}
                    title={previewItem.fileName}
                    className="w-full h-[65vh] rounded-lg border border-gray-200 shadow-sm"
                  />
                ) : isAudio(previewItem) ? (
                  <div className="py-8 w-full flex flex-col items-center justify-center">
                    <audio controls src={previewUrl} className="w-full max-w-md">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt={previewItem.fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-gray-200"
                  />
                )
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-sm font-medium">Preview not available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
