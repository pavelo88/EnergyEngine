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
        // CUANDO ARRANCA: Vidrio muy sutil para que no sea "totalmente transparente"
        !isScrolled && "bg-white/5 dark:bg-black/10 backdrop-blur-sm py-5 border-transparent",
        // AL HACER SCROLL: Se vuelve sólido (Blanco o Negro según el modo)
        isScrolled && "bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl py-3 border-slate-200/50 dark:border-white/10 shadow-lg"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              asChild
              className={cn(
                "font-display font-black uppercase text-[11px] tracking-[0.2em] transition-colors px-4",
                "text-slate-950 dark:text-white hover:text-primary dark:hover:text-primary"
              )}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}

          <div className="ml-6 flex items-center gap-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-8 font-display font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                  Intranet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl p-2 min-w-[200px]">
                <DropdownMenuItem asChild className="focus:bg-primary/10 rounded-xl cursor-pointer">
                  <Link href="/admin" className="font-display font-black text-slate-950 dark:text-white uppercase text-[10px] tracking-widest p-3 block">Administración</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-primary/10 rounded-xl cursor-pointer">
                  <Link href="/inspection" className="font-display font-black text-slate-950 dark:text-white uppercase text-[10px] tracking-widest p-3 block">Inspección</Link>
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
              <Button variant="ghost" size="icon" className="text-slate-950 dark:text-white">
                <Menu size={28} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white/95 dark:bg-slate-950/98 border-l border-slate-200 dark:border-white/10 backdrop-blur-3xl p-8">
              <SheetHeader>
                <SheetTitle className="font-display font-black text-slate-950 dark:text-white uppercase tracking-tighter text-2xl pt-8">Menú</SheetTitle>
                <SheetDescription className='sr-only'>Navegación móvil</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-8 mt-16">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-display font-black text-slate-950 dark:text-white/80 uppercase text-xs tracking-[0.2em] hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-slate-200 dark:bg-white/10 my-4" />
                <Button asChild className="w-full bg-primary h-14 rounded-2xl font-display font-black uppercase text-[11px] tracking-widest shadow-lg">
                  <Link href="/admin">Administración</Link>
                </Button>
                <Button asChild className="w-full bg-primary h-14 rounded-2xl font-display font-black uppercase text-[11px] tracking-widest shadow-lg">
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