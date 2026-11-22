import React from "react";
import { BookOpen, Plus, Settings, Database } from "lucide-react";

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
    <header
      className="h-12 shrink-0 select-none z-20 flex items-center justify-between px-4 border-b"
      style={{
        background: "linear-gradient(90deg, #0d1117 0%, #111827 100%)",
        borderColor: "#1e2a3e",
      }}
    >
      {/* ── Logo + Título + Breadcrumb ── */}
      <div className="flex items-center gap-3">
        {/* Icono con gradiente azul */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #1d4ed8, #6366f1)" }}
        >
          <BookOpen className="w-4 h-4 text-white" />
        </div>

        {/* Nombre de la app */}
        <span className="text-sm font-bold tracking-tight" style={{ color: "#f1f5f9" }}>
          BPMIM
        </span>

        {/* Separador breadcrumb */}
        <span style={{ color: "#3d5270" }} className="text-sm font-light select-none">/</span>

        {/* Badge de versión */}
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(59,130,246,0.12)",
            color: "#60a5fa",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          v0.3.5
        </span>

        {/* Separador */}
        <span style={{ color: "#3d5270" }} className="text-sm select-none">/</span>

        {/* Contador de preguntas */}
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
          <Database className="w-3 h-3" style={{ color: "#60a5fa" }} />
          <span style={{ color: "#f1f5f9" }} className="font-semibold">{totalQuestions}</span>
          <span>{totalQuestions === 1 ? "pregunta" : "preguntas"}</span>
        </span>
      </div>

      {/* ── Acciones ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          title="Opciones, configuración de interfaz, imágenes y respaldos"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          style={{
            background: "#161e2e",
            color: "#94a3b8",
            border: "1px solid #1e2a3e",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#243048";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2a3e";
          }}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Opciones</span>
        </button>

        {/* Divisor */}
        <div className="h-5 w-px" style={{ background: "#1e2a3e" }} />

        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            boxShadow: "0 0 12px rgba(59,130,246,0.3)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(59,130,246,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(59,130,246,0.3)";
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Pregunta</span>
        </button>
      </div>
    </header>
  );
};
