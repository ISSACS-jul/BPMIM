import { parseImageAlt } from "./imageSize";
import { Quiz } from "../types/quiz";
import { getShuffledMatchingRight } from "./matchingHelper";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

/**
 * Genera la cadena de texto con el código fuente LaTeX (.tex)
 * basado exactamente en la plantilla formal institucional.
 */
export function generateLatexCode(quiz: Quiz, mode: "exam" | "solutions" = "exam"): string {
  const isSolutions = mode === "solutions";
  const isChoice = (t: string) =>
    t === "multiple_choice" || t === "multiple_response" || t === "true_false";
  const mcCount = quiz.items.filter((item) => isChoice(item.question.type)).length;

  let tex = `% ============================================================
%  PLANTILLA DE EVALUACIÓN  ·  Opción múltiple y preguntas abiertas
%  Compilar con: pdflatex nombre_archivo.tex   (dos veces)
% ============================================================
\\documentclass[11pt,a4paper]{article}

% ---------- Codificación e idioma ----------
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{microtype}
\\usepackage[spanish]{babel}

% ---------- Tipografía (Palatino + Helvetica para títulos) ----------
\\usepackage[sc]{mathpazo}
\\usepackage[scaled=0.92]{helvet}
\\linespread{1.08}

% ---------- Página ----------
\\usepackage[top=2.1cm,bottom=2.1cm,left=2.4cm,right=2.4cm,
            headheight=15pt,footskip=1.2cm]{geometry}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usepackage[most]{tcolorbox}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{array}
\\usepackage{tabularx}
\\usepackage{amssymb}
\\usepackage{amsmath}
\\usepackage{graphicx}

% ---------- Paleta de colores ----------
\\definecolor{azulprincipal}{HTML}{1F3A5F}   % azul marino
\\definecolor{azulclaro}{HTML}{EAF0F7}       % fondo suave
\\definecolor{dorado}{HTML}{B08D57}          % acento
\\definecolor{grisborde}{HTML}{C9D1DB}
\\definecolor{gristexto}{HTML}{4A5568}

% ---------- Datos del examen ----------
\\newcommand{\\Institucion}{${escapeLatex(quiz.header.institution)}}
\\newcommand{\\Curso}{${escapeLatex(quiz.header.course)}}
\\newcommand{\\TituloExamen}{${escapeLatex(quiz.header.title)}}
\\newcommand{\\Docente}{${escapeLatex(quiz.header.teacher)}}
\\newcommand{\\Fecha}{${escapeLatex(quiz.header.date)}}

% ---------- Encabezado y pie de página ----------
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\fancyhead[L]{\\sffamily\\scriptsize\\color{gristexto}\\Institucion\\ \\textbullet\\ \\Curso}
\\fancyhead[R]{\\sffamily\\scriptsize\\color{gristexto}\\TituloExamen}
\\fancyfoot[C]{\\sffamily\\scriptsize\\color{gristexto}%
  \\tikz[baseline=-0.6ex]{\\draw[dorado,line width=0.5pt](0,0)--(0.6,0);}\\quad
  Página \\thepage\\ de \\pageref{LastPage}\\quad
  \\tikz[baseline=-0.6ex]{\\draw[dorado,line width=0.5pt](0,0)--(0.6,0);}}

% La primera página no repite el encabezado corriente
\\fancypagestyle{plain}{\\fancyhf{}\\renewcommand{\\headrulewidth}{0pt}%
  \\fancyfoot[C]{\\sffamily\\scriptsize\\color{gristexto}%
  \\tikz[baseline=-0.6ex]{\\draw[dorado,line width=0.5pt](0,0)--(0.6,0);}\\quad
  Página \\thepage\\ de \\pageref{LastPage}\\quad
  \\tikz[baseline=-0.6ex]{\\draw[dorado,line width=0.5pt](0,0)--(0.6,0);}}}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

% ---------- Estilos de caja ----------
\\tcbset{
  encab/.style={enhanced, colback=white, colframe=azulprincipal,
    boxrule=0.8pt, arc=2pt, left=0pt,right=0pt,top=0pt,bottom=0pt,
    boxsep=0pt, before skip=0pt, after skip=7pt},
  instr/.style={enhanced, colback=white, colframe=azulprincipal,
    boxrule=0.7pt, arc=3pt, left=9pt,right=9pt,top=5pt,bottom=5pt,
    before skip=0pt, after skip=12pt},
  hoja/.style={enhanced, colback=white, colframe=azulprincipal,
    boxrule=0.8pt, arc=2pt, left=8pt,right=8pt,top=4pt,bottom=4pt,
    before skip=6pt, after skip=10pt, fonttitle=\\sffamily\\bfseries\\scriptsize,
    coltitle=white, colbacktitle=azulprincipal, attach boxed title to top left={xshift=10pt,yshift=-2mm},
    boxed title style={arc=2pt,boxrule=0pt,top=1pt,bottom=1pt}}
}

% ---------- Campo con línea punteada (Estudiante, Grupo) ----------
\\newcommand{\\campolinea}[2]{%
  \\parbox[b]{#1}{\\sffamily\\small\\color{gristexto}#2\\,{\\color{grisborde}\\dotfill}}}

% ---------- Contadores ----------
\\newcounter{preg}
\\setcounter{preg}{0}

% ---------- Número de pregunta en círculo ----------
\\newcommand{\\numpreg}[1]{%
  \\tikz[baseline=(n.base)]\\node[circle,fill=azulprincipal,text=white,
    inner sep=0pt,minimum size=18pt,font=\\sffamily\\bfseries\\footnotesize](n){#1};}

% ---------- Opción de selección múltiple ----------
\\newcommand{\\opcion}[2]{%
  {\\sffamily\\bfseries\\color{azulprincipal}#1.}\\hspace{5pt}#2}

% ---------- HOJA DE RESPUESTAS (burbujas estilo ICFES) ----------
\\newcommand{\\hojarespuestas}[1]{%
  \\begin{tcolorbox}[hoja,title={HOJA DE RESPUESTAS}]
  \\vspace{3pt}
  \\centering
  \\begin{tikzpicture}[x=1cm,y=1cm]
    \\foreach \\q in {1,...,#1}{
      \\pgfmathtruncatemacro{\\c}{int((\\q-1)/4)}
      \\pgfmathtruncatemacro{\\r}{mod(\\q-1,4)}
      \\pgfmathsetmacro{\\ox}{\\c*4.1}
      \\pgfmathsetmacro{\\oy}{-\\r*0.56}
      \\node[font=\\sffamily\\scriptsize\\bfseries,text=azulprincipal,anchor=east]
        at (\\ox+0.55,\\oy) {\\q};
      \\foreach \\l [count=\\i from 0] in {A,B,C,D}{
        \\node[circle,draw=azulprincipal,line width=0.6pt,inner sep=0pt,
          minimum size=0.42cm,font=\\sffamily\\fontsize{5.5}{6}\\selectfont,
          text=azulprincipal] at (\\ox+0.95+\\i*0.7,\\oy) {\\l};
      }
    }
  \\end{tikzpicture}
  \\end{tcolorbox}}

% ---------- Enunciado ----------
\\newcommand{\\enunciado}[1]{%
  \\begin{minipage}[t]{\\linewidth}\\small #1\\end{minipage}}

% ---------- PREGUNTA DE OPCIÓN MÚLTIPLE ----------
\\newcommand{\\preguntaMC}[5]{%
  \\refstepcounter{preg}%
  \\begin{minipage}{\\linewidth}
    \\noindent
    \\begin{tabularx}{\\linewidth}{@{}c@{\\hspace{9pt}}X@{}}
      \\numpreg{\\thepreg} & \\enunciado{#1}
    \\end{tabularx}\\par\\vspace{4pt}
    \\hspace{27pt}\\begin{minipage}{\\dimexpr\\linewidth-27pt\\relax}\\small
      \\renewcommand{\\arraystretch}{1.1}
      \\begin{tabularx}{\\linewidth}{@{}X@{\\hspace{8pt}}X@{}}
        \\opcion{A}{#2} & \\opcion{B}{#3}\\\\
        \\opcion{C}{#4} & \\opcion{D}{#5}
      \\end{tabularx}
    \\end{minipage}
  \\end{minipage}
  \\par\\vspace{12pt}}

% ---------- Cuadro de respuesta ----------
\\newcommand{\\cuadrorespuesta}[1]{%
  \\begin{tcolorbox}[enhanced, colback=white, colframe=grisborde,
      boxrule=0.8pt, arc=2pt, left=0pt,right=0pt,top=0pt,bottom=0pt,
      height=#1, valign=top, before skip=0pt, after skip=0pt,
      borderline west={2.5pt}{0pt}{dorado}]
    \\null
  \\end{tcolorbox}}

% ---------- PREGUNTA ABIERTA ----------
\\newcommand{\\preguntaAbierta}[2]{%
  \\refstepcounter{preg}%
  \\begin{minipage}{\\linewidth}
    \\noindent
    \\begin{tabularx}{\\linewidth}{@{}c@{\\hspace{9pt}}X@{}}
      \\numpreg{\\thepreg} & \\enunciado{#1}
    \\end{tabularx}\\par\\vspace{5pt}
    \\hspace{27pt}\\begin{minipage}{\\dimexpr\\linewidth-27pt\\relax}
      \\cuadrorespuesta{#2}
    \\end{minipage}
  \\end{minipage}
  \\par\\vspace{14pt}}

% ============================================================
\\begin{document}
\\thispagestyle{plain}

% ---------- BANDA SUPERIOR ----------
\\begin{tikzpicture}[remember picture,overlay]
  \\fill[azulprincipal] (current page.north west) rectangle
       ([yshift=-0.55cm]current page.north east);
  \\fill[dorado] ([yshift=-0.55cm]current page.north west) rectangle
       ([yshift=-0.62cm]current page.north east);
\\end{tikzpicture}
\\vspace*{-0.7cm}

% ---------- ENCABEZADO DEL EXAMEN ----------
\\begin{center}
  {\\sffamily\\bfseries\\fontsize{16}{19}\\selectfont\\color{azulprincipal}\\Institucion}\\\\[5pt]
  {\\sffamily\\bfseries\\large\\color{azulprincipal}\\TituloExamen}\\\\[4pt]
  {\\sffamily\\small\\color{gristexto}\\Curso\\ \\ \\textbullet\\ \\ Docente: \\Docente\\ \\ \\textbullet\\ \\ Fecha: \\Fecha}
\\end{center}
\\vspace{-2pt}
{\\color{azulprincipal}\\hrule height 0.6pt}
\\vspace{9pt}

% ---------- ESTUDIANTE Y GRUPO ----------
\\noindent
\\campolinea{0.70\\linewidth}{Estudiante:}\\hfill\\campolinea{0.25\\linewidth}{Grupo:}

\\vspace{9pt}

% ---------- INSTRUCCIONES ----------
\\begin{tcolorbox}[instr]
  \\sffamily\\footnotesize\\itshape\\color{gristexto}
  \\textbf{\\color{azulprincipal}Instrucciones:} ${escapeLatex(quiz.header.instructions)}
\\end{tcolorbox}
`;

  if (mcCount > 0 && quiz.header.showAnswerSheet !== false) {
    tex += `
% ============================================================
%  HOJA DE RESPUESTAS (${mcCount} preguntas de opción múltiple)
% ============================================================
\\hojarespuestas{${mcCount}}
\\vspace{6pt}
`;
  }

  tex += `
% ============================================================
%  PREGUNTAS
% ============================================================
`;

  let qNum = 0;
  quiz.items.forEach((item) => {
    const q = item.question;
    if (q.type !== "stimulus") qNum += 1;

    const videoNotes =
      q.videos && q.videos.length > 0
        ? `\n\n{\\footnotesize\\color{azulprincipal}\\textbf{Material audiovisual:} ${q.videos
            .map((v) => `${v.caption ? v.caption + ": " : ""}${v.url}`)
            .join(" | ")}}`
        : "";

    if (q.type === "stimulus") {
      tex += `\\begin{tcolorbox}[enhanced, colback=azulsuave, colframe=dorado, boxrule=0.8pt, arc=2pt]\n`;
      if (q.stimulusTitle) {
        tex += `{\\sffamily\\small\\bfseries\\color{azulprincipal} ${formatLatexBody(q.stimulusTitle)}${
          q.stimulusRangeNote ? ` (${formatLatexBody(q.stimulusRangeNote)})` : ""
        }}\\\\[4pt]\n`;
      }
      tex += `${formatLatexBody(q.prompt)}${videoNotes}\n\\end{tcolorbox}\n\\vspace{6pt}\n\n`;
    } else if (q.type === "open") {
      const height = q.openResponseHeight ? `${q.openResponseHeight}cm` : "3.5cm";
      tex += `\\preguntaAbierta{${formatLatexBody(q.prompt)}${videoNotes}}{${height}}\n\n`;

      if (isSolutions && q.explanation) {
        tex += `{\\footnotesize\\color{azulprincipal}\\textbf{Criterio/Solución Pregunta ${qNum}:} ${formatLatexBody(q.explanation)}}\n\\vspace{8pt}\n\n`;
      }
    } else if (q.type === "matching" && q.matchingPairs) {
      const rightCol = getShuffledMatchingRight(q);
      const maxLen = Math.max(q.matchingPairs.length, rightCol.length);
      const rowsTex: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const leftPart = q.matchingPairs[i]
          ? `${i + 1}. ${formatLatexBody(q.matchingPairs[i].left)}`
          : "";
        const rightPart = rightCol[i]
          ? `${String.fromCharCode(65 + i)}. ${formatLatexBody(rightCol[i].text)}`
          : "";
        const ansBox = q.matchingPairs[i]
          ? isSolutions
            ? `[ ${String.fromCharCode(65 + Math.max(0, rightCol.findIndex((r) => r.pairId === q.matchingPairs![i].id)))} ]`
            : "[ \\quad ]"
          : "";
        rowsTex.push(`  ${leftPart} \\hfill ${ansBox} \\quad ${rightPart}`);
      }
      const pairsTex = rowsTex.join(" \\\\\n");
      tex += `\\preguntaAbierta{${formatLatexBody(q.prompt)}${videoNotes}\\\\[6pt]\n${pairsTex}}{1.2cm}\n\n`;
    } else if (q.type === "ordering" && q.orderingItems) {
      const stepsTex = q.orderingItems
        .map((o) => `  [ \\quad ] ${formatLatexBody(o.text)}`)
        .join(" \\\\\n");
      tex += `\\preguntaAbierta{${formatLatexBody(q.prompt)}${videoNotes}\\\\[6pt]\n${stepsTex}}{1.2cm}\n\n`;
    } else if (q.type === "numeric" || q.type === "fill_blanks") {
      const promptFmt = formatLatexBody(
        q.prompt.replace(/\{\{([^}]+?)\}\}/g, (_, ans) =>
          isSolutions ? `\\underline{\\textbf{${ans}}}` : `\\underline{\\hspace{2.5cm}}`
        )
      );
      const ansLine =
        q.type === "numeric"
          ? `\\\\[6pt]\\textbf{Respuesta:} ${
              isSolutions ? `${q.numericAnswer || ""} ${q.numericUnit || ""}` : "\\underline{\\hspace{3cm}} " + (q.numericUnit || "")
            }`
          : "";
      tex += `\\preguntaAbierta{${promptFmt}${videoNotes}${ansLine}}{1.2cm}\n\n`;
    } else {
      const optA = q.options[0]?.text || "";
      const optB = q.options[1]?.text || "";
      const optC = q.options[2]?.text || "";
      const optD = q.options[3]?.text || "";

      tex += `\\preguntaMC{${formatLatexBody(q.prompt)}${videoNotes}}
  {${formatLatexBody(optA)}}{${formatLatexBody(optB)}}
  {${formatLatexBody(optC)}}{${formatLatexBody(optD)}}\n\n`;

      if (q.type === "true_false" && q.requireJustification) {
        tex += `{\\footnotesize\\color{gristexto}\\textit{Justifique su respuesta:} \\hrulefill}\\\\[6pt]\n`;
      }

      if (isSolutions) {
        const correctOpts = q.options
          .map((o, idx) => (o.isCorrect ? ["A", "B", "C", "D", "E", "F"][idx] : null))
          .filter(Boolean)
          .join(", ");
        tex += `{\\footnotesize\\color{azulprincipal}\\textbf{Respuesta Correcta Pregunta ${qNum}:} Opción ${correctOpts || "N/A"}. ${formatLatexBody(q.explanation || "")}}\n\\vspace{8pt}\n\n`;
      }
    }
  });

  tex += `
% ---------- CIERRE ----------
\\vspace{6pt}
\\begin{center}
  \\tikz{\\draw[dorado,line width=0.6pt](0,0)--(2.2,0);}\\quad
  {\\sffamily\\small\\bfseries\\color{azulprincipal}\\textit{Fin del examen}}\\quad
  \\tikz{\\draw[dorado,line width=0.6pt](0,0)--(2.2,0);}\\\\[3pt]
  {\\sffamily\\scriptsize\\color{gristexto}Revise sus respuestas antes de entregar.}
\\end{center}

\\end{document}
`;

  return tex;
}

