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
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const renderNavLinks = () => (
    <>
      {navLinks.map((link) => (
        <Button key={link.href} variant="link" asChild className="text-slate-950 dark:text-foreground/80 hover:text-slate-950 dark:hover:text-primary transition-colors cursor-pointer text-sm font-bold tracking-tight">
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
    </>
  );

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled ? "glass-header py-3" : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {renderNavLinks()}
          <div className="ml-4 flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
                  Intranet
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl">                <DropdownMenuItem asChild className="focus:bg-slate-100 dark:focus:bg-white/10">
                  <Link href="/admin" className="font-bold text-slate-800 dark:text-white uppercase tracking-tighter cursor-pointer">Administración</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-100 dark:focus:bg-white/10">
                  <Link href="/inspection" className="font-bold text-slate-800 dark:text-white uppercase tracking-tighter cursor-pointer">Inspección</Link>
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
              <Button variant="ghost" size="icon" className="text-slate-950 dark:text-white/80">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass-white border-l border-slate-200/50 dark:border-white/5 dark:bg-slate-950/95">
              <SheetHeader>
                <SheetTitle className="font-headline font-black text-slate-950 dark:text-white uppercase tracking-tighter border-0">Menú</SheetTitle>
                <SheetDescription className='sr-only'>
                  Menú principal de navegación del sitio.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col items-center gap-6 mt-16">
                {renderNavLinks()}
                <Button asChild className="w-full bg-slate-900 dark:bg-primary text-white px-6 py-4 rounded-3xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                  <Link href="/admin">Administración</Link>
                </Button>
                <Button asChild className="w-full bg-slate-900 dark:bg-primary text-white px-6 py-4 rounded-3xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
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
