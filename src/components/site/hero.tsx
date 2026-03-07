'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Activity, Settings, Globe, PhoneCall } from 'lucide-react';
import { stats } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function Hero() {

  return (
    <section className="relative flex flex-col justify-center px-6 py-16 sm:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary py-1 px-4 text-[10px] font-black uppercase tracking-widest mb-6"
            >
              Misión Crítica Garantizada
            </Badge>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-black uppercase leading-[0.85] tracking-tighter mb-8 font-headline text-white"
          >
            energía <br /> <span className="text-primary">imparable</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="text-lg text-zinc-300 mb-8 max-w-md text-balance"
          >
            Especialistas en mantenimiento industrial para infraestructuras de
            alta exigencia: Aeropuertos y Hospitales.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button asChild size="lg" className="px-10 py-7 bg-primary text-primary-foreground rounded-full font-black uppercase tracking-widest text-xs group hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
              <Link href="#contacto">
                Contactar Ingeniería
                <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          {stats.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-white/5 backdrop-blur-md p-6 rounded-lg border border-white/10 flex flex-col items-center text-center"
            >
              <div className="text-primary mb-4">
                <m.icon className="size-7" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold mb-1 tracking-tighter text-white">
                {m.val}
              </div>
              <div className="text-[10px] uppercase font-black text-white/50 tracking-widest">
                {m.tag}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
