function SkeletonCard({ className = '' }) {
    return (
      <div className={`animate-pulse rounded-2xl bg-card/60 p-4 ${className}`}>
        <div className="h-36 rounded-xl bg-white/5" />
        <div className="mt-4 space-y-3">
          <div className="h-4 rounded bg-white/5" />
          <div className="h-4 w-2/3 rounded bg-white/5" />
        </div>
      </div>
    );
  }
  
  export default SkeletonCard;
