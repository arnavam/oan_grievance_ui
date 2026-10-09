import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder: string;
}

export function CustomSelect({ options, defaultValue, onChange, placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Resets the internal selection when `defaultValue` changes (e.g. the
  // parent loads a different record into this same mounted dropdown).
  // Adjusted during render, not in an effect: it takes effect in the same
  // render instead of flashing the old value for one extra render first.
  const [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue);
  if (defaultValue !== prevDefaultValue) {
    setPrevDefaultValue(defaultValue);
    setValue(defaultValue || '');
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    setValue(optionValue);
    if (onChange) onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-left flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors"
      >
        <span className={selectedOption ? 'text-gray-700' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Animated Dropdown Menu */}
      <div 
        className={`absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden transition-all duration-300 origin-top ${
          isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'
        }`}
      >
        <div className="max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                index !== options.length - 1 ? 'border-b border-gray-100' : ''
              } ${value === option.value ? 'bg-green-50 text-[#16A34A] font-semibold' : 'text-gray-600'}`}
            >
              {option.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
