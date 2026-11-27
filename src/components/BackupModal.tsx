import React, { useState, useMemo } from "react";
import { Question } from "../types/quiz";
import { saveFileWithDialog } from "../utils/fileDialog";
import { createBankZip } from "../utils/zipHandler";
import { X, FolderOpen, Copy, Check, Database, Archive, Filter, CheckSquare, Square } from "lucide-react";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  questions,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modo de selección para exportar solo ciertas preguntas o por etiqueta
  const [filterMode, setFilterMode] = useState<"all" | "tags" | "custom">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const s = new Set<string>();
    questions.forEach((q) => q.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [questions]);

  const questionsToExport = useMemo(() => {
    if (filterMode === "all") return questions;
    if (filterMode === "tags") {
      if (selectedTags.length === 0) return [];
      return questions.filter((q) => q.tags?.some((t) => selectedTags.includes(t)));
    }
    return questions.filter((q) => selectedIds.has(q.id));
  }, [questions, filterMode, selectedTags, selectedIds]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(questionsToExport, null, 2);
  const jsonSizeKB = (new Blob([jsonString]).size / 1024).toFixed(1);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleQuestionId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 1. Guardar como ZIP (Preguntas + Carpeta imagenes/)
  const handleSaveZipWithDialog = async () => {
    if (questionsToExport.length === 0) {
      setErrorMsg("Selecciona al menos una pregunta para exportar.");
      return;
    }
    setIsSaving(true);
    setSavedPath(null);
    setErrorMsg(null);

    try {
      const zipBlob = await createBankZip(questionsToExport);
      const filename = `BPMIM_Banco_${new Date().toISOString().slice(0, 10)}.zip`;
      const result = await saveFileWithDialog(
        filename,
        zipBlob,
        "Paquete ZIP con Imágenes (*.zip)",
        "zip"
      );
      if (result.success) {
        setSavedPath(result.path || filename);
      }
    } catch (err) {
      console.error("Error al generar ZIP del banco:", err);
      setErrorMsg("No se pudo generar el archivo ZIP.");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Guardar como JSON directo
  const handleSaveJsonWithDialog = async () => {
    if (questionsToExport.length === 0) {
      setErrorMsg("Selecciona al menos una pregunta para exportar.");
      return;
    }
    setIsSaving(true);
    setSavedPath(null);
    setErrorMsg(null);

    const filename = `BPMIM_Banco_${new Date().toISOString().slice(0, 10)}.json`;
    const result = await saveFileWithDialog(
      filename,
      jsonString,
      "Archivo JSON (*.json)",
      "json"
    );

    setIsSaving(false);
    if (result.success) {
      setSavedPath(result.path || filename);
    }
  };

  const handleCopy = async () => {
    if (questionsToExport.length === 0) {
      setErrorMsg("Selecciona al menos una pregunta para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-850 border border-slate-700 w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Respaldar / Exportar Banco</h2>
              <p className="text-xs text-slate-400">
                Exporta todo el banco, filtra por etiqueta o elige preguntas específicas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Selector de Alcance */}
          <div className="bg-slate-900/70 border border-slate-750 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                ¿Qué preguntas deseas incluir?
              </span>
              <span className="text-[11px] font-semibold text-sky-400">
                {questionsToExport.length} de {questions.length} seleccionadas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`py-1.5 px-2 rounded-lg border font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                Todas ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("tags")}
                className={`py-1.5 px-2 rounded-lg border font-medium transition-colors ${
                  filterMode === "tags"
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                Por Etiqueta (Tag)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("custom")}
                className={`py-1.5 px-2 rounded-lg border font-medium transition-colors ${
                  filterMode === "custom"
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                Elegir Específicas
              </button>
            </div>

            {/* Filtro por Tags */}
            {filterMode === "tags" && (
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                {allTags.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">No hay etiquetas registradas.</span>
                ) : (
                  allTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-mono transition-all ${
                          active
                            ? "bg-sky-500/20 border-sky-500 text-sky-300 font-bold"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Selección manual de preguntas */}
            {filterMode === "custom" && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1 pr-1">
                {questions.map((q, idx) => {
                  const checked = selectedIds.has(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQuestionId(q.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-colors ${
                        checked
                          ? "bg-sky-500/15 border-sky-500/50 text-slate-100"
                          : "bg-slate-900 border-slate-750 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="font-mono text-[10px] text-sky-400 shrink-0">#{idx + 1}</span>
                      <span className="truncate flex-1">{q.prompt.replace(/\n/g, " ").slice(0, 70)}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{q.topic}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Confirmación de guardado */}
          {savedPath && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">¡Archivo guardado exitosamente!</p>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5 break-all">{savedPath}</p>
              </div>
            </div>
          )}

          {/* Opción 1: Paquete ZIP */}
          <div className="p-4 bg-slate-900 border border-emerald-800/50 rounded-xl space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5" />
                  1. Paquete Completo (.zip con Imágenes) — Recomendado
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Incluye las preguntas seleccionadas y todas sus imágenes adjuntas.
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving || questionsToExport.length === 0}
                onClick={handleSaveZipWithDialog}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isSaving ? "Empaquetando..." : "Guardar ZIP"}</span>
              </button>
            </div>
          </div>

          {/* Opción 2: Archivo JSON */}
          <div className="p-4 bg-slate-900 border border-slate-750 rounded-xl space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                  2. Solo Datos (.json) — {jsonSizeKB} KB
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Archivo ligero ideal para respaldo rápido de texto y fórmulas.
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving || questionsToExport.length === 0}
                onClick={handleSaveJsonWithDialog}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{isSaving ? "Guardando..." : "Guardar JSON"}</span>
              </button>
            </div>
          </div>

          {/* Opción 3: Copiar al portapapeles */}
          <div className="p-4 bg-slate-900 border border-slate-750 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3. Copiar Texto JSON al Portapapeles
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Copia el arreglo de preguntas seleccionadas para pegarlo en otro lugar.
                </p>
              </div>
              <button
                type="button"
                disabled={questionsToExport.length === 0}
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "¡Copiado!" : "Copiar JSON"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-700 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
