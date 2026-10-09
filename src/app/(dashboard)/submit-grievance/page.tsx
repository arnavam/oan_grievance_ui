import SubmitGrievancePage from "@/features/submit-grievance/page";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Submit Grievance | Grievance Management Dashboard",
};

export default function SubmitGrievance() {
  return (
    <Suspense>
      <SubmitGrievancePage />
    </Suspense>
  );
}
