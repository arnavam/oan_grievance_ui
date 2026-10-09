"use client";

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';

import { Officer, OfficerCard } from './components/OfficerCard';
import { AddOfficerModal } from './components/AddOfficerModal';
import { EditOfficerModal } from './components/EditOfficerModal';

const initialOfficers: Officer[] = [
  {
    id: '1',
    initials: 'TA',
    initialsBg: 'bg-[#065f46]',
    name: 'Tigist Alemu',
    role: 'Inputs Quality Grievance Officer',
    department: 'Inputs Supply & Distribution Agency',
    email: 'tigist.alemu@isda.gov.et',
    phone: '+251 911 234 567',
    region: 'Oromia',
    tags: ['Inputs'],
    assigned: 48,
    resolved: 39,
    avgTime: '11d',
    resolutionRate: 81,
    status: 'Active'
  },
  {
    id: '2',
    initials: 'DH',
    initialsBg: 'bg-[#065f46]',
    name: 'Dawit Haile',
    role: 'Market Grievance Coordinator',
    department: 'Market Development & Trade Bureau',
    email: 'dawit.haile@mdtb.gov.et',
    phone: '+251 912 345 678',
    region: 'Tigray',
    tags: ['Markets'],
    assigned: 36,
    resolved: 28,
    avgTime: '13d',
    resolutionRate: 78,
    status: 'Active'
  },
  {
    id: '3',
    initials: 'SB',
    initialsBg: 'bg-[#065f46]',
    name: 'Selam Bekele',
    role: 'Agricultural Credit Officer',
    department: 'Agricultural Finance Institute (AFI)',
    email: 'selam.bekele@afi.gov.et',
    phone: '+251 913 456 789',
    region: 'Sidama',
    tags: ['Inputs', 'Payments'],
    assigned: 22,
    resolved: 19,
    avgTime: '9d',
    resolutionRate: 86,
    status: 'Active'
  },
  {
    id: '4',
    initials: 'HG',
    initialsBg: 'bg-[#065f46]',
    name: 'Hana Girma',
    role: 'Schemes & Extension Officer',
    department: 'Ministry of Agriculture (MoA)',
    email: 'hana.girma@moa.gov.et',
    phone: '+251 914 567 890',
    region: 'Amhara',
    tags: ['Schemes'],
    assigned: 31,
    resolved: 24,
    avgTime: '12d',
    resolutionRate: 77,
    status: 'Active'
  },
  {
    id: '5',
    initials: 'LK',
    initialsBg: 'bg-[#065f46]',
    name: 'Lemma Kassa',
    role: 'Cooperative Payments Officer',
    department: 'Cooperative Promotion Agency',
    email: 'lemma.kassa@cpa.gov.et',
    phone: '+251 915 678 901',
    region: 'Somali',
    tags: ['Payments', 'Markets'],
    assigned: 17,
    resolved: 12,
    avgTime: '15d',
    resolutionRate: 71,
    status: 'On Leave'
  },
  {
    id: '6',
    initials: 'BT',
    initialsBg: 'bg-[#065f46]',
    name: 'Biruk Tesfaye',
    role: 'Finance Grievance Analyst',
    department: 'Agricultural Finance Institute (AFI)',
    email: 'biruk.tesfaye@afi.gov.et',
    phone: '+251 916 789 012',
    region: 'Oromia',
    tags: ['Credit'],
    assigned: 19,
    resolved: 14,
    avgTime: '11d',
    resolutionRate: 74,
    status: 'Active'
  }
];



export function NodalOfficersL1() {
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
          <div className="flex gap-4 text-xs font-semibold text-gray-500">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
              5 Active
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              1 On Leave
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              0 Inactive
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803d] text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors w-full md:w-auto shadow-sm"
          >
            <Plus size={16} strokeWidth={3} />
            Add L1 Officer
          </button>
        </div>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="p-6">
          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-0">
            {filteredOfficers.map(officer => (
              <OfficerCard
                key={officer.id}
                officer={officer}
                onEdit={(o) => setEditingOfficer(o)}
              />
            ))}
          </div>
        </div>
      </div>

      <AddOfficerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditOfficerModal
        isOpen={!!editingOfficer}
        onClose={() => setEditingOfficer(null)}
        officer={editingOfficer}
      />
    </div>
  );
}
