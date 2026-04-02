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

// ESQUEMA DE VALIDACIÓN ACTUALIZADO (Ahora incluye el teléfono)
const formSchema = z.object({
  name: z.string().min(2, { message: 'Mínimo 2 caracteres.' }),
  phone: z.string().min(6, { message: 'Número de contacto inválido.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  technicalRequest: z.string().min(10, { message: 'Mínimo 10 caracteres.' }),
});

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', phone: '', email: '', technicalRequest: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      // Al usar ...values, el teléfono se guarda automáticamente en Firebase
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
    <section id="contacto" className="pt-12 pb-20 relative z-10 px-4 md:px-6">

      <div className="max-w-7xl mx-auto bg-white/50 dark:bg-black/20 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3rem] p-4 sm:p-8 md:p-12 flex flex-col gap-8 sm:gap-10">

        {/* TÍTULO */}
        <div className="text-center px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] uppercase">
            ¿Necesitas <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">asistencia técnica?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 items-stretch">

          {/* ======================================================== */}
          {/* COLUMNA IZQUIERDA (DATOS)                                  */}
          {/* ======================================================== */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-xl flex flex-col gap-4 font-body h-full">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

              <a href="tel:925154354" className="order-1 flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="flex flex-col min-w-0 pr-2">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Oficina Central</p>
                  <p className="text-lg lg:text-xl font-headline font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors whitespace-nowrap mt-0.5">925 15 43 54</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 dark:bg-black/20 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all shrink-0">
                  <PhoneCall size={18} />
                </div>
              </a>

              <a href="tel:683775208" className="order-2 sm:order-3 flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="flex flex-col min-w-0 pr-2">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Delegación Norte</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 mt-0.5 mb-0.5 whitespace-nowrap">
                    <User size={12} className="text-primary" /> Andrés Granados
                  </p>
                  <p className="text-lg lg:text-xl font-headline font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors whitespace-nowrap">683 77 52 08</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 dark:bg-black/20 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all shrink-0">
                  <PhoneCall size={18} />
                </div>
              </a>

              <a href="tel:635120510" className="order-3 sm:order-4 flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="flex flex-col min-w-0 pr-2">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Delegación Sur</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 mt-0.5 mb-0.5 whitespace-nowrap">
                    <User size={12} className="text-primary" /> Antonio Ugena
                  </p>
                  <p className="text-lg lg:text-xl font-headline font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors whitespace-nowrap">635 12 05 10</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 dark:bg-black/20 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-12 transition-all shrink-0">
                  <PhoneCall size={18} />
                </div>
              </a>

              <div className="order-4 sm:order-2 flex items-center justify-center gap-6 p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 shadow-inner">
                <Link href="https://facebook.com/energyenginees" target="_blank" className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all duration-300 hover:scale-110">
                  <Facebook size={22} />
                </Link>
                <Link href="https://instagram.com/energyenginees" target="_blank" className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all duration-300 hover:scale-110">
                  <Instagram size={22} />
                </Link>
                <Link href="https://linkedin.com/company/energy-engine-es" target="_blank" className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all duration-300 hover:scale-110">
                  <Linkedin size={22} />
                </Link>
              </div>

            </div>

            <div className="flex flex-col gap-3 flex-grow rounded-3xl p-2 sm:p-3 bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-inner group mt-2">
              <div className="w-full h-[180px] sm:h-[220px] lg:flex-grow rounded-2xl overflow-hidden relative bg-slate-200 dark:bg-muted/20">
                <div className="absolute inset-0 bg-slate-900/5 dark:bg-white/5 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-500" />
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3060.5558866694337!2d-3.62525962401419!3d39.90657457152629!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd69fd9fca56779b%3A0xd8e264de001cf92b!2sEnergy%20Engine%20Grupos%20Electr%C3%B3genos%20S.L!5e0!3m2!1ses-419!2sec!4v1774495706280!5m2!1ses-419!2sec"
                  className="w-full h-full border-0 transition-all duration-[1.5s] filter grayscale-[0.8] contrast-125 sepia-[0.3] hue-rotate-[130deg] dark:invert dark:hue-rotate-180 group-hover:grayscale-0 group-hover:sepia-0 group-hover:dark:invert-0"
                  allowFullScreen
                  loading="lazy"
                  title="Ubicación Energy Engine Yepes"
                ></iframe>
              </div>

              <div className="flex items-center gap-3 px-3 pb-2 pt-1">
                <MapPin className="text-primary shrink-0" size={20} />
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-relaxed">
                  C/Miguel Lopez Bravo, 6, Yepes (Toledo) 45313
                </p>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* COLUMNA DERECHA (FORMULARIO)                               */}
          {/* ======================================================== */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 lg:p-10 shadow-xl h-full flex flex-col relative overflow-hidden font-body">

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="p-3 sm:p-4 bg-primary text-primary-foreground rounded-2xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] shrink-0">
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tighter">
                Mensaje Directo
              </h3>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 flex-grow flex flex-col">

                {/* GRID DE DOS COLUMNAS PARA NOMBRE Y TELÉFONO EN PC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-300 tracking-widest">Nombre / Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Juan Pérez" {...field} className="h-12 sm:h-14 rounded-2xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-primary/50 text-slate-900 dark:text-white shadow-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-300 tracking-widest">Teléfono</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Ej. 600 123 456" {...field} className="h-12 sm:h-14 rounded-2xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-primary/50 text-slate-900 dark:text-white shadow-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-300 tracking-widest">Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="tu@empresa.com" {...field} className="h-12 sm:h-14 rounded-2xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-primary/50 text-slate-900 dark:text-white shadow-sm" />
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
                      <FormLabel className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-300 tracking-widest">Detalle su requerimiento</FormLabel>
                      <FormControl className="flex-grow">
                        <Textarea
                          placeholder="Ej. Mantenimiento preventivo para motor diésel..."
                          {...field}
                          className="h-full min-h-[120px] sm:min-h-[140px] rounded-2xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-primary/50 resize-none p-4 sm:p-5 text-slate-900 dark:text-white leading-relaxed shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full h-14 sm:h-16 text-sm sm:text-base font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_40px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all shrink-0 bg-primary text-primary-foreground border-none mt-2">
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
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