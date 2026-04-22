
'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  User, PenTool, Trash2, Save, CheckCircle2, LogOut, Clock, TrendingUp,
  ChevronRight, X, Calendar as CalendarIcon, FileText
} from 'lucide-react';
import { useAuth, useFirestore as useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { decimalToTime } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import ReportGeneratorModal from '@/app/admin/components/ReportGeneratorModal';

// ────────── HOURS DETAIL MODAL ──────────
function HorasDetailModal({ reportes, onClose }: { reportes: any[]; onClose: () => void }) {
  const allStops = reportes;

  const totalN = allStops.reduce((s, p) => s + (p.horasNormales || 0), 0);
  const totalE = allStops.reduce((s, p) => s + (p.horasExtras || 0), 0);
  const totalS = allStops.reduce((s, p) => s + (p.horasEspeciales || 0), 0);

  const getFormattedDate = (fecha: any) => {
    if (!fecha) return '–';
    try {
      if (fecha.toDate) return format(fecha.toDate(), 'dd/MM', { locale: es });
      if (fecha.seconds) return format(new Date(fecha.seconds * 1000), 'dd/MM', { locale: es });
      if (typeof fecha === 'string') return format(new Date(fecha), 'dd/MM', { locale: es });
    } catch { return '–'; }
    return '–';
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#062113] text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mes en Curso</p>
              <h2 className="text-xl font-black uppercase flex items-center gap-2">
                <Clock size={20} className="text-emerald-400" /> Bitácora de Horas
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
              <X size={14} />
            </button>
          </div>
          {/* Totals strip */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Normales</p>
              <p className="text-lg font-black text-white">{decimalToTime(totalN)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">Extras</p>
              <p className="text-lg font-black text-white">{decimalToTime(totalE)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Especiales</p>
              <p className="text-lg font-black text-white">{decimalToTime(totalS)}</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {allStops.length === 0 ? (
            <div className="p-12 text-center text-slate-300">
              <Clock size={40} className="mx-auto mb-3" />
              <p className="font-black text-sm uppercase text-slate-400">Sin horas este mes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-slate-100 text-slate-500">
                    <th className="text-left px-4 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Fecha</th>
                    <th className="text-left px-4 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Cliente</th>
                    <th className="text-left px-4 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Actividad</th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-emerald-600 tracking-widest whitespace-nowrap">Norm.</th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-yellow-600 tracking-widest whitespace-nowrap">Extra</th>
                    <th className="text-center px-3 py-3 font-black uppercase text-[10px] text-blue-600 tracking-widest whitespace-nowrap">Esp.</th>
                  </tr>
                </thead>
                <tbody>
                  {allStops.map((stop, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-3 font-bold text-slate-500 whitespace-nowrap">{getFormattedDate(stop.fecha)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap max-w-[140px] truncate">{stop.clienteNombre || '–'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap max-w-[120px] truncate">{stop.actividad || '–'}</td>
                      <td className="px-3 py-3 text-center font-black text-emerald-600 whitespace-nowrap">{decimalToTime(stop.horasNormales || 0)}</td>
                      <td className="px-3 py-3 text-center font-black text-yellow-600 whitespace-nowrap">{decimalToTime(stop.horasExtras || 0)}</td>
                      <td className="px-3 py-3 text-center font-black text-blue-600 whitespace-nowrap">{decimalToTime(stop.horasEspeciales || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────── EXPENSES DETAIL MODAL ──────────
function GastosDetailModal({ gastos, onClose }: { gastos: any[]; onClose: () => void }) {
  // Group by rubro
  const byRubro = gastos.reduce((acc: Record<string, any[]>, g: any) => {
    const rubro = g.rubro || 'Otros';
    if (!acc[rubro]) acc[rubro] = [];
    acc[rubro].push(g);
    return acc;
  }, {});

  const totalGeneral = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#062113] text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mes en Curso</p>
              <h2 className="text-xl font-black uppercase flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" /> Desglose de Gastos
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
              <X size={14} />
            </button>
          </div>
          <div className="mt-4 bg-white/10 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Total Liquidado</span>
            <span className="text-2xl font-black text-emerald-400">{totalGeneral.toFixed(2)}€</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {gastos.length === 0 ? (
            <div className="py-12 text-center text-slate-300">
              <TrendingUp size={40} className="mx-auto mb-3" />
              <p className="font-black text-sm uppercase text-slate-400">Sin gastos este mes</p>
            </div>
          ) : (
            Object.entries(byRubro).map(([rubro, items]: [string, any[]]) => {
              const subtotal = items.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
              return (
                <div key={rubro} className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest">{rubro}</span>
                    <span className="text-[11px] font-black text-emerald-400">{subtotal.toFixed(2)}€</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-4 py-2 font-black text-[9px] uppercase text-slate-400 whitespace-nowrap">Concepto</th>
                          <th className="text-right px-4 py-2 font-black text-[9px] uppercase text-slate-400 whitespace-nowrap">Monto</th>
                          <th className="text-center px-4 py-2 font-black text-[9px] uppercase text-slate-400 whitespace-nowrap">Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((g: any, i: number) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[200px] truncate">{g.descripcion || g.concepto || '–'}</td>
                            <td className="px-4 py-2.5 text-right font-black text-slate-900">{parseFloat(g.monto || 0).toFixed(2)}€</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${g.tipoPago === 'Inspector' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {g.tipoPago || 'Empresa'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────── MAIN PROFILE TAB ──────────
export default function ProfileTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  // Monthly stats
  const [monthlyReportes, setMonthlyReportes] = useState<any[]>([]);
  const [monthlyGastos, setMonthlyGastos] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showHorasModal, setShowHorasModal] = useState(false);
  const [showGastosModal, setShowGastosModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const auth = useAuth();
  const db = useFirebase();
  const isOnline = useOnlineStatus();

  const mesLabel = format(new Date(), 'MMMM yyyy', { locale: es }).toUpperCase();

  // Load monthly data
  useEffect(() => {
    const stored = localStorage.getItem('energy_engine_signature');
    if (stored) setSavedSignature(stored);

    if (!auth.currentUser?.email || !db || !isOnline) { setStatsLoading(false); return; }

    const fetchMonthly = async () => {
      setStatsLoading(true);
      try {
        const email = auth.currentUser!.email!;

        // 1. Fetch Visits
        const qVisitas = query(
          collection(db, "bitacora_visitas"),
          where("inspectorId", "==", email)
        );
        const vSnap = await getDocs(qVisitas);
        const allV = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setMonthlyReportes(allV.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0)));

        // 2. Fetch Expenses
        const qGastos = query(
          collection(db, "gastos_detalle"),
          where("inspectorId", "==", email)
        );
        const gSnap = await getDocs(qGastos);
        const allG = gSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setMonthlyGastos(allG.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0)));

      } catch (e) {
        console.error("Error fetching monthly stats:", e);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchMonthly();
  }, [auth.currentUser, db, isOnline]);

  // Computed totals
  const totalHoras = monthlyReportes.reduce(
    (s, p) => s + (p.horasNormales || 0) + (p.horasExtras || 0) + (p.horasEspeciales || 0), 0
  );
  const totalGastos = monthlyGastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);

  // ── Canvas Logic ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * scale) {
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      ctx.scale(scale, scale);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#165a30';
    }
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const stopDrawing = (e?: any) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.beginPath();
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setHasSignature(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      setHasSignature(false);
    }
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    if (!hasSignature) { alert("Por favor, dibuja una firma antes de guardar."); return; }
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5);
    localStorage.setItem('energy_engine_signature', base64);
    setSavedSignature(base64);
    alert("Firma guardada correctamente en el dispositivo.");
  };

  const handleLogout = async () => {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      try {
        localStorage.removeItem('energy_engine_session_id');
        localStorage.removeItem('energy_engine_offline_email');
        if (auth) await signOut(auth);
      } catch (err) {
        console.warn("Error al cerrar sesión:", err);
      } finally {
        window.location.href = '/auth/inspection';
      }
    }
  };

  return (
    <>
      {showHorasModal && <HorasDetailModal reportes={monthlyReportes} onClose={() => setShowHorasModal(false)} />}
      {showGastosModal && <GastosDetailModal gastos={monthlyGastos} onClose={() => setShowGastosModal(false)} />}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* User Card */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#062113]/10 text-[#062113] rounded-2xl flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico RTS Registrado</p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {auth.currentUser?.displayName?.toUpperCase() || auth.currentUser?.email?.split('@')[0].toUpperCase() || 'TÉCNICO ENERGY'}
            </h2>
            <p className="text-sm font-medium text-slate-500">{auth.currentUser?.email}</p>
          </div>
        </section>

        {/* ── MONTHLY STATS ── */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <CalendarIcon size={12} /> {mesLabel}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Hours Card */}
            <button
              onClick={() => setShowHorasModal(true)}
              disabled={statsLoading}
              className="bg-slate-900 p-5 rounded-[2rem] shadow-lg text-white text-left group active:scale-[0.97] transition-all hover:bg-[#0a2d1a]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-emerald-400" />
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors mt-1" />
              </div>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Horas de Producción</p>
              <p className="text-3xl font-black tracking-tight leading-none mt-1">
                {statsLoading ? '–:–' : decimalToTime(totalHoras)}
              </p>
              <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase">Ver Detalle →</p>
            </button>

            {/* Expenses Card */}
            <button
              onClick={() => setShowGastosModal(true)}
              disabled={statsLoading}
              className="bg-emerald-500 p-5 rounded-[2rem] shadow-lg text-white text-left group active:scale-[0.97] transition-all hover:bg-emerald-600"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <ChevronRight size={16} className="text-white/40 group-hover:text-white transition-colors mt-1" />
              </div>
              <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Gastos Liquidados</p>
              <p className="text-3xl font-black tracking-tight leading-none mt-1">
                {statsLoading ? '–' : `${totalGastos.toFixed(2)}€`}
              </p>
              <p className="text-[9px] font-bold text-white/60 mt-1 uppercase">Ver Desglose →</p>
            </button>
          </div>
        </div>

        <Button
          onClick={() => setIsReportModalOpen(true)}
          className="w-full h-14 rounded-[2rem] bg-slate-100 text-slate-900 border border-slate-200 font-extrabold text-xs uppercase tracking-widest gap-3 shadow-md hover:bg-slate-200 transition-all active:scale-95"
        >
          <FileText size={20} className="text-emerald-500" /> Descargar Reporte Consolidado
        </Button>

        {/* Signature Section */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
              <PenTool size={18} className="text-primary" /> Firma Digital
            </h3>
            {savedSignature && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <CheckCircle2 size={12} /> CONFIGURADA
              </span>
            )}
          </div>

          <div className="relative group">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onMouseMove={draw}
              onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw}
              className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-crosshair touch-none"
            />
            {!hasSignature && !savedSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-bold uppercase tracking-widest">
                Firme aquí para reportes
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={clearCanvas} className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all text-xs">
              <Trash2 size={16} /> LIMPIAR
            </button>
            <button onClick={saveSignature} className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-black text-white bg-slate-900 shadow-lg active:scale-95 transition-all text-xs">
              <Save size={16} className="text-emerald-400" /> GUARDAR
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-slate-400 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all text-xs"
        >
          <LogOut size={16} /> CERRAR SESIÓN
        </button>
      </div>

      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportes={[...monthlyReportes, ...monthlyGastos]}
        fixedInspectorName={auth.currentUser?.displayName || auth.currentUser?.email || ''}
      />
    </>
  );
}
