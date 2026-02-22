'use client';

import { useLeadActivities } from '@/lib/queries/leads';
import { ErrorState } from './ui/ErrorState';
import { Skeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';

interface ActivityTimelineProps {
  entityType: 'lead' | 'deal' | 'client';
  entityId: string;
}

function formatPayload(payload: Record<string, unknown> | null | undefined): string {
  if (!payload || Object.keys(payload).length === 0) return '';
  const interesting = Object.entries(payload)
    .filter(([k]) => !['orgId', 'id', 'updatedAt'].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(', ');
  return interesting;
}

function eventTypeBadgeColor(type: string | undefined | null): string {
  const t = type ?? '';
  if (t.includes('created')) return 'bg-blue-900/60 text-blue-300';
  if (t.includes('won')) return 'bg-green-900/60 text-green-300';
  if (t.includes('lost')) return 'bg-red-900/60 text-red-300';
  if (t.includes('stall') || t.includes('stale') || t.includes('decay'))
    return 'bg-orange-900/60 text-orange-300';
  if (t.includes('qualified') || t.includes('enriched'))
    return 'bg-purple-900/60 text-purple-300';
  if (t.includes('call')) return 'bg-yellow-900/60 text-yellow-300';
  return 'bg-gray-800 text-gray-400';
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  // Currently the API only exposes /leads/:id/activities
  // For other entity types we show a "Coming soon" placeholder
  const { data, isLoading, isError, error, refetch } = useLeadActivities(
    entityType === 'lead' ? entityId : '',
  );

  if (entityType !== 'lead') {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Activity</h3>
        <p className="text-sm text-gray-500">Activity timeline for {entityType}s coming soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Activity Timeline</h3>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-2 w-2 mt-1.5 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (!data || data.length === 0) && (
        <EmptyState
          icon="📋"
          title="No activity yet"
          description="Events will appear here as the lead progresses."
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="relative max-h-[400px] overflow-y-auto pr-1">
          <div className="absolute left-1 top-0 bottom-0 w-px bg-gray-800" />
          <ul className="space-y-4 pl-5">
            {[...data]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              )
              .map((activity) => (
                <li key={activity.id} className="relative">
                  <div className="absolute -left-5 top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-gray-900" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${eventTypeBadgeColor(activity.eventType)}`}
                      >
                        {activity.eventType}
                      </span>
                      <time className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString()}
                      </time>
                    </div>
                    {activity.payload && (
                      <p className="text-xs text-gray-500">
                        {formatPayload(activity.payload)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
