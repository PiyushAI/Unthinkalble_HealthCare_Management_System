import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  id,
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block font-label-sm text-label-sm text-on-surface font-medium mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`block w-full py-2 border border-outline rounded-lg text-on-surface focus:ring-primary focus:border-primary sm:text-sm bg-surface-card ${
            icon ? 'pl-10 pr-3' : 'px-3'
          }`}
          {...props}
        />
      </div>
    </div>
  );
};
