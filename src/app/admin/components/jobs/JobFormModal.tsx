'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ────────── AUTOCOMPLETE COMBOBOX INTERNO ──────────
function Combobox({ label, placeholder, items, value, onSelect }: {
  label: string;
  placeholder: string;
  items: { id: string; label: string }[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = items.find(i => i.id === value);
    setDisplay(found?.label || '');
  }, [value, items]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query === '' ? items : items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-2 relative" ref={ref}>
      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</Label>
      <div 
        onClick={() => setOpen(!open)}
        className="h-14 w-full rounded-2xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all px-4 flex items-center justify-between cursor-pointer"
      >
        <span className={cn("text-sm font-bold", !display ? "text-slate-400" : "text-slate-900")}>
          {display || placeholder}
        </span>
        <Search size={16} className="text-slate-300" />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden animate-in slide-in-from-top-2">
          <div className="p-3 border-b border-slate-50">
            <input 
              autoFocus
              className="w-full bg-slate-50 rounded-xl px-3 py-2 text-xs font-bold outline-none border border-transparent focus:border-primary/20"
              placeholder="Escribe para filtrar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map(item => (
              <div 
                key={item.id}
                onClick={() => { onSelect(item.id); setOpen(false); setQuery(''); }}
                className={cn(
                  "p-3 rounded-xl cursor-pointer text-xs font-bold uppercase transition-all flex items-center justify-between",
                  value === item.id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {item.label}
                {value === item.id && <Check size={14} />}
              </div>
            ))}
            {filtered.length === 0 && <p className="p-4 text-center text-[10px] font-black text-slate-300 uppercase">Sin resultados</p>}
          </div>
        </div>
      )}
    </div>
  );
}

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingJob: any;
  clients: { id: string; nombre: string }[];
  inspectors: { id: string; nombre: string }[];
  onSubmit: (data: any) => Promise<void>;
  formLoading: boolean;
}

export default function JobFormModal({
  isOpen,
  onClose,
  editingJob,
  clients,
  inspectors,
  onSubmit,
  formLoading
}: JobFormModalProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedInspectorIds, setSelectedInspectorIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('Registrada');
  const [selectedPriority, setSelectedPriority] = useState('Media');
  const [selectedFormLabel, setSelectedFormLabel] = useState('');

  useEffect(() => {
    if (editingJob) {
      setSelectedClientId(editingJob.clienteId || '');
      setSelectedInspectorIds(editingJob.inspectorIds || []);
      setSelectedStatus(editingJob.estado || 'Registrada');
      setSelectedPriority(editingJob.prioridad || 'Media');
      setSelectedFormLabel(editingJob.descripcion || '');
    } else {
      setSelectedClientId('');
      setSelectedInspectorIds([]);
      setSelectedStatus('Registrada');
      setSelectedPriority('Media');
      setSelectedFormLabel('');
    }
  }, [editingJob, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClientId);
    onSubmit({
      clienteId: selectedClientId,
      clienteNombre: client?.nombre || '',
      inspectorIds: selectedInspectorIds,
      estado: selectedStatus,
      prioridad: selectedPriority,
      descripcion: selectedFormLabel
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg my-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
            {editingJob ? 'Editar Orden' : 'Nueva Orden de Trabajo'}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
          {/* DESCRIPCIÓN DE LA ORDEN */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título / Descripción de la Orden</Label>
            <Input 
              placeholder="Ej: Mantenimiento Preventivo Grupo Electrógeno..." 
              value={selectedFormLabel} 
              onChange={e => setSelectedFormLabel(e.target.value)}
              className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold text-slate-900"
            />
          </div>

          {/* CLIENTE */}
          <Combobox
            label="Vincular a Cliente"
            placeholder="Buscar cliente..."
            items={clients.map(c => ({ id: c.id, label: c.nombre }))}
            value={selectedClientId}
            onSelect={id => setSelectedClientId(id)}
          />

          {/* TÉCNICOS */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Técnicos</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
              {inspectors.map(i => (
                <label key={i.id} className={cn(
                  "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all",
                  selectedInspectorIds.includes(i.id) ? 'bg-primary/10 border-primary/20' : 'hover:bg-white'
                )}>
                  <input 
                    type="checkbox" 
                    checked={selectedInspectorIds.includes(i.id)} 
                    onChange={(e) => {
                      if (e.target.checked) setSelectedInspectorIds(prev => [...prev, i.id]);
                      else setSelectedInspectorIds(prev => prev.filter(id => id !== i.id));
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-slate-700 truncate">{i.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ESTADO */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de la Orden</Label>
            <div className="flex gap-2">
              {['Registrada', 'En Proceso', 'Completada'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStatus(s)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    selectedStatus === s ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* PRIORIDAD */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad</Label>
            <div className="flex gap-2">
              {['Baja', 'Media', 'Alta'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    selectedPriority === p 
                      ? (p === 'Alta' ? 'bg-red-500 border-red-500 text-white' : p === 'Media' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
            <Button
              type="submit"
              disabled={formLoading || !selectedClientId || selectedInspectorIds.length === 0}
              className="rounded-xl font-black uppercase text-xs tracking-widest bg-primary px-8 py-3 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {formLoading ? <><Loader2 size={14} className="animate-spin mr-2" />Procesando...</> : 'Confirmar Orden'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
