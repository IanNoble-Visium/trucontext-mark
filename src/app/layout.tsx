import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/theme';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TimelineProvider } from '@/contexts/TimelineContext';
import { Box, Flex } from '@chakra-ui/react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

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
            <Flex h="100vh" overflow="hidden">
              {/* Sidebar */}
              <Box w="320px" flexShrink={0}>
                <DashboardSidebar />
              </Box>

              {/* Main Content */}
              <Box flex="1" overflow="auto">
                {children}
              </Box>
            </Flex>
          </TimelineProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}
