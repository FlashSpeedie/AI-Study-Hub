import { cn } from '@/lib/utils';

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sidebar placeholder - hidden on mobile */}
        <div className="hidden lg:block w-64 float-left mr-8">
          <div className="space-y-3">
            <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <div className="h-14 bg-muted/30 rounded animate-pulse mb-6" />
          
          {/* Header block */}
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-muted/30 rounded animate-pulse mb-6" />
          
          {/* Card placeholders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
            <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
            <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
          </div>
          
          {/* Wide block */}
          <div className="h-48 rounded-2xl bg-muted/20 animate-pulse mt-6" />
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
