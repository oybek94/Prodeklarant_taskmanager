import React from 'react';

/** Skeleton shimmer animatsiya effekti */
const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/10 before:to-transparent';

/** Oddiy skeleton block */
const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200 dark:bg-slate-700 rounded ${shimmer} ${className}`} />
);

/** Task detail modal skeleton */
export const TaskDetailSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBlock className="w-48 h-6 rounded-lg" />
        <SkeletonBlock className="w-32 h-4 rounded" />
      </div>
      <SkeletonBlock className="w-24 h-8 rounded-xl" />
    </div>

    {/* Info cards */}
    <div className="grid grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
          <SkeletonBlock className="w-20 h-3 rounded" />
          <SkeletonBlock className="w-28 h-5 rounded" />
        </div>
      ))}
    </div>

    {/* Stage list */}
    <div className="space-y-3">
      <SkeletonBlock className="w-32 h-5 rounded-lg" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
          <SkeletonBlock className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1">
            <SkeletonBlock className={`h-4 rounded ${i % 2 === 0 ? 'w-40' : 'w-32'}`} />
            <SkeletonBlock className="w-20 h-3 rounded" />
          </div>
          <SkeletonBlock className="w-20 h-7 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);
