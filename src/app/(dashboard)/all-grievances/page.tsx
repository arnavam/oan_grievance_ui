import AllGrievancesPage from "@/features/all-grievances/page";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "All Grievances | Grievance Management Dashboard",
};

export default function AllGrievances() {
  return (
    <Suspense>
      <AllGrievancesPage />
    </Suspense>
  );
}
