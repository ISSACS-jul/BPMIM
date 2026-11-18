import React, { useState } from "react";
import { Quiz } from "../types/quiz";
import { generateHtmlQuiz } from "../utils/htmlQuizExporter";
import { saveFileWithDialog } from "../utils/fileDialog";
import { X, Globe, Clock, Shuffle, Download, Sparkles, Check } from "lucide-react";

interface ExportHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

export const ExportHtmlModal: React.FC<ExportHtmlModalProps> = ({
  isOpen,
  onClose,
  quiz,
}) => {
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportedPath(null);

    const htmlContent = generateHtmlQuiz(quiz, {
      timerMinutes: timerEnabled ? timerMinutes : 0,
      shuffleQuestions,
    });

    const defaultFilename = `${quiz.header.title.replace(/[^a-zA-Z0-9_\-]/g, "_") || "evaluacion"}_Cuestionario.html`;
    const result = await saveFileWithDialog(
      defaultFilename,
      htmlContent,
      "Aplicación Web HTML5 (*.html)",
      "html"
    );

    setIsExporting(false);

    if (result.success) {
      setExportedPath(result.path || "Guardado exitosamente");
      setTimeout(() => {
        setExportedPath(null);
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Exportar Cuestionario Web (HTML5)</h2>
              <p className="text-xs text-slate-400">
                Genera una app web lista para entregar a estudiantes
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

        {/* Configuración del Cuestionario */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 bg-dark-900 border border-dark-750 rounded-xl space-y-1">
            <h4 className="text-xs font-semibold text-slate-200">
              {quiz.header.title || "Evaluación"}
            </h4>
            <p className="text-[11px] text-slate-400">
              {quiz.items.length} {quiz.items.length === 1 ? "pregunta" : "preguntas"} &bull; Total:{" "}
              {quiz.items.reduce((s, it) => s + (it.points || 1), 0)} puntos
            </p>
          </div>

          {/* Opción 1: Temporizador */}
          <div className="space-y-3 p-4 bg-dark-800/60 border border-dark-700 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Temporizador de Evaluación
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Limita el tiempo para resolver la prueba
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={(e) => setTimerEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {timerEnabled && (
              <div className="pt-2 flex items-center gap-3 border-t border-dark-700/60">
                <span className="text-xs text-slate-300">Duración:</span>
                <div className="flex items-center gap-2">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTimerMinutes(mins)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        timerMinutes === mins
                          ? "bg-indigo-600 border-indigo-500 text-white font-medium"
                          : "bg-dark-900 border-dark-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-1">
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 bg-dark-900 border border-dark-700 rounded-lg text-xs text-center text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Opción 2: Orden Aleatorio */}
          <div className="p-4 bg-dark-800/60 border border-dark-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-brand-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Orden Aleatorio (Shuffle)
                </span>
                <span className="text-[11px] text-slate-400">
                  Desordenar las preguntas automáticamente al abrir el cuestionario
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {exportedPath && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportedPath}</span>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-4 bg-dark-850 border-t border-dark-700 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isExporting || quiz.items.length === 0}
            onClick={handleExport}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all hover:shadow-indigo-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exportando..." : "Generar y Guardar HTML"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
