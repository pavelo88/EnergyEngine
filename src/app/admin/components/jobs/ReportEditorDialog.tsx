'use client';

import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import HojaTrabajoForm from '@/app/inspection/components/forms/HojaTrabajoForm';
import InformeRevisionForm from '@/app/inspection/components/forms/InformeRevisionForm';
import InformeTecnicoForm from '@/app/inspection/components/forms/InformeTecnicoForm';
import InformeSimplificadoForm from '@/app/inspection/components/forms/InformeSimplificadoForm';
import RevisionBasicaForm from '@/app/inspection/components/forms/RevisionBasicaForm';

interface ReportEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReport: any;
  aiSuggestions: any;
  isAiLoading: boolean;
  onAnalyzeAi: () => Promise<void>;
  onSuccess: () => void;
}

const FORM_TYPES = [
  { id: 'hoja-trabajo', label: 'Hoja de Trabajo' },
  { id: 'informe-revision', label: 'Informe de Revisión' },
  { id: 'informe-tecnico', label: 'Informe Técnico' },
  { id: 'informe-simplificado', label: 'Informe Simplificado' },
  { id: 'revision-basica', label: 'Revisión Básica' },
];

export default function ReportEditorDialog({
  isOpen,
  onOpenChange,
  selectedReport,
  aiSuggestions,
  isAiLoading,
  onAnalyzeAi,
  onSuccess
}: ReportEditorDialogProps) {
  if (!selectedReport) return null;

  const formProps = {
    initialData: selectedReport,
    aiData: aiSuggestions,
    onSuccess: onSuccess,
    isAdmin: true
  };

  const renderForm = () => {
    switch (selectedReport.formType) {
      case 'hoja-trabajo': return <HojaTrabajoForm {...formProps} />;
      case 'informe-revision': return <InformeRevisionForm {...formProps} />;
      case 'informe-tecnico': return <InformeTecnicoForm {...formProps} />;
      case 'informe-simplificado': return <InformeSimplificadoForm {...formProps} />;
      case 'revision-basica': return <RevisionBasicaForm {...formProps} />;
      default: return <p className="p-20 text-center font-black text-slate-300 uppercase">Tipo de formulario no soportado</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0 rounded-[2.5rem] bg-white text-slate-950 border-none shadow-2xl">
        <DialogHeader className="p-8 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              {selectedReport.id && !selectedReport.orderId ? <FileText size={20} /> : <Sparkles size={20} />}
            </div>
            {selectedReport.numero_informe || selectedReport.id
              ? `Revisión Administrativa: ${selectedReport.numero_informe || selectedReport.id}`
              : `Nuevo ${FORM_TYPES.find(f => f.id === selectedReport.formType)?.label || 'Informe'}`
            }
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              onClick={onAnalyzeAi}
              disabled={isAiLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
            >
              {isAiLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
              {isAiLoading ? 'Analizando...' : 'Analizar con IA'}
            </Button>
          </div>
        </DialogHeader>
        <div className="p-4 md:p-8">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
