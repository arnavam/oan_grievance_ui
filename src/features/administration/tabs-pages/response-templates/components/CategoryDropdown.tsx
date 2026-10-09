import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CategoryDropdownProps {
    /** Service category names from the grievance options. */
    categories: string[];
    value: string;
    /** Called with '' for "all categories". */
    onChange: (category: string) => void;
}

export function CategoryDropdown({ categories, value, onChange }: CategoryDropdownProps) {
    const t = useTranslations('admin.responseTemplates');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [{ value: '', label: t('allCategories') }, ...categories.map((c) => ({ value: c, label: c }))];

    return (
        <div className="flex flex-col relative" ref={dropdownRef}>
            <span id="template-category-filter" className="text-[14px] font-bold text-[#4B5563] mb-1">
                {t('serviceCategory')}
            </span>

            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby="template-category-filter"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between px-4 py-2 bg-white border rounded-lg text-[15px] text-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] min-w-[240px] transition-colors ${isOpen ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200'}`}
            >
                <span className={value ? 'text-gray-900 font-medium' : 'text-[#6B7280] font-medium'}>
                    {value || t('allCategories')}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <ul role="listbox" aria-labelledby="template-category-filter" className="max-h-[220px] overflow-y-auto py-1 [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                        {options.map((option) => (
                            <li key={option.value || 'all'} role="option" aria-selected={value === option.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onChange(option.value);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-[15px] hover:bg-gray-50 transition-colors ${value === option.value ? 'bg-[#F0FDF4] text-[#16A34A] font-medium' : 'text-[#4B5563]'}`}
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
