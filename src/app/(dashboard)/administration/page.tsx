import { Suspense } from 'react';
import AdministrationPage from '@/features/administration/page';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400 font-medium">Loading administration...</div>}>
      <AdministrationPage />
    </Suspense>
  );
}
