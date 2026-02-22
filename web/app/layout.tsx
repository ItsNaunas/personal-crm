import type { Metadata } from 'next';
import './globals.css';
import { OrgProvider } from '@/lib/org-context';
import { ReactQueryProvider } from '@/lib/query-client';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Personal CRM',
  description: 'Production-grade state-driven CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <OrgProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="ml-[220px] flex-1 overflow-y-auto bg-gray-950">
                {children}
              </main>
            </div>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1f2937',
                  color: '#f3f4f6',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                },
                success: {
                  iconTheme: { primary: '#4f6ef7', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                },
              }}
            />
          </OrgProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
