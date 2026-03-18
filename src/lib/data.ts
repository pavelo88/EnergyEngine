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
    id: 'mantenimiento-preventivo',
    title: 'Mantenimiento Preventivo y Correctivo',
    description: 'Planes personalizados de mantenimiento para asegurar la continuidad de sus equipos.',
    desc: 'Planes personalizados de mantenimiento para asegurar la continuidad de sus equipos.',
    fullDescription: 'Realizamos mantenimientos preventivos y correctivos exhaustivos, inspecciones técnicas y cambios de consumibles siguiendo los estándares más altos del sector.',
    image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?q=80&w=600&auto=format&fit=crop",
    icon: Wrench
  },
  {
    id: 'inspecciones-tecnicas',
    title: 'Inspecciones y Revisiones Técnicas',
    description: 'Revisiones detalladas con tecnología avanzada para detectar anomalías antes de que ocurran.',
    desc: 'Revisiones detalladas con tecnología avanzada para detectar anomalías antes de que ocurran.',
    fullDescription: 'Evaluamos el estado electromecánico de sus equipos para detectar posibles fallos antes de que ocurran, garantizando una operatividad del 100%.',
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop",
    icon: ShieldCheck
  },
  {
    id: 'consumibles-fluidos',
    title: 'Stock Consumibles y Fluidos',
    description: 'Cambios de aceite, filtros, baterías y anticongelante con productos de primera calidad.',
    desc: 'Cambios de aceite, filtros, baterías y anticongelante con productos de primera calidad.',
    fullDescription: 'Mantenemos sus motores en condiciones óptimas mediante la sustitución periódica de componentes críticos y fluidos vitales para la vida útil del motor.',
    image: "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?q=80&w=600&auto=format&fit=crop",
    icon: Droplets
  },
  {
    id: 'tarifas-averias',
    title: 'Tarifas por Averías',
    description: 'Presupuestos transparentes y competitivos para la reparación de cualquier fallo técnico.',
    desc: 'Presupuestos transparentes y competitivos para la reparación de cualquier fallo técnico.',
    fullDescription: 'Ofrecemos diagnósticos precisos y tarifas claras para la resolución de averías, asegurando que su inversión esté siempre protegida y operativa.',
    image: "https://images.unsplash.com/photo-1532007271961-f40a1b5d6e2e?q=80&w=600&auto=format&fit=crop",
    icon: FileText
  },
  {
    id: 'revisiones-flexibles',
    title: 'Revisiones Flexibles',
    description: 'Revisiones con o sin cambios de piezas, ajustándonos estrictamente a lo que solicite el cliente.',
    desc: 'Revisiones con o sin cambios de piezas, ajustándonos estrictamente a lo que solicite el cliente.',
    fullDescription: 'Nos adaptamos a sus protocolos internos. Realizamos la inspección y le asesoramos, dejando en sus manos la decisión final sobre las intervenciones.',
    image: "https://images.unsplash.com/photo-1504917595222-3ad75908e31f?q=80&w=600&auto=format&fit=crop",
    icon: ClipboardList
  },
  {
    id: 'recambios-originales',
    title: 'Suministro de Recambios',
    description: 'Suministro de todo tipo de recambios originales en tiempo récord sin importar la magnitud.',
    desc: 'Suministro de todo tipo de recambios originales en tiempo récord sin importar la magnitud.',
    fullDescription: 'Nuestra logística avanzada nos permite entregar componentes críticos de las principales marcas del mercado para minimizar cualquier parada no programada.',
    image: "https://images.unsplash.com/photo-1586528116311-b8c0a4e769c0?q=80&w=600&auto=format&fit=crop",
    icon: Package
  },
  {
    id: 'mantenimiento-multimarca',
    title: 'Generadores Multimarca',
    description: 'Diésel, gas, estacionarios, móviles, abiertos e insonorizados. Servicio integral.',
    desc: 'Diésel, gas, estacionarios, móviles, abiertos e insonorizados. Servicio integral.',
    fullDescription: 'Especialistas en motores multimarca (Perkins, Cummins, Volvo, etc.). Atendemos equipos manuales y automáticos con total garantía profesional.',
    image: "https://images.unsplash.com/photo-1513828583488-b2dc4d9e05d0?q=80&w=600&auto=format&fit=crop",
    icon: Cpu
  },
  {
    id: 'cogeneracion-om',
    title: 'Cogeneración y O&M',
    description: 'Contratos para plantas de cogeneración con técnicos y electromecánicos altamente cualificados.',
    desc: 'Contratos para plantas de cogeneración con técnicos y electromecánicos altamente cualificados.',
    fullDescription: 'Operación y mantenimiento integral de plantas. Solucionamos anomalías mecánicas o eléctricas en bombas, torres, cuadros de control y sistemas de combustible.',
    image: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=600&auto=format&fit=crop",
    icon: Factory
  },
  {
    id: 'asistencia-24-7',
    title: 'Asistencia Técnica 24/7',
    description: 'Servicio los 365 días del año. Cobertura en toda España, islas y Portugal.',
    desc: 'Servicio los 365 días del año. Cobertura en toda España, islas y Portugal.',
    fullDescription: 'Disponibilidad inmediata para atender urgencias a cualquier hora del día o de la noche, minimizando el tiempo de inactividad de su instalación.',
    image: "https://images.unsplash.com/photo-1508253730651-e5ace80a7025?q=80&w=600&auto=format&fit=crop",
    icon: PhoneCall
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