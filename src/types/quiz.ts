export type QuestionType =
  | "multiple_choice"    // Opción múltiple con única respuesta
  | "multiple_response"  // Opción múltiple con múltiple respuesta
  | "true_false"         // Verdadero / Falso (con o sin justificación)
  | "matching"           // Emparejamiento / Relación de columnas
  | "ordering"           // Ordenamiento / Secuenciación
  | "fill_blanks"        // Completar espacios / oraciones / tablas
  | "numeric"            // Respuesta numérica o cálculo directo
  | "open"               // Respuesta abierta o desarrollo
  | "video_quiz"         // Pregunta interactiva basada en video con pausas
  | "stimulus";          // Estímulo compartido (imagen/texto/tabla/video para varias preguntas)

export type OptionLayout = "grid-2" | "vertical" | "horizontal";

export type OpenSubtype =
  | "step_by_step"
  | "error_detection"
  | "comparison"
  | "hypothetical"
  | "essay";

export interface Option {
  id: string; // ej: "a", "b", "c", "d"
  text: string;
  isCorrect: boolean;
  image?: string; // Ruta relativa (imagenes/...) o dataURL / URL
  imageWidth?: number; // Porcentaje de ancho de imagen (ej: 50, 80, 100)
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface OrderingItem {
  id: string;
  text: string;
}

export interface VideoCuePoint {
  id: string;
  timeSeconds: number; // Momento exacto de pausa en segundos (ej: 45)
  prompt: string; // Pregunta que aparece al pausarse el video
  options?: Option[]; // Opciones opcionales; si está vacío, es pregunta abierta
  explanation?: string;
}

export type VideoFeedbackMode = "immediate" | "at_timestamp" | "at_end";

export interface VideoEmbed {
  id: string;
  url: string;
  caption?: string;
  playbackScope?: "full" | "clip"; // Video completo o solo una parte
  startSeconds?: number; // Segundo de inicio (si es fragmento)
  endSeconds?: number; // Segundo de fin (si es fragmento)
  feedbackMode?: VideoFeedbackMode; // Cuándo mostrar las respuestas correctas
  feedbackAtSeconds?: number; // Segundo exacto si feedbackMode === "at_timestamp"
  cuePoints?: VideoCuePoint[]; // Puntos de pausa interactivos con preguntas
}

export interface Question {
  id: string;
  type: QuestionType;
  course: string;
  topic: string;
  subtopic?: string;
  difficulty: "Fácil" | "Media" | "Difícil";
  tags: string[];
  prompt: string; // Enunciado en Markdown + LaTeX + Tablas + Huecos {{...}}

  // Opciones (para multiple_choice, multiple_response, true_false)
  options: Option[];
  optionLayout?: OptionLayout; // Distribución de opciones: "grid-2" | "vertical" | "horizontal"

  // Verdadero / Falso
  requireJustification?: boolean;

  // Emparejamiento / Relación de columnas
  matchingPairs?: MatchingPair[];
  matchingDistractors?: string[]; // Respuestas extra en columna derecha para evitar descarte
  matchingRightOrder?: { text: string; pairId?: string }[]; // Orden mezclado de la columna B

  // Ordenamiento / Secuenciación (en el orden correcto; al exportar/mostrar se pueden mezclar)
  orderingItems?: OrderingItem[];

  // Respuesta numérica / cálculo directo
  numericAnswer?: string;
  numericUnit?: string;
  numericTolerance?: string;

  // Respuesta abierta
  openResponseHeight?: number;
  openSubtype?: OpenSubtype;

  // Estímulo compartido (cuando type === "stimulus")
  stimulusTitle?: string; // ej: "Responda las siguientes preguntas con base en el texto/imagen:"
  stimulusRangeNote?: string; // ej: "Preguntas 2 a 5"

  // Videos adjuntos
  videos?: VideoEmbed[];

  explanation?: string; // Solución / rúbrica / justificación
  createdAt: string;
}

export interface QuizHeader {
  institution: string;
  course: string;
  title: string;
  teacher: string;
  date: string;
  instructions: string;
  showAnswerSheet: boolean;
}

export interface QuizItem {
  instanceId: string;
  question: Question;
  points: number;
}

export interface Quiz {
  id: string;
  header: QuizHeader;
  items: QuizItem[];
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Opción Múltiple (Única)",
  multiple_response: "Múltiple Respuesta",
  true_false: "Verdadero / Falso",
  matching: "Emparejamiento",
  ordering: "Ordenamiento",
  fill_blanks: "Completar Espacios",
  numeric: "Respuesta Numérica",
  open: "Abierta / Desarrollo",
  video_quiz: "Video Interactivo",
  stimulus: "Estímulo / Contexto",
};
