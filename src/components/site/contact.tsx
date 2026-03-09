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

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  technicalRequest: z.string().min(10, { message: 'Los detalles deben tener al menos 10 caracteres.' }),
});

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', technicalRequest: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(values);
    setIsSubmitting(false);
    toast({
      title: 'Solicitud Enviada',
      description: 'Gracias por contactarnos. Nos pondremos en contacto pronto.',
    });
    form.reset();
  }

  return (
    <section id="contacto" className="pt-16 pb-8 px-6 scroll-mt-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10 font-headline">
          Canal de <span className="text-primary">Comunicación</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Form Column */}
          <div className="p-8 rounded-lg border h-full flex flex-col">
            <h3 className="text-base font-bold uppercase mb-6 font-headline flex items-center gap-3">
              <Mail className="text-primary" />
              Enviar Requerimiento
            </h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col flex-grow">
                <div className='flex-grow space-y-6'>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="SU NOMBRE COMPLETO..." {...field} className="uppercase font-bold text-xs bg-transparent border-0 border-b rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary pl-0" />
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
                          <Input type="email" placeholder="SU EMAIL DE CONTACTO..." {...field} className="uppercase font-bold text-xs bg-transparent border-0 border-b rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary pl-0" />
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
                          <Textarea rows={3} placeholder="DETALLE SU NECESIDAD O PROYECTO..." {...field} className="uppercase font-bold text-xs bg-transparent border-0 border-b rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary pl-0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <Button variant="outline" type="button" className="w-full rounded-xl font-bold uppercase text-xs">
                    <Shield size={16} className="mr-2"/>
                    Ver Garantía
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-bold uppercase text-xs hover:bg-accent/90 transition-all">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send size={16} className="mr-2"/>}
                    Enviar
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Info Column */}
          <div className="p-8 rounded-lg border h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">Oficina Central</p>
                    <p className="text-xl font-bold tracking-tighter">{contactInfo.phone}</p>
                </div>
                <div className="flex gap-1">
                  {[
                    {href: socialLinks.facebook, icon: Facebook},
                    {href: socialLinks.instagram, icon: Instagram},
                    {href: socialLinks.linkedin, icon: Linkedin}
                  ].map((social, i) => {
                    const Icon = social.icon;
                    return (
                      <Button key={i} variant="ghost" size="icon" asChild className="rounded-full text-muted-foreground hover:text-primary">
                        <Link href={social.href} target="_blank"><Icon size={20}/></Link>
                      </Button>
                    )
                  })}
                </div>
            </div>
            <div className="flex-grow rounded-md overflow-hidden relative group border">
              <iframe src={contactInfo.mapUrl} className="w-full h-full transition-all duration-700" allowFullScreen loading="lazy"></iframe>
            </div>
            <div className="flex items-start gap-4 pt-4 text-muted-foreground">
              <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">{contactInfo.address}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
