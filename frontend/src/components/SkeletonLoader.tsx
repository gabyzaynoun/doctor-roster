import './SkeletonLoader.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width, height, borderRadius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
      }}
    />
  );
}

export function ScheduleGridSkeleton() {
  return (
    <div className="schedule-grid-skeleton">
      <div className="skeleton-header">
        <Skeleton width={150} height={40} borderRadius="8px" />
        <div className="skeleton-days">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} width={60} height={50} borderRadius="8px" />
          ))}
        </div>
      </div>
      <div className="skeleton-body">
        {Array.from({ length: 4 }).map((_, centerIdx) => (
          <div key={centerIdx} className="skeleton-center-group">
            <Skeleton width="100%" height={35} borderRadius="6px" className="skeleton-center-header" />
            {Array.from({ length: 3 }).map((_, shiftIdx) => (
              <div key={shiftIdx} className="skeleton-row">
                <Skeleton width={80} height={35} borderRadius="6px" />
                {Array.from({ length: 7 }).map((_, dayIdx) => (
                  <Skeleton key={dayIdx} width={60} height={35} borderRadius="6px" />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="doctor-card-skeleton">
      <Skeleton width={40} height={40} borderRadius="50%" />
      <div className="skeleton-info">
        <Skeleton width={120} height={16} borderRadius="4px" />
        <Skeleton width={80} height={12} borderRadius="4px" />
      </div>
    </div>
  );
}

export function DoctorListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="doctor-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <DoctorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="table-row-skeleton">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height={20} borderRadius="4px" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-skeleton">
      <div className="table-header-skeleton">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={24} borderRadius="4px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card-skeleton">
      <Skeleton width="60%" height={20} borderRadius="4px" />
      <Skeleton width="80%" height={16} borderRadius="4px" />
      <Skeleton width="40%" height={16} borderRadius="4px" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card-skeleton">
      <Skeleton width={40} height={40} borderRadius="8px" />
      <div className="stat-info">
        <Skeleton width={60} height={28} borderRadius="4px" />
        <Skeleton width={80} height={14} borderRadius="4px" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="stats-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="charts-row">
        <Skeleton width="100%" height={300} borderRadius="12px" />
        <Skeleton width="100%" height={300} borderRadius="12px" />
      </div>
    </div>
  );
}
