import React, { useState, useMemo } from "react";
import { Question } from "../types/quiz";
import { QuestionCard } from "./QuestionCard";
import { Search, Filter, X, Layers, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface BankPanelProps {
  questions: Question[];
  onAddToQuiz: (q: Question) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  quizQuestionIds: Set<string>;
  pageSize: number;
}

export const BankPanel: React.FC<BankPanelProps> = ({
  questions,
  onAddToQuiz,
  onEditQuestion,
  onDeleteQuestion,
  quizQuestionIds,
  pageSize = 50,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Listas únicas de cursos y temas para los filtros
  const courses = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.course))).filter(Boolean);
  }, [questions]);

  const topics = useMemo(() => {
    const list =
      selectedCourse === "all"
        ? questions.map((q) => q.topic)
        : questions.filter((q) => q.course === selectedCourse).map((q) => q.topic);
    return Array.from(new Set(list)).filter(Boolean);
  }, [questions, selectedCourse]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    questions.forEach((q) => q.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [questions]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Búsqueda por texto en enunciado y opciones
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesPrompt = q.prompt.toLowerCase().includes(term);
        const matchesOptions = q.options.some((opt) => opt.text.toLowerCase().includes(term));
        const matchesTags = q.tags.some((t) => t.toLowerCase().includes(term));
        if (!matchesPrompt && !matchesOptions && !matchesTags) return false;
      }

      // Filtro de Curso
      if (selectedCourse !== "all" && q.course !== selectedCourse) return false;

      // Filtro de Tema
      if (selectedTopic !== "all" && q.topic !== selectedTopic) return false;

      // Filtro de Dificultad
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;

      // Filtro de Etiquetas
      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((t) => q.tags.includes(t));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [questions, searchTerm, selectedCourse, selectedTopic, selectedDifficulty, selectedTags]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedTopic("all");
    setSelectedDifficulty("all");
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedCourse !== "all" ||
    selectedTopic !== "all" ||
    selectedDifficulty !== "all" ||
    selectedTags.length > 0;

  // Paginación (20, 50, 100)
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedQuestions = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, validCurrentPage, pageSize]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900 border-r border-slate-750">
      {/* ── Barra de Búsqueda y Filtros ── */}
      <div className="p-3 space-y-2.5 shrink-0 bg-slate-850 border-b border-slate-750">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por fórmula, enunciado, tema o etiqueta..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg pl-9 pr-8 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desplegables de filtros */}
        <div className="grid grid-cols-3 gap-2">
          {/* Selector de Cursos */}
          <div className="relative">
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedTopic("all");
                setCurrentPage(1);
              }}
              className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer truncate"
            >
              <option value="all">
                Todos los Cursos
              </option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Selector de Temas */}
          <div className="relative">
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer truncate"
            >
              <option value="all">
                Todos los Temas
              </option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Selector de Dificultad */}
          <div className="relative">
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer truncate"
            >
              <option value="all">
                Dificultad
              </option>
              <option value="Fácil">
                Fácil
              </option>
              <option value="Media">
                Media
              </option>
              <option value="Difícil">
                Difícil
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Chips de Etiquetas seleccionables */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 max-h-16 overflow-y-auto pt-1">
            <span className="text-[10px] flex items-center gap-1 mr-1 text-slate-400">
              <Filter className="w-3 h-3" /> Tags:
            </span>
            {allTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-all font-mono border ${
                    active
                      ? "bg-sky-500/20 text-sky-400 border-sky-500/40 font-bold"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Contador y botón de limpiar */}
        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
          <span>
            Mostrando <strong className="text-slate-200">{filteredQuestions.length}</strong> de{" "}
            <strong className="text-slate-200">{questions.length}</strong> preguntas
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Lista scrolleable con celdas tipo notebook ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {paginatedQuestions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Layers className="w-10 h-10 mb-2 stroke-1 opacity-40 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">No se encontraron preguntas</p>
            <p className="text-xs mt-1 max-w-xs text-slate-400">
              Prueba cambiando o limpiando los filtros o añade una nueva pregunta al banco.
            </p>
          </div>
        ) : (
          paginatedQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSelectedInQuiz={quizQuestionIds.has(q.id)}
              onAddToQuiz={() => onAddToQuiz(q)}
              onEdit={() => onEditQuestion(q)}
              onDelete={() => onDeleteQuestion(q.id)}
            />
          ))
        )}
      </div>

      {/* ── Paginación inferior ── */}
      {totalPages > 1 && (
        <div className="p-2.5 flex items-center justify-between text-xs shrink-0 bg-slate-850 border-t border-slate-750">
          <span className="text-[11px] text-slate-400">
            Página <strong className="text-slate-200">{validCurrentPage}</strong> de{" "}
            <strong className="text-slate-200">{totalPages}</strong> ({pageSize}/pág)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 rounded font-semibold text-xs font-mono bg-slate-800 border border-slate-700 text-sky-400">
              {validCurrentPage}
            </span>
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
