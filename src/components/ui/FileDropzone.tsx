"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { File as FileIcon, Upload } from "lucide-react";

export interface FileDropzoneProps {
  label: ReactNode;
  /** Main line inside the drop area, e.g. "Click to upload or drag and drop". */
  prompt: ReactNode;
  /** Secondary line: accepted types and size limit. */
  hint: ReactNode;
  /** Accessible name for the hidden file input. */
  inputLabel: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Receives every picked or dropped file; filtering is the caller's job. */
  onFiles: (files: File[]) => void;
  /** Rendered under the drop area — normally a list of `FileRow`s. */
  children?: ReactNode;
}

/**
 * Click-or-drop file picker. Holds no file state: it hands picked files to
 * `onFiles` and renders whatever list the caller passes as children.
 */
export function FileDropzone({
  label,
  prompt,
  hint,
  inputLabel,
  accept,
  multiple = true,
  disabled,
  onFiles,
  children,
}: FileDropzoneProps) {
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div>
      <div id={labelId} className="text-base font-bold text-gray-800 mb-2">
        {label}
      </div>
      <button
        type="button"
        aria-describedby={labelId}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) onFiles(Array.from(e.dataTransfer.files));
        }}
        className={`w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed ${
          isDragging ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"
        }`}
      >
        <Upload className="h-6 w-6 text-gray-500" aria-hidden="true" />
        <span className="text-sm text-gray-600">{prompt}</span>
        <span className="text-xs text-gray-400">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        aria-label={inputLabel}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
      {children}
    </div>
  );
}

export interface FileRowProps {
  name: string;
  /** Right-aligned detail, e.g. a size or an upload/scan status. */
  detail?: ReactNode;
  /** Replaces the default file icon, e.g. with a spinner while uploading. */
  icon?: ReactNode;
  /** Buttons at the end of the row (preview, remove). */
  actions?: ReactNode;
}

/** One picked file under a `FileDropzone`. Wrap rows in a `<ul>`. */
export function FileRow({ name, detail, icon, actions }: FileRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
      {icon ?? <FileIcon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />}
      <span className="flex-1 truncate text-gray-800">{name}</span>
      {detail != null && <span className="flex items-center gap-1.5 text-gray-500">{detail}</span>}
      {actions}
    </li>
  );
}
