'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BackLinkProps {
  /** Where Back leads when there is no history to step back through. */
  href: string;
  label?: string;
}

export function BackLink({ href, label = 'Back' }: BackLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (window.history.length <= 1) return;
        event.preventDefault();
        router.back();
      }}
      className="inline-flex items-center space-x-2 text-[#4B5563] hover:text-[#111827] font-medium text-sm transition-colors"
    >
      <ArrowLeft size={16} strokeWidth={2.5} />
      <span>{label}</span>
    </Link>
  );
}
