import React, { useState, useRef, useEffect } from "react";
import { Quiz, QUESTION_TYPE_LABELS } from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import { getImageSync } from "../utils/imageStore";
import { getShuffledMatchingRight } from "../utils/matchingHelper";
import { VideoEmbedList } from "./VideoEmbedList";
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

  const totalPoints = quiz.items.reduce(
    (sum, item) => sum + (item.question.type === "stimulus" ? 0 : item.points || 0),
    0
  );
  const optionLabels = ["A", "B", "C", "D", "E", "F"];

  // Calcular numeración real (los bloques de estímulo no consumen número de pregunta)
  let runningNum = 0;
  const numberedItems = quiz.items.map((item, idx) => {
    const isStimulus = item.question.type === "stimulus";
    if (!isStimulus) runningNum += 1;
    return { item, index: idx, questionNumber: isStimulus ? null : runningNum };
  });

  // Preguntas objetivas de selección para la hoja de respuestas
  const mcQuestions = numberedItems.filter(
    ({ item }) =>
      item.question.type === "multiple_choice" ||
      item.question.type === "multiple_response" ||
      item.question.type === "true_false"
  );

  const isSolutions = previewMode === "solutions";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900">
      {/* ── Barra superior de herramientas ── */}
      <div className="p-3 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-850 border-b border-slate-750">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHeaderSettings(!showHeaderSettings)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              showHeaderSettings
                ? "bg-sky-500/20 border-sky-500 text-sky-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Encabezado</span>
          </button>

          <button
            onClick={onShuffleQuestions}
            disabled={quiz.items.length < 2}
            title="Mezclar orden de las preguntas aleatoriamente"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-40 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Mezclar Preguntas</span>
          </button>

          <button
            onClick={onShuffleOptions}
            disabled={mcQuestions.length === 0}
            title="Mezclar orden de opciones A, B, C, D manteniendo la correcta"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mezclar Incisos</span>
          </button>
        </div>

        {/* Interruptor de Modo Alumno vs Modo Solucionario */}
        <div className="flex items-center rounded-md p-0.5 bg-slate-900 border border-slate-750">
          <button
            onClick={() => setPreviewMode("exam")}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              previewMode === "exam"
                ? "bg-sky-600 text-white"
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
        <div className="p-4 space-y-3 shrink-0 bg-slate-850 border-b border-slate-750">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Configuración del Encabezado del Examen
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block mb-1 text-slate-300 font-medium">Institución:</label>
              <input
                type="text"
                value={quiz.header.institution}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, institution: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500 transition-colors"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-300 font-medium">Curso / Asignatura:</label>
              <input
                type="text"
                value={quiz.header.course}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, course: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500 transition-colors"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-300 font-medium">Título de la Evaluación:</label>
              <input
                type="text"
                value={quiz.header.title}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, title: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500 transition-colors"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-300 font-medium">Profesor(a) / Docente:</label>
              <input
                type="text"
                value={quiz.header.teacher || ""}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, teacher: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block mb-1 text-slate-300 font-medium">Instrucciones Generales:</label>
              <textarea
                rows={2}
                value={quiz.header.instructions}
                onChange={(e) =>
                  onUpdateHeader({ ...quiz.header, instructions: e.target.value })
                }
                className="w-full rounded px-2.5 py-1.5 focus:outline-none bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500 transition-colors"
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
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500/20"
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
      <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text bg-slate-900">
        {/* Encabezado formal del examen */}
        <div className="rounded-xl p-5 space-y-4 bg-slate-850 border border-slate-750">
          <div className="text-center space-y-1 pb-3 border-b border-slate-750">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-amber-500">
              {quiz.header.institution}
            </h2>
            <h1 className="text-base font-bold text-slate-100">{quiz.header.title}</h1>
            <div className="flex items-center justify-center space-x-4 text-xs pt-0.5 text-slate-400">
              <span>
                <strong>Asignatura:</strong> {quiz.header.course}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                <strong>Fecha:</strong> {quiz.header.date}
              </span>
              {quiz.header.teacher && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>
                    <strong>Docente:</strong> {quiz.header.teacher}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Campos para que el estudiante complete */}
          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="pb-1 border-b border-dashed border-slate-700">
              <span className="font-medium text-slate-400">Estudiante: </span>
            </div>
            <div className="pb-1 border-b border-dashed border-slate-700">
              <span className="font-medium text-slate-400">Grupo / Grado: </span>
            </div>
            <div className="pb-1 border-b border-dashed border-slate-700">
              <span className="font-medium text-slate-400">Calificación: </span>
              <span className="float-right font-mono text-slate-500">/ {totalPoints} pts</span>
            </div>
          </div>

          {/* Instrucciones */}
          {quiz.header.instructions && (
            <div className="text-[11px] leading-relaxed p-2.5 rounded bg-slate-900 border border-slate-750 text-slate-400">
              <strong className="text-slate-200">Instrucciones: </strong>
              {quiz.header.instructions}
            </div>
          )}

          {/* Hoja de Respuestas */}
          {quiz.header.showAnswerSheet && mcQuestions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-750">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Hoja de Respuestas (Rellene la opción correcta)
                </span>
                <span className="text-[10px] text-slate-400">
                  {mcQuestions.length} {mcQuestions.length === 1 ? "pregunta" : "preguntas"} de selección
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3 rounded-lg bg-slate-900 border border-slate-750">
                {mcQuestions.map(({ item, questionNumber }) => {
                  const num = questionNumber || 1;
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
          numberedItems.map(({ item, index, questionNumber }) => {
            const q = item.question;
            const isStimulus = q.type === "stimulus";
            const isOpenType = q.type === "open";
            const isChoiceType =
              q.type === "multiple_choice" ||
              q.type === "multiple_response" ||
              q.type === "true_false";
            const renderedPrompt = renderMarkdownWithMath(q.prompt, {
              showBlankAnswers: isSolutions,
            });

            const layoutClass =
              q.optionLayout === "horizontal"
                ? "grid grid-cols-2 sm:grid-cols-4 gap-2"
                : q.optionLayout === "vertical"
                ? "flex flex-col gap-2"
                : "grid grid-cols-1 sm:grid-cols-2 gap-2";

            return (
              <div
                key={item.instanceId}
                className={`group relative rounded-xl p-5 transition-all shadow-sm border ${
                  isStimulus
                    ? "bg-amber-500/5 border-amber-500/40"
                    : "bg-slate-850 border-slate-750 hover:border-slate-600"
                }`}
              >
                {/* Controles de orden y puntaje */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-750">
                  <div className="flex items-center space-x-2">
                    {isStimulus ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] border border-amber-500/40 uppercase tracking-wide">
                        {q.stimulusTitle || "Estímulo Compartido"}
                        {q.stimulusRangeNote ? ` (${q.stimulusRangeNote})` : ""}
                      </span>
                    ) : (
                      <>
                        <span className="w-6 h-6 rounded-full bg-sky-600/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                          {questionNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          Pregunta #{questionNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {QUESTION_TYPE_LABELS[q.type] || q.type}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Reordenar */}
                    <div className="flex items-center space-x-0.5 bg-slate-800 rounded border border-slate-700">
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

                    {/* Editor de puntaje (oculto si es estímulo) */}
                    {!isStimulus && (
                      <div className="flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.points || 1}
                          onChange={(e) =>
                            onUpdatePoints(item.instanceId, parseFloat(e.target.value) || 0)
                          }
                          className="w-10 bg-transparent text-xs text-right text-sky-400 font-semibold focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">pts</span>
                      </div>
                    )}

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

                {/* Enunciado con KaTeX / Tablas / Huecos */}
                <div
                  className="prose prose-sm max-w-none text-xs text-slate-200 leading-relaxed font-normal mb-4"
                  dangerouslySetInnerHTML={{ __html: renderedPrompt }}
                />

                {/* Videos adjuntos */}
                <VideoEmbedList videos={q.videos} />

                {/* Tipo Abierta */}
                {isOpenType && (
                  <div
                    style={{
                      height: `${(q.openResponseHeight || 3.5) * 26}px`,
                      minHeight: "70px",
                    }}
                    className="w-full bg-slate-900/60 border border-slate-700 border-l-[3.5px] border-l-amber-500 rounded-lg p-2.5 text-[11px] text-slate-400 italic select-none"
                  >
                    [Espacio asignado para procedimiento y respuesta escrita del estudiante]
                  </div>
                )}

                {/* Tipos de Selección (Múltiple, Múltiple Respuesta, Verdadero/Falso) */}
                {isChoiceType && (
                  <div className="space-y-2.5">
                    <div className={layoutClass}>
                      {q.options.map((opt, optIdx) => {
                        const renderedOpt = renderMarkdownWithMath(opt.text);
                        const highlightCorrect = isSolutions && opt.isCorrect;
                        const optImg = opt.image
                          ? opt.image.startsWith("imagenes/") || opt.image.startsWith("images/")
                            ? getImageSync(opt.image) || opt.image
                            : opt.image
                          : null;

                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`flex flex-col gap-1.5 text-xs p-2.5 rounded-lg border transition-colors ${
                              highlightCorrect
                                ? "bg-emerald-950/30 border-emerald-700 text-emerald-200 font-medium"
                                : "bg-slate-900/60 border-slate-750 text-slate-300"
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <span
                                className={`font-bold shrink-0 text-xs font-mono ${
                                  highlightCorrect ? "text-emerald-400" : "text-sky-400"
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
                            {optImg && (
                              <img
                                src={optImg}
                                alt={`Opción ${optionLabels[optIdx]}`}
                                style={{ maxWidth: `${opt.imageWidth || 80}%` }}
                                className="rounded-lg mx-auto border border-slate-700"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {q.type === "true_false" && q.requireJustification && (
                      <div className="p-2.5 rounded-lg border border-slate-700 border-l-[3.5px] border-l-amber-500 bg-slate-900/60 text-[11px] text-slate-400 italic">
                        Justificación: __________________________________________________________________
                      </div>
                    )}
                  </div>
                )}

                {/* Tipo Emparejamiento */}
                {q.type === "matching" && q.matchingPairs && (() => {
                  const rightCol = getShuffledMatchingRight(q);
                  return (
                    <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-750">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch text-xs">
                        <div className="flex flex-col h-full">
                          <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2 text-center">
                            Columna A (Premisas)
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly gap-2">
                            {q.matchingPairs.map((pair, pIdx) => {
                              const matchedIdx = rightCol.findIndex((r) => r.pairId === pair.id);
                              const correctLetter =
                                matchedIdx >= 0 ? String.fromCharCode(65 + matchedIdx) : "?";
                              return (
                                <div
                                  key={pair.id || pIdx}
                                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between gap-2 shadow-sm"
                                >
                                  <span className="flex-1">
                                    <strong className="text-sky-400 font-mono mr-1.5">{pIdx + 1}.</strong>
                                    {pair.left}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                      {isSolutions ? `[ ${correctLetter} ]` : "[   ]"}
                                    </span>
                                    <span className="w-2 h-2 rounded-full bg-sky-400/70 hidden sm:inline-block" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col h-full">
                          <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2 text-center">
                            Columna B (Respuestas)
                          </div>
                          <div className="flex-1 flex flex-col justify-evenly gap-2">
                            {rightCol.map((itemB, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2 shadow-sm"
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-400/70 shrink-0 hidden sm:inline-block" />
                                <span className="flex-1">
                                  <strong className="text-amber-400 font-mono mr-1.5">
                                    {String.fromCharCode(65 + rIdx)}.
                                  </strong>
                                  {itemB.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Tipo Ordenamiento */}
                {q.type === "ordering" && q.orderingItems && (
                  <div className="space-y-1.5 text-xs">
                    {q.orderingItems.map((ord, oIdx) => (
                      <div
                        key={ord.id || oIdx}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-750 flex items-center gap-2.5"
                      >
                        <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-center leading-6 font-mono font-bold text-sky-400">
                          {isSolutions ? oIdx + 1 : " "}
                        </span>
                        <span className="text-slate-200">{ord.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tipo Respuesta Numérica */}
                {q.type === "numeric" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-750 text-xs">
                    <span className="text-slate-400 font-medium">Respuesta:</span>
                    <span className="min-w-[110px] border-b-2 border-sky-500/70 pb-0.5 text-center font-mono font-bold text-emerald-400">
                      {isSolutions ? q.numericAnswer || "—" : "\u00A0"}
                    </span>
                    {q.numericUnit && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                        {q.numericUnit}
                      </span>
                    )}
                    {isSolutions && q.numericTolerance && (
                      <span className="text-[11px] text-slate-400">({q.numericTolerance})</span>
                    )}
                  </div>
                )}

                {/* Explicación / Solucionario */}
                {isSolutions && q.explanation && (
                  <div className="mt-3 p-2.5 bg-sky-950/30 border border-sky-800/40 rounded-lg text-xs text-sky-200">
                    <span className="font-semibold text-sky-300">
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
      <div className="p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-850 border-t border-slate-750">
        <div className="text-xs flex items-center space-x-3 text-slate-400">
          <span>
            Preguntas: <strong className="text-slate-100">{quiz.items.length}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Total Puntos: <strong className="text-sky-400">{totalPoints}</strong>
          </span>
        </div>

        {/* Botón Desplegable Unificado de Exportación */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            disabled={quiz.items.length === 0}
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all active:scale-95 disabled:opacity-40 bg-sky-600 hover:bg-sky-500 shadow-sm hover:shadow-sky-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Examen</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {/* Menú Desplegable */}
          {isExportMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-64 rounded-xl shadow-2xl p-1.5 space-y-1 z-30 bg-slate-850 border border-slate-700">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-750">
                Opciones de Exportación
              </div>

              {/* 1. Imprimir / PDF */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onExportPdf(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left text-slate-200 hover:bg-slate-750 hover:text-white"
              >
                <Printer className="w-4 h-4 shrink-0 text-rose-400" />
                <div>
                  <div className="font-medium">Imprimir / PDF</div>
                  <div className="text-[10px] text-slate-400">Impresión directa o guardar PDF</div>
                </div>
              </button>

              {/* 2. LaTeX */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onOpenLatexModal(previewMode); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left text-slate-200 hover:bg-slate-750 hover:text-white"
              >
                <FileCode className="w-4 h-4 shrink-0 text-emerald-400" />
                <div>
                  <div className="font-medium">Código LaTeX (.tex)</div>
                  <div className="text-[10px] text-slate-400">Ver código o descargar .tex</div>
                </div>
              </button>

              {/* 3. Word */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onExportWord(previewMode); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left text-slate-200 hover:bg-slate-750 hover:text-white"
              >
                <FileText className="w-4 h-4 shrink-0 text-sky-400" />
                <div>
                  <div className="font-medium">Documento Word (.docx)</div>
                  <div className="text-[10px] text-slate-400">Editable con tipografía institucional</div>
                </div>
              </button>

              <div className="my-1 border-t border-slate-750" />

              {/* 4. Cuestionario Web HTML5 */}
              <button
                type="button"
                onClick={() => { setIsExportMenuOpen(false); onOpenExportHtml(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left text-indigo-300 hover:bg-indigo-950/30 hover:text-white"
              >
                <Globe className="w-4 h-4 shrink-0 text-indigo-400" />
                <div>
                  <div className="font-semibold">Cuestionario Web (HTML5)</div>
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
