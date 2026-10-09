export interface SlaCategory {
    id: string;
    category: string; // e.g. "Inputs", "Markets", "Credit"
    categoryColor: string; // e.g. "bg-green-100 text-green-700"
    department: string; // the department the category routes to
    /** The category's SLA configuration (what PATCH takes); null when it has none. */
    configId: string | null;
    slaDays: number;
    autoEscalate: boolean;
    /** Notify on breach (the SLA configuration's flag). */
    notifyOnBreach: boolean;
    progressPercentage?: number;
}

/** Chip colours, handed out to categories in list order. */
export const CATEGORY_COLORS = [
    'bg-[#DCFCE7] text-[#008236] border border-[#99E8B5]',
    'bg-[#FFEDD4] text-[#CA3500] border border-[#F9CA96]',
    'bg-[#F3E8FF] text-[#BB4D00] border border-[#E2C7FF]',
    'bg-[#FEF3C6] text-[#8200DB] border border-[#F8DB67]',
    'bg-[#DBEAFE] text-[#1447E6] border border-[#BEDBFF]',
];
