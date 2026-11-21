import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  let variantStyles =
    'bg-blue-900 hover:bg-blue-950 active:bg-slate-950 text-white border border-blue-950/20 shadow-xs hover:shadow';

  if (variant === 'secondary') {
    variantStyles =
      'bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white border border-slate-700/50 shadow-xs hover:shadow';
  } else if (variant === 'danger') {
    variantStyles =
      'bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white border border-rose-800/50 shadow-xs hover:shadow';
  } else if (variant === 'outline') {
    variantStyles =
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 font-semibold shadow-2xs hover:border-slate-400';
  }

  let sizeStyles = 'px-4 py-2 text-xs sm:text-sm';
  if (size === 'sm') {
    sizeStyles = 'px-3 py-1.5 text-xs';
  } else if (size === 'lg') {
    sizeStyles = 'px-5 py-2.5 text-base';
  }

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
