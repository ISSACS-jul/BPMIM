import { parseImageAlt } from "./imageSize";
import { Quiz } from "../types/quiz";
import { getImageSync } from "./imageStore";
import { getShuffledMatchingRight } from "./matchingHelper";
import { parseVideoUrl } from "./markdownRenderer";

export interface HtmlQuizConfig {
  timerMinutes: number; // 0 para sin límite
  shuffleQuestions: boolean;
}

/**
 * Convierte cualquier imagen referenciada en Markdown (imagenes/...) a su DataURL incrustado
 * para que el archivo HTML sea 100% autocontenido y funcione sin conexión.
 */
function embedImagesInMarkdown(text: string): string {
  if (!text) return "";
  return text.replace(
    /!\[(.*?)\]\(((?:imagenes\/|images\/|\.\/imagenes\/)[^)\s]+)\)/g,
    (match, altRaw, path) => {
      const cached = getImageSync(path);
      const { alt, widthPercent } = parseImageAlt(altRaw);
      const src = cached || path;
      return `<img src="${src}" alt="${alt}" style="max-width:${widthPercent}%;height:auto;margin:0.75rem auto;display:block;border-radius:0.5rem;" />`;
    }
  );
}

/**
 * Genera una página HTML interactiva basada en el examen/quiz.
 * - Sin modo constructor (directamente la experiencia del quiz)
 * - Temporizador y orden aleatorio predefinidos desde la configuración
 * - KaTeX para fórmulas matemáticas
 * - Marked para formateo de texto
 * - Tailwind CSS para diseño elegante claro/oscuro
 */
