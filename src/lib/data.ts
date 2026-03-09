import type { LucideIcon } from 'lucide-react';
import { Activity, Cpu, ShieldCheck, Zap, Settings, Globe, PhoneCall } from 'lucide-react';

<<<<<<< HEAD
export const brands: string[] = ["Perkins", "Guascor", "Cummins", "Iveco", "Ruggerini", "Volvo Penta", "Lombardini", "MAN", "Rolls-Royce", "MTU", "Deif"];
=======
export const brands: string[] = ["Perkins", "Guascor", "Cummins", "Iveco", "Ruggerini", "Volvo Penta", "Lombardini", "MAN", "Rolls-Royce", "MTU"];
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

type Service = {
    id: string;
    title: string;
    desc: string;
    icon: LucideIcon;
    imgId: string;
    bpType: string;
};

export const services: Service[] = [
    { id: "01", title: "Mantenimiento Preventivo", desc: "Intervenciones críticas en motores diésel y gas de alto rendimiento.", icon: Activity, imgId: "service-1", bpType: "mantenimiento" },
    { id: "02", title: "Pruebas de Carga", desc: "Simulación de fallos de red con bancos resistivos.", icon: ShieldCheck, imgId: "service-2", bpType: "carga" },
    { id: "03", title: "Sistemas de Control", desc: "Ingeniería en cuadros de maniobra y equipos PLC/DEIF.", icon: Cpu, imgId: "service-3", bpType: "control" },
    { id: "04", title: "Rehabilitación Motor", desc: "Overhaul completo de grupos electrógenos de misión crítica.", icon: Zap, imgId: "service-4", bpType: "rehabilitacion" },
    { id: "05", title: "Telemetría y Control Remoto", desc: "Monitorización remota para prevenir paradas inesperadas y optimizar el rendimiento.", icon: Cpu, imgId: "service-5", bpType: "telemetria" },
    { id: "06", title: "Logística de Repuestos", desc: "Suministro inmediato de filtros y componentes originales para todas las marcas.", icon: Settings, imgId: "service-6", bpType: "logistica" },
];

export const contactInfo = {
  address: "C/Miguel Lopez Bravo, 6 (Nave), Yepes (Toledo) CP:45313",
  phone: "92 515 43 53",
  emails: ["administracion@energyengine.es", "serviciotecnico@energyengine.es"],
  mapUrl: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3060.5601159996186!2d-3.6247125!3d39.9064799!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd69fd9fca56779b%3A0xd8e264de001cf92b!2sEnergy%20Engine%20Grupos%20Electr%C3%B3genos%20S.L!5e0!3m2!1ses-419!2sec!4v1771523891979!5m2!1ses-419!2sec",
};

export const socialLinks = {
  facebook: "#",
  instagram: "#",
  linkedin: "#"
};

export const navLinks = [
    { href: "#servicios", label: "Servicios" },
    { href: "#marcas", label: "Marcas" },
    { href: "#contacto", label: "Contacto" },
];

export const stats = [
    { val: '+12', tag: 'Años Exp.', icon: Activity },
    { val: '+200', tag: 'Equipos', icon: Settings },
    { val: '+5', tag: 'Países', icon: Globe },
    { val: '24/7', tag: 'Soporte', icon: PhoneCall },
];
