import { Outfit } from 'next/font/google';
import '../globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const publicRoutes = new Set(['/signin', '/signup']);
    const hasToken = Boolean(
      localStorage.getItem('access_token') || localStorage.getItem('admin_token')
    );

    if (!hasToken && !publicRoutes.has(router.pathname)) {
      setAuthChecked(true);
      router.replace('/signin');
      return;
    }

    if (hasToken && router.pathname === '/signin') {
      setAuthChecked(true);
      router.replace('/');
      return;
    }

    setAuthChecked(true);
  }, [router.pathname, router]);

  if (!authChecked) {
    return null;
  }

  return (
    <div className={outfit.className}>
      <ThemeProvider>
        <SidebarProvider>
          <Component {...pageProps} />
        </SidebarProvider>
      </ThemeProvider>
    </div>
  );
}
