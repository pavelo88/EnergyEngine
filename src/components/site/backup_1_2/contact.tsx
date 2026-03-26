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
    // CONTENEDOR DE LA SECCIÓN (Totalmente transparente para dejar ver la imagen de fondo)
    <section id="contacto" className="pt-12 pb-20 relative z-10 px-4 md:px-6">
      {/* ======================================================== */}
      {/* CRISTAL PRINCIPAL (PADRE): Envuelve título y columnas      */}
      {/* Opacidad muy baja (10% claro, 20% oscuro) para que se vea el fondo */}
      {/* ======================================================== */}
      <div className="max-w-7xl mx-auto bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/5 shadow-2xl rounded-[3rem] p-6 md:p-12 flex flex-col gap-10">

        {/* TÍTULO */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-headline font-bold text-foreground tracking-tight leading-[1.2]">
            ¿Necesitas <span className="text-primary">asistencia técnica?</span>
          </h2>
        </div>

        {/* CONTENEDOR DE LAS DOS COLUMNAS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">

          {/* ======================================================== */}
          {/* CRISTAL IZQUIERDO (DATOS)                                  */}
          {/* ======================================================== */}
          <div className="bg-white/20 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col gap-4 font-body h-full">

            {/* FILA 1: Oficina Central (Izquierda) + Redes Sociales (Derecha) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarjeta 1: Oficina Central */}
              <a href="tel:925154354" className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 hover:border-primary/50 transition-all group">
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-foreground">Oficina Central</p>
                  <p className="text-lg font-bold text-primary tracking-wide">925 15 43 54</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <PhoneCall size={18} />
                </div>
              </a>

              {/* Tarjeta Redes Sociales */}
              <div className="flex items-center justify-center gap-5 p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5">
                <Link href="https://facebook.com/energyenginees" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook size={24} />
                </Link>
                <Link href="https://instagram.com/energyenginees" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram size={24} />
                </Link>
                <Link href="https://linkedin.com/company/energy-engine-es" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin size={24} />
                </Link>
              </div>
            </div>

            {/* FILA 2: Delegación Norte (Izquierda) + Delegación Sur (Derecha) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarjeta 2: Norte */}
              <a href="tel:683775208" className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 hover:border-primary/50 transition-all group">
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-foreground">Delegación Norte</p>
                  <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 mb-1">
                    <User size={12} /> Andrés Granados
                  </p>
                  <p className="text-lg font-bold text-primary tracking-wide">683 77 52 08</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <PhoneCall size={18} />
                </div>
              </a>

              {/* Tarjeta 3: Sur */}
              <a href="tel:635120510" className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 hover:border-primary/50 transition-all group">
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-foreground">Delegación Sur</p>
                  <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 mb-1">
                    <User size={12} /> Antonio Ugena
                  </p>
                  <p className="text-lg font-bold text-primary tracking-wide">635 12 05 10</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <PhoneCall size={18} />
                </div>
              </a>
            </div>

            {/* FILA 3 y 4: Mapa y Dirección */}
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 flex flex-col gap-4 flex-grow">

              {/* Mapa - Verde agua en claro, Oscuro en oscuro */}
              <div className="w-full flex-grow min-h-[180px] rounded-xl overflow-hidden relative bg-muted/20">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3056.4027763841026!2d-3.626490323450942!3d39.92341258771493!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd6a11700683bc47%3A0xe10098f9dddb00b0!2sC.%20Miguel%20L%C3%B3pez%20Bravo%2C%206%2C%2045313%20Yepes%2C%20Toledo%2C%20Spain!5e0!3m2!1sen!2sec!4v1700000000000!5m2!1sen!2sec"
                  className="w-full h-full border-0 transition-all duration-500 sepia-[.4] hue-rotate-[130deg] saturate-[1.5] dark:sepia-0 dark:saturate-100 dark:invert dark:grayscale dark:hue-rotate-180 dark:opacity-85"
                  allowFullScreen
                  loading="lazy"
                  title="Ubicación Energy Engine Yepes"
                ></iframe>
              </div>

              {/* Dirección Abajo del mapa */}
              <div className="flex items-start gap-3 px-2 pt-1">
                <MapPin className="text-primary shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  C/Miguel Lopez Bravo, 6 (Nave), Yepes (Toledo) CP:45313
                </p>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* CRISTAL DERECHO (FORMULARIO)                               */}
          {/* ======================================================== */}
          <div className="bg-white/20 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-xl h-full flex flex-col relative overflow-hidden font-body">

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                <Send size={24} />
              </div>
              <h3 className="text-2xl font-bold font-headline">Envíanos un mensaje</h3>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Nombre / Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Juan Pérez" {...field} className="h-12 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 dark:border-white/10 focus-visible:ring-primary/50 text-foreground" />
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
                      <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@empresa.com" {...field} className="h-12 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 dark:border-white/10 focus-visible:ring-primary/50 text-foreground" />
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
                      <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Detalle su requerimiento técnico</FormLabel>
                      <FormControl className="flex-grow">
                        <Textarea
                          placeholder="Ej. Mantenimiento preventivo para motor diésel de cogeneración..."
                          {...field}
                          className="h-full min-h-[140px] rounded-xl bg-white/50 dark:bg-black/20 border-white/40 dark:border-white/10 focus-visible:ring-primary/50 resize-none p-4 text-foreground leading-relaxed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-base font-bold rounded-xl shadow-lg mt-4 hover:shadow-primary/25 transition-all shrink-0">
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isSubmitting ? 'Enviando solicitud...' : 'Enviar Requerimiento'}
                </Button>
              </form>
            </Form>
          </div>

        </div>
      </div>
    </section>
  );
}