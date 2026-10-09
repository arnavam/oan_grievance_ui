import { X, Save, ChevronDown } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

const departmentOptions = [
  { value: 'Ministry of Agriculture (MoA)', label: 'Ministry of Agriculture (MoA)' },
  { value: 'Agricultural Transformation Institute (ATI)', label: 'Agricultural Transformation Institute (ATI)' },
  { value: 'Ethiopian Agricultural Business Corporation (EABC)', label: 'Ethiopian Agricultural Business Corporation (EABC)' },
  { value: 'Cooperative Promotion Agency', label: 'Cooperative Promotion Agency' },
  { value: 'Agricultural Finance Institute (AFI)', label: 'Agricultural Finance Institute (AFI)' },
  { value: 'Inputs Supply & Distribution Agency', label: 'Inputs Supply & Distribution Agency' },
  { value: 'Market Development & Trade Bureau', label: 'Market Development & Trade Bureau' },
  { value: 'Regional Bureau of Agriculture', label: 'Regional Bureau of Agriculture' },
  { value: 'Woreda Agriculture & Natural Resource Office', label: 'Woreda Agriculture & Natural Resource Office' },
  { value: 'Irrigation & Lowlands Development Authority', label: 'Irrigation & Lowlands Development Authority' }
];

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'On Leave', label: 'On Leave' }
];

const categoryOptions = [
  { value: 'Inputs', label: 'Inputs' },
  { value: 'Schemes', label: 'Schemes' },
  { value: 'Payments', label: 'Payments' },
  { value: 'Credit', label: 'Credit' },
  { value: 'Markets', label: 'Markets' }
];

interface AddOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddOfficerModal({ isOpen, onClose }: AddOfficerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col font-sans">

          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Add Nodal Officer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* Title / Designation */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Title / Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Job title"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={departmentOptions}
                  placeholder="Select Department"
                />
              </div>

              {/* Email ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="Enter Email ID"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative w-24 flex-shrink-0">
                    <select className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors">
                      <option value="+255">+255</option>
                      <option value="+251">+251</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Phone"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Region
                </label>
                <input
                  type="text"
                  placeholder="Enter Region"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Status <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={statusOptions}
                  placeholder="Select Status"
                />
              </div>

              {/* Assigned Service Categories */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Assigned Service Categories <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={categoryOptions}
                  placeholder="Select Assigned Categories"
                />
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-4 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
              <Save size={16} strokeWidth={2.5} />
              Save Officer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