export function generateHtmlQuiz(quiz: Quiz, config: HtmlQuizConfig): string {
  // Preparar los items del quiz
  const preparedQuestions = quiz.items.map((item, idx) => {
    const q = item.question;
    const isChoice =
      q.type === "multiple_choice" ||
      q.type === "multiple_response" ||
      q.type === "true_false";

    let fullPrompt = q.prompt || "";
    if (q.type === "stimulus" && q.stimulusTitle) {
      fullPrompt = `**${q.stimulusTitle}**\n\n${fullPrompt}`;
    }
    if (q.videos && q.videos.length > 0) {
      const videoMd = q.videos
        .map((v) => {
          const cuesNote =
            v.cuePoints && v.cuePoints.length > 0
              ? `\n` +
                v.cuePoints
                  .sort((a, b) => a.timeSeconds - b.timeSeconds)
                  .map((cp, cpI) => {
                    const mm = Math.floor(cp.timeSeconds / 60);
                    const ss = Math.floor(cp.timeSeconds % 60).toString().padStart(2, "0");
                    return `  - ⏸ **Pausa ${cpI + 1} (${mm}:${ss})**: ${cp.prompt}`;
                  })
                  .join("\n")
              : "";
          return `\n\n📺 **Video${v.caption ? `: ${v.caption}` : ""}**: [${v.url}](${v.url})${cuesNote}`;
        })
        .join("");
      fullPrompt += videoMd;
    }
    if (q.type === "matching" && q.matchingPairs) {
      const rightCol = getShuffledMatchingRight(q);
      const maxLen = Math.max(q.matchingPairs.length, rightCol.length);
      const rows: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const l = q.matchingPairs[i] ? `${i + 1}. ${q.matchingPairs[i].left}` : "";
        const r = rightCol[i] ? `${String.fromCharCode(65 + i)}. ${rightCol[i].text}` : "";
        rows.push(`${l}   |   ${r}`);
      }
      fullPrompt += `\n\n${rows.join("\n")}`;
    }
    if (q.type === "ordering" && q.orderingItems) {
      const ordMd = q.orderingItems.map((o) => `- [ ] ${o.text}`).join("\n");
      fullPrompt += `\n\n${ordMd}`;
    }
    fullPrompt = fullPrompt.replace(/\{\{([^}]+?)\}\}/g, "________");

    const promptProcessed = embedImagesInMarkdown(fullPrompt);
    const explanationProcessed = embedImagesInMarkdown(
      q.explanation ||
        (q.type === "numeric" && q.numericAnswer
          ? `Respuesta: ${q.numericAnswer} ${q.numericUnit || ""}`
          : "")
    );

    const options = isChoice
      ? q.options.map((opt) => {
          const textPart = embedImagesInMarkdown(opt.text || "");
          const imgPart = opt.image
            ? `\n${embedImagesInMarkdown(`![opcion|${opt.imageWidth || 80}%](${opt.image})`)}`
            : "";
          return `${textPart}${imgPart}`.trim();
        })
      : [];
    const correctOptionIndex = isChoice
      ? q.options.findIndex((opt) => opt.isCorrect)
      : -1;

    // Para preguntas no-selección, extraer palabras clave simples o concepto
    let keywords: string[] = [];
    const refText = q.explanation || q.numericAnswer || "";
    if (!isChoice && refText) {
      keywords = refText
        .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 8);
    }

    return {
      id: `q_${idx + 1}`,
      type: isChoice ? "multiple" : "open",
      text: promptProcessed,
      points: q.type === "stimulus" ? 0 : item.points || 1.0,
      options,
      correctOption: correctOptionIndex >= 0 ? correctOptionIndex : 0,
      keywords,
      modelAnswer: !isChoice ? explanationProcessed : "",
      explanation: explanationProcessed,
      videos: (q.videos || []).map((v) => {
        const p = parseVideoUrl(v.url);
        return {
          id: v.id,
          url: v.url,
          kind: p.kind,
          embedUrl: p.embedUrl,
          youtubeId: p.youtubeId || null,
          caption: v.caption || "",
          playbackScope: v.playbackScope || "full",
          startSeconds: v.startSeconds || 0,
          endSeconds: v.endSeconds,
          feedbackMode: v.feedbackMode || "at_end",
          feedbackAtSeconds: v.feedbackAtSeconds,
          cuePoints: [...(v.cuePoints || [])].sort((a, b) => a.timeSeconds - b.timeSeconds),
        };
      }),
    };
  });

  const quizData = {
    institution: quiz.header.institution || "Institución Educativa",
    course: quiz.header.course || "Curso",
    title: quiz.header.title || "Evaluación de Conocimientos",
    teacher: quiz.header.teacher || "",
    date: quiz.header.date || "",
    instructions: quiz.header.instructions || "Lea atentamente y responda cada pregunta.",
    timerMinutes: config.timerMinutes,
    shuffleQuestions: config.shuffleQuestions,
    questions: preparedQuestions,
  };

  const quizDataJson = JSON.stringify(quizData).replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="es" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(quiz.header.title)} - Evaluación Interactiva</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts: Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Font Awesome para iconos -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- KaTeX para fórmulas matemáticas -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <!-- Marked para renderizado Markdown -->
    <script src="https://cdn.jsdelivr.net/npm/marked@14.1.3/marked.min.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        primary: {
                            50: '#eef2ff',
                            100: '#e0e7ff',
                            500: '#4f46e5',
                            600: '#4338ca',
                            700: '#3730a3',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .fade-in {
            animation: fadeIn 0.35s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 4px 0;
        }
        .rendered-markdown p {
            margin-bottom: 0.5rem;
        }
        .rendered-markdown img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 0.75rem auto;
            display: block;
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 min-h-screen flex flex-col">

    <!-- Notificación Toast Flotante -->
    <div id="toast-container" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>

    <!-- Barra de Navegación Superior -->
    <header class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <i class="fa-solid fa-graduation-cap text-lg"></i>
                </div>
                <div>
                    <h1 class="font-bold text-base sm:text-lg leading-tight tracking-tight">${escapeHtml(quiz.header.institution || "BPMIM")}</h1>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(quiz.header.course || "Evaluación")}</p>
                </div>
            </div>

            <!-- Botón Tema Oscuro/Claro -->
            <button onclick="toggleTheme()" aria-label="Cambiar tema" class="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">
                <i id="theme-icon" class="fa-solid fa-moon text-lg"></i>
            </button>
        </div>
    </header>

    <!-- Contenedor Principal -->
    <main class="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">

        <!-- VISTA 1: Pantalla de Bienvenida / Información Pre-Quiz -->
        <section id="quiz-intro" class="fade-in">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-10 text-center">
                <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">
                    <i class="fa-solid fa-file-signature"></i>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mb-2">${escapeHtml(quiz.header.title)}</h2>
                ${quiz.header.teacher ? `<p class="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2"><i class="fa-solid fa-chalkboard-user mr-1.5"></i>Docente: ${escapeHtml(quiz.header.teacher)}</p>` : ""}
                <p class="text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-6 text-sm leading-relaxed">
                    ${escapeHtml(quiz.header.instructions)}
                </p>

                <!-- Resumen de datos -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                    <div class="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400" id="stat-total-q">0</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1">Preguntas</div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400" id="stat-total-pts">0</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1">Puntos Totales</div>
                    </div>
                    <div class="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div class="text-2xl font-bold text-amber-600 dark:text-amber-400" id="stat-timer-display">Sin límite</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1">Tiempo Asignado</div>
                    </div>
                </div>

                <button onclick="startQuiz()" class="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mx-auto">
                    <span>Comenzar Cuestionario</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </section>

        <!-- VISTA 2: Pantalla Activa del Quiz -->
        <section id="quiz-active" class="hidden">
            <!-- Barra de progreso y temporizador -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div class="flex items-center justify-between text-sm font-medium mb-2.5">
                    <span class="text-slate-600 dark:text-slate-300">
                        Pregunta <strong id="q-current-num" class="text-indigo-600 dark:text-indigo-400">1</strong> de <span id="q-total-num">5</span>
                    </span>
                    <div class="flex items-center gap-4">
                        <span id="q-points-badge" class="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                            1 pts
                        </span>
                        <div id="timer-badge" class="hidden items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-bold bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-lg">
                            <i class="fa-regular fa-clock"></i>
                            <span id="timer-countdown">00:00</span>
                        </div>
                    </div>
                </div>
                <!-- Barra de Progreso -->
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div id="progress-bar" class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: 20%"></div>
                </div>
            </div>

            <!-- Tarjeta de la Pregunta -->
            <div id="question-card" class="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 fade-in">
                <div class="flex items-center gap-2 mb-4">
                    <span id="q-type-tag" class="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Opción Múltiple
                    </span>
                </div>

                <div id="q-text" class="rendered-markdown text-base sm:text-lg text-slate-900 dark:text-white mb-6 leading-relaxed">
                    <!-- Se llena con renderMath -->
                </div>

                <!-- Opciones o área abierta -->
                <div id="q-answer-area" class="space-y-3">
                    <!-- Se llena por JS -->
                </div>
            </div>

            <!-- Controles de Navegación -->
            <div class="flex items-center justify-between gap-4">
                <button id="btn-prev" onclick="prevQuestion()" class="px-5 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2">
                    <i class="fa-solid fa-chevron-left"></i>
                    <span>Anterior</span>
                </button>

                <button id="btn-next" onclick="nextQuestion()" class="px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
                    <span>Siguiente</span>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>

                <button id="btn-finish" onclick="finishQuiz()" class="hidden px-6 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2">
                    <span>Finalizar Evaluación</span>
                    <i class="fa-solid fa-check-double"></i>
                </button>
            </div>
        </section>

        <!-- VISTA 3: Pantalla de Resultados -->
        <section id="quiz-results" class="hidden fade-in">
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center mb-8">
                <div id="result-icon-bg" class="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 text-3xl">
                    <i id="result-icon" class="fa-solid fa-trophy"></i>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mb-2">¡Cuestionario Completado!</h2>
                <p id="result-feedback-msg" class="text-slate-600 dark:text-slate-300 mb-6">Resultados de tu desempeño:</p>

                <div class="flex flex-wrap justify-center gap-6 mb-8">
                    <div class="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-[140px]">
                        <div class="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                            <span id="res-score">0</span><span class="text-lg text-slate-400 font-normal">/<span id="res-max-score">100</span></span>
                        </div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Puntuación</div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-[140px]">
                        <div class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400" id="res-percentage">0%</div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Porcentaje</div>
                    </div>
                </div>

                <button onclick="restartQuiz()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors inline-flex items-center gap-2">
                    <i class="fa-solid fa-rotate-right"></i>
                    <span>Reintentar Evaluación</span>
                </button>
            </div>

            <!-- Desglose detallado -->
            <h3 class="text-lg font-bold mb-4 px-1 flex items-center gap-2">
                <i class="fa-solid fa-list-check text-indigo-500"></i>
                <span>Revisión Detallada de Preguntas</span>
            </h3>
            <div id="results-breakdown" class="space-y-4"></div>
        </section>

    </main>

    <!-- Lógica JavaScript integrada -->
    <script>
        const quizData = ${quizDataJson};

        let activeQuestions = [];
        let userAnswers = {};
        let currentIndex = 0;
        let timerInterval = null;
        let secondsRemaining = 0;

        window.onload = () => {
            initTheme();
            renderIntro();
        };

        function renderMath(text) {
            if (!text) return "";
            const mathBlocks = [];
            let processed = text.replace(/\\$\\$([\\s\\S]+?)\\$\\$/g, (_, math) => {
                try {
                    const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
                    mathBlocks.push(rendered);
                    return '%%MATH_BLOCK_' + (mathBlocks.length - 1) + '%%';
                } catch {
                    return '$$' + math + '$$';
                }
            });

            const mathInlines = [];
            processed = processed.replace(/(?<!\\\\)\\$([^\\$\\n]+?)\\$/g, (_, math) => {
                try {
                    const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
                    mathInlines.push(rendered);
                    return '%%MATH_INLINE_' + (mathInlines.length - 1) + '%%';
                } catch {
                    return '$' + math + '$';
                }
            });

            let html = marked.parse(processed);
            html = html.replace(/%%MATH_BLOCK_(\\d+)%%/g, (_, index) => {
                return '<div class="katex-display">' + mathBlocks[Number(index)] + '</div>';
            });
            html = html.replace(/%%MATH_INLINE_(\\d+)%%/g, (_, index) => {
                return mathInlines[Number(index)] || "";
            });
            return html;
        }

        function initTheme() {
            const savedTheme = localStorage.getItem('bpmim_quiz_theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
                document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
            }
        }

        function toggleTheme() {
            const html = document.documentElement;
            const icon = document.getElementById('theme-icon');
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                icon.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('bpmim_quiz_theme', 'light');
            } else {
                html.classList.add('dark');
                icon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('bpmim_quiz_theme', 'dark');
            }
        }

        function renderIntro() {
            const totalPts = quizData.questions.reduce((acc, q) => acc + (Number(q.points) || 1), 0);
            document.getElementById('stat-total-q').textContent = quizData.questions.length;
            document.getElementById('stat-total-pts').textContent = totalPts.toFixed(1).replace(/\\.0$/, '');
            document.getElementById('stat-timer-display').textContent = quizData.timerMinutes > 0 ? (quizData.timerMinutes + ' min') : 'Sin límite';
        }

        function startQuiz() {
            if (quizData.questions.length === 0) return;

            activeQuestions = JSON.parse(JSON.stringify(quizData.questions));
            if (quizData.shuffleQuestions) {
                activeQuestions.sort(() => Math.random() - 0.5);
            }

            userAnswers = {};
            currentIndex = 0;

            const timerBadge = document.getElementById('timer-badge');
            clearInterval(timerInterval);

            if (quizData.timerMinutes > 0) {
                secondsRemaining = quizData.timerMinutes * 60;
                timerBadge.classList.remove('hidden');
                timerBadge.classList.add('flex');
                updateTimerDisplay();
                timerInterval = setInterval(() => {
                    secondsRemaining--;
                    updateTimerDisplay();
                    if (secondsRemaining <= 0) {
                        clearInterval(timerInterval);
                        alert("¡Se ha terminado el tiempo asignado!");
                        finishQuiz();
                    }
                }, 1000);
            } else {
                timerBadge.classList.add('hidden');
                timerBadge.classList.remove('flex');
            }

            document.getElementById('quiz-intro').classList.add('hidden');
            document.getElementById('quiz-results').classList.add('hidden');
            document.getElementById('quiz-active').classList.remove('hidden');

            renderQuestion();
        }

        function updateTimerDisplay() {
            const mins = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
            const secs = (secondsRemaining % 60).toString().padStart(2, '0');
            const el = document.getElementById('timer-countdown');
            el.textContent = mins + ':' + secs;
            if (secondsRemaining <= 60) {
                el.parentElement.classList.add('text-rose-600', 'animate-pulse');
            } else {
                el.parentElement.classList.remove('text-rose-600', 'animate-pulse');
            }
        }

        let activeYtTimers = [];
        function clearVideoTimers() {
            activeYtTimers.forEach(id => clearInterval(id));
            activeYtTimers = [];
        }

        function renderInteractiveVideos(q) {
            clearVideoTimers();
            const container = document.getElementById('q-text');
            if (!q.videos || q.videos.length === 0) return;

            const wrap = document.createElement('div');
            wrap.className = 'mt-4 space-y-4';
            container.appendChild(wrap);

            q.videos.forEach((v, vIdx) => {
                const card = document.createElement('div');
                card.className = 'rounded-xl overflow-hidden border border-slate-700 bg-slate-900';
                const playerBoxId = 'yt-player-' + q.id + '-' + vIdx;
                const overlayId = 'vid-overlay-' + q.id + '-' + vIdx;

                let mediaHtml = '';
                if (v.kind === 'direct') {
                    mediaHtml = '<video id="' + playerBoxId + '" src="' + v.url + '" controls class="w-full max-h-72 bg-black"></video>';
                } else {
                    mediaHtml = '<div id="' + playerBoxId + '" class="w-full h-64 bg-black"></div>';
                }

                card.innerHTML = mediaHtml +
                    '<div id="' + overlayId + '" class="hidden p-4 bg-slate-950 border-t-2 border-amber-500 space-y-3"></div>';
                wrap.appendChild(card);

                const triggered = new Set();
                const cueAnswers = {};
                let feedbackShown = false;
                let currentPlayer = null;
                let currentVideoEl = null;

                function showFeedbackSummary() {
                    feedbackShown = true;
                    const ov = document.getElementById(overlayId);
                    if (!ov || !v.cuePoints || v.cuePoints.length === 0) return;
                    const rows = v.cuePoints.map((cp, ci) => {
                        const ans = cueAnswers[cp.id];
                        const corrIdx = (cp.options || []).findIndex(o => o.isCorrect);
                        const ok = corrIdx >= 0 && ans === corrIdx;
                        const corrText = corrIdx >= 0 ? cp.options[corrIdx].text : '';
                        const ansText = typeof ans === 'number' && cp.options[ans] ? cp.options[ans].text : 'Sin responder';
                        return '<div class="p-2 rounded bg-slate-900 border border-slate-700 text-xs">' +
                            '<div class="font-semibold text-white">#' + (ci + 1) + ' ' + escapeText(cp.prompt) + '</div>' +
                            '<div class="text-slate-400 mt-0.5">Tu respuesta: <strong class="' + (ok ? 'text-emerald-400' : 'text-rose-400') + '">' + escapeText(ansText) + '</strong> &bull; Correcta: <strong class="text-emerald-400">' + escapeText(corrText) + '</strong></div>' +
                            '</div>';
                    }).join('');
                    ov.innerHTML = '<div class="text-xs font-bold text-emerald-400">✔ Revisión de Respuestas del Video</div>' +
                        '<div class="space-y-1.5">' + rows + '</div>' +
                        '<div class="flex justify-end"><button type="button" onclick="document.getElementById(\\'' + overlayId + '\\').classList.add(\\'hidden\\')" class="px-3 py-1 rounded bg-slate-800 text-slate-200 text-xs">Cerrar</button></div>';
                    ov.classList.remove('hidden');
                }

                function showCue(cp) {
                    triggered.add(cp.id);
                    const ov = document.getElementById(overlayId);
                    if (!ov) return;
                    const mm = Math.floor(cp.timeSeconds / 60);
                    const ss = String(Math.floor(cp.timeSeconds % 60)).padStart(2, '0');
                    let optsHtml = '';
                    if (cp.options && cp.options.length > 0) {
                        optsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="opts-' + cp.id + '">' +
                            cp.options.map((o, oi) =>
                                '<button type="button" data-idx="' + oi + '" class="cue-opt-btn p-2 rounded-lg border border-slate-700 bg-slate-900 text-left text-xs text-slate-100">' +
                                String.fromCharCode(65 + oi) + '. ' + escapeText(o.text) + '</button>'
                            ).join('') + '</div>';
                    }
                    ov.innerHTML =
                        '<div class="text-xs font-bold text-amber-400">⏸ Pausa automática en ' + mm + ':' + ss + '</div>' +
                        '<p class="text-sm font-semibold text-white">' + escapeText(cp.prompt) + '</p>' +
                        optsHtml +
                        '<div class="flex justify-end"><button type="button" id="resume-' + cp.id + '" class="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold">▶ Continuar Video</button></div>';
                    ov.classList.remove('hidden');

                    ov.querySelectorAll('.cue-opt-btn').forEach(btn => {
                        btn.onclick = () => {
                            const oi = Number(btn.getAttribute('data-idx'));
                            cueAnswers[cp.id] = oi;
                            ov.querySelectorAll('.cue-opt-btn').forEach(b => {
                                b.className = 'cue-opt-btn p-2 rounded-lg border border-slate-700 bg-slate-900 text-left text-xs text-slate-100';
                            });
                            if (v.feedbackMode === 'immediate') {
                                const isCorr = cp.options[oi] && cp.options[oi].isCorrect;
                                btn.classList.add(isCorr ? 'border-emerald-500' : 'border-rose-500');
                                btn.classList.add(isCorr ? 'bg-emerald-950/40' : 'bg-rose-950/40');
                            } else {
                                btn.classList.add('border-sky-500', 'bg-sky-900/40');
                            }
                        };
                    });

                    document.getElementById('resume-' + cp.id).onclick = () => {
                        ov.classList.add('hidden');
                        if (currentVideoEl) currentVideoEl.play();
                        if (currentPlayer && currentPlayer.playVideo) currentPlayer.playVideo();
                    };
                }

                function checkTime(now, pauseCb) {
                    if (v.playbackScope === 'clip' && v.endSeconds && now >= v.endSeconds) {
                        pauseCb();
                        if (v.feedbackMode === 'at_end' && !feedbackShown) showFeedbackSummary();
                        return;
                    }
                    if (v.feedbackMode === 'at_timestamp' && v.feedbackAtSeconds !== undefined && !feedbackShown && now >= v.feedbackAtSeconds && now < v.feedbackAtSeconds + 1.5) {
                        pauseCb();
                        showFeedbackSummary();
                        return;
                    }
                    const hit = (v.cuePoints || []).find(cp => !triggered.has(cp.id) && now >= cp.timeSeconds && now < cp.timeSeconds + 1.5);
                    if (hit) { pauseCb(); showCue(hit); }
                }

                if (v.kind === 'direct') {
                    const el = document.getElementById(playerBoxId);
                    currentVideoEl = el;
                    el.addEventListener('loadedmetadata', () => {
                        if (v.playbackScope === 'clip' && v.startSeconds) el.currentTime = v.startSeconds;
                    });
                    el.addEventListener('timeupdate', () => {
                        checkTime(el.currentTime, () => el.pause());
                    });
                    el.addEventListener('ended', () => {
                        if (v.feedbackMode === 'at_end' && !feedbackShown) showFeedbackSummary();
                    });
                } else if (v.kind === 'youtube' && v.youtubeId) {
                    const initYt = () => {
                        if (!window.YT || !window.YT.Player) return;
                        const pVars = { rel: 0, modestbranding: 1, playsinline: 1 };
                        if (v.playbackScope === 'clip' && v.startSeconds) pVars.start = Math.floor(v.startSeconds);
                        if (v.playbackScope === 'clip' && v.endSeconds) pVars.end = Math.floor(v.endSeconds);
                        currentPlayer = new window.YT.Player(playerBoxId, {
                            videoId: v.youtubeId,
                            width: '100%',
                            height: '100%',
                            playerVars: pVars,
                            events: {
                                onStateChange: (ev) => {
                                    if (ev.data === 0 && v.feedbackMode === 'at_end' && !feedbackShown) {
                                        showFeedbackSummary();
                                    }
                                    if (ev.data === 1) {
                                        const tId = setInterval(() => {
                                            try {
                                                checkTime(currentPlayer.getCurrentTime(), () => currentPlayer.pauseVideo());
                                            } catch {}
                                        }, 250);
                                        activeYtTimers.push(tId);
                                    }
                                }
                            }
                        });
                    };
                    if (window.YT && window.YT.Player) {
                        initYt();
                    } else {
                        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                            const s = document.createElement('script');
                            s.src = 'https://www.youtube.com/iframe_api';
                            document.head.appendChild(s);
                        }
                        const prev = window.onYouTubeIframeAPIReady;
                        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); initYt(); };
                    }
                }
            });
        }

        function renderQuestion() {
            const q = activeQuestions[currentIndex];
            const total = activeQuestions.length;

            document.getElementById('q-current-num').textContent = currentIndex + 1;
            document.getElementById('q-total-num').textContent = total;
            document.getElementById('q-points-badge').textContent = q.points + ' pts';
            document.getElementById('progress-bar').style.width = (((currentIndex + 1) / total) * 100) + '%';

            const typeTag = document.getElementById('q-type-tag');
            if (q.type === 'multiple') {
                typeTag.innerHTML = '<i class="fa-solid fa-list-ul mr-1 text-indigo-500"></i> Opción Múltiple';
            } else {
                typeTag.innerHTML = '<i class="fa-solid fa-align-left mr-1 text-emerald-500"></i> Pregunta Abierta';
            }

            document.getElementById('q-text').innerHTML = renderMath(q.text);
            renderInteractiveVideos(q);

            const answerArea = document.getElementById('q-answer-area');
            answerArea.innerHTML = '';

            if (q.type === 'multiple') {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                q.options.forEach((optText, idx) => {
                    const isSelected = userAnswers[q.id] === idx;
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.onclick = () => selectMultipleOption(q.id, idx);
                    btn.className = 'w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ' +
                        (isSelected 
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-900/30 dark:border-indigo-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50');

                    btn.innerHTML = '<span class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ' +
                        (isSelected ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600') +
                        '">' + (letters[idx] || idx + 1) + '</span>' +
                        '<div class="font-medium text-slate-800 dark:text-slate-100 flex-1 rendered-markdown">' + renderMath(optText) + '</div>';
                    answerArea.appendChild(btn);
                });
            } else {
                const currentVal = userAnswers[q.id] || '';
                answerArea.innerHTML = '<div class="space-y-2">' +
                    '<textarea id="open-answer-input" rows="4" oninput="saveOpenAnswer(\\'' + q.id + '\\', this.value)" placeholder="Escribe tu respuesta y procedimiento detallado..." class="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-800 dark:text-slate-100">' +
                    escapeText(currentVal) +
                    '</textarea>' +
                    '<div class="flex justify-between text-xs text-slate-400"><span>Justifique su procedimiento claramente.</span><span id="char-counter">' + currentVal.length + ' caracteres</span></div></div>';
            }

            document.getElementById('btn-prev').disabled = currentIndex === 0;
            if (currentIndex === total - 1) {
                document.getElementById('btn-next').classList.add('hidden');
                document.getElementById('btn-finish').classList.remove('hidden');
            } else {
                document.getElementById('btn-next').classList.remove('hidden');
                document.getElementById('btn-finish').classList.add('hidden');
            }
        }

        function selectMultipleOption(questionId, optionIdx) {
            userAnswers[questionId] = optionIdx;
            renderQuestion();
        }

        function saveOpenAnswer(questionId, text) {
            userAnswers[questionId] = text;
            const counter = document.getElementById('char-counter');
            if (counter) counter.textContent = text.length + ' caracteres';
        }

        function prevQuestion() {
            if (currentIndex > 0) {
                currentIndex--;
                renderQuestion();
            }
        }

        function nextQuestion() {
            if (currentIndex < activeQuestions.length - 1) {
                currentIndex++;
                renderQuestion();
            }
        }

        function evaluateQuestion(q) {
            const ans = userAnswers[q.id];
            if (q.type === 'multiple') {
                const isCorrect = ans === q.correctOption;
                return {
                    isCorrect,
                    earnedPoints: isCorrect ? Number(q.points) : 0
                };
            } else {
                const text = (ans || '').trim().toLowerCase();
                if (!text) return { isCorrect: false, earnedPoints: 0 };
                const valid = text.length >= 5;
                return { isCorrect: valid, earnedPoints: valid ? Number(q.points) : 0 };
            }
        }

        function finishQuiz() {
            clearInterval(timerInterval);
            document.getElementById('quiz-active').classList.add('hidden');
            document.getElementById('quiz-results').classList.remove('hidden');
            renderResults();
        }

        function renderResults() {
            let totalEarned = 0;
            let totalPossible = 0;
            const breakdownContainer = document.getElementById('results-breakdown');
            breakdownContainer.innerHTML = '';

            activeQuestions.forEach((q, idx) => {
                const pts = Number(q.points);
                totalPossible += pts;
                const evalRes = evaluateQuestion(q);
                totalEarned += evalRes.earnedPoints;

                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm border-l-4 ' +
                    (evalRes.isCorrect ? 'border-l-emerald-500 border-slate-200 dark:border-slate-700' : 'border-l-rose-500 border-slate-200 dark:border-slate-700');

                let detailsHTML = '';
                if (q.type === 'multiple') {
                    const userChoice = userAnswers[q.id] !== undefined ? q.options[userAnswers[q.id]] : 'Sin responder';
                    const correctChoice = q.options[q.correctOption];
                    detailsHTML = '<div class="mt-3 text-sm space-y-1.5">' +
                        '<div class="flex items-start gap-2"><span class="text-slate-500 dark:text-slate-400 shrink-0">Tu respuesta:</span> <div class="' + (evalRes.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') + '">' + renderMath(userChoice) + '</div></div>' +
                        (!evalRes.isCorrect ? '<div class="flex items-start gap-2"><span class="text-slate-500 dark:text-slate-400 shrink-0">Respuesta correcta:</span> <div class="text-emerald-600 dark:text-emerald-400">' + renderMath(correctChoice) + '</div></div>' : '') +
                        '</div>';
                } else {
                    const userText = userAnswers[q.id] ? escapeText(userAnswers[q.id]) : '<em class="text-slate-400">Sin respuesta escrita</em>';
                    detailsHTML = '<div class="mt-3 text-sm space-y-2">' +
                        '<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">' +
                        '<span class="text-xs font-semibold uppercase text-slate-400 block mb-1">Tu respuesta:</span>' +
                        '<p class="text-slate-700 dark:text-slate-200 whitespace-pre-line">' + userText + '</p>' +
                        '</div>' +
                        (q.modelAnswer ? '<div class="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">' +
                        '<span class="text-xs font-semibold uppercase text-indigo-500 block mb-1">Solución / Guía esperada:</span>' +
                        '<div class="text-slate-700 dark:text-slate-300">' + renderMath(q.modelAnswer) + '</div></div>' : '') +
                        '</div>';
                }

                card.innerHTML = '<div class="flex items-start justify-between gap-4">' +
                    '<div class="font-bold text-slate-900 dark:text-white flex-1"><span class="text-slate-400 mr-1">#' + (idx + 1) + '</span> ' + renderMath(q.text) + '</div>' +
                    '<span class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ' +
                    (evalRes.isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300') +
                    '">' + evalRes.earnedPoints + ' / ' + pts + ' pts</span></div>' +
                    detailsHTML +
                    (q.explanation && q.type === 'multiple' ? '<div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/70 text-xs text-slate-500 dark:text-slate-400"><i class="fa-solid fa-circle-info text-indigo-500 mr-1"></i> ' + renderMath(q.explanation) + '</div>' : '');
                
                breakdownContainer.appendChild(card);
            });

            const pct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
            document.getElementById('res-score').textContent = totalEarned.toFixed(1).replace(/\\.0$/, '');
            document.getElementById('res-max-score').textContent = totalPossible.toFixed(1).replace(/\\.0$/, '');
            document.getElementById('res-percentage').textContent = pct + '%';

            const iconBg = document.getElementById('result-icon-bg');
            const icon = document.getElementById('result-icon');
            const msg = document.getElementById('result-feedback-msg');

            if (pct >= 80) {
                iconBg.className = "w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 text-3xl";
                icon.className = "fa-solid fa-trophy";
                msg.textContent = "¡Sobresaliente! Has completado la evaluación con éxito.";
            } else if (pct >= 50) {
                iconBg.className = "w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 text-3xl";
                icon.className = "fa-solid fa-medal";
                msg.textContent = "¡Buen trabajo! Has aprobado la evaluación.";
            } else {
                iconBg.className = "w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 text-3xl";
                icon.className = "fa-solid fa-book-open-reader";
                msg.textContent = "Puedes repasar los conceptos e intentarlo nuevamente.";
            }
        }

        function restartQuiz() {
            clearInterval(timerInterval);
            document.getElementById('quiz-active').classList.add('hidden');
            document.getElementById('quiz-results').classList.add('hidden');
            document.getElementById('quiz-intro').classList.remove('hidden');
            renderIntro();
        }

        function escapeText(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
