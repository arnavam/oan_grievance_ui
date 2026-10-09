"use client";

import { useFormatter, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { FileDropzone, FileRow } from "@/components/ui/FileDropzone";

import {
  MAX_ATTACHMENTS_PER_CASE,
  MAX_ATTACHMENT_BYTES,
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  ACCEPTED_ATTACHMENT_EXTENSIONS,
} from "@/lib/attachments";

export interface SupportingDocumentsFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** Called when a pick or drop included files that were skipped for type, size, or slot limits. */
  onRejected: () => void;
  disabled?: boolean;
  maxFiles?: number;
}

/**
 * Documents attached to a case action, shared by the officer response form
 * and the submitter's action panel. Only holds the picked files; the form
 * that owns it uploads them on submit.
 */
export function SupportingDocumentsField({
  files,
  onChange,
  onRejected,
  disabled,
  maxFiles = MAX_ATTACHMENTS_PER_CASE,
}: SupportingDocumentsFieldProps) {
  const t = useTranslations("supportingDocuments");
  const format = useFormatter();

  const addFiles = (picked: File[]) => {
    const remainingSlots = Math.max(0, maxFiles - files.length);
    const valid = picked.filter(
      (f) => (ACCEPTED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(f.type) && f.size <= MAX_ATTACHMENT_BYTES
    );
    const unique = valid.filter((f) => !files.some((p) => p.name === f.name && p.size === f.size));
    const toAdd = unique.slice(0, remainingSlots);

    if (toAdd.length > 0) {
      onChange([...files, ...toAdd]);
    }

    // Trigger rejection feedback if files were filtered out or capped by available slots.
    if (valid.length < picked.length || unique.length > remainingSlots) {
      onRejected();
    }
  };

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
      ? format.number(bytes / (1024 * 1024), { style: "unit", unit: "megabyte", maximumFractionDigits: 1 })
      : format.number(Math.max(1, Math.round(bytes / 1024)), { style: "unit", unit: "kilobyte" });

  const isFull = files.length >= maxFiles;

  return (
    <FileDropzone
      label={t("label")}
      prompt={t.rich("prompt", {
        strong: (chunks) => <span className="font-bold text-emerald-700">{chunks}</span>,
      })}
      hint={t("hint")}
      inputLabel={t("label")}
      accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
      disabled={disabled || isFull}
      onFiles={addFiles}
    >
      {files.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {files.map((file) => (
            <FileRow
              key={`${file.name}-${file.size}`}
              name={file.name}
              detail={formatSize(file.size)}
              actions={
                <button
                  type="button"
                  onClick={() => onChange(files.filter((f) => f !== file))}
                  aria-label={t("remove", { name: file.name })}
                  disabled={disabled}
                  className="rounded p-1 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              }
            />
          ))}
        </ul>
      )}
    </FileDropzone>
  );
}
