export interface SIFormProps {
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  /**
   * Field keys to skip rendering — e.g. ones a caller already collected
   * earlier in its own flow (the register form reuses these components for
   * their per-type fields, but doesn't want Full Name/Phone/Email repeated
   * after already asking for them). Defaults to none.
   */
  hiddenFields?: string[];
  /** Validation messages by field key, shown directly under the matching field. */
  errors?: Record<string, string>;
  /** Called with a field's key when it loses focus, so the caller can validate it. */
  onFieldBlur?: (key: string) => void;
}

export interface SIFieldMeta {
  key: string;
  label: string;
  required: boolean;
}
