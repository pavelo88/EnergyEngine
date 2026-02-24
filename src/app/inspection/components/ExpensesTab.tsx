'use client';

import React, { useState, useRef } from 'react';
import { 
  Receipt, MapPin, Save, Loader2, User, Hourglass, Euro, Trash2, Plus, 
  PenTool, FileText, CheckCircle
} from 'lucide-react';
import { db, COLLECTIONS, auth } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// --- TIPOS DE DATOS ---
type Gasto = {
  rubro: string;
  monto: number;
  descripcion: string;
  forma_pago: string;
};

const initialGastoState = {
  rubro: 'Alimentación',
  monto: '',
  descripcion: '',
  forma_pago: 'Efectivo',
};

// --- COMPONENTE PRINCIPAL ---
export default function ExpensesTab() {
  const [idIntervencion, setIdIntervencion] = useState('');
  const [resumenTrabajos, setResumenTrabajos] = useState('');
  const [horasTrabajadas, setHorasTrabajadas] = useState('');
  const [nombreClienteRecibe, setNombreClienteRecibe] = useState('');

  const [geolocalizacion, setGeolocalizacion] = useState<{lat: number, lng: number} | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [gastoActual, setGastoActual] = useState(initialGastoState);
  
  const [loading, setLoading] = useState(false);

  const tecnicoCanvasRef = useRef<HTMLCanvasElement>(null);
  const clienteCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- LÓGICA DE FIRMAS ---
  const setupCanvas = (canvas: HTMLCanvasElement, onDraw: () => void) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawing = false;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    const start = (e: any) => {
        drawing = true;
        draw(e);
    };
    const end = () => {
        drawing = false;
        ctx.beginPath();
        onDraw();
    };
    const draw = (e: any) => {
        if (!drawing) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchmove', draw);

    // Cleanup function
    return () => {
        canvas.removeEventListener('mousedown', start);
        canvas.removeEventListener('mouseup', end);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('touchstart', start);
        canvas.removeEventListener('touchend', end);
        canvas.removeEventListener('touchmove', draw);
    };
  };

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // --- LÓGICA DEL FORMULARIO ---
  const getGeoLocation = () => {
    if (geolocalizacion) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeolocalizacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => alert("Error GPS: " + err.message)
    );
  };

  const handleAddGasto = () => {
    if (!gastoActual.monto || !gastoActual.descripcion) {
      alert("El monto y la descripción del gasto son obligatorios.");
      return;
    }
    setGastos([...gastos, { ...gastoActual, monto: parseFloat(gastoActual.monto) }]);
    setGastoActual(initialGastoState);
  };

  const handleRemoveGasto = (index: number) => {
    setGastos(gastos.filter((_, i) => i !== index));
  };
  
  const handleSaveParte = async () => {
    if (!idIntervencion || !resumenTrabajos || !horasTrabajadas) {
        return alert("El Nº de Intervención, el Resumen de Trabajos y las Horas son obligatorios.");
    }
    setLoading(true);
    try {
        const parteData = {
            id_intervencion: idIntervencion,
            id_inspector: auth.currentUser?.uid,
            email_inspector: auth.currentUser?.email,
            fecha: serverTimestamp(),
            geolocalizacion: geolocalizacion,
            resumen_trabajos: resumenTrabajos,
            horas_trabajadas: parseFloat(horasTrabajadas),
            gastos: gastos,
            firma_tecnico_url: tecnicoCanvasRef.current?.toDataURL(),
            firma_cliente_url: clienteCanvasRef.current?.toDataURL(),
            nombre_cliente_recibe: nombreClienteRecibe,
            estado: 'Pendiente Aprobación'
        };

        await addDoc(collection(db, "partes_diarios"), parteData);
        
        alert("¡Parte de Trabajo Diario guardado con éxito!");
        // Reset full form
        setIdIntervencion('');
        setResumenTrabajos('');
        setHorasTrabajadas('');
        setNombreClienteRecibe('');
        setGeolocalizacion(null);
        setGastos([]);
        clearCanvas(tecnicoCanvasRef);
        clearCanvas(clienteCanvasRef);

    } catch (e) {
        console.error("Error al guardar el parte: ", e);
        alert("Error al guardar: " + e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* --- SECCIÓN 1: CABECERA DEL PARTE --- */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><FileText size={20} /></div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Parte de Trabajo Diario</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={idIntervencion} onChange={e => setIdIntervencion(e.target.value)} type="text" placeholder="Nº de Intervención / OT" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900" />
            <button onClick={getGeoLocation} disabled={!!geolocalizacion} className={`p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${geolocalizacion ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                <MapPin size={16} /> {geolocalizacion ? `GPS OK: ${geolocalizacion.lat.toFixed(3)}...` : 'Capturar Ubicación'}
            </button>
        </div>
      </section>

      {/* --- SECCIÓN 2: TRABAJOS Y HORAS --- */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><Hourglass size={18} className="text-blue-500"/> Resumen y Horas</h3>
        <input value={horasTrabajadas} onChange={e => setHorasTrabajadas(e.target.value)} type="number" placeholder="Horas Totales Trabajadas" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900" />
        <textarea value={resumenTrabajos} onChange={e => setResumenTrabajos(e.target.value)} placeholder="Descripción detallada de los trabajos realizados en sitio..." className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 h-32 resize-none" />
      </section>

      {/* --- SECCIÓN 3: GASTOS ASOCIADOS --- */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><Receipt size={18} className="text-blue-500"/> Gastos y Viáticos</h3>
        {/* Formulario para añadir gasto */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
            <input value={gastoActual.monto} onChange={e => setGastoActual({...gastoActual, monto: e.target.value})} type="number" placeholder="Monto (€)" className="p-3 rounded-lg border-none font-bold col-span-1" />
            <select value={gastoActual.rubro} onChange={e => setGastoActual({...gastoActual, rubro: e.target.value})} className="p-3 rounded-lg border-none font-bold col-span-1">
                {['Alimentación', 'Combustible', 'Peajes', 'Hospedaje', 'Repuestos', 'Otros'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={gastoActual.descripcion} onChange={e => setGastoActual({...gastoActual, descripcion: e.target.value})} type="text" placeholder="Descripción breve del gasto" className="p-3 rounded-lg border-none font-bold col-span-2" />
            <select value={gastoActual.forma_pago} onChange={e => setGastoActual({...gastoActual, forma_pago: e.target.value})} className="p-3 rounded-lg border-none font-bold col-span-1">
                <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option>
            </select>
            <button onClick={handleAddGasto} className="p-3 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center gap-2 col-span-1"><Plus size={16}/>Añadir</button>
        </div>
        {/* Lista de gastos añadidos */}
        <div className="space-y-2">
            {gastos.map((g, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Euro size={16} className="text-emerald-500"/>
                        <div>
                            <p className="font-bold text-sm text-slate-800">{g.descripcion}</p>
                            <p className="text-xs text-slate-500">{g.rubro} - {g.forma_pago}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{g.monto.toFixed(2)}€</span>
                        <button onClick={() => handleRemoveGasto(i)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            {gastos.length === 0 && <p className="text-center text-xs text-slate-400 font-bold py-4">No hay gastos añadidos a este parte.</p>}
        </div>
      </section>

      {/* --- SECCIÓN 4: FIRMAS BIOMÉTRICAS --- */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><ClipboardSignature size={18} className="text-blue-500"/> Firmas de Conformidad</h3>
        {/* Firma Técnico */}
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><PenTool size={12}/> Firma del Técnico</label>
            <canvas ref={tecnicoCanvasRef} width={600} height={200} className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-crosshair touch-none" />
            <button onClick={() => clearCanvas(tecnicoCanvasRef)} className="text-xs text-red-500 font-bold">Limpiar</button>
        </div>
        {/* Firma Cliente */}
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><User size={12}/> Recibido por (Cliente)</label>
            <input value={nombreClienteRecibe} onChange={e => setNombreClienteRecibe(e.target.value)} type="text" placeholder="Nombre y Apellido de quien recibe" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 mb-2" />
            <canvas ref={clienteCanvasRef} width={600} height={200} className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-crosshair touch-none" />
            <button onClick={() => clearCanvas(clienteCanvasRef)} className="text-xs text-red-500 font-bold">Limpiar</button>
        </div>
      </section>

      {/* --- ACCIÓN FINAL --- */}
      <button onClick={handleSaveParte} disabled={loading} className="w-full p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50">
        {loading ? <Loader2 className="animate-spin text-blue-500" /> : <Save className="text-blue-500" />}
        FINALIZAR Y GUARDAR PARTE
      </button>
    </div>
  );
}
