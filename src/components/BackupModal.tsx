import React, { useState } from "react";
import { Question } from "../types/quiz";
import { saveFileWithDialog } from "../utils/fileDialog";
import { createBankZip } from "../utils/zipHandler";
import { X, FolderOpen, Copy, Check, Database, Archive } from "lucide-react";

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
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(questions, null, 2);
  const jsonSizeKB = (new Blob([jsonString]).size / 1024).toFixed(1);

  // 1. Guardar como ZIP (Preguntas + Carpeta imagenes/)
  const handleSaveZipWithDialog = async () => {
    setIsSaving(true);
    setSavedPath(null);

    try {
      const zipBlob = await createBankZip(questions);
      const filename = `BPMIM_Banco_Completo_${new Date().toISOString().slice(0, 10)}.zip`;
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
      alert("No se pudo generar el archivo ZIP.");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Guardar como JSON directo
  const handleSaveJsonWithDialog = async () => {
    setIsSaving(true);
    setSavedPath(null);

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
      <div className="bg-dark-850 border border-dark-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-950/70 border border-brand-800/60 flex items-center justify-center text-brand-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Respaldar Banco de Preguntas</h2>
              <p className="text-xs text-slate-400">
                Guarda una copia completa en archivo .zip (con imágenes) o en formato .json
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          {/* Tarjeta de Resumen */}
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block text-xl font-bold text-slate-100">{questions.length}</span>
              <span className="text-xs text-slate-400">Preguntas registradas</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-brand-400">{jsonSizeKB} KB</span>
              <span className="text-xs text-slate-400">Tamaño del texto</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-emerald-400">ZIP / JSON</span>
              <span className="text-xs text-slate-400">Formatos compatibles</span>
            </div>
          </div>

          {savedPath && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">¡Respaldo guardado exitosamente!</p>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5 break-all">
                  {savedPath}
                </p>
              </div>
            </div>
          )}

          {/* Opciones de Guardado */}
          <div className="space-y-3">
            <p className="text-xs text-slate-300">Selecciona el formato de respaldo:</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opción 1: ZIP Completo con Imágenes */}
              <button
                onClick={handleSaveZipWithDialog}
                disabled={isSaving}
                className="p-4 bg-dark-800 hover:bg-dark-750 border border-dark-750 hover:border-emerald-500 rounded-xl text-left transition-all group flex flex-col justify-between shadow-sm active:scale-[0.98]"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Archive className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Paquete ZIP Completo
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Incluye el JSON y la carpeta <code>imagenes/</code> adjunta. Ideal para no perder fotos.
                  </p>
                </div>
                <span className="mt-4 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  {isSaving ? "Guardando..." : "Guardar ZIP &rarr;"}
                </span>
              </button>

              {/* Opción 2: Solo JSON */}
              <button
                onClick={handleSaveJsonWithDialog}
                disabled={isSaving}
                className="p-4 bg-dark-800 hover:bg-dark-750 border border-dark-750 hover:border-brand-500 rounded-xl text-left transition-all group flex flex-col justify-between shadow-sm active:scale-[0.98]"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Solo Archivo .json
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Guarda únicamente las preguntas y fórmulas en un archivo de texto ligero.
                  </p>
                </div>
                <span className="mt-4 text-xs font-semibold text-brand-400 flex items-center gap-1">
                  {isSaving ? "Guardando..." : "Guardar JSON &rarr;"}
                </span>
              </button>

              {/* Opción 3: Copiar texto JSON */}
              <button
                onClick={handleCopy}
                className="p-4 bg-dark-800 hover:bg-dark-750 border border-dark-750 hover:border-blue-500/50 rounded-xl text-left transition-all group flex flex-col justify-between shadow-sm active:scale-[0.98]"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {copied ? "¡Copiado!" : "Copiar JSON"}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Copia todo el texto al portapapeles para pegarlo en otro lugar.
                  </p>
                </div>
                <span className="mt-4 text-xs font-semibold text-blue-400 flex items-center gap-1">
                  {copied ? "Listo ✓" : "Copiar texto &rarr;"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3.5 bg-dark-850 border-t border-dark-700 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
