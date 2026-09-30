const SkeletonCard = () => (
  <div className="flex items-start p-4 gap-3 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-[#333940] flex-shrink-0" />
    <div className="flex-grow min-w-0 space-y-2">
      <div className="h-3.5 bg-[#333940] rounded w-4/5" />
      <div className="h-3 bg-[#2a2d33] rounded w-2/5" />
    </div>
    <div className="h-3 bg-[#2a2d33] rounded w-10 flex-shrink-0" />
  </div>
);

const NotificationSkeleton = () => (
  <div className="divide-y divide-white/5">
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default NotificationSkeleton;
