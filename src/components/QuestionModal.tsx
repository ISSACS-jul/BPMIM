import React, { useState, useEffect, useMemo, useRef } from "react";
import { Question, Option, QuestionType } from "../types/quiz";
import { renderMarkdownWithMath } from "../utils/markdownRenderer";
import { handleClipboardImage, processAndSaveImage } from "../utils/clipboardImage";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Eye,
  Edit3,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Code2,
  FileCode,
  Sparkles,
  Upload,
} from "lucide-react";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  questionToEdit?: Question | null;
}

const TEMPLATE_MULTIPLE_CHOICE = `Curso: Física 10°
Tema: Cinemática
Subtema: MRUV
Dificultad: Media
Tags: aceleración, MRUV, gráficas
Tipo: multiple

Un móvil que parte del reposo acelera de manera constante a razón de $a = 2\\,\\text{m/s}^2$ durante $t = 5\\,\\text{s}$.
¿Cuál es la distancia total recorrida?
$$d = v_0 t + \\frac{1}{2} a t^2$$

A) $10\\,\\text{m}$
*B) $25\\,\\text{m}$
C) $50\\,\\text{m}$
D) $5\\,\\text{m}$

Solución: Como parte del reposo, $v_0 = 0$, resultando $d = \\frac{1}{2}(2)(25) = 25\\,\\text{m}$.`;

