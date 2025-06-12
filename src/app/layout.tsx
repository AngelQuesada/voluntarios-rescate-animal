'use client';

import { Inter } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme/theme';
import { AuthProvider } from '@/context/AuthContext';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ReduxProvider } from '@/store/provider';
import Script from 'next/script';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import '@/styles/pwaStyles.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/icons/favicon-32x32.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Rescate Animal" />
        <meta name="apple-mobile-web-app-status-bar-style" content="white" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#ffffff" />
        <meta name="application-name" content="Rescate Animal Voluntariado" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="browsermode" content="application" />
        <meta name="standalone" content="yes" />
      </head>
      <body suppressHydrationWarning={true} className={inter.className}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ReduxProvider>
              <AuthProvider>
                <Box sx={{ minHeight: '100vh' }}>{children}</Box>
              </AuthProvider>
            </ReduxProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
        <Script src="/register-sw.js" strategy="lazyOnload" />
        <Script id="pwa-display-mode">
          {`
            // Función para comprobar y notificar el modo de visualización
            function checkDisplayMode() {
              // Verificar modo standalone en iOS de forma segura
              const isIOSStandalone = typeof window.navigator.standalone !== 'undefined' ? 
                window.navigator.standalone : false;
              
              if (window.matchMedia('(display-mode: standalone)').matches || 
                  window.matchMedia('(display-mode: fullscreen)').matches || 
                  isIOSStandalone) {
                console.log('Aplicación en modo pantalla completa/standalone');
                document.body.classList.add('pwa-mode');
                document.documentElement.classList.add('pwa-mode');
              } else {
                console.log('Aplicación en navegador normal');
                document.body.classList.remove('pwa-mode');
                document.documentElement.classList.remove('pwa-mode');
              }
            }
            
            // Ejecutar al cargar
            checkDisplayMode();
            
            // También escuchar cambios en el modo de visualización
            window.matchMedia('(display-mode: standalone)').addEventListener('change', checkDisplayMode);
            window.matchMedia('(display-mode: fullscreen)').addEventListener('change', checkDisplayMode);
          `}
        </Script>
        <Script id="mobile-vh-fix">
          {`
            // Fix para la altura de la ventana en dispositivos móviles
            function setVH() {
              // Primero obtenemos la altura de la ventana
              let vh = window.innerHeight * 0.01;
              // Luego establecemos la propiedad CSS para usarla en todo el sitio
              document.documentElement.style.setProperty('--vh', vh + 'px');
            }
            
            // Ejecutar al cargar
            setVH();
            
            // Ejecutar cuando cambia el tamaño de pantalla, especialmente útil cuando
            // un dispositivo móvil cambia entre orientación vertical y horizontal
            window.addEventListener('resize', () => {
              setVH();
            });
            
            // Modificamos esta función para NO forzar pantalla completa en Android 
            // Ya que esto puede ocultar la barra de estado
            function tryFullscreen() {
              const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                  window.matchMedia('(display-mode: fullscreen)').matches;
              const isAndroid = /android/i.test(navigator.userAgent);
              
              if ((isStandalone || document.referrer.includes('android-app://')) && isAndroid) {
                // Forzar estilos específicos para Android en modo standalone
                // sin forzar pantalla completa para mantener la barra de estado
                if (document.body.classList.contains('pwa-mode')) {
                  document.documentElement.style.setProperty('height', '100%', 'important');
                  document.documentElement.style.setProperty('width', '100%', 'important');
                  document.documentElement.style.setProperty('overflow', 'auto', 'important');
                  // Evitamos fijar la posición para permitir scroll
                  document.documentElement.style.setProperty('position', 'relative', 'important');
                }
              }
            }
            
            // Escuchar eventos que podrían desencadenar los ajustes de estilo
            ['load', 'resize'].forEach(evt => {
              window.addEventListener(evt, tryFullscreen, {once: false});
            });
          `}
        </Script>
      </body>
    </html>
  );
}
