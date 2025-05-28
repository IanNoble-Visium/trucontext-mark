import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/theme';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
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
        <ChakraProvider theme={theme}>
          <TimelineProvider>
            {children}
          </TimelineProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}
