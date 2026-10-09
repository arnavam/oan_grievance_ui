export type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZES: Record<SpinnerSize, string> = {
  sm: 'h-5 w-5 border-2',
  md: 'h-9 w-9 border-[3px]',
  lg: 'h-14 w-14 border-4',
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-white/30 border-t-white animate-spin ${SIZES[size]} ${className}`}
    />
  );
}