const TEMPLATE_OPEN_QUESTION = `Curso: Matemáticas 11°
Tema: Cálculo Integral
Dificultad: Difícil
Tags: integrales, área, cálculo
Tipo: abierta
Alto: 4.5cm

Calcule el área acotada entre la parábola $y = x^2$ y la recta $y = 2x$.
Presente el procedimiento completo y límites de integración:
$$A = \\int_{a}^{b} [f(x) - g(x)]\\,dx$$

Solución: Puntos de intersección en $x=0$ y $x=2$. El área es $A = \\int_0^2 (2x - x^2)dx = \\frac{4}{3}$.`;

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  questionToEdit,
}) => {
  // Modo de edición: Formulario visual vs Código directo
  const [entryMode, setEntryMode] = useState<"form" | "code">("form");
  const [imageSizePercent, setImageSizePercent] = useState<number>(50);

  // Estado del modo formulario
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [course, setCourse] = useState("Física 10°");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Fácil" | "Media" | "Difícil">("Media");
  const [tagsInput, setTagsInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [openResponseHeight, setOpenResponseHeight] = useState<number>(3.5);
  const [options, setOptions] = useState<Option[]>([
    { id: "a", text: "", isCorrect: true },
    { id: "b", text: "", isCorrect: false },
    { id: "c", text: "", isCorrect: false },
    { id: "d", text: "", isCorrect: false },
  ]);
  const [explanation, setExplanation] = useState("");
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Estado del modo código directo
  const [directCode, setDirectCode] = useState(TEMPLATE_MULTIPLE_CHOICE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (questionToEdit) {
      setType(questionToEdit.type || "multiple_choice");
      setCourse(questionToEdit.course || "Física 10°");
      setTopic(questionToEdit.topic || "");
      setSubtopic(questionToEdit.subtopic || "");
      setDifficulty(questionToEdit.difficulty || "Media");
      setTagsInput(questionToEdit.tags?.join(", ") || "");
      setPrompt(questionToEdit.prompt || "");
      setOpenResponseHeight(questionToEdit.openResponseHeight || 3.5);
      setOptions(
        questionToEdit.options?.length > 0
          ? questionToEdit.options
          : [
              { id: "a", text: "", isCorrect: true },
              { id: "b", text: "", isCorrect: false },
              { id: "c", text: "", isCorrect: false },
              { id: "d", text: "", isCorrect: false },
            ]
      );
      setExplanation(questionToEdit.explanation || "");
      setEntryMode("form");
    } else {
      setType("multiple_choice");
      setCourse("Física 10°");
      setTopic("");
      setSubtopic("");
      setDifficulty("Media");
      setTagsInput("");
      setPrompt("");
      setOpenResponseHeight(3.5);
      setOptions([
        { id: "a", text: "", isCorrect: true },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ]);
      setExplanation("");
      setDirectCode(TEMPLATE_MULTIPLE_CHOICE);
    }
    setPreviewTab("edit");
    setClipboardNotice(null);
  }, [questionToEdit, isOpen]);

  // Manejador para botón "Insertar Imagen" desde archivo
  const handleSelectImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { markdownTag, path } = await processAndSaveImage(file, undefined, imageSizePercent);
      if (entryMode === "code") {
        setDirectCode((prev) => prev + "\n" + markdownTag);
      } else {
        setPrompt((prev) => prev + "\n" + markdownTag);
      }
      setClipboardNotice(`Imagen agregada: ${path}`);
      setTimeout(() => setClipboardNotice(null), 3500);
    } catch (err) {
      console.error("Error al procesar archivo de imagen:", err);
      alert("No se pudo cargar la imagen seleccionada.");
    } finally {
      e.target.value = "";
    }
  };

  // Parser inteligente para el código directo
  const parsedFromCode = useMemo<Question | null>(() => {
    if (entryMode !== "code" || !directCode.trim()) return null;

    try {
      // 1. Si el usuario pegó JSON puro
      if (directCode.trim().startsWith("{")) {
        const parsed = JSON.parse(directCode);
        return {
          id: questionToEdit?.id || `q-${Date.now()}`,
          course: parsed.course || "General",
          topic: parsed.topic || "General",
          subtopic: parsed.subtopic,
          difficulty: parsed.difficulty || "Media",
          type: parsed.type || (parsed.options ? "multiple_choice" : "open"),
          prompt: parsed.prompt || "",
          options: parsed.options || [],
          explanation: parsed.explanation,
          tags: parsed.tags || [],
          openResponseHeight: parsed.openResponseHeight || 3.5,
        };
      }

      // 2. Formato en Texto Estructurado
      const lines = directCode.split("\n");
      let extractedCourse = "General";
      let extractedTopic = "General";
      let extractedSubtopic = "";
      let extractedDifficulty: "Fácil" | "Media" | "Difícil" = "Media";
      let extractedType: QuestionType = "multiple_choice";
      let extractedTags: string[] = [];
      let extractedHeight = 3.5;

      const bodyLines: string[] = [];
      const optionLines: { letter: string; isCorrect: boolean; text: string }[] = [];
      let extractedExplanation = "";

      let inHeader = true;
      let inExplanation = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (
          trimmed.toLowerCase().startsWith("solución:") ||
          trimmed.toLowerCase().startsWith("solucion:") ||
          trimmed.toLowerCase().startsWith("explicación:") ||
          trimmed.toLowerCase().startsWith("explicacion:")
        ) {
          inExplanation = true;
          const colonIdx = line.indexOf(":");
          extractedExplanation = line.substring(colonIdx + 1).trim();
          continue;
        }

        if (inExplanation) {
          extractedExplanation += "\n" + line;
          continue;
        }

        if (inHeader) {
          const lower = trimmed.toLowerCase();
          if (lower.startsWith("curso:")) {
            extractedCourse = trimmed.substring(6).trim();
            continue;
          }
          if (lower.startsWith("tema:")) {
            extractedTopic = trimmed.substring(5).trim();
            continue;
          }
          if (lower.startsWith("subtema:")) {
            extractedSubtopic = trimmed.substring(8).trim();
            continue;
          }
          if (lower.startsWith("dificultad:")) {
            const diffStr = trimmed.substring(11).trim().toLowerCase();
            if (diffStr.includes("fácil") || diffStr.includes("facil")) {
              extractedDifficulty = "Fácil";
            } else if (diffStr.includes("difícil") || diffStr.includes("dificil")) {
              extractedDifficulty = "Difícil";
            } else {
              extractedDifficulty = "Media";
            }
            continue;
          }
          if (lower.startsWith("tags:") || lower.startsWith("etiquetas:")) {
            const colonIdx = trimmed.indexOf(":");
            extractedTags = trimmed
              .substring(colonIdx + 1)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            continue;
          }
          if (lower.startsWith("tipo:")) {
            const typeStr = trimmed.substring(5).trim().toLowerCase();
            if (typeStr.includes("abierta") || typeStr.includes("open")) {
              extractedType = "open";
            } else {
              extractedType = "multiple_choice";
            }
            continue;
          }
          if (lower.startsWith("alto:") || lower.startsWith("altura:")) {
            const colonIdx = trimmed.indexOf(":");
            const val = parseFloat(trimmed.substring(colonIdx + 1));
            if (!isNaN(val)) extractedHeight = val;
            continue;
          }

          if (trimmed === "") continue;
          inHeader = false;
        }

        // Detección de opciones: A) texto, *B) texto
        const optionMatch = trimmed.match(/^(\*?)([A-Fa-f])[\)\.\-]\s*(.*)$/);
        if (optionMatch && extractedType !== "open") {
          const isCorrect = optionMatch[1] === "*";
          const letter = optionMatch[2].toUpperCase();
          const optText = optionMatch[3];
          optionLines.push({ letter, isCorrect, text: optText });
        } else {
          bodyLines.push(line);
        }
      }

      if (optionLines.length > 0) {
        extractedType = "multiple_choice";
      }

      const hasCorrect = optionLines.some((o) => o.isCorrect);
      const finalOptions: Option[] =
        extractedType === "open"
          ? []
          : optionLines.length > 0
          ? optionLines.map((o, idx) => ({
              id: o.letter.toLowerCase(),
              text: o.text,
              isCorrect: hasCorrect ? o.isCorrect : idx === 0,
            }))
          : [
              { id: "a", text: "Opción A", isCorrect: true },
              { id: "b", text: "Opción B", isCorrect: false },
            ];

      return {
        id: questionToEdit?.id || `q-${Date.now()}`,
        course: extractedCourse,
        topic: extractedTopic,
        subtopic: extractedSubtopic,
        difficulty: extractedDifficulty,
        type: extractedType,
        prompt: bodyLines.join("\n").trim(),
        options: finalOptions,
        explanation: extractedExplanation.trim(),
        tags: extractedTags,
        openResponseHeight: extractedHeight,
      };
    } catch (e) {
      console.warn("Error parseando código directo:", e);
      return null;
    }
  }, [directCode, entryMode, questionToEdit]);

  if (!isOpen) return null;

  const handlePastePrompt = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleClipboardImage(e, prompt, setPrompt, (info) => {
      setClipboardNotice(info);
      setTimeout(() => setClipboardNotice(null), 3500);
    }, imageSizePercent);
  };

  const handlePasteDirectCode = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleClipboardImage(e, directCode, setDirectCode, (info) => {
      setClipboardNotice(info);
      setTimeout(() => setClipboardNotice(null), 3500);
    }, imageSizePercent);
  };

  const handleAddOption = () => {
    const letters = ["a", "b", "c", "d", "e", "f", "g"];
    const nextLetter = letters[options.length] || `opt-${options.length + 1}`;
    setOptions([...options, { id: nextLetter, text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const removedWasCorrect = options[index].isCorrect;
    const newOptions = options.filter((_, i) => i !== index);
    if (removedWasCorrect && newOptions.length > 0) {
      newOptions[0].isCorrect = true;
    }
    setOptions(newOptions);
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const handleSetCorrectOption = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(newOptions);
  };

  const handleSave = () => {
    if (entryMode === "code") {
      if (!parsedFromCode) {
        alert("El código de la pregunta tiene errores o está incompleto.");
        return;
      }
      if (!parsedFromCode.prompt.trim()) {
        alert("El enunciado de la pregunta no puede estar vacío.");
        return;
      }
      onSave(parsedFromCode);
      onClose();
      return;
    }

    if (!prompt.trim()) {
      alert("El enunciado de la pregunta no puede estar vacío.");
      return;
    }

    if (type === "multiple_choice") {
      const validOptions = options.filter((o) => o.text.trim() !== "");
      if (validOptions.length < 2) {
        alert("Debes proporcionar al menos 2 opciones de respuesta válidas.");
        return;
      }
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const questionData: Question = {
      id: questionToEdit?.id || `q-${Date.now()}`,
      course: course.trim() || "Física 10°",
      topic: topic.trim() || "General",
      subtopic: subtopic.trim() || undefined,
      difficulty,
      type,
      prompt: prompt.trim(),
      options: type === "open" ? [] : options,
      explanation: explanation.trim() || undefined,
      tags,
      openResponseHeight: type === "open" ? openResponseHeight : undefined,
    };

    onSave(questionData);
    onClose();
  };

  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const renderedPromptPreview = renderMarkdownWithMath(
    entryMode === "code" ? parsedFromCode?.prompt || "" : prompt
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center font-bold text-sm">
              {entryMode === "code" ? <Code2 className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {questionToEdit ? "Editar Pregunta" : "Nueva Pregunta para el Banco"}
              </h2>
              <p className="text-xs text-slate-400">
                Soporta KaTeX ($...$ y $$...$$), Markdown e imágenes limpias
              </p>
            </div>
          </div>

          {/* Selector de Modo: Formulario Visual vs Código Directo */}
          <div className="flex items-center space-x-3">
            <div className="bg-dark-900 border border-dark-700 rounded-lg p-0.5 flex items-center">
              <button
                type="button"
                onClick={() => setEntryMode("form")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  entryMode === "form"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Formulario</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("code")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  entryMode === "code"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Código Directo</span>
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

        {/* Input oculto para carga de imágenes */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSelectImageFile}
          accept="image/*"
          className="hidden"
        />

        {/* MODO CÓDIGO DIRECTO */}
        {entryMode === "code" ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Editor de código */}
            <div className="flex-1 p-5 flex flex-col space-y-2 border-r border-dark-700 bg-dark-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-brand-400" />
                  Editor de Texto Estructurado
                </span>

                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center gap-1 bg-dark-900 border border-dark-700 rounded-lg p-0.5">
                    <span className="text-[10px] text-slate-400 px-1 font-medium">Tamaño:</span>
                    {[
                      { label: "S (25%)", val: 25 },
                      { label: "M (50%)", val: 50 },
                      { label: "L (75%)", val: 75 },
                      { label: "XL (100%)", val: 100 },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setImageSizePercent(s.val)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                          imageSizePercent === s.val
                            ? "bg-brand-600 text-white font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
<button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-dark-800 border border-emerald-800/50 flex items-center gap-1 transition-colors"
                    title="Insertar imagen desde archivo"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>Insertar Imagen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectCode(TEMPLATE_MULTIPLE_CHOICE)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-dark-800 border border-dark-700 hover:border-dark-600"
                  >
                    Plantilla Opción Múltiple
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectCode(TEMPLATE_OPEN_QUESTION)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-dark-800 border border-dark-700 hover:border-dark-600"
                  >
                    Plantilla Abierta
                  </button>
                </div>
              </div>

              {clipboardNotice && (
                <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
                  {clipboardNotice}
                </div>
              )}

              <textarea
                value={directCode}
                onChange={(e) => setDirectCode(e.target.value)}
                onPaste={handlePasteDirectCode}
                placeholder="Escribe o pega aquí la pregunta..."
                className="flex-1 w-full bg-dark-950 border border-dark-700 rounded-xl p-3.5 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>

            {/* Vista previa en tiempo real */}
            <div className="flex-1 p-5 overflow-y-auto bg-dark-900/30 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Vista Previa de la Pregunta
              </span>

              {parsedFromCode ? (
                <div className="bg-dark-850 border border-dark-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-950/80 text-brand-400 border border-brand-800/60">
                      {parsedFromCode.course}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-dark-800 px-2 py-0.5 rounded">
                      {parsedFromCode.topic}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto font-medium">
                      {parsedFromCode.difficulty}
                    </span>
                  </div>

                  <div
                    className="text-xs text-slate-200 leading-relaxed font-normal"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownWithMath(parsedFromCode.prompt),
                    }}
                  />

                  {parsedFromCode.type === "open" ? (
                    <div
                      style={{ height: `${(parsedFromCode.openResponseHeight || 3.5) * 26}px` }}
                      className="w-full bg-white/5 border border-dark-600 border-l-[3px] border-l-[#B08D57] rounded p-2.5 text-[11px] text-slate-500 italic"
                    >
                      [Espacio asignado para procedimiento del estudiante - {parsedFromCode.openResponseHeight || 3.5} cm]
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {parsedFromCode.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                            opt.isCorrect
                              ? "bg-emerald-950/30 border-emerald-700 text-emerald-200"
                              : "bg-dark-900 border-dark-750 text-slate-300"
                          }`}
                        >
                          <span className="font-bold">{letters[i]}.</span>
                          <div
                            className="flex-1"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdownWithMath(opt.text),
                            }}
                          />
                          {opt.isCorrect && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                              Correcta
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {parsedFromCode.explanation && (
                    <div className="mt-2 p-2 bg-brand-950/30 border border-brand-800/40 rounded text-xs text-brand-300">
                      <strong>Solución: </strong>
                      <div
                        className="inline"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdownWithMath(parsedFromCode.explanation),
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-dark-700 rounded-xl">
                  Escribe el formato para ver la previsualización en vivo.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO FORMULARIO VISUAL */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Tipo de Pregunta */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tipo de Pregunta
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("multiple_choice")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                    type === "multiple_choice"
                      ? "bg-brand-600/10 border-brand-500 text-brand-300 ring-1 ring-brand-500"
                      : "bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600 hover:text-slate-300"
                  }`}
                >
                  <CheckSquare className="w-5 h-5 text-brand-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Opción Múltiple (Incisos A, B, C, D)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Preguntas con opciones cerradas y calificación automática
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType("open")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                    type === "open"
                      ? "bg-[#1F3A5F]/40 border-[#B08D57] text-[#D8B480] ring-1 ring-[#B08D57]"
                      : "bg-dark-900 border-dark-700 text-slate-400 hover:border-dark-600 hover:text-slate-300"
                  }`}
                >
                  <Square className="w-5 h-5 text-[#B08D57]" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Pregunta Abierta (Desarrollo Escrito)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Incluye recuadro para que el estudiante justifique procedimientos
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Metadatos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Curso:</label>
                <input
                  type="text"
                  placeholder="Ej: Física 10°"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tema:</label>
                <input
                  type="text"
                  placeholder="Ej: Cinemática"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subtema:</label>
                <input
                  type="text"
                  placeholder="Ej: MRUV"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dificultad:</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  style={{ backgroundColor: "#101622", color: "#e2e8f0" }}
                  className="w-full border border-dark-700 focus:border-brand-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                >
                  <option value="Fácil" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>Fácil</option>
                  <option value="Media" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>Media</option>
                  <option value="Difícil" style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>Difícil</option>
                </select>
              </div>
            </div>

            {/* Etiquetas */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Etiquetas / Tags (Separadas por coma):
              </label>
              <input
                type="text"
                placeholder="aceleración, gráficas, examen 1"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* Enunciado con pestañas Edit / Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Enunciado de la Pregunta (Soporta Markdown y KaTeX)
                </label>
                <div className="flex items-center space-x-1 bg-dark-900 p-0.5 rounded-lg border border-dark-700">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("edit")}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      previewTab === "edit"
                        ? "bg-brand-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("preview")}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      previewTab === "preview"
                        ? "bg-brand-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Vista Previa
                  </button>
                </div>
              </div>

              {/* Botones de atajos y botón de insertar imagen */}
              {previewTab === "edit" && (
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  <span className="text-[10px] text-slate-500">Insertar fórmula:</span>
                  <button
                    type="button"
                    onClick={() => setPrompt((p) => p + " $x$ ")}
                    className="px-2 py-0.5 bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded text-[11px] text-brand-400 font-mono"
                  >
                    $x$ en línea
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt((p) => p + "\n$$\\frac{a}{b}$$\n")}
                    className="px-2 py-0.5 bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded text-[11px] text-brand-400 font-mono"
                  >
                    Fracción
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt((p) => p + "\n$$\\sqrt{x^2 + y^2}$$\n")}
                    className="px-2 py-0.5 bg-dark-800 hover:bg-dark-750 border border-dark-700 rounded text-[11px] text-brand-400 font-mono"
                  >
                    Raíz
                  </button>
                  <div className="flex items-center gap-1 bg-dark-900 border border-dark-700 rounded-lg p-0.5">
                    <span className="text-[10px] text-slate-400 px-1 font-medium">Tamaño:</span>
                    {[
                      { label: "S (25%)", val: 25 },
                      { label: "M (50%)", val: 50 },
                      { label: "L (75%)", val: 75 },
                      { label: "XL (100%)", val: 100 },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setImageSizePercent(s.val)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                          imageSizePercent === s.val
                            ? "bg-brand-600 text-white font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
<button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 bg-dark-800 hover:bg-dark-750 border border-emerald-800/60 rounded text-[11px] text-emerald-400 flex items-center gap-1 font-medium ml-1"
                    title="Seleccionar archivo de imagen del computador"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>Insertar Imagen</span>
                  </button>
                </div>
              )}

              {clipboardNotice && (
                <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
                  {clipboardNotice}
                </div>
              )}

              {previewTab === "edit" ? (
                <textarea
                  rows={4}
                  placeholder="Escribe el enunciado de la pregunta aquí. Soporta fórmulas como $E = mc^2$ o pega imágenes con Ctrl+V..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onPaste={handlePastePrompt}
                  className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-xl p-3 text-xs text-slate-200 focus:outline-none leading-relaxed font-mono"
                />
              ) : (
                <div
                  className="w-full min-h-[100px] bg-dark-900 border border-dark-700 rounded-xl p-4 text-xs text-slate-200 leading-relaxed font-normal"
                  dangerouslySetInnerHTML={{ __html: renderedPromptPreview }}
                />
              )}
            </div>

            {/* SECCIÓN ESPECÍFICA SEGÚN TIPO */}
            {type === "multiple_choice" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Opciones de Respuesta (Marca con el círculo la correcta)
                  </label>
                  {options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Opción</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, i) => {
                    const isSelected = opt.isCorrect;
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-colors ${
                          isSelected
                            ? "bg-emerald-950/20 border-emerald-700/60"
                            : "bg-dark-900 border-dark-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetCorrectOption(i)}
                          title="Marcar como respuesta correcta"
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500" />
                          )}
                        </button>

                        <span
                          className={`font-bold text-xs w-4 text-center ${
                            isSelected ? "text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {letters[i]}
                        </span>

                        <input
                          type="text"
                          placeholder={`Texto de la opción ${letters[i]} (ej: $25\\,\\text{m}$)`}
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(i, e.target.value)}
                          className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
                        />

                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-dark-900/80 border border-[#B08D57]/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Cuadro de Respuesta del Estudiante
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Define la altura del espacio asignado en el examen
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-slate-300 font-medium">Altura:</label>
                    <select
                      value={openResponseHeight}
                      onChange={(e) => setOpenResponseHeight(parseFloat(e.target.value))}
                      style={{ backgroundColor: "#101622", color: "#e2e8f0" }}
                      className="border border-dark-700 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
                    >
                      <option value={2.5} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>2.5 cm (Corta - 4 líneas)</option>
                      <option value={3.5} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>3.5 cm (Estándar - 6 líneas)</option>
                      <option value={4.5} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>4.5 cm (Media - 8 líneas)</option>
                      <option value={6.0} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>6.0 cm (Amplia - 12 líneas)</option>
                      <option value={8.0} style={{ backgroundColor: "#101622", color: "#e2e8f0" }}>8.0 cm (Media página)</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{ height: `${openResponseHeight * 28}px` }}
                  className="w-full bg-white/5 border border-slate-700 border-l-[3.5px] border-l-[#B08D57] rounded p-3 flex items-start text-[11px] text-slate-500 italic"
                >
                  [Espacio asignado para procedimiento y respuesta escrita del estudiante - {openResponseHeight} cm]
                </div>
              </div>
            )}

            {/* Solución / Explicación */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === "open"
                  ? "Criterio de Evaluación / Solución esperada"
                  : "Solución / Justificación (Opcional)"}
              </label>
              <textarea
                rows={2}
                placeholder="Describe los pasos o solución..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 rounded-lg p-3 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        )}

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
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow-sm transition-all hover:shadow-brand-500/20 active:scale-95"
          >
            Guardar Pregunta en el Banco
          </button>
        </div>
      </div>
    </div>
  );
};
