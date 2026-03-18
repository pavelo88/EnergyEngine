
'use client';

import { useState } from 'react';
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

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  technicalRequest: z.string().min(10, { message: 'Los detalles deben tener al menos 10 caracteres.' }),
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
          observations: '',
          createdAt: serverTimestamp(),
        });
        
        toast({
          title: 'Solicitud Enviada',
          description: 'Gracias por contactarnos. Tu requerimiento ha sido registrado en nuestro sistema.',
        });
        form.reset();
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: 'No pudimos procesar tu solicitud en este momento. Por favor, inténtalo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contacto" className="pt-24 pb-24 px-6 scroll-mt-10 relative overflow-hidden glass-section">
      <div className="max-w-6xl mx-auto glass-crystallized p-8 md:p-16 rounded-huge shadow-premium relative z-10 border-slate-200/50 dark:border-white/10 dark:bg-slate-950/20 backdrop-blur-3xl">
        <h2 className="text-center text-[2.2rem] md:text-5xl font-serif font-medium mb-12 text-slate-950 dark:text-white leading-[1.1] tracking-tight">
          Canal de <span className="text-primary italic">Comunicación</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Form Column */}
          <div className="glass-card p-10 rounded-[3rem] h-full flex flex-col border-slate-200/50 dark:border-white/5 bg-white/20 dark:bg-black/10">
            <h3 className="text-base font-bold uppercase mb-8 font-headline flex items-center gap-3 text-slate-800 dark:text-white/80 tracking-widest leading-none">
              <Mail className="text-primary" size={20} />
              Enviar Requerimiento Técnico
            </h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 flex flex-col flex-grow">
                <div className='flex-grow space-y-8'>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="SU NOMBRE COMPLETO..." {...field} className="uppercase font-bold text-xs bg-transparent border-0 border-b border-slate-200 dark:border-white/10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary pl-0 text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 h-10 transition-colors" />
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
                          <Input type="email" placeholder="SU EMAIL DE CONTACTO..." {...field} className="uppercase font-bold text-xs bg-transparent border-0 border-b border-slate-200 dark:border-white/10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary pl-0 text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 h-10 transition-colors" />
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
                          <Textarea rows={4} placeholder="DETALLE SU NECESIDAD O PROYECTO..." {...field} className="uppercase font-bold text-xs bg-transparent border-0 border-b border-slate-200 dark:border-white/10 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary pl-0 text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 transition-colors" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
                  <Button variant="outline" type="button" className="w-full h-14 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-white/60">
                    <Shield size={16} className="mr-2 opacity-50"/>
                    Ver Garantía SAT
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-slate-900 dark:bg-primary text-white py-3 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 dark:hover:bg-primary/90 transition-all shadow-xl shadow-primary/10">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Send size={16} className="mr-2"/>}
                    Enviar Solicitud
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Info Column */}
          <div className="glass-card p-10 rounded-[2.5rem] h-full flex flex-col border-slate-200/50 dark:border-white/5 bg-white/20 dark:bg-black/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                    <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-[0.3em] mb-1">Oficina Central</p>
                    <p className="text-2xl font-headline font-black tracking-tighter text-slate-950 dark:text-white italic">{contactInfo.phone}</p>
                </div>
                <div className="flex gap-2">
                  {[
                    {href: socialLinks.facebook, icon: Facebook},
                    {href: socialLinks.instagram, icon: Instagram},
                    {href: socialLinks.linkedin, icon: Linkedin}
                  ].map((social, i) => {
                    const Icon = social.icon;
                    return (
                      <Button key={i} variant="ghost" size="icon" asChild className="w-10 h-10 rounded-xl text-slate-400 dark:text-white/40 hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all">
                        <Link href={social.href || '#'} target="_blank"><Icon size={20}/></Link>
                      </Button>
                    )
                  })}
                </div>
            </div>
            <div className="flex-grow rounded-3xl overflow-hidden relative group border border-slate-200 dark:border-white/10 shadow-inner">
              <iframe src={contactInfo.mapUrl} className="w-full h-full transition-all duration-700 brightness-90 grayscale-0 hover:grayscale-0 hover:brightness-100 dark:brightness-50 dark:invert-[0.9] dark:hue-rotate-180" allowFullScreen loading="lazy"></iframe>
            </div>
            <div className="flex items-start gap-4 pt-8 text-slate-500 dark:text-slate-400">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed italic">{contactInfo.address}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