/**
 * Descarga directamente el código fuente LaTeX en un archivo .tex
 */
export function downloadLatexFile(quiz: Quiz, mode: "exam" | "solutions" = "exam") {
  const tex = generateLatexCode(quiz, mode);
  const blob = new Blob([tex], { type: "text/plain;charset=utf-8" });
  const filename = `${sanitizeFilename(quiz.header.title)}_${mode === "solutions" ? "Solucionario" : "Examen"}.tex`;
  saveAs(blob, filename);
}

/**
 * Exportación directa (retrocompatibilidad)
 */
export function exportToLatex(quiz: Quiz, mode: "exam" | "solutions" = "exam") {
  downloadLatexFile(quiz, mode);
}

/**
 * Genera y descarga un documento Word (.docx)
 */
export async function exportToWord(quiz: Quiz, mode: "exam" | "solutions" = "exam") {
  const isSolutions = mode === "solutions";

  const tableHeader = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "1F3A5F" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: "center" as any,
                children: [
                  new TextRun({
                    text: quiz.header.institution.toUpperCase(),
                    bold: true,
                    size: 26,
                    color: "1F3A5F",
                  }),
                ],
              }),
              new Paragraph({
                alignment: "center" as any,
                children: [
                  new TextRun({
                    text: quiz.header.title,
                    bold: true,
                    size: 22,
                    color: "1F3A5F",
                  }),
                ],
              }),
              new Paragraph({
                alignment: "center" as any,
                children: [
                  new TextRun({
                    text: `${quiz.header.course}  •  Docente: ${quiz.header.teacher}  •  Fecha: ${quiz.header.date}`,
                    size: 18,
                    color: "4A5568",
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  });

  const children: any[] = [
    tableHeader,
    new Paragraph({ text: "", spacing: { after: 120 } }),
    new Paragraph({
      children: [
        new TextRun({ text: "Estudiante: ", bold: true, color: "4A5568" }),
        new TextRun({ text: "...........................................................................................   " }),
        new TextRun({ text: "Grupo: ", bold: true, color: "4A5568" }),
        new TextRun({ text: "........................" }),
      ],
      spacing: { after: 180 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Instrucciones: ", bold: true, color: "1F3A5F" }),
        new TextRun({
          text: quiz.header.instructions,
          italics: true,
          color: "4A5568",
        }),
      ],
      spacing: { after: 240 },
    }),
  ];

  let wordQNum = 0;
  quiz.items.forEach((item) => {
    const q = item.question;
    const isStimulus = q.type === "stimulus";
    if (!isStimulus) wordQNum += 1;

    children.push(
      new Paragraph({
        children: isStimulus
          ? [
              new TextRun({
                text: `${q.stimulusTitle || "CONTEXTO COMPARTIDO"}${
                  q.stimulusRangeNote ? ` (${q.stimulusRangeNote})` : ""
                }: `,
                bold: true,
                size: 22,
                color: "B08D57",
              }),
              new TextRun({
                text: cleanWordText(q.prompt),
                size: 22,
              }),
            ]
          : [
              new TextRun({
                text: `${wordQNum}. `,
                bold: true,
                size: 22,
                color: "1F3A5F",
              }),
              new TextRun({
                text: `(${item.points} pt${item.points > 1 ? "s" : ""}) `,
                italics: true,
                size: 18,
                color: "718096",
              }),
              new TextRun({
                text: cleanWordText(
                  q.prompt.replace(/\{\{([^}]+?)\}\}/g, (_, ans) =>
                    isSolutions ? `[${ans}]` : "__________"
                  )
                ),
                size: 22,
              }),
            ],
        spacing: { before: 180, after: 100 },
      })
    );

    if (q.videos && q.videos.length > 0) {
      q.videos.forEach((v) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `    [Video${v.caption ? ` - ${v.caption}` : ""}: ${v.url}]`,
                italics: true,
                size: 18,
                color: "2B6CB0",
              }),
            ],
            spacing: { after: 60 },
          })
        );
      });
    }

    if (isStimulus) {
      // No requiere espacio de respuesta
    } else if (q.type === "open") {
      const box = new Table({
        width: { size: 95, type: WidthType.PERCENTAGE },
        borders: {
          left: { style: BorderStyle.SINGLE, size: 18, color: "B08D57" },
          top: { style: BorderStyle.SINGLE, size: 4, color: "C9D1DB" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "C9D1DB" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "C9D1DB" },
        },
        rows: [
          new TableRow({
            height: { value: 1400, rule: "atleast" as any },
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "[Espacio para procedimiento y respuesta]",
                        color: "A0AEC0",
                        italics: true,
                        size: 18,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
      children.push(box);
    } else if (q.type === "matching" && q.matchingPairs) {
      const rightCol = getShuffledMatchingRight(q);
      const maxLen = Math.max(q.matchingPairs.length, rightCol.length);
      for (let pIdx = 0; pIdx < maxLen; pIdx++) {
        const leftItem = q.matchingPairs[pIdx];
        const rightItem = rightCol[pIdx];
        const ansBox = leftItem
          ? isSolutions
            ? `[ ${String.fromCharCode(65 + Math.max(0, rightCol.findIndex((r) => r.pairId === leftItem.id)))} ]`
            : "[   ]"
          : "     ";
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `    ${leftItem ? `${pIdx + 1}. ${cleanWordText(leftItem.left)}   ${ansBox}` : "                              "}      ${rightItem ? `${String.fromCharCode(65 + pIdx)}. ${cleanWordText(rightItem.text)}` : ""}`,
                size: 20,
              }),
            ],
            spacing: { after: 60 },
          })
        );
      }
    } else if (q.type === "ordering" && q.orderingItems) {
      q.orderingItems.forEach((o) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `    [   ]  ${cleanWordText(o.text)}`,
                size: 20,
              }),
            ],
            spacing: { after: 60 },
          })
        );
      });
    } else if (q.type === "numeric") {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `    Respuesta: ${
                isSolutions ? `${q.numericAnswer || ""} ${q.numericUnit || ""}` : `________________  ${q.numericUnit || ""}`
              }`,
              bold: true,
              size: 20,
              color: isSolutions ? "1F3A5F" : "2D3748",
            }),
          ],
          spacing: { after: 80 },
        })
      );
    } else if (q.type !== "fill_blanks") {
      const labels = ["A", "B", "C", "D", "E", "F"];
      q.options.forEach((opt, optIndex) => {
        const isCorrectMark = isSolutions && opt.isCorrect;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `    ${labels[optIndex]}.  `,
                bold: true,
                color: isCorrectMark ? "1F3A5F" : "2D3748",
              }),
              new TextRun({
                text: cleanWordText(opt.text),
                bold: isCorrectMark,
                color: isCorrectMark ? "1F3A5F" : "2D3748",
              }),
              isCorrectMark
                ? new TextRun({
                    text: "  ✓ [Respuesta Correcta]",
                    bold: true,
                    color: "2B6CB0",
                  })
                : new TextRun({ text: "" }),
            ],
            spacing: { after: 60 },
          })
        );
      });
    }

    if (isSolutions && q.explanation) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `    Criterio/Solución: ${cleanWordText(q.explanation)}`,
              italics: true,
              color: "1F3A5F",
              size: 20,
            }),
          ],
          spacing: { before: 80, after: 160 },
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${sanitizeFilename(quiz.header.title)}_${isSolutions ? "Solucionario" : "Examen"}.docx`;
  saveAs(blob, filename);
}

export function exportToPdf() {
  window.print();
}

function escapeLatex(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\textbackslash ")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde ")
    .replace(/\^/g, "\\textasciicircum ");
}

function formatLatexBody(str: string): string {
  if (!str) return "";
  // Reemplazar imágenes Markdown ![alt|50%](imagenes/archivo.png) por \includegraphics con escala
  let formatted = str.replace(
    /!\[(.*?)\]\(((?:imagenes\/|images\/|\.\/imagenes\/)[^)\s]+)\)/g,
    (_, altRaw, path) => {
      const { widthPercent } = parseImageAlt(altRaw);
      const scale = (widthPercent / 100).toFixed(2);
      const cleanPath = path.replace(/^\.\//, "");
      return `\\begin{center}\\includegraphics[width=${scale}\\linewidth]{${cleanPath}}\\end{center}`;
    }
  );
  return formatted.replace(/\n\n/g, "\\par\\vspace{4pt}\\noindent ");
}

function cleanWordText(str: string): string {
  if (!str) return "";
  return str.replace(/!\[.*?\]\(.*?\)/g, "[Imagen adjunta]");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 30) || "evaluacion";
}
