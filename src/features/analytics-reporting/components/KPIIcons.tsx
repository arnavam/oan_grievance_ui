import React from 'react';

interface IconProps extends React.ComponentProps<"svg"> {
  color?: string;
}

export const TimerIcon = ({ className, color = "currentColor", ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={color} className={className} {...props} xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="2.5" rx="1" />
    <rect x="10.5" y="4" width="3" height="3" />
    <rect x="18" y="4" width="2.5" height="5" rx="1.25" transform="rotate(45 19.25 6.5)" />
    <circle cx="12" cy="14" r="9.5" />
    <rect x="10.5" y="8" width="3" height="7" rx="1.5" fill="white" />
  </svg>
);

export const CheckCircleIcon = ({ className, color = "currentColor", ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={color} className={className} {...props} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" />
    <path d="M7.5 12L10.5 15L16.5 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const TrendDotsIcon = ({ className, color = "currentColor", ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={color} className={className} {...props} xmlns="http://www.w3.org/2000/svg">
    <path d="M5 14L15 4M10 4H15V9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="20" cy="4" r="1.25" />
    <circle cx="15" cy="9" r="1.25" />
    <circle cx="20" cy="9" r="1.25" />
    <circle cx="10" cy="14" r="1.25" />
    <circle cx="15" cy="14" r="1.25" />
    <circle cx="20" cy="14" r="1.25" />
    <circle cx="5" cy="19" r="1.25" />
    <circle cx="10" cy="19" r="1.25" />
    <circle cx="15" cy="19" r="1.25" />
    <circle cx="20" cy="19" r="1.25" />
  </svg>
);

export const StarIcon = ({ className, color = "currentColor", ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" className={className} {...props} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3.5L14.7 9.1L20.8 10L16.4 14.4L17.4 20.5L12 17.7L6.6 20.5L7.6 14.4L3.2 10L9.3 9.1L12 3.5Z" />
  </svg>
);
