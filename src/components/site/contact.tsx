'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, MapPin, PhoneCall, User, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import Link from 'next/link';

// ESQUEMA DE VALIDACIÓN
const formSchema = z.object({
  name: z.string().min(2, { message: 'Mínimo 2 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  technicalRequest: z.string().min(10, { message: 'Mínimo 10 caracteres.' }),
});

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', technicalRequest: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      await addDoc(collection(db, 'contact_requests'), {
        ...values,
        createdAt: serverTimestamp(),
        status: 'Pendiente'
      });
      toast({ title: '¡Solicitud Enviada!', description: 'Nuestro equipo técnico se pondrá en contacto pronto.' });
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error de Envío', description: 'Intenta llamar directamente.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // CONTENEDOR DE LA SECCIÓN
    <section id="contacto" className="pt-12 pb-20 relative z-10 px-4 md:px-6">

      {/* ======================================================== */}
      {/* CRISTAL PRINCIPAL (PADRE) con NUVOS ESTILOS MODERNOS       */}
      {/* ======================================================== */}
      <div className="max-w-7xl mx-auto bg-white/40 dark:bg-black/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-[3rem] p-6 md:p-12 flex flex-col gap-10">

        {/* TÍTULO */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-headline font-black text-slate-900 dark:text-white tracking-tighter leading-[1.2] uppercase">
            ¿Necesitas <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">asistencia técnica?</span>
          </h2>
        </div>

        {/* CONTENEDOR DE LAS DOS COLUMNAS - ESTRUCTURA 100% ORIGINAL */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">

          {/* ======================================================== */}
          {/* CRISTAL IZQUIERDO (DATOS) - NUEVOS ESTILOS INTERNOS        */}
          {/* ======================================================== */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-4 font-body h-full">

            {/* FILA 1: Oficina Central (Izquierda) + Redes Sociales (Derecha) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarjeta 1: Oficina Central */}
              <a href="tel:925154354" className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-black/40 border border-white/40 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Oficina Central</p>
                  <p className="text-xl font-headline font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">925 15 43 54</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/20 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all shrink-0">
                  <PhoneCall size={20} />
                </div>
              </a>

              {/* Tarjeta Redes Sociales */}
              <div className="flex items-center justify-center gap-5 p-5 rounded-3xl bg-white dark:bg-black/40 border border-white/40 dark:border-white/5 shadow-inner">
                <Link href="https://facebook.com/energyenginees" target="_blank" className="text-slate-500 hover:text-primary transition-all duration-300 hover:scale-110">
                  <Facebook size={24} />
                </Link>
                <Link href="https://instagram.com/energyenginees" target="_blank" className="text-slate-500 hover:text-primary transition-all duration-300 hover:scale-110">
                  <Instagram size={24} />
                </Link>
                <Link href="https://linkedin.com/company/energy-engine-es" target="_blank" className="text-slate-500 hover:text-primary transition-all duration-300 hover:scale-110">
                  <Linkedin size={24} />
                </Link>
              </div>
            </div>

            {/* FILA 2: Delegación Norte (Izquierda) + Delegación Sur (Derecha) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarjeta 2: Norte */}
              <a href="tel:683775208" className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-black/40 border border-white/40 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delegación Norte</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5 mb-1">
                    <User size={12} className="text-primary" /> Andrés Granados
                  </p>
                  <p className="text-xl font-headline font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">683 77 52 08</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/20 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all shrink-0">
                  <PhoneCall size={20} />
                </div>
              </a>

              {/* Tarjeta 3: Sur */}
              <a href="tel:635120510" className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-black/40 border border-white/40 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delegación Sur</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5 mb-1">
                    <User size={12} className="text-primary" /> Antonio Ugena
                  </p>
                  <p className="text-xl font-headline font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">635 12 05 10</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/20 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all shrink-0">
                  <PhoneCall size={20} />
                </div>
              </a>
            </div>

            {/* FILA 3 y 4: Mapa y Dirección */}
            <div className="flex flex-col gap-4 flex-grow rounded-3xl p-3 bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 shadow-inner group">
              <div className="w-full h-[220px] lg:flex-grow rounded-2xl overflow-hidden relative bg-muted/20">
                <div className="absolute inset-0 bg-slate-900/5 dark:bg-white/5 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-500" />
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3060.5558866694337!2d-3.62525962401419!3d39.90657457152629!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd69fd9fca56779b%3A0xd8e264de001cf92b!2sEnergy%20Engine%20Grupos%20Electr%C3%B3genos%20S.L!5e0!3m2!1ses-419!2sec!4v1774495706280!5m2!1ses-419!2sec"
                  className="w-full h-full border-0 transition-all duration-[1.5s] filter grayscale-[0.8] contrast-125 sepia-[0.3] hue-rotate-[130deg] dark:invert dark:hue-rotate-180 group-hover:grayscale-0 group-hover:sepia-0 group-hover:dark:invert-0"
                  allowFullScreen
                  loading="lazy"
                  title="Ubicación Energy Engine Yepes"
                ></iframe>
              </div>

              {/* Dirección Abajo del mapa */}
              <div className="flex items-center gap-3 px-4 pb-2 pt-1">
                <MapPin className="text-primary shrink-0" size={24} />
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-relaxed">
                  C/Miguel Lopez Bravo, 6, Yepes (Toledo) 45313
                </p>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* CRISTAL DERECHO (FORMULARIO) - NUEVOS ESTILOS              */}
          {/* ======================================================== */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-xl h-full flex flex-col relative overflow-hidden font-body">

            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)]">
                <Send size={24} />
              </div>
              <h3 className="text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tighter">Mensaje Directo</h3>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Nombre / Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Juan Pérez" {...field} className="h-14 rounded-2xl bg-white/80 dark:bg-black/20 border-white/40 dark:border-white/10 focus-visible:ring-primary/50 text-slate-900 dark:text-white shadow-inner" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@empresa.com" {...field} className="h-14 rounded-2xl bg-white/80 dark:bg-black/20 border-white/40 dark:border-white/10 focus-visible:ring-primary/50 text-slate-900 dark:text-white shadow-inner" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicalRequest"
                  render={({ field }) => (
                    <FormItem className="flex-grow flex flex-col">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Detalle su requerimiento técnico</FormLabel>
                      <FormControl className="flex-grow">
                        <Textarea
                          placeholder="Ej. Mantenimiento preventivo para motor diésel..."
                          {...field}
                          className="h-full min-h-[140px] rounded-2xl bg-white/80 dark:bg-black/20 border-white/40 dark:border-white/10 focus-visible:ring-primary/50 resize-none p-5 text-slate-900 dark:text-white leading-relaxed shadow-inner"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full h-16 text-base font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_40px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all shrink-0 bg-primary text-primary-foreground border-none">
                  {isSubmitting ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : null}
                  {isSubmitting ? 'Procesando...' : 'Enviar Solicitud'}
                </Button>
              </form>
            </Form>
          </div>

        </div>
      </div>
    </section>
  );
}