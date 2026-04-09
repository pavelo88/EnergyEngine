'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin, Facebook, Instagram, Linkedin, MessageCircle, Mail } from 'lucide-react';
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
      await addDoc(collection(db, 'contact_requests'), {
        ...values,
        createdAt: serverTimestamp(),
        status: 'Pendiente'
      });
      toast({ title: '¡Solicitud Enviada!', description: 'Nuestro equipo técnico se pondrá en contacto pronto.' });
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error de Envío', description: 'Intenta usar los correos directos o WhatsApp.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contacto" className="pt-10 pb-16 relative z-10 px-4 md:px-6">

      {/* CONTENEDOR PRINCIPAL CON EFECTO GLASS RECUPERADO */}
      <div className="max-w-7xl mx-auto bg-white/50 dark:bg-black/20 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3rem] p-4 sm:p-6 md:p-8 flex flex-col gap-6">

        {/* TÍTULO PRINCIPAL */}
        <div className="text-center px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] uppercase">
            ¿Necesitas <span className="text-emerald-600 dark:text-emerald-500">asistencia técnica?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">

          {/* ======================================================== */}
          {/* COLUMNA IZQUIERDA: CANALES DE ATENCIÓN Y MAPA            */}
          {/* ======================================================== */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col gap-5 font-body h-full">

            {/* Título de la tarjeta CENTRADO */}
            <div className="flex items-center justify-center gap-3 w-full px-4 py-2 bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 rounded-xl shadow-sm mb-1">
              <h3 className="text-lg font-black font-headline text-slate-900 dark:text-white uppercase tracking-wider text-center">
                Canales de Atención
              </h3>
            </div>

            {/* Cuadrícula interna */}
            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-4 sm:gap-6 items-stretch flex-grow">

              {/* Lado Izquierdo: Correos y Redes (Las 3 cajas se estiran equitativamente con flex-1) */}
              <div className="flex flex-col gap-3 h-full">
                {/* Correo Administración */}
                <a href="mailto:administracion@energyengine.es" className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition-all group">
                  <Mail size={18} className="text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <p className="text-xs sm:text-[12.5px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 break-all leading-tight">
                    administracion@energyengine.es
                  </p>
                </a>

                {/* Correo Servicio Técnico */}
                <a href="mailto:serviciotecnico@energyengine.es" className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition-all group">
                  <Mail size={18} className="text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <p className="text-xs sm:text-[12.5px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 break-all leading-tight">
                    serviciotecnico@energyengine.es
                  </p>
                </a>

                {/* Redes Sociales - Ahora en una caja de la misma altura */}
                <div className="flex-1 flex items-center justify-center gap-6 p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 shadow-inner">
                  <Link href="https://facebook.com/energyenginees" target="_blank" className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-all hover:scale-110">
                    <Facebook size={20} />
                  </Link>
                  <Link href="https://instagram.com/energyenginees" target="_blank" className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-all hover:scale-110">
                    <Instagram size={20} />
                  </Link>
                  <Link href="https://linkedin.com/company/energy-engine-es" target="_blank" className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-all hover:scale-110">
                    <Linkedin size={20} />
                  </Link>
                </div>
              </div>

              {/* Lado Derecho: Teléfonos (flex-1 para igualar a la izquierda) */}
              <div className="flex flex-col gap-3 h-full">
                <a href="https://wa.me/34925154354" target="_blank" className="flex-1 flex items-center justify-between p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Oficina Central</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600">925 15 43 54</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                    <MessageCircle size={16} />
                  </div>
                </a>

                <a href="https://wa.me/34683775208" target="_blank" className="flex-1 flex items-center justify-between p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Delegación Norte</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600">683 77 52 08</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                    <MessageCircle size={16} />
                  </div>
                </a>

                <a href="https://wa.me/34635120510" target="_blank" className="flex-1 flex items-center justify-between p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-white/60 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Delegación Sur</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600">635 12 05 10</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                    <MessageCircle size={16} />
                  </div>
                </a>
              </div>

            </div>

            {/* Mapa y Dirección */}
            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/40 dark:border-white/10">
              <div className="w-full h-[200px] rounded-xl overflow-hidden relative bg-slate-200 dark:bg-muted/20 border border-white/60 dark:border-white/10">
                <iframe
                  src="https://maps.google.com/maps?q=Calle%20Miguel%20Lopez%20Bravo,%206,%20Yepes,%20Toledo&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  title="Ubicación Energy Engine Yepes"
                ></iframe>
              </div>
              <div className="flex items-center justify-center gap-2 px-1">
                <MapPin className="text-emerald-600 shrink-0" size={16} />
                <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  C/Miguel Lopez Bravo, 6, Yepes (Toledo) 45313
                </p>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* COLUMNA DERECHA: FORMULARIO                              */}
          {/* ======================================================== */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl h-full flex flex-col gap-6">

            <h3 className="text-xl sm:text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tighter">
              Déjanos tu requerimiento
            </h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 flex-grow flex flex-col">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-300 tracking-widest">Nombre / Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Juan Pérez" {...field} className="h-12 rounded-xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-emerald-500 text-slate-900 dark:text-white shadow-sm" />
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
                          <Input type="tel" placeholder="Ej. 600 123 456" {...field} className="h-12 rounded-xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-emerald-500 text-slate-900 dark:text-white shadow-sm" />
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
                        <Input type="email" placeholder="tu@empresa.com" {...field} className="h-12 rounded-xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-emerald-500 text-slate-900 dark:text-white shadow-sm" />
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
                          placeholder="Ej. Mantenimiento preventivo..."
                          {...field}
                          className="h-full min-h-[140px] rounded-xl bg-white/90 dark:bg-black/40 border-white/60 dark:border-white/10 focus-visible:ring-emerald-500 resize-none p-4 text-slate-900 dark:text-white leading-relaxed shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_40px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all bg-[#0f5b3a] hover:bg-[#0c4a2e] text-white border-none mt-2">
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