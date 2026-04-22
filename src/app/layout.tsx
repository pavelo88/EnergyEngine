import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/site/theme-provider';
import ParticleBackground from '@/components/site/ParticleBackground';
import ModernBackground from '@/components/site/ModernBackground';
import SEOStructuredData from '@/components/site/seo-structured-data';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Motores Energy & Grupos Electrógenos | Energy Engine España',
  applicationName: 'Energy Engine',
  description: 'Expertos en Motores Energy, mantenimiento integral, reparación de averías y pruebas de carga para grupos electrógenos. Servicio técnico oficial multimarca: Perkins, Guascor, Cummins, Volvo Penta y más. Asistencia 24/7.',
  keywords: [
    'motores energy', 'mantenimiento motores energy', 'grupos electrógenos', 
    'Perkins', 'Guascor', 'Siemens Energy', 'Guascor Energy', 'Cummins', 'Iveco', 'Ruggerini', 'Volvo Penta', 
    'Lombardini', 'MAN', 'Rolls-Royce', 'MTU', 'Deif', 'Baudouin', 'Atlas Copco', 'Caterpillar', 
    'Leroy-Somer', 'Pramac', 'Deutz', 'Doosan', 'J.L. Metric', 'Generac', 'Stamford', 'Isuzu', 
    'Hipower', 'Himoinsa', 'John Deere', 'Kohler', 'Kubota', 'FPT', 'Scania', 'Socomec', 
    'Mosa', 'Yanmar', 'Mecc Alte', 'mantenimiento industrial', 'reparación de averías', 
    'bancos de carga', 'cogeneración', 'asistencia técnica 24/7', 'repuestos originales', 
    'España', 'Portugal'
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Energy Engine',
  },
  icons: {
    apple: '/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://energyengine.es',
    title: 'Energy Engine | Especialistas en Energía y Mantenimiento',
    description: 'Servicios especializados de mantenimiento, repuestos y asistencia 24/7 para grupos electrógenos y plantas de cogeneración.',
    siteName: 'Energy Engine',
    images: [
      {
        url: '/hero.png',
        width: 1200,
        height: 630,
        alt: 'Energy Engine - Mantenimiento Industrial',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Energy Engine | Mantenimiento de Grupos Electrógenos',
    description: 'Soluciones integrales de energía, mantenimiento multimarca y soporte técnico 24/7.',
    images: ['/hero.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="bg-transparent">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>

      {/* TRANSPARENCIA TOTAL: 
          - bg-transparent elimina cualquier color de fondo sólido.
          - relative z-10 asegura que el contenido flote sobre los fondos animados.
      */}
      <body className={cn(
        'min-h-screen font-body antialiased bg-transparent text-foreground relative',
        fontBody.variable
      )}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <FirebaseClientProvider>

            {/* Los fondos se renderizan detrás de todo */}
            <ParticleBackground />
            <ModernBackground />
            <SEOStructuredData />

            {/* z-10 para que el texto sea legible y cliqueable */}
            <main className="relative z-10 flex flex-col min-h-screen">
              {children}
            </main>

            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}