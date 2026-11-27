import React, { useState } from "react";
import { Quiz } from "../types/quiz";
import { generateLatexCode } from "../utils/exporters";
import { saveFileWithDialog } from "../utils/fileDialog";
import { createLatexProjectZip } from "../utils/zipHandler";
import { X, Copy, Check, Download, FileCode, Archive, ExternalLink } from "lucide-react";

interface LatexModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  initialMode?: "exam" | "solutions";
}

export const LatexModal: React.FC<LatexModalProps> = ({
  isOpen,
  onClose,
  quiz,
  initialMode = "exam",
}) => {
  const [mode, setMode] = useState<"exam" | "solutions">(initialMode);
  const [copied, setCopied] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const latexCode = generateLatexCode(quiz, mode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  const handleDownloadTex = async () => {
    const filename = `${quiz.header.title.replace(/[^a-zA-Z0-9_\-]/g, "_") || "evaluacion"}_${
      mode === "solutions" ? "Solucionario" : "Examen"
    }.tex`;
    await saveFileWithDialog(filename, latexCode, "Archivo LaTeX (*.tex)", "tex");
  };

  const handleDownloadZipProject = async () => {
    setIsDownloadingZip(true);
    try {
      const zipBlob = await createLatexProjectZip(quiz, latexCode, mode);
      const filename = `${quiz.header.title.replace(/[^a-zA-Z0-9_\-]/g, "_") || "evaluacion"}_Overleaf_Proyecto.zip`;
      const res = await saveFileWithDialog(
        filename,
        zipBlob,
        "Proyecto LaTeX ZIP (*.zip)",
        "zip"
      );
      if (res.success) {
        setNotice(`Proyecto ZIP guardado: ${res.path || filename}`);
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err) {
      console.error("Error generando ZIP de LaTeX:", err);
      setNotice("No se pudo generar el archivo ZIP del proyecto LaTeX.");
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Código y Proyecto LaTeX</h2>
              <p className="text-xs text-slate-400">
                Descarga el archivo .tex o el paquete .zip completo para compilar en Overleaf
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Selector Examen vs Solucionario */}
            <div className="flex bg-dark-900 border border-dark-700 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("exam")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  mode === "exam" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Examen
              </button>
              <button
                type="button"
                onClick={() => setMode("solutions")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  mode === "solutions" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Solucionario
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {notice && (
          <div className="mx-6 mt-3 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
            {notice}
          </div>
        )}

        {/* Banner de Overleaf con botón de ZIP */}
        <div className="px-6 py-3 bg-dark-900/70 border-b border-dark-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-300">
            <span className="font-semibold text-emerald-400 block sm:inline">
              📦 Proyecto para Overleaf:
            </span>{" "}
            Descarga el archivo <strong>.zip</strong> conteniendo el documento <code>.tex</code> y la carpeta <code>imagenes/</code> adjunta.
          </div>
          <button
            type="button"
            onClick={handleDownloadZipProject}
            disabled={isDownloadingZip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm shrink-0 disabled:opacity-40"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isDownloadingZip ? "Generando ZIP..." : "Descargar Proyecto .zip (Overleaf)"}</span>
          </button>
        </div>

        {/* Visor de código */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <textarea
            readOnly
            value={latexCode}
            className="w-full flex-1 bg-dark-950 border border-dark-700 rounded-xl p-4 font-mono text-xs text-slate-300 focus:outline-none resize-none leading-relaxed select-all"
          />
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3.5 bg-dark-850 border-t border-dark-700 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {latexCode.split("\n").length} líneas de código LaTeX generadas
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "¡Copiado!" : "Copiar Código"}</span>
            </button>

            <button
              onClick={handleDownloadTex}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .tex</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
