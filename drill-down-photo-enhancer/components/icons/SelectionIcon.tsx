import React from 'react';

const SelectionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 3v4" />
    <path d="M3 17v4" />
    <path d="M21 3v4" />
    <path d="M21 17v4" />
    <path d="M4 3h4" />
    <path d="M16 3h4" />
    <path d="M4 21h4" />
    <path d="M16 21h4" />
  </svg>
);

export default SelectionIcon;