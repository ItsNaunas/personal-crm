import clsx from 'clsx';

type Variant =
  | 'default'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'gray'
  | 'orange'
  | 'cyan';

const variants: Record<Variant, string> = {
  default: 'bg-gray-800 text-gray-300',
  blue: 'bg-blue-900/60 text-blue-300',
  green: 'bg-green-900/60 text-green-300',
  yellow: 'bg-yellow-900/60 text-yellow-300',
  red: 'bg-red-900/60 text-red-300',
  purple: 'bg-purple-900/60 text-purple-300',
  gray: 'bg-gray-800/80 text-gray-400',
  orange: 'bg-orange-900/60 text-orange-300',
  cyan: 'bg-cyan-900/60 text-cyan-300',
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

// Stage badge helpers
export function lifecycleStageBadge(stage: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    new_lead: { label: 'New Lead', variant: 'blue' },
    contacted: { label: 'Contacted', variant: 'purple' },
    qualified: { label: 'Qualified', variant: 'yellow' },
    proposal: { label: 'Proposal', variant: 'yellow' },
    negotiation: { label: 'Negotiation', variant: 'yellow' },
    won: { label: 'Won', variant: 'green' },
    lost: { label: 'Lost', variant: 'red' },
  };
  return map[stage] ?? { label: stage, variant: 'gray' };
}

export function dealStageBadge(stage: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    discovery: { label: 'Discovery', variant: 'blue' },
    proposal: { label: 'Proposal', variant: 'purple' },
    negotiation: { label: 'Negotiation', variant: 'yellow' },
    won: { label: 'Won', variant: 'green' },
    lost: { label: 'Lost', variant: 'red' },
  };
  return map[stage] ?? { label: stage, variant: 'gray' };
}

export function callStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    booked: { label: 'Booked', variant: 'blue' },
    completed: { label: 'Completed', variant: 'green' },
    no_show: { label: 'No Show', variant: 'red' },
  };
  return map[status] ?? { label: status, variant: 'gray' };
}

/** Next action (Contact, Follow up, Schedule call, etc.) with distinct colors. */
export function nextActionBadge(nextAction: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    contact: { label: 'Contact', variant: 'blue' },
    follow_up: { label: 'Follow up', variant: 'orange' },
    schedule_call: { label: 'Schedule call', variant: 'purple' },
    send_proposal: { label: 'Send proposal', variant: 'cyan' },
    no_action: { label: 'No action', variant: 'gray' },
  };
  return map[nextAction] ?? { label: nextAction, variant: 'gray' };
}

/** Priority (Critical, High, Normal, Low) with distinct colors. */
export function priorityBadge(priority: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    critical: { label: 'Critical', variant: 'red' },
    high: { label: 'High', variant: 'orange' },
    normal: { label: 'Normal', variant: 'gray' },
    low: { label: 'Low', variant: 'default' },
  };
  return map[priority] ?? { label: priority, variant: 'gray' };
}

/** Cold = cool blue, Warm = orange, Hot = red. Use for badges and temperature styling. */
export function temperatureBadge(temp: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    cold: { label: 'Cold', variant: 'cyan' },
    warm: { label: 'Warm', variant: 'orange' },
    hot: { label: 'Hot', variant: 'red' },
  };
  return map[temp] ?? { label: temp, variant: 'gray' };
}

/** Border + background for temperature (closed state). Use with TemperatureSelect for colored text when selected. */
export const temperatureSelectClasses: Record<string, string> = {
  cold: 'border-cyan-600/60 bg-cyan-950/20',
  warm: 'border-orange-600/60 bg-orange-950/20',
  hot: 'border-red-600/60 bg-red-950/20',
};
