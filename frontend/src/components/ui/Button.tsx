import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'urgent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex justify-center items-center font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2.5 px-4 text-sm',
    lg: 'py-3 px-6 text-base',
  };

  const variantClasses = {
    primary: 'border border-transparent text-on-primary bg-primary hover:bg-primary-container focus:ring-primary',
    secondary: 'border border-outline-variant text-on-surface bg-surface-card hover:bg-surface-container focus:ring-primary',
    ghost: 'border border-transparent text-primary bg-transparent hover:bg-primary/10 focus:ring-primary shadow-none',
    urgent: 'border border-transparent text-on-error bg-status-error hover:bg-error-container focus:ring-status-error',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
