"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { performLogout } from '@/features/auth/logout';
import { selectUser } from '@/features/auth/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Generates 1-2 letter initials from full name, falling back to email local part. */
function initialsFor(fullName?: string, email?: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0]! + parts[1][0]!).toUpperCase();
    }
    return fullName.trim().slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const local = email.split('@')[0] ?? email;
    return local.slice(0, 2).toUpperCase();
  }
  return '?';
}

export function UserProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await performLogout(dispatch, user?.email ?? null);
    router.push('/login');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.full_name || user?.email || 'Not signed in';
  const userType = user?.type || (user && user.roles.length > 0 ? user.roles.join(', ') : '');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 focus:outline-none hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 active:scale-95 transition-all duration-300 ml-2 border border-gray-200 rounded-full pl-1.5 pr-4 py-1.5 bg-white"
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-full bg-[#10b981] overflow-hidden shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm text-white text-[13px] font-bold">
          {user ? initialsFor(user.full_name, user.email) : '?'}
        </div>
        <div className="flex flex-col items-start text-left -mt-0.5">
          <span className="text-[14px] font-bold text-gray-900 leading-tight">{displayName}</span>
          {user && userType && (
            <span className="text-[13px] font-medium text-[#4b5563] leading-tight mt-0.5">{userType}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-700 stroke-[2.5] ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-gray-100 transition-all duration-200 origin-top-right z-50 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }`}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900 break-all">{displayName}</p>
          {user?.email && user.email !== displayName && (
            <p className="text-xs text-gray-500 mt-0.5 break-all">{user.email}</p>
          )}
          {userType && (
            <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-emerald-50 text-[#0b8535] text-xs font-semibold rounded-full border border-emerald-100">
              {userType}
            </span>
          )}
        </div>

        <div className="py-2">
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/profile');
            }}
            className="w-full flex items-center gap-3 px-5 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <User className="w-5 h-5 text-slate-700 stroke-[2]" />
            Profile
          </button>
        </div>

        <div className="py-2 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-5 py-3 text-[15px] font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-5 h-5 stroke-[2]" />
            {isLoggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
