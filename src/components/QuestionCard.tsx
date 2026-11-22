import React from "react";
import { Question } from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import { Plus, Edit2, Trash2, Tag, CheckCircle2, Square, CheckSquare } from "lucide-react";

interface QuestionCardProps {
  question: Question;
  onAddToQuiz?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelectedInQuiz?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAddToQuiz,
  onEdit,
  onDelete,
  isSelectedInQuiz = false,
}) => {
  const renderedPrompt = React.useMemo(() => {
    return renderMarkdownWithMath(question.prompt);
  }, [question.prompt]);

  const isOpenType = question.type === "open";
  const optionLabels = ["A", "B", "C", "D", "E", "F"];

  // Difficulty style map (CLMIM-style badges)
  const diffStyle: Record<string, React.CSSProperties> = {
    Fácil:   { background: "rgba(16,185,129,0.12)",  color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" },
    Media:   { background: "rgba(245,158,11,0.12)",  color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" },
    Difícil: { background: "rgba(244,63,94,0.12)",   color: "#fda4af", border: "1px solid rgba(244,63,94,0.3)"  },
  };

  return (
    <div
      className="group relative cell-appear flex flex-col justify-between rounded-xl transition-all duration-200"
      style={{
        background: "#111827",
        border: "1px solid #1e2a3e",
        borderLeft: "3px solid #243048",
        padding: "0",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderLeftColor = "#3b82f6";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(59,130,246,0.1), 0 4px 16px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderLeftColor = "#243048";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* ── Cell Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
        style={{ background: "#0d1117", borderBottom: "1px solid #1e2a3e" }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tipo badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono"
            style={
              isOpenType
                ? { background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }
                : { background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }
            }
          >
            {isOpenType ? <Square className="w-2.5 h-2.5" /> : <CheckSquare className="w-2.5 h-2.5" />}
            {isOpenType ? "Abierta" : "Opción Múltiple"}
          </span>

          {/* Curso */}
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            {question.course}
          </span>

          {/* Tema */}
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-md"
            style={{ background: "#161e2e", color: "#cbd5e1", border: "1px solid #1e2a3e" }}
          >
            {question.topic}
          </span>

          {/* Subtema */}
          {question.subtopic && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{ color: "#94a3b8", background: "#0d1117", border: "1px solid #1e2a3e" }}
            >
              {question.subtopic}
            </span>
          )}

          {/* Dificultad */}
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={diffStyle[question.difficulty] || {}}
          >
            {question.difficulty}
          </span>
        </div>

        {/* Acciones (edit / delete) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar pregunta"
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar pregunta"
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Cell Body ── */}
      <div className="px-4 pt-3 pb-2">
        {/* Enunciado con LaTeX */}
        <div
          className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed mb-3 break-words [&>p]:mb-2 [&_img]:max-h-56 [&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-dark-700"
          style={{ color: "#e2e8f0" }}
          dangerouslySetInnerHTML={{ __html: renderedPrompt }}
        />

        {/* Opciones / Respuesta abierta */}
        {isOpenType ? (
          <div
            className="mb-3 p-3 rounded-md text-[11px] italic"
            style={{
              background: "#0d1117",
              borderLeft: "3px solid #f59e0b",
              border: "1px solid #1e2a3e",
              borderLeftWidth: "3px",
              color: "#94a3b8",
            }}
          >
            [Espacio para respuesta escrita del estudiante: {question.openResponseHeight || 3.5} cm]
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
            {question.options.map((opt, i) => {
              const renderedOpt = renderMarkdownWithMath(opt.text);
              return (
                <div
                  key={opt.id || i}
                  className="flex items-start gap-2 text-xs p-2 rounded-lg transition-colors"
                  style={
                    opt.isCorrect
                      ? { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }
                      : { background: "#0d1117", border: "1px solid #1e2a3e", color: "#cbd5e1" }
                  }
                >
                  <span
                    className="font-bold shrink-0 text-[11px] px-1 rounded font-mono"
                    style={opt.isCorrect ? { color: "#10b981" } : { color: "#64748b" }}
                  >
                    {optionLabels[i]}.
                  </span>
                  <div
                    className="flex-1 break-words [&>p]:inline"
                    dangerouslySetInnerHTML={{ __html: renderedOpt }}
                  />
                  {opt.isCorrect && (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cell Footer ── */}
      <div
        className="px-3 py-2 flex items-center justify-between gap-2"
        style={{ borderTop: "1px solid #1e2a3e", background: "#0d1117" }}
      >
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          {question.tags.map((t, idx) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono"
              style={{ color: "#64748b", background: "#161e2e", border: "1px solid #1e2a3e" }}
            >
              <Tag className="w-2.5 h-2.5 opacity-60" />
              {t}
            </span>
          ))}
        </div>

        {/* Botón Agregar */}
        {onAddToQuiz && (
          <button
            onClick={onAddToQuiz}
            disabled={isSelectedInQuiz}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all shrink-0 active:scale-95"
            style={
              isSelectedInQuiz
                ? { background: "#161e2e", color: "#64748b", cursor: "not-allowed", border: "1px solid #1e2a3e" }
                : { background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", boxShadow: "0 0 10px rgba(59,130,246,0.25)" }
            }
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSelectedInQuiz ? "En el examen" : "Agregar"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
