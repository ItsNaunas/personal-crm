import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-gray-800 bg-gray-900/50 px-6 py-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
          >
            <ChevronLeft className="h-3 w-3" />
            {backLabel ?? 'Back'}
          </Link>
        )}
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
