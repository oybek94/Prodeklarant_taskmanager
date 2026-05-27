import React from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Optional icon to display before the text */
  icon?: string;
  /** Optional icon to display after the text */
  endIcon?: string;
  /** Indicates loading state */
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-1 ring-blue-600/50 dark:bg-blue-600 dark:hover:bg-blue-500',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-slate-600',
  destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm ring-1 ring-red-600/50 dark:bg-red-600 dark:hover:bg-red-500',
  outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border border-gray-300 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-800',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-slate-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
  icon: 'p-2 rounded-lg justify-center',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      endIcon,
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Focus ring colors based on variant
    const focusRing = {
      primary: 'focus:ring-blue-500 dark:focus:ring-offset-slate-900',
      secondary: 'focus:ring-gray-400 dark:focus:ring-offset-slate-900',
      destructive: 'focus:ring-red-500 dark:focus:ring-offset-slate-900',
      outline: 'focus:ring-gray-400 dark:focus:ring-offset-slate-900',
      ghost: 'focus:ring-gray-400 dark:focus:ring-offset-slate-900',
    };

    const combinedClassName = twMerge(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      focusRing[variant],
      className
    );

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />
        )}
        {!isLoading && icon && (
          <Icon icon={icon} className={twMerge('w-4 h-4', children ? 'mr-2' : '')} />
        )}
        {children}
        {!isLoading && endIcon && (
          <Icon icon={endIcon} className="w-4 h-4 ml-2" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
