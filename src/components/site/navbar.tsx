'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { navLinks } from '@/lib/data';
import { ThemeToggle } from './theme-toggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
        // CUANDO ARRANCA: Vidrio sutil
        !isScrolled && "bg-white/5 dark:bg-black/10 backdrop-blur-sm py-5 border-transparent",
        // AL HACER SCROLL: Cristal elegante igual que el Footer
        isScrolled && "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md py-3 border-slate-200 dark:border-white/10 shadow-lg"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* LOGO AGRANDADO: Le dimos un ancho fijo mayor y forzamos al SVG a ocupar ese espacio */}
        <Link
          href="/"
          className="block w-100 md:w-72 transition-transform hover:scale-105 active:scale-95 [&>svg]:w-full [&>svg]:h-auto"
        >
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              asChild
              className={cn(
                "font-bold text-sm tracking-wide transition-colors px-4",
                "text-slate-900 dark:text-slate-200 hover:text-primary dark:hover:text-primary"
              )}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}

          <div className="ml-6 flex items-center gap-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Botón Intranet: Tipografía limpia y tamaño normal */}
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 text-sm font-bold shadow-lg transition-all active:scale-95">
                  Intranet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 min-w-[200px]">
                <DropdownMenuItem asChild className="focus:bg-primary/10 rounded-lg cursor-pointer">
                  {/* Menú: Texto normal legible */}
                  <Link href="/admin" className="font-bold text-sm text-slate-900 dark:text-white p-3 block">
                    Administración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-primary/10 rounded-lg cursor-pointer">
                  <Link href="/inspection" className="font-bold text-sm text-slate-900 dark:text-white p-3 block">
                    Inspección
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex items-center gap-4">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-900 dark:text-white">
                <Menu size={28} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white/95 dark:bg-slate-950/95 border-l border-slate-200 dark:border-white/10 backdrop-blur-xl p-8">
              <SheetHeader>
                <SheetTitle className="font-bold text-slate-900 dark:text-white text-2xl pt-8 text-left">
                  Menú
                </SheetTitle>
                <SheetDescription className='sr-only'>Navegación móvil</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-12">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-bold text-slate-800 dark:text-slate-200 text-lg hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-slate-200 dark:bg-white/10 my-4" />
                <Button asChild className="w-full bg-primary text-primary-foreground h-14 rounded-xl text-base font-bold shadow-md">
                  <Link href="/admin">Administración</Link>
                </Button>
                <Button asChild className="w-full bg-primary text-primary-foreground h-14 rounded-xl text-base font-bold shadow-md">
                  <Link href="/inspection">Inspección</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}