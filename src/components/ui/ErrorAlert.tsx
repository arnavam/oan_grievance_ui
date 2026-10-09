import { AlertCircle } from 'lucide-react';

export interface ErrorAlertProps {
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
  /** Lets a form control reference this alert via aria-describedby, so the reason is announced when the control itself gets focus, not only when the alert first appears. */
  id?: string;
}

export function ErrorAlert({ children, icon = true, className = '', id }: ErrorAlertProps) {
  return (
    <div
      id={id}
      role="alert"
      className={`w-full flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-left ${className}`}
    >
      {icon && <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} aria-hidden="true" />}
      <span className="leading-5 min-w-0">{children}</span>
    </div>
  );
}

export default ErrorAlert;
