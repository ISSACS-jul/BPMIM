import React, { useState, useRef, useEffect } from "react";
import { Quiz } from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import {
  FileText,
  FileCode,
  Printer,
  Globe,
  Shuffle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Settings2,
  Eye,
  EyeOff,
  Sparkles,
  Download,
} from "lucide-react";

interface QuizPanelProps {
  quiz: Quiz;
  onUpdateHeader: (newHeader: Quiz["header"]) => void;
  onRemoveItem: (instanceId: string) => void;
  onMoveItem: (index: number, direction: "up" | "down") => void;
  onUpdatePoints: (instanceId: string, points: number) => void;
  onShuffleQuestions: () => void;
  onShuffleOptions: () => void;
  onExportPdf: () => void;
  onOpenLatexModal: (mode: "exam" | "solutions") => void;
  onExportWord: (mode: "exam" | "solutions") => void;
  onOpenExportHtml: () => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  quiz,
  onUpdateHeader,
  onRemoveItem,
  onMoveItem,
  onUpdatePoints,
  onShuffleQuestions,
  onShuffleOptions,
  onExportPdf,
  onOpenLatexModal,
  onExportWord,
  onOpenExportHtml,
}) => {
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState<"exam" | "solutions">("exam");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalPoints = quiz.items.reduce((sum, item) => sum + (item.points || 0), 0);
  const optionLabels = ["A", "B", "C", "D", "E", "F"];

  // Preguntas de opción múltiple para la hoja de respuestas
  const mcQuestions = quiz.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.question.type !== "open");

  const isSolutions = previewMode === "solutions";

  return (
    <div className="h-full flex flex-col bg-dark-900 overflow-hidden">
      {/* Barra superior de herramientas del Quiz */}
      <div className="p-3 bg-dark-850/80 border-b border-dark-750 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHeaderSettings(!showHeaderSettings)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              showHeaderSettings
                ? "bg-brand-600/20 border-brand-500 text-brand-400"
                : "bg-dark-800 border-dark-700 text-slate-300 hover:text-white"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Encabezado</span>
          </button>

          <button
            onClick={onShuffleQuestions}
            disabled={quiz.items.length < 2}
            title="Mezclar orden de las preguntas aleatoriamente"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-md disabled:opacity-40 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Mezclar Preguntas</span>
          </button>

          <button
            onClick={onShuffleOptions}
            disabled={mcQuestions.length === 0}
            title="Mezclar orden de opciones A, B, C, D manteniendo la correcta"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-md disabled:opacity-40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mezclar Incisos</span>
          </button>
        </div>

        {/* Interruptor de Modo Alumno vs Modo Solucionario */}
        <div className="flex items-center bg-dark-800 border border-dark-700 rounded-md p-0.5">
          <button
            onClick={() => setPreviewMode("exam")}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              previewMode === "exam"
                ? "bg-brand-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Estudiante</span>
          </button>
          <button
            onClick={() => setPreviewMode("solutions")}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              previewMode === "solutions"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <EyeOff className="w-3 h-3" />
            <span>Solucionario</span>
          </button>
        </div>
      </div>

      {/* Editor desplegable del Encabezado */}
      {showHeaderSettings && (
        <div className="p-4 bg-dark-850 border-b border-dark-700 space-y-3 shrink-0">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Configuración del Encabezado del Examen
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Institución:</label>
              <input
                type="text"
                value={quiz.header.institution}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, institution: e.target.value })
                }
                className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Curso / Asignatura:</label>
              <input
                type="text"
                value={quiz.header.course}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, course: e.target.value })
                }
                className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Título de la Evaluación:</label>
              <input
                type="text"
                value={quiz.header.title}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, title: e.target.value })
                }
                className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Profesor(a) / Docente:</label>
              <input
                type="text"
                value={quiz.header.teacher || ""}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, teacher: e.target.value })
                }
                className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-slate-400 block mb-1">Instrucciones Generales:</label>
              <textarea
                rows={2}
                value={quiz.header.instructions}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, instructions: e.target.value })
                }
                className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="col-span-2 flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quiz.header.showAnswerSheet}
                  onChange={(e) =>
                    onUpdateHeader({
                      ...quiz.header,
                      showAnswerSheet: e.target.checked,
                    })
                  }
                  className="rounded bg-dark-900 border-dark-700 text-brand-500 focus:ring-brand-500/20"
                />
                <span className="text-slate-300 font-medium">
                  Incluir Hoja de Respuestas compacta (Burbujas A, B, C, D)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Vista Previa del Examen (Renderizado Real) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
        {/* Encabezado formal del examen estilo examen impreso */}
        <div className="border-2 border-[#1F3A5F]/60 dark:border-dark-700 rounded-xl p-5 bg-white/5 space-y-4">
          <div className="text-center space-y-1 pb-3 border-b border-dark-700">
            <h2 className="text-xs uppercase tracking-widest text-[#B08D57] font-semibold">
              {quiz.header.institution}
            </h2>
            <h1 className="text-base font-bold text-slate-100">{quiz.header.title}</h1>
            <div className="flex items-center justify-center space-x-4 text-xs text-slate-400 pt-0.5">
              <span>
                <strong>Asignatura:</strong> {quiz.header.course}
              </span>
              <span>&bull;</span>
              <span>
                <strong>Fecha:</strong> {quiz.header.date}
              </span>
              {quiz.header.teacher && (
                <>
                  <span>&bull;</span>
                  <span>
                    <strong>Docente:</strong> {quiz.header.teacher}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Campos para que el estudiante complete */}
          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="border-b border-dashed border-dark-600 pb-1">
              <span className="text-slate-400 font-medium">Estudiante: </span>
            </div>
            <div className="border-b border-dashed border-dark-600 pb-1">
              <span className="text-slate-400 font-medium">Grupo / Grado: </span>
            </div>
            <div className="border-b border-dashed border-dark-600 pb-1">
              <span className="text-slate-400 font-medium">Calificación: </span>
              <span className="text-slate-500 float-right font-mono">/ {totalPoints} pts</span>
            </div>
          </div>

          {/* Instrucciones */}
          {quiz.header.instructions && (
            <div className="text-[11px] text-slate-400 leading-relaxed bg-dark-900/60 p-2.5 rounded border border-dark-750">
              <strong className="text-slate-300">Instrucciones: </strong>
              {quiz.header.instructions}
            </div>
          )}

          {/* Hoja de Respuestas (Si está habilitada y hay preguntas de opción múltiple) */}
          {quiz.header.showAnswerSheet && mcQuestions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dark-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Hoja de Respuestas (Rellene la opción correcta)
                </span>
                <span className="text-[10px] text-slate-400">
                  {mcQuestions.length} {mcQuestions.length === 1 ? "pregunta" : "preguntas"} de selección
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-dark-900/90 p-3 rounded-lg border border-dark-750">
                {mcQuestions.map(({ item, index }) => {
                  const num = index + 1;
                  const correctIdx = item.question.options.findIndex((o) => o.isCorrect);

                  return (
                    <div
                      key={item.instanceId}
                      className="flex items-center space-x-1.5 text-[11px] py-0.5 justify-center"
                    >
                      <span className="font-bold text-slate-300 w-4 text-right">
                        {num}.
                      </span>
                      <div className="flex space-x-1">
                        {item.question.options.map((_, optIdx) => {
                          const isCorrect = isSolutions && optIdx === correctIdx;
                          return (
                            <span
                              key={optIdx}
                              className={`w-4 h-4 rounded-full border text-[9px] flex items-center justify-center font-bold select-none ${
                                isCorrect
                                  ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                                  : "border-dark-600 text-slate-400 bg-dark-800"
                              }`}
                            >
                              {optionLabels[optIdx]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Lista de Preguntas agregadas al Examen */}
        {quiz.items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-500 border-2 border-dashed border-dark-750 rounded-xl">
            <p className="text-sm font-medium text-slate-400">El examen está vacío</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Selecciona preguntas del panel izquierdo haciendo clic en "+ Añadir" para armar tu evaluación.
            </p>
          </div>
        ) : (
          quiz.items.map((item, index) => {
            const q = item.question;
            const renderedPrompt = renderMarkdownWithMath(q.prompt);
            const isOpenType = q.type === "open";

            return (
              <div
                key={item.instanceId}
                className="group relative bg-dark-850 border border-dark-750 hover:border-dark-600 rounded-xl p-5 transition-all shadow-sm"
              >
                {/* Controles de orden y puntaje flotantes */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-dark-750">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/30">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Pregunta #{index + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded bg-dark-800">
                      {isOpenType ? "Respuesta Abierta" : "Opción Múltiple"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Reordenar */}
                    <div className="flex items-center space-x-0.5 bg-dark-800 rounded border border-dark-700">
                      <button
                        onClick={() => onMoveItem(index, "up")}
                        disabled={index === 0}
                        title="Subir posición"
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onMoveItem(index, "down")}
                        disabled={index === quiz.items.length - 1}
                        title="Bajar posición"
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Editor de puntaje */}
                    <div className="flex items-center space-x-1 bg-dark-800 px-2 py-0.5 rounded border border-dark-700">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.points || 1}
                        onChange={(e) =>
                          onUpdatePoints(item.instanceId, parseFloat(e.target.value) || 0)
                        }
                        className="w-10 bg-transparent text-xs text-right text-brand-400 font-semibold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">pts</span>
                    </div>

                    {/* Eliminar del examen */}
                    <button
                      onClick={() => onRemoveItem(item.instanceId)}
                      title="Quitar del examen"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Enunciado con KaTeX */}
                <div
                  className="text-xs text-slate-200 leading-relaxed font-normal mb-4"
                  dangerouslySetInnerHTML={{ __html: renderedPrompt }}
                />

                {/* Si es tipo abierta: renderiza el cuadro de respuesta del estudiante */}
                {isOpenType ? (
                  <div
                    style={{
                      height: `${(q.openResponseHeight || 3.5) * 26}px`,
                      minHeight: "70px",
                    }}
                    className="w-full bg-white/5 border border-dark-600 border-l-[3.5px] border-l-[#B08D57] rounded-lg p-2.5 text-[11px] text-slate-500 italic select-none"
                  >
                    [Espacio asignado para procedimiento y respuesta escrita del estudiante]
                  </div>
                ) : (
                  /* Opciones múltiples */
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const renderedOpt = renderMarkdownWithMath(opt.text);
                      const highlightCorrect = isSolutions && opt.isCorrect;

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-start space-x-2 text-xs p-2 rounded-lg border transition-colors ${
                            highlightCorrect
                              ? "bg-emerald-950/30 border-emerald-700 text-emerald-200 font-medium"
                              : "bg-dark-900/60 border-dark-750 text-slate-300"
                          }`}
                        >
                          <span
                            className={`font-bold shrink-0 text-xs ${
                              highlightCorrect ? "text-emerald-400" : "text-[#1F3A5F] dark:text-brand-400"
                            }`}
                          >
                            {optionLabels[optIdx]}.
                          </span>
                          <div
                            className="flex-1 break-words [&>p]:inline"
                            dangerouslySetInnerHTML={{ __html: renderedOpt }}
                          />
                          {highlightCorrect && (
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shrink-0">
                              Correcta
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explicación / Solucionario */}
                {isSolutions && q.explanation && (
                  <div className="mt-3 p-2.5 bg-brand-950/30 border border-brand-800/40 rounded-lg text-xs text-brand-200">
                    <span className="font-semibold text-brand-300">
                      {isOpenType ? "Criterio de Evaluación / Solución: " : "Solución / Justificación: "}
                    </span>
                    <div
                      className="inline [&>p]:inline"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownWithMath(q.explanation),
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Cierre del examen estilo plantilla */}
        {quiz.items.length > 0 && (
          <div className="py-6 text-center space-y-1 text-xs">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-[1px] w-16 bg-[#B08D57]" />
              <span className="font-bold text-[#1F3A5F] dark:text-brand-400 italic">
                Fin del examen
              </span>
              <div className="h-[1px] w-16 bg-[#B08D57]" />
            </div>
            <p className="text-[11px] text-slate-400">Revise sus respuestas antes de entregar.</p>
          </div>
        )}
      </div>

      {/* Barra inferior: Resumen y Menú Desplegable de Exportación */}
      <div className="p-3 bg-dark-850 border-t border-dark-750 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="text-xs text-slate-300 flex items-center space-x-3">
          <span>
            Preguntas: <strong>{quiz.items.length}</strong>
          </span>
          <span>&bull;</span>
          <span>
            Total Puntos: <strong className="text-brand-400">{totalPoints}</strong>
          </span>
        </div>

        {/* Botón Desplegable Unificado de Exportación */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            disabled={quiz.items.length === 0}
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition-all shadow-sm hover:shadow-brand-500/20 active:scale-95 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Examen</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {/* Menú Desplegable */}
          {isExportMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-64 bg-dark-850 border border-dark-700 rounded-xl shadow-2xl p-1.5 space-y-1 z-30 animate-in fade-in duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-dark-750">
                Opciones de Exportación
              </div>

              {/* 1. Imprimir / PDF */}
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportPdf();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-dark-750 rounded-lg transition-colors text-left"
              >
                <Printer className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-medium">Imprimir / PDF</div>
                  <div className="text-[10px] text-slate-400">Impresión directa o guardar PDF</div>
                </div>
              </button>

              {/* 2. LaTeX */}
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onOpenLatexModal(previewMode);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-dark-750 rounded-lg transition-colors text-left"
              >
                <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-medium">Código LaTeX (.tex)</div>
                  <div className="text-[10px] text-slate-400">Ver código o descargar .tex</div>
                </div>
              </button>

              {/* 3. Word */}
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportWord(previewMode);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-dark-750 rounded-lg transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-medium">Documento Word (.docx)</div>
                  <div className="text-[10px] text-slate-400">Editable con tipografía institucional</div>
                </div>
              </button>

              <div className="my-1 border-t border-dark-750" />

              {/* 4. Cuestionario Web HTML5 */}
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onOpenExportHtml();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-300 hover:text-white hover:bg-indigo-950/40 rounded-lg transition-colors text-left"
              >
                <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-semibold text-indigo-300">Cuestionario Web (HTML5)</div>
                  <div className="text-[10px] text-slate-400">App interactiva lista para estudiantes</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
