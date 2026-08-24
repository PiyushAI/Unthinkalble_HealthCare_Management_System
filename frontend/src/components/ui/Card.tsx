import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-surface-card rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-outline-variant overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
