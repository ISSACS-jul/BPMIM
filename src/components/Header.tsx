import React from "react";
import { Plus, Settings, Database } from "lucide-react";
import appLogo from "../assets/logo.png";

interface HeaderProps {
  totalQuestions: number;
  onOpenNewModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalQuestions,
  onOpenNewModal,
  onOpenSettings,
}) => {
  return (
    <header className="h-12 shrink-0 select-none z-20 flex items-center justify-between px-4 border-b bg-slate-900 border-slate-750">
      {/* ── Logo + Título + Breadcrumb ── */}
      <div className="flex items-center gap-3">
        {/* Logo de la app */}
        <img
          src={appLogo}
          alt="BPMIM Logo"
          className="w-8 h-8 rounded-lg object-cover shadow-md border border-slate-700/60"
        />

        {/* Nombre de la app */}
        <span className="text-sm font-bold tracking-tight text-slate-100">
          BPMIM
        </span>

        {/* Separador */}
        <span className="text-sm select-none text-slate-500">/</span>

        {/* Contador de preguntas */}
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Database className="w-3 h-3 text-sky-400" />
          <span className="font-semibold text-slate-200">{totalQuestions}</span>
          <span>{totalQuestions === 1 ? "pregunta" : "preguntas"}</span>
        </span>
      </div>

      {/* ── Acciones ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          title="Opciones, configuración de interfaz, imágenes y respaldos"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 hover:border-slate-600 hover:bg-slate-750 shadow-sm"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
          <span>Opciones</span>
        </button>

        {/* Divisor */}
        <div className="h-5 w-px bg-slate-750 mx-0.5" />

        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all active:scale-95 bg-sky-600 hover:bg-sky-500 shadow-sm hover:shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Pregunta</span>
        </button>
      </div>
    </header>
  );
};
