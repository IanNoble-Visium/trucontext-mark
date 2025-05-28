import Providers from './providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { TimelineProvider } from '@/contexts/TimelineContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TruContext by Visium',
  description: 'Cyber Graph Visualization Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <SidebarProvider>
            <TimelineProvider>
              <div className="flex">
                <Sidebar className="border-r">
                  <SidebarContent>
                    <DashboardSidebar />
                  </SidebarContent>
                </Sidebar>
                <SidebarInset>{children}</SidebarInset>
              </div>
            </TimelineProvider>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
