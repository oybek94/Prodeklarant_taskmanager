import React from 'react';

type EmptyValueProps = {
  /** The value to check for emptiness */
  value: any;
  /** What to display when empty. Default is an em-dash "—" */
  fallback?: React.ReactNode;
  /** Format of fallback. "dash" (—) or "text" (Kiritilmagan / Mavjud emas) */
  format?: 'dash' | 'text';
  /** The text to show if format='text'. Defaults to "Kiritilmagan" */
  textFallback?: string;
  /** Apply a gray color to the fallback? Defaults to true */
  dimmed?: boolean;
};

/**
 * EmptyValue is a standard component for handling missing/null data.
 * If value exists, it renders the value.
 * If value is missing (null, undefined, empty string), it renders a standardized fallback.
 */
const EmptyValue: React.FC<EmptyValueProps> = ({ 
  value, 
  fallback, 
  format = 'dash', 
  textFallback = 'Kiritilmagan',
  dimmed = true 
}) => {
  const isEmpty = value === null || value === undefined || value === '';

  if (!isEmpty) {
    return <>{value}</>;
  }

  const defaultFallback = format === 'dash' ? '—' : textFallback;
  const content = fallback ?? defaultFallback;

  if (dimmed) {
    return (
      <span className="text-gray-400 dark:text-gray-500 font-normal italic select-none">
        {content}
      </span>
    );
  }

  return <>{content}</>;
};

export default EmptyValue;

/**
 * A utility function version if a React node isn't suitable (e.g. inside an input placeholder or title attribute).
 */
export const formatEmpty = (value: any, fallback: string = '—'): string => {
  return (value === null || value === undefined || value === '') ? fallback : String(value);
};
