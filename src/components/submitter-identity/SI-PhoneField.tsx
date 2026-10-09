'use client';

import { PhoneField, type PhoneFieldProps } from '@/components/ui/PhoneField';

export type SIPhoneFieldProps = PhoneFieldProps;

/**
 * The Contact Mobile field shared by every submitter-identity sub-form.
 * Backed by the shared ui/PhoneField component.
 */
export function SIPhoneField(props: PhoneFieldProps) {
  return <PhoneField {...props} />;
}
