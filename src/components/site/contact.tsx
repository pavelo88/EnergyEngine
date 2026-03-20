'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Send, Shield, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { contactInfo, socialLinks } from '@/lib/data';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

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
      if (db) {
        await addDoc(collection(db, 'contactos'), {
          ...values,
          status: 'Pendiente',
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Enviado', description: 'Registro completado.' });
        form.reset();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al enviar.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contacto" className="py-24 px-6 relative z-10 overflow-hidden">

      {/* CAPA MEDIANA: Vidrio con tinte "VERDE AGUA LIGERÍSIMO" */}
      <div className={cn(
        "max-w-7xl mx-auto p-12 md:p-20 rounded-[4rem] border transition-all duration-700 relative z-10",
        // Ajuste: Tinte verde agua suave (bg-primary/5) y desenfoque
        "bg-primary/[0.03] dark:bg-primary/[0.05] backdrop-blur-md border-primary/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.1)]"
      )}>

        <h2 className="text-center text-[2.5rem] md:text-6xl font-display font-black mb-16 text-slate-950 dark:text-white uppercase tracking-tighter leading-none">
          Canal de <span className="text-primary italic">Comunicación</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">

          {/* CAPA PEQUEÑA 1: Tarjeta de Formulario (Efecto Doble Vidrio) */}
          <div className="p-10 rounded-[3rem] border border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase mb-10 font-display flex items-center gap-3 text-primary tracking-[0.3em]">
                <Mail size={18} />
                Enviar Solicitud
              </h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="SU NOMBRE..." {...field} className="uppercase font-bold text-[10px] bg-transparent border-0 border-b border-slate-950/20 dark:border-white/10 rounded-none focus-visible:ring-0 focus:border-primary pl-0 text-slate-950 dark:text-white h-10 transition-all" />
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
                        <FormControl>
                          <Input type="email" placeholder="SU EMAIL..." {...field} className="uppercase font-bold text-[10px] bg-transparent border-0 border-b border-slate-950/20 dark:border-white/10 rounded-none focus-visible:ring-0 focus:border-primary pl-0 text-slate-950 dark:text-white h-10 transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="technicalRequest"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea rows={3} placeholder="MENSAJE O PROYECTO..." {...field} className="uppercase font-bold text-[10px] bg-transparent border-0 border-b border-slate-950/20 dark:border-white/10 rounded-none focus-visible:ring-0 focus:border-primary pl-0 text-slate-950 dark:text-white resize-none transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-slate-950 dark:bg-primary text-white rounded-2xl font-display font-black uppercase text-[11px] tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={18} className="mr-2" />}
                    Enviar Presupuesto
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          {/* CAPA PEQUEÑA 2: Tarjeta de Info (Efecto Doble Vidrio) */}
          <div className="p-10 rounded-[3rem] border border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-black tracking-[0.3em] mb-2">Oficina Central</p>
                <p className="text-3xl font-display font-black tracking-tighter text-slate-950 dark:text-white leading-none">{contactInfo.phone}</p>
              </div>
              <div className="flex gap-2">
                <Link href={socialLinks.facebook || '#'} target="_blank">
                  <Button variant="ghost" size="icon" className="w-11 h-11 rounded-xl hover:text-primary border border-transparent hover:border-primary/20 transition-all"><Facebook size={20} /></Button>
                </Link>
                <Link href={socialLinks.instagram || '#'} target="_blank">
                  <Button variant="ghost" size="icon" className="w-11 h-11 rounded-xl hover:text-primary border border-transparent hover:border-primary/20 transition-all"><Instagram size={20} /></Button>
                </Link>
              </div>
            </div>
            <div className="flex-grow rounded-[2.5rem] overflow-hidden relative border border-slate-950/10 dark:border-white/10 shadow-inner min-h-[320px]">
              <iframe src={contactInfo.mapUrl} className="w-full h-full brightness-95 dark:brightness-50 dark:invert-[0.9] dark:hue-rotate-180" allowFullScreen loading="lazy"></iframe>
            </div>
            <div className="pt-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed text-slate-500 dark:text-white/40 italic">
                {contactInfo.address}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}