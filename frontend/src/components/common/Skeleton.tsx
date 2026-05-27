import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps {
  className?: string;
}

/**
 * A basic Skeleton block that pulses to indicate loading.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={twMerge(
        'animate-pulse bg-gray-200 dark:bg-slate-700/50 rounded',
        className
      )}
    />
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * A ready-to-use skeleton for standard data tables.
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={`th-${i}`} className="p-4">
                  <Skeleton className="h-4 w-24 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {Array.from({ length: rows }).map((_, rIndex) => (
              <tr key={`tr-${rIndex}`}>
                {Array.from({ length: columns }).map((_, cIndex) => (
                  <td key={`td-${rIndex}-${cIndex}`} className="p-4">
                    <Skeleton
                      className={`h-4 rounded-md ${
                        cIndex === 0 ? 'w-16' : cIndex === columns - 1 ? 'w-20' : 'w-full max-w-[120px]'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
