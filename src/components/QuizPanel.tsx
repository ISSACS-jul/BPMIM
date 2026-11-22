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
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#0d1117" }}>
      {/* ── Barra superior de herramientas ── */}
      <div
        className="p-3 flex flex-wrap items-center justify-between gap-2 shrink-0"
        style={{ background: "#111827", borderBottom: "1px solid #1e2a3e" }}
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHeaderSettings(!showHeaderSettings)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={
              showHeaderSettings
                ? { background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", color: "#60a5fa" }
                : { background: "#161e2e", border: "1px solid #1e2a3e", color: "#94a3b8" }
            }
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Encabezado</span>
          </button>

          <button
            onClick={onShuffleQuestions}
            disabled={quiz.items.length < 2}
            title="Mezclar orden de las preguntas aleatoriamente"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md disabled:opacity-40 transition-colors"
            style={{ background: "#161e2e", border: "1px solid #1e2a3e", color: "#94a3b8" }}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Mezclar Preguntas</span>
          </button>

          <button
            onClick={onShuffleOptions}
            disabled={mcQuestions.length === 0}
            title="Mezclar orden de opciones A, B, C, D manteniendo la correcta"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md disabled:opacity-40 transition-colors"
            style={{ background: "#161e2e", border: "1px solid #1e2a3e", color: "#94a3b8" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mezclar Incisos</span>
          </button>
        </div>

        {/* Interruptor de Modo Alumno vs Modo Solucionario */}
        <div
          className="flex items-center rounded-md p-0.5"
          style={{ background: "#0d1117", border: "1px solid #1e2a3e" }}
        >
          <button
            onClick={() => setPreviewMode("exam")}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium transition-colors"
            style={
              previewMode === "exam"
                ? { background: "#2563eb", color: "#fff" }
                : { color: "#64748b" }
            }
          >
            <Eye className="w-3 h-3" />
            <span>Estudiante</span>
          </button>
          <button
            onClick={() => setPreviewMode("solutions")}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium transition-colors"
            style={
              previewMode === "solutions"
                ? { background: "#059669", color: "#fff" }
                : { color: "#64748b" }
            }
          >
            <EyeOff className="w-3 h-3" />
            <span>Solucionario</span>
          </button>
        </div>
      </div>

      {/* Editor desplegable del Encabezado */}
      {showHeaderSettings && (
        <div
          className="p-4 space-y-3 shrink-0"
          style={{ background: "#111827", borderBottom: "1px solid #1e2a3e" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
            Configuración del Encabezado del Examen
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block mb-1" style={{ color: "#94a3b8" }}>Institución:</label>
              <input
                type="text"
                value={quiz.header.institution}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, institution: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none"
                style={{ background: "#0d1117", border: "1px solid #1e2a3e", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="block mb-1" style={{ color: "#94a3b8" }}>Curso / Asignatura:</label>
              <input
                type="text"
                value={quiz.header.course}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, course: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none"
                style={{ background: "#0d1117", border: "1px solid #1e2a3e", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="block mb-1" style={{ color: "#94a3b8" }}>Título de la Evaluación:</label>
              <input
                type="text"
                value={quiz.header.title}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, title: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none"
                style={{ background: "#0d1117", border: "1px solid #1e2a3e", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="block mb-1" style={{ color: "#94a3b8" }}>Profesor(a) / Docente:</label>
              <input
                type="text"
                value={quiz.header.teacher || ""}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, teacher: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none"
                style={{ background: "#0d1117", border: "1px solid #1e2a3e", color: "#e2e8f0" }}
              />
            </div>
            <div className="col-span-2">
              <label className="block mb-1" style={{ color: "#94a3b8" }}>Instrucciones Generales:</label>
              <textarea
                rows={2}
                value={quiz.header.instructions}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, instructions: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none"
                style={{ background: "#0d1117", border: "1px solid #1e2a3e", color: "#e2e8f0" }}
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

      {/* ── Vista Previa del Examen ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text" style={{ background: "#0d1117" }}>
        {/* Encabezado formal del examen */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "#111827", border: "1px solid #1e2a3e" }}
        >
          <div className="text-center space-y-1 pb-3" style={{ borderBottom: "1px solid #1e2a3e" }}>
            <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#f59e0b" }}>
              {quiz.header.institution}
            </h2>
            <h1 className="text-base font-bold" style={{ color: "#f1f5f9" }}>{quiz.header.title}</h1>
            <div className="flex items-center justify-center space-x-4 text-xs pt-0.5" style={{ color: "#94a3b8" }}>
              <span>
                <strong>Asignatura:</strong> {quiz.header.course}
              </span>
              <span style={{ color: "#1e2a3e" }}>•</span>
              <span>
                <strong>Fecha:</strong> {quiz.header.date}
              </span>
              {quiz.header.teacher && (
                <>
                  <span style={{ color: "#1e2a3e" }}>•</span>
                  <span>
                    <strong>Docente:</strong> {quiz.header.teacher}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Campos para que el estudiante complete */}
          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="pb-1" style={{ borderBottom: "1px dashed #243048" }}>
              <span className="font-medium" style={{ color: "#94a3b8" }}>Estudiante: </span>
            </div>
            <div className="pb-1" style={{ borderBottom: "1px dashed #243048" }}>
              <span className="font-medium" style={{ color: "#94a3b8" }}>Grupo / Grado: </span>
            </div>
            <div className="pb-1" style={{ borderBottom: "1px dashed #243048" }}>
              <span className="font-medium" style={{ color: "#94a3b8" }}>Calificación: </span>
              <span className="float-right font-mono" style={{ color: "#64748b" }}>/ {totalPoints} pts</span>
            </div>
          </div>

          {/* Instrucciones */}
          {quiz.header.instructions && (
            <div
              className="text-[11px] leading-relaxed p-2.5 rounded"
              style={{ background: "#0d1117", border: "1px solid #1e2a3e", color: "#94a3b8" }}
            >
              <strong style={{ color: "#cbd5e1" }}>Instrucciones: </strong>
              {quiz.header.instructions}
            </div>
          )}

          {/* Hoja de Respuestas */}
          {quiz.header.showAnswerSheet && mcQuestions.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1e2a3e" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#cbd5e1" }}>
                  Hoja de Respuestas (Rellene la opción correcta)
                </span>
                <span className="text-[10px]" style={{ color: "#64748b" }}>
                  {mcQuestions.length} {mcQuestions.length === 1 ? "pregunta" : "preguntas"} de selección
                </span>
              </div>
              <div
                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3 rounded-lg"
                style={{ background: "#0d1117", border: "1px solid #1e2a3e" }}
              >
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

      {/* ── Barra inferior: Resumen + Export ── */}
      <div
        className="p-3 flex flex-wrap items-center justify-between gap-3 shrink-0"
        style={{ background: "#111827", borderTop: "1px solid #1e2a3e" }}
      >
        <div className="text-xs flex items-center space-x-3" style={{ color: "#94a3b8" }}>
          <span>
            Preguntas: <strong style={{ color: "#f1f5f9" }}>{quiz.items.length}</strong>
          </span>
          <span style={{ color: "#1e2a3e" }}>•</span>
          <span>
            Total Puntos: <strong style={{ color: "#60a5fa" }}>{totalPoints}</strong>
          </span>
        </div>

        {/* Botón Desplegable Unificado de Exportación */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            disabled={quiz.items.length === 0}
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Examen</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {/* Menú Desplegable */}
          {isExportMenuOpen && (
            <div
              className="absolute right-0 bottom-full mb-2 w-64 rounded-xl shadow-2xl p-1.5 space-y-1 z-30"
              style={{ background: "#111827", border: "1px solid #1e2a3e" }}
            >
              <div
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#64748b", borderBottom: "1px solid #1e2a3e" }}
              >
                Opciones de Exportación
              </div>

              {/* 1. Imprimir / PDF */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onExportPdf(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left"
                style={{ color: "#cbd5e1" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#161e2e")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <Printer className="w-4 h-4 shrink-0" style={{ color: "#f43f5e" }} />
                <div>
                  <div className="font-medium">Imprimir / PDF</div>
                  <div className="text-[10px]" style={{ color: "#64748b" }}>Impresión directa o guardar PDF</div>
                </div>
              </button>

              {/* 2. LaTeX */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onOpenLatexModal(previewMode); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left"
                style={{ color: "#cbd5e1" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#161e2e")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <FileCode className="w-4 h-4 shrink-0" style={{ color: "#10b981" }} />
                <div>
                  <div className="font-medium">Código LaTeX (.tex)</div>
                  <div className="text-[10px]" style={{ color: "#64748b" }}>Ver código o descargar .tex</div>
                </div>
              </button>

              {/* 3. Word */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onExportWord(previewMode); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left"
                style={{ color: "#cbd5e1" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#161e2e")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <FileText className="w-4 h-4 shrink-0" style={{ color: "#60a5fa" }} />
                <div>
                  <div className="font-medium">Documento Word (.docx)</div>
                  <div className="text-[10px]" style={{ color: "#64748b" }}>Editable con tipografía institucional</div>
                </div>
              </button>

              <div className="my-1" style={{ borderTop: "1px solid #1e2a3e" }} />

              {/* 4. Cuestionario Web HTML5 */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onOpenExportHtml(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left"
                style={{ color: "#a5b4fc" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <Globe className="w-4 h-4 shrink-0" style={{ color: "#8b5cf6" }} />
                <div>
                  <div className="font-semibold">Cuestionario Web (HTML5)</div>
                  <div className="text-[10px]" style={{ color: "#64748b" }}>App interactiva lista para estudiantes</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
