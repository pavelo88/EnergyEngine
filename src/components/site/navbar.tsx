'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, UserCircle, Cpu, Activity } from 'lucide-react';
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
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={cn(
      "fixed top-0 inset-x-0 z-50 flex justify-center transition-all duration-700 pointer-events-none",
      !isScrolled ? "px-4 pt-4 sm:pt-6" : "px-0 pt-0"
    )}>
      <header
        className={cn(
          "w-full transition-all duration-500 pointer-events-auto",
          !isScrolled 
            ? "max-w-7xl mx-auto rounded-[2rem] bg-white/10 dark:bg-black/20 backdrop-blur-md py-4 sm:py-5 border border-white/20 dark:border-white/5 shadow-xl"
            : "max-w-none rounded-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl py-3 border-b border-slate-200/50 dark:border-white/10 shadow-2xl"
        )}
      >
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          
          {/* LOGO: EL DOBLE DE GRANDE (w-64 sm:w-80 md:w-96) */}
          <Link
            href="/"
            className="block w-64 sm:w-80 md:w-96 transition-transform hover:scale-[1.02] active:scale-95 relative group shrink-0"
          >
            <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 [&>svg]:w-full [&>svg]:h-auto pl-2 transform scale-125 origin-left">
              <Logo />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                asChild
                className={cn(
                  "font-bold text-sm tracking-widest uppercase transition-all px-4 py-2.5 h-auto rounded-xl",
                  "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-primary/10"
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-slate-900/90 dark:bg-white/90 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl px-6 h-12 text-sm font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95 group border border-slate-700 dark:border-white/20">
                  <UserCircle className="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                  Acceso
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-2 mt-2">
                <DropdownMenuItem asChild className="focus:bg-primary/10 rounded-xl cursor-pointer p-0 group">
                  <Link href="/admin" className="flex items-center w-full px-4 py-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg mr-3 group-hover:bg-blue-500/20 transition-colors">
                      <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span className="block font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Dashboard</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Gestión Administrativa</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <div className="h-px bg-slate-200 dark:bg-white/10 my-1 mx-2" />
                <DropdownMenuItem asChild className="focus:bg-primary/10 rounded-xl cursor-pointer p-0 group">
                  <Link href="/inspection" className="flex items-center w-full px-4 py-3">
                    <div className="bg-primary/10 p-2 rounded-lg mr-3 group-hover:bg-primary/20 transition-colors">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="block font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Inspectores</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Portal Operativo 24/7</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md text-slate-900 dark:text-white">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md bg-white/95 dark:bg-slate-950/95 border-l border-white/20 dark:border-white/10 backdrop-blur-3xl p-8 flex flex-col">
                <SheetHeader className="text-left mb-8">
                  <SheetTitle className="font-black text-slate-900 dark:text-white text-3xl uppercase tracking-tighter">
                    Menú
                  </SheetTitle>
                  <SheetDescription className='text-slate-500 font-medium'>Navegación principal del sitio.</SheetDescription>
                </SheetHeader>
                
                <div className="flex flex-col gap-2 flex-grow">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group flex items-center p-4 rounded-2xl hover:bg-primary/10 transition-colors"
                    >
                      <span className="font-black text-slate-800 dark:text-slate-200 text-xl uppercase tracking-wider group-hover:text-primary transition-colors">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="mt-auto space-y-4 pt-8 border-t border-slate-200 dark:border-white/10">
                  <Button asChild className="w-full h-16 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 rounded-2xl text-base font-black uppercase tracking-widest">
                    <Link href="/admin"><Cpu className="mr-2" /> Administración</Link>
                  </Button>
                  <Button asChild className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-base font-black uppercase tracking-widest shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]">
                    <Link href="/inspection"><Activity className="mr-2" /> Portal Inspectores</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </header>
    </div>
  );
}