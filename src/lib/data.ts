import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Wrench, ShieldCheck, Droplets, FileText,
  ClipboardList, Package, Cpu, Factory, PhoneCall,
  Activity, Globe, Settings
} from 'lucide-react';

export interface Service {
  id: string;
  title: string;
  description: string;
  desc?: string;
  fullDescription: string;
  image: string;
  icon: any; // Usaremos el componente de React directamente
}

// Puedes reemplazar esta imagen por una de tu propia biblioteca si lo prefieres
const INDUSTRIAL_GENERATOR_BG = "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop";

export const services: Service[] = [
  {
    id: 'mantenimiento-integral',
    title: 'Mantenimiento Integral',
    description: 'Planes personalizados preventivos y correctivos con revisiones flexibles adaptadas a sus protocolos para asegurar la continuidad de sus equipos.',
    desc: 'Planes personalizados preventivos y correctivos con revisiones flexibles adaptadas a sus protocolos para asegurar la continuidad de sus equipos.',
    fullDescription: 'Realizamos mantenimientos preventivos y correctivos exhaustivos, incluyendo revisiones flexibles que se adaptan a las necesidades operativas de cada cliente.',
    image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?q=80&w=600&auto=format&fit=crop",
    icon: Wrench
  },
  {
    id: 'inspecciones-pruebas',
    title: 'Inspecciones y Pruebas de Carga',
    description: 'Revisiones detalladas con tecnología avanzada y pruebas de banco de carga para certificar el rendimiento crítico ante cualquier fallo de red.',
    desc: 'Revisiones detalladas con tecnología avanzada y pruebas de banco de carga para certificar el rendimiento crítico ante cualquier fallo de red.',
    fullDescription: 'Evaluamos el estado electromecánico mediante diagnósticos avanzados y validamos la capacidad real de respuesta con bancos de carga certificados.',
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop",
    icon: ShieldCheck
  },
  {
    id: 'consumibles-fluidos',
    title: 'Consumibles y Fluidos',
    description: 'Sustitución periódica de aceite, filtros, baterías y anticongelante con productos de alta gama para prolongar la vida útil de sus motores industriales.',
    desc: 'Sustitución periódica de aceite, filtros, baterías y anticongelante con productos de alta gama para prolongar la vida útil de sus motores industriales.',
    fullDescription: 'Mantenemos sus motores en condiciones óptimas mediante la gestión integral de fluidos y recambio de componentes críticos según programas de vida útil.',
    image: "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?q=80&w=600&auto=format&fit=crop",
    icon: Droplets
  },
  {
    id: 'reparacion-averias',
    title: 'Reparación de Averías',
    description: 'Diagnóstico técnico preciso y resolución de fallos con tarifas transparentes y presupuestos competitivos para minimizar el tiempo de inactividad.',
    desc: 'Diagnóstico técnico preciso y resolución de fallos con tarifas transparentes y presupuestos competitivos para minimizar el tiempo de inactividad.',
    fullDescription: 'Ofrecemos soluciones inmediatas ante averías críticas, con diagnósticos precisos por técnicos cualificados y una estructura de costes clara y sin sorpresas.',
    image: "https://images.unsplash.com/photo-1532007271961-f40a1b5d6e2e?q=80&w=600&auto=format&fit=crop",
    icon: FileText
  },
  {
    id: 'logistica-recambios',
    title: 'Logística de Recambios',
    description: 'Suministro ágil de piezas originales de las principales marcas mundiales, garantizando la disponibilidad de componentes críticos en tiempo récord.',
    desc: 'Suministro ágil de piezas originales de las principales marcas mundiales, garantizando la disponibilidad de componentes críticos en tiempo récord.',
    fullDescription: 'Nuestra red logística asegura la entrega inmediata de repuestos genuinos certificados para minimizar cualquier parada no programada de su instalación.',
    image: "https://images.unsplash.com/photo-1586528116311-b8c0a4e769c0?q=80&w=600&auto=format&fit=crop",
    icon: Package
  },
  {
    id: 'generadores-multimarca',
    title: 'Generadores Multimarca',
    description: 'Especialistas en motores diésel y gas, sistemas estacionarios, móviles e insonorizados de marcas líderes como Perkins, Cummins y Volvo Penta.',
    desc: 'Especialistas en motores diésel y gas, sistemas estacionarios, móviles e insonorizados de marcas líderes como Perkins, Cummins y Volvo Penta.',
    fullDescription: 'Servicio técnico experto para una amplia gama de fabricantes, cubriendo sistemas manuales y automáticos con total garantía de compatibilidad y rendimiento.',
    image: "https://images.unsplash.com/photo-1513828583488-b2dc4d9e05d0?q=80&w=600&auto=format&fit=crop",
    icon: Cpu
  },
  {
    id: 'cogeneracion-om',
    title: 'Cogeneración y O&M',
    description: 'Operación y Mantenimiento especializado para plantas de cogeneración, optimizando el rendimiento electromecánico y la gestión de sistemas auxiliares.',
    desc: 'Operación y Mantenimiento especializado para plantas de cogeneración, optimizando el rendimiento electromecánico y la gestión de sistemas auxiliares.',
    fullDescription: 'Gestión integral de plantas industriales, solucionando anomalías en bombas, torres, cuadros de control y optimizando la eficiencia energética global.',
    image: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=600&auto=format&fit=crop",
    icon: Factory
  },
  {
    id: 'asistencia-24-7',
    title: 'Asistencia Técnica 24/7',
    description: 'Soporte experto disponible los 365 días del año con respuesta inmediata y cobertura total en España y Portugal para cualquier emergencia técnica.',
    desc: 'Soporte experto disponible los 365 días del año con respuesta inmediata y cobertura total en España y Portugal para cualquier emergencia técnica.',
    fullDescription: 'Disponibilidad absoluta para atender urgencias críticas a cualquier hora, garantizando la continuidad del suministro energético donde más se necesita.',
    image: "https://images.unsplash.com/photo-1508253730651-e5ace80a7025?q=80&w=600&auto=format&fit=crop",
    icon: PhoneCall
  },
  {
    id: 'modernizacion-telegestion',
    title: 'Modernización y Telegestión',
    description: 'Actualización de sistemas obsoletos e implementación de monitorización remota inteligente para el control y supervisión 24/7 de sus activos.',
    desc: 'Actualización de sistemas obsoletos e implementación de monitorización remota inteligente para el control y supervisión 24/7 de sus activos.',
    fullDescription: 'Convertimos equipos antiguos en sistemas inteligentes (Retrofitting) con control digital y supervisión remota vía telegestión de última generación.',
    image: "https://images.unsplash.com/photo-1504917595222-3ad75908e31f?q=80&w=600&auto=format&fit=crop",
    icon: Settings
  }
];

// Datos adicionales para el header/footer y estadísticas (sin cambios)
export const brands: string[] = ["Perkins", "Guascor", "Cummins", "Iveco", "Ruggerini", "Volvo Penta", "Lombardini", "MAN", "Rolls-Royce", "MTU", "Deif"];

export const contactInfo = {
  address: "C/Miguel Lopez Bravo, 6 (Nave), Yepes (Toledo) CP:45313",
  phone: "92 515 43 53",
  emails: ["administracion@energyengine.es", "serviciotecnico@energyengine.es"],
  mapUrl: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3060.5601159996186!2d-3.6247125!3d39.9064799!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd69fd9fca56779b%3A0xd8e264de001cf92b!2sEnergy%20Engine%20Grupos%20Electr%C3%B3genos%20S.L!5e0!3m2!1ses-419!2sec!4v1771523891979!5m2!1ses-419!2sec",
};

export const socialLinks = {
  facebook: "#",
  instagram: "#",
  linkedin: "https://www.linkedin.com/company/energy-engine-grupos-electrogenos/"
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