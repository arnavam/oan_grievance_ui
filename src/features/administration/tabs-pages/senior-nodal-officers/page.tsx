"use client";

import { useState } from 'react';
import { Search, Plus, Zap } from 'lucide-react';

import { Officer, SeniorOfficerCard } from './components/SeniorOfficerCard';
import { AddSeniorOfficerModal } from './components/AddSeniorOfficerModal';
import { EditSeniorOfficerModal } from './components/EditSeniorOfficerModal';

const initialOfficers: Officer[] = [
  {
    id: '1',
    initials: 'YM',
    initialsBg: 'bg-[#065f46]',
    name: 'Yonas Mekonnen',
    role: 'Deputy Director, Market Governance',
    department: 'Market Development & Trade Burea',
    email: 'almaz.worku@mdtb.gov.et',
    phone: '+251 911 100 002',
    region: 'Addis Ababa',
    tags: ['Inputs'],
    assigned: 12,
    resolved: 11,
    avgTime: '8d',
    resolutionRate: 92,
    status: 'Active',
    reportsTo: 'Tigist Alemu'
  },
  {
    id: '2',
    initials: 'AW',
    initialsBg: 'bg-[#065f46]',
    name: 'Almaz Worku',
    role: 'Market Grievance Coordinator',
    department: 'Market Development & Trade Bureau',
    email: 'dawit.haile@mdtb.gov.et',
    phone: '+251 912 345 678',
    region: 'Tigray',
    tags: ['Markets', 'Payments'],
    assigned: 8,
    resolved: 8,
    avgTime: '10d',
    resolutionRate: 100,
    status: 'Active',
    reportsTo: 'Dawit Haile'
  },
  {
    id: '3',
    initials: 'MS',
    initialsBg: 'bg-[#065f46]',
    name: 'Mekdes Solomon',
    role: 'Head of Credit Policy, AFI',
    department: 'Agricultural Finance Institute (AFI)',
    email: 'mekdes.solomon@afi.gov.et',
    phone: '+251 911 100 003',
    region: 'Addis Ababa',
    tags: ['Credit'],
    assigned: 5,
    resolved: 5,
    avgTime: '7d',
    resolutionRate: 100,
    status: 'Active',
    reportsTo: 'Selam Bekele'
  },
  {
    id: '4',
    initials: 'FN',
    initialsBg: 'bg-[#065f46]',
    name: 'Fikadu Negash',
    role: 'State Minister for Agricultural Services',
    department: 'Ministry of Agriculture (MoA)',
    email: 'fikadu.negash@moa.gov.et',
    phone: '+251 911 100 004',
    region: 'Addis Ababa',
    tags: ['Schemes', 'Inputs', 'Markets', 'Credit', 'Payments'],
    assigned: 6,
    resolved: 6,
    avgTime: '9d',
    resolutionRate: 83,
    status: 'Active',
    reportsTo: 'Hana Girma'
  }
];



export function SeniorNodalOfficersL2() {
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);

  const filteredOfficers = initialOfficers.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white rounded-xl shadow-sm border border-gray-100 font-sans overflow-hidden">

      {/* Top Search & Actions (Fixed) */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-gray-200 shrink-0">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
            placeholder="Search officers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="text-sm font-medium text-gray-500">
            L2 officers receive escalations when L1 exceeds SLA deadline.
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803d] text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors w-full md:w-auto shadow-sm"
          >
            <Plus size={16} strokeWidth={3} />
            Add L2 Officer
          </button>
        </div>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="p-6">
          {/* Escalation Flow Info */}
          <div className="mb-6 bg-[#FFFBEB] border border-[#F7ECBB] rounded-xl px-5 py-3 flex items-center gap-3">
            <Zap size={18} className="text-[#D97706] fill-transparent" />
            <span className="text-[14px] font-semibold text-[#B45309]">
              Escalation flow: <span className="font-medium text-[#D97706]">Submitted → L1 Officer → SLA breach → L1 escalation → 2× SLA → L2 escalation → Admin notified.</span>
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-0">
            {filteredOfficers.map(officer => (
              <SeniorOfficerCard
                key={officer.id}
                officer={officer}
                onEdit={(o) => setEditingOfficer(o)}
              />
            ))}
          </div>
        </div>
      </div>

      <AddSeniorOfficerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditSeniorOfficerModal
        isOpen={!!editingOfficer}
        onClose={() => setEditingOfficer(null)}
        officer={editingOfficer}
      />
    </div>
  );
}
