import type { LucideIcon } from 'lucide-react';
import { Activity, Cpu, Globe, LineChart, PhoneCall, ShieldCheck, Settings, Truck, Zap } from 'lucide-react';

export const brands: string[] = ["Perkins", "Guascor", "Cummins", "Iveco", "Ruggerini", "Volvo Penta", "Lombardini", "MAN", "Rolls-Royce", "MTU"];

type Service = {
    id: string;
    title: string;
    desc: string;
    imgId: string;
    bpType: string;
    icon: LucideIcon;
};

export const services: Service[] = [
    { id: "01", title: "Mantenimiento Preventivo", desc: "Intervenciones críticas en motores diésel y gas de alto rendimiento.", imgId: "service-1", bpType: "mantenimiento", icon: Activity },
    { id: "02", title: "Pruebas de Carga", desc: "Simulación de fallos de red con bancos resistivos de 600kW.", imgId: "service-2", bpType: "carga", icon: ShieldCheck },
    { id: "03", title: "Sistemas de Control", desc: "Ingeniería en cuadros de maniobra y equipos PLC/DEIF.", imgId: "service-3", bpType: "control", icon: Cpu },
    { id: "04", title: "Rehabilitación Motor", desc: "Overhaul completo de grupos electrógenos de misión crítica.", imgId: "service-4", bpType: "rehabilitacion", icon: Zap },
    { id: "05", title: "Telemetría 24/7", desc: "Monitorización remota para prevenir paradas inesperadas.", imgId: "service-5", bpType: "telemetria", icon: LineChart },
    { id: "06", title: "Logística Repuestos", desc: "Suministro inmediato de filtros y componentes originales.", imgId: "service-6", bpType: "logistica", icon: Truck }
];

type Stat = {
    val: string;
    tag: string;
    icon: LucideIcon;
};

export const stats: Stat[] = [
    { val: "500+", tag: "Proyectos", icon: Globe },
    { val: "15+", tag: "Años Exp", icon: Settings },
    { val: "99.7%", tag: "Uptime", icon: Activity },
    { val: "24/7", tag: "Soporte", icon: PhoneCall }
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
