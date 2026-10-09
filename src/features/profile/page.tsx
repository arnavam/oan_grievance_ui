"use client";

import { useEffect, useId, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/features/auth/store/authSlice";
import { getFullProfile, resolveFaydaId, type BackendAuthMeData } from "@/features/auth/api/authApi";
import { logger } from "@/lib/logger";
import { UserCircle, Loader2, AlertTriangle, Info, Eye, EyeOff } from "lucide-react";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "U";
}

/** A stored value, or an honest admission that there isn't one — same convention as A2C's profile modal. */
function displayValue(value: string | null | undefined): string {
  return value && value.trim() ? value : "Not provided";
}

// readOnly, not disabled: a disabled input is pulled out of the tab order
// and inconsistently announced by screen readers, so it makes the entire
// section unreachable by keyboard. readOnly keeps it focusable and
// selectable (for copying a value out) while still refusing edits.
const lockedFieldClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 mb-1.5">{label}</label>
      <input id={id} type="text" value={displayValue(value)} readOnly className={lockedFieldClass} />
    </div>
  );
}

/**
 * Same masked-by-default + explicit-reveal treatment `SIMaskedIdField` gives
 * a Fayda ID at registration — a government ID number gets the same
 * shoulder-surfing/screen-share protection a password does, here too, not
 * plaintext on first paint just because this instance is read-only rather
 * than editable. Only Fayda ID gets this: registration_number (an
 * organisation's registration, not a person's national ID) was never
 * treated as sensitive at registration either — see SI-CooperativeFPOForm.tsx,
 * a plain input, not SIMaskedIdField.
 */
function MaskedField({ label, value }: { label: string; value: string | null | undefined }) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const hasValue = Boolean(value && value.trim());
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={revealed ? "text" : "password"}
          value={displayValue(value)}
          readOnly
          className={`${lockedFieldClass} pr-10`}
        />
        {hasValue && (
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAppSelector(selectUser);
  const [profile, setProfile] = useState<BackendAuthMeData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    getFullProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error("Failed to load profile:", error);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grievanceProfile = profile?.profiles?.grievance;
  const displayName = profile?.full_name || user?.email || "User";
  const initials = initialsFor(displayName);
  // Same fallback authApi.ts's getMe() uses for Redux's `user.mobile_no` —
  // kept in sync so this page doesn't show "Not provided" for a value the
  // header/rest of the app already displays correctly for the same account.
  const mobileNo = profile?.mobile_no || grievanceProfile?.contact_mobile;
  const faydaId = resolveFaydaId(grievanceProfile?.identities);

  return (
    <div className="flex flex-col gap-6 font-sans pb-2">
      <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 mb-1">
          <UserCircle className="w-6 h-6 text-[#0b8535]" />
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        </div>
        <p className="text-[15px] text-gray-500 font-medium">Your account details.</p>
      </div>

      {status === "loading" && (
        <div role="status" className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0b8535] animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading profile…</p>
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm p-6 flex items-center gap-3 text-red-600 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          Could not load your profile right now.
        </div>
      )}

      {status === "ready" && (
        <>
          {/* Personal Information */}
          <section className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm">
            <div className="p-6 pb-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Personal Information</h3>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Editing isn&apos;t available yet — these fields are read-only for now.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 p-6">
              <div className="flex flex-col items-center justify-center min-w-[200px]">
                <div className="w-24 h-24 rounded-full bg-[#10b981] flex items-center justify-center text-white text-3xl font-bold shadow-sm">
                  {initials}
                </div>
                <h4 className="mt-4 font-bold text-gray-900 text-center">{displayName}</h4>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {user && user.roles.length > 0 ? user.roles.join(", ") : "No role assigned"}
                </p>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Full Name" value={profile?.full_name} />
                <Field label="Email" value={profile?.login_email} />
                <Field label="Phone Number" value={mobileNo} />
                <Field label="Preferred Language" value={grievanceProfile?.preferred_language} />
              </div>
            </div>
          </section>

          {/* Account Information — namespaced under profiles.grievance:
              submitter identity for a submitter, role/scope for staff. */}
          {grievanceProfile && (
            <section className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Account Type" value={grievanceProfile.type} />
                <Field label="Role" value={grievanceProfile.role} />
                {faydaId && <MaskedField label="Fayda ID" value={faydaId} />}
                {grievanceProfile.registration_number && (
                  <Field label="Registration Number" value={grievanceProfile.registration_number} />
                )}
                {grievanceProfile.department && <Field label="Department" value={grievanceProfile.department} />}
                {grievanceProfile.role_level && <Field label="Role Level" value={grievanceProfile.role_level} />}
                {grievanceProfile.administrative_area && (
                  <Field label="Administrative Area" value={grievanceProfile.administrative_area} />
                )}
                {grievanceProfile.administrative_unit && (
                  <Field label="Administrative Unit" value={grievanceProfile.administrative_unit} />
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
