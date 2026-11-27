import React, { useState, useRef, useEffect, useCallback } from "react";
import { VideoEmbed, VideoCuePoint } from "../types/quiz";
import { parseVideoUrl } from "../utils/markdownRenderer";
import {
  Video,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Circle,
  ArrowRight,
  Scissors,
  Award,
  XCircle,
} from "lucide-react";

interface VideoEmbedListProps {
  videos?: VideoEmbed[];
  compact?: boolean;
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseTimeInput(raw: string): number {
  const trimmed = (raw || "").trim();
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":").map(Number);
    return Math.max(0, (m || 0) * 60 + (s || 0));
  }
  return Math.max(0, Number(trimmed) || 0);
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, any>;
          events?: {
            onReady?: (event: any) => void;
            onStateChange?: (event: any) => void;
          };
        }
      ) => any;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
    __ytApiCallbacks?: Array<() => void>;
  }
}

function loadYouTubeIframeApi(cb: () => void) {
  if (window.YT && window.YT.Player) {
    cb();
    return;
  }
  window.__ytApiCallbacks = window.__ytApiCallbacks || [];
  window.__ytApiCallbacks.push(cb);

  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      const list = window.__ytApiCallbacks || [];
      window.__ytApiCallbacks = [];
      list.forEach((fn) => fn());
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  }
}

const InteractiveVideoCard: React.FC<{ video: VideoEmbed; compact: boolean }> = ({
  video,
  compact,
}) => {
  const parsed = parseVideoUrl(video.url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const cuePoints = [...(video.cuePoints || [])].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const isClip = video.playbackScope === "clip";
  const startSec = isClip && video.startSeconds !== undefined ? video.startSeconds : 0;
  const endSec = isClip && video.endSeconds !== undefined && video.endSeconds > startSec ? video.endSeconds : undefined;
  const feedbackMode = video.feedbackMode || "at_end";
  const feedbackAtSec = video.feedbackAtSeconds;

  const [triggeredIds, setTriggeredIds] = useState<Set<string>>(new Set());
  const [activeCue, setActiveCue] = useState<VideoCuePoint | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [feedbackTriggered, setFeedbackTriggered] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const triggeredRef = useRef(triggeredIds);
  triggeredRef.current = triggeredIds;
  const activeCueRef = useRef(activeCue);
  activeCueRef.current = activeCue;
  const cuePointsRef = useRef(cuePoints);
  cuePointsRef.current = cuePoints;
  const feedbackTriggeredRef = useRef(feedbackTriggered);
  feedbackTriggeredRef.current = feedbackTriggered;

  useEffect(() => {
    setTriggeredIds(new Set());
    setActiveCue(null);
    setAnswers({});
    setShowSummary(false);
    setFeedbackTriggered(false);
  }, [video.id, video.url, startSec, endSec, feedbackMode, feedbackAtSec]);

  const triggerCuePoint = useCallback((cp: VideoCuePoint) => {
    setTriggeredIds((prev) => new Set(prev).add(cp.id));
    setActiveCue(cp);
  }, []);

  const checkPlaybackTime = useCallback(
    (now: number, pauseFn: () => void) => {
      if (activeCueRef.current) return;

      // 1. Verificar si llegó al fin del fragmento
      if (endSec !== undefined && now >= endSec) {
        pauseFn();
        if (feedbackMode === "at_end" && cuePointsRef.current.length > 0) {
          setShowSummary(true);
          setFeedbackTriggered(true);
        }
        return;
      }

      // 2. Verificar si llegó al punto de retroalimentación programado
      if (
        feedbackMode === "at_timestamp" &&
        feedbackAtSec !== undefined &&
        !feedbackTriggeredRef.current &&
        now >= feedbackAtSec &&
        now < feedbackAtSec + 1.5
      ) {
        pauseFn();
        setFeedbackTriggered(true);
        setShowSummary(true);
        return;
      }

      // 3. Verificar puntos de pausa con preguntas
      const hit = cuePointsRef.current.find(
        (cp) => !triggeredRef.current.has(cp.id) && now >= cp.timeSeconds && now < cp.timeSeconds + 1.5
      );
      if (hit) {
        pauseFn();
        triggerCuePoint(hit);
      }
    },
    [endSec, feedbackMode, feedbackAtSec, triggerCuePoint]
  );

  // Inicializar YouTube IFrame Player API si es un enlace de YouTube
  useEffect(() => {
    if (parsed.kind !== "youtube" || !parsed.youtubeId) return;

    let destroyed = false;
    let pollTimer: number | null = null;

    loadYouTubeIframeApi(() => {
      if (destroyed || !ytContainerRef.current || !window.YT?.Player) return;

      ytContainerRef.current.innerHTML = "";
      const targetDiv = document.createElement("div");
      targetDiv.style.width = "100%";
      targetDiv.style.height = "100%";
      ytContainerRef.current.appendChild(targetDiv);

      const playerVars: Record<string, any> = {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      };
      if (startSec > 0) playerVars.start = Math.floor(startSec);
      if (endSec !== undefined) playerVars.end = Math.floor(endSec);

      ytPlayerRef.current = new window.YT.Player(targetDiv, {
        videoId: parsed.youtubeId!,
        width: "100%",
        height: "100%",
        playerVars,
        events: {
          onReady: () => {
            if (!destroyed) setYtReady(true);
          },
          onStateChange: (event: any) => {
            const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
            const endedState = window.YT?.PlayerState?.ENDED ?? 0;

            if (event.data === endedState) {
              if (pollTimer) window.clearInterval(pollTimer);
              if (feedbackMode === "at_end" && cuePointsRef.current.length > 0) {
                setShowSummary(true);
                setFeedbackTriggered(true);
              }
              return;
            }

            if (event.data === playingState) {
              if (pollTimer) window.clearInterval(pollTimer);
              pollTimer = window.setInterval(() => {
                if (destroyed) return;
                try {
                  const now = ytPlayerRef.current?.getCurrentTime?.() ?? 0;
                  checkPlaybackTime(now, () => ytPlayerRef.current?.pauseVideo?.());
                } catch {}
              }, 250);
            } else if (pollTimer) {
              window.clearInterval(pollTimer);
              pollTimer = null;
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (pollTimer) window.clearInterval(pollTimer);
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
      ytPlayerRef.current = null;
      setYtReady(false);
    };
  }, [parsed.kind, parsed.youtubeId, startSec, endSec, feedbackMode, checkPlaybackTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current && startSec > 0) {
      videoRef.current.currentTime = startSec;
    }
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    if (startSec > 0 && el.currentTime < startSec) {
      el.currentTime = startSec;
      return;
    }
    checkPlaybackTime(el.currentTime, () => el.pause());
  };

  const handleVideoEnded = () => {
    if (feedbackMode === "at_end" && cuePoints.length > 0) {
      setShowSummary(true);
      setFeedbackTriggered(true);
    }
  };

  const handleOpenCueManually = (cp: VideoCuePoint) => {
    setShowSummary(false);
    if (videoRef.current) {
      videoRef.current.currentTime = cp.timeSeconds;
      videoRef.current.pause();
    } else if (ytPlayerRef.current && ytReady) {
      try {
        ytPlayerRef.current.seekTo(cp.timeSeconds, true);
        ytPlayerRef.current.pauseVideo();
      } catch {}
    }
    triggerCuePoint(cp);
  };

  const handleResumeVideo = () => {
    setActiveCue(null);
    setShowSummary(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (ytPlayerRef.current && ytReady) {
      try {
        ytPlayerRef.current.playVideo();
      } catch {}
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <div className="relative">
        {parsed.kind === "direct" ? (
          <video
            ref={videoRef}
            src={parsed.embedUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className={`w-full ${compact ? "max-h-48" : "max-h-72"} bg-black`}
          />
        ) : parsed.kind === "youtube" ? (
          <div ref={ytContainerRef} className={`w-full ${compact ? "h-44" : "h-64"} bg-black`}>
            <iframe
              src={parsed.embedUrl}
              title={video.caption || "Video de YouTube"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className={`w-full ${compact ? "h-44" : "h-64"} bg-black`}>
            <iframe
              src={startSec > 0 ? `${parsed.embedUrl}#t=${startSec}s` : parsed.embedUrl}
              title={video.caption || "Video de pregunta"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Overlay interactivo cuando el video se pausa en una pregunta */}
        {activeCue && (
          <div className="p-4 bg-slate-950/95 border-t-2 border-amber-500 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Pause className="w-3 h-3" />
                Pausa en {formatSeconds(activeCue.timeSeconds)}
              </span>
              <span className="text-[10px] text-slate-400">
                {feedbackMode === "immediate"
                  ? "Corrección inmediata"
                  : feedbackMode === "at_timestamp" && feedbackAtSec !== undefined
                  ? `Respuestas se mostrarán en ${formatSeconds(feedbackAtSec)}`
                  : "Respuestas se mostrarán al final del video"}
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-100 leading-relaxed">
              {activeCue.prompt}
            </p>

            {activeCue.options && activeCue.options.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {activeCue.options.map((opt, idx) => {
                  const chosen = answers[activeCue.id] === idx;
                  const revealNow = feedbackMode === "immediate" && answers[activeCue.id] !== undefined;

                  let styleClass =
                    "bg-slate-900 border-slate-700 text-slate-200 hover:border-sky-500/50";
                  if (revealNow) {
                    if (opt.isCorrect) {
                      styleClass = "bg-emerald-950/40 border-emerald-500 text-emerald-200";
                    } else if (chosen) {
                      styleClass = "bg-rose-950/40 border-rose-500 text-rose-200";
                    }
                  } else if (chosen) {
                    styleClass = "bg-sky-500/20 border-sky-500 text-sky-200 font-semibold";
                  }

                  return (
                    <button
                      key={opt.id || idx}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [activeCue.id]: idx }))
                      }
                      className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition-colors ${styleClass}`}
                    >
                      {chosen ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      )}
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={2}
                value={(answers[activeCue.id] as string) || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [activeCue.id]: e.target.value }))
                }
                placeholder="Escribe tu respuesta aquí..."
                className="w-full rounded-lg p-2 text-xs bg-slate-900 border border-slate-700 text-slate-100"
              />
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResumeVideo}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Continuar Video</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Panel de Retroalimentación / Resultados (en un punto del video o al final) */}
        {showSummary && cuePoints.length > 0 && (
          <div className="p-4 bg-slate-950/95 border-t-2 border-emerald-500 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Award className="w-4 h-4" />
                Revisión de Respuestas del Video
              </span>
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cuePoints.map((cp, idx) => {
                const userAns = answers[cp.id];
                const hasOpts = cp.options && cp.options.length > 0;
                const correctIdx = hasOpts
                  ? cp.options!.findIndex((o) => o.isCorrect)
                  : -1;
                const isCorrect = hasOpts && userAns === correctIdx;

                return (
                  <div
                    key={cp.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200">
                        #{idx + 1} ({formatSeconds(cp.timeSeconds)}): {cp.prompt}
                      </span>
                      {hasOpts &&
                        (isCorrect ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Correcta
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 shrink-0">
                            <XCircle className="w-3 h-3" /> Incorrecta
                          </span>
                        ))}
                    </div>
                    {hasOpts ? (
                      <div className="text-[11px] text-slate-400">
                        Tu respuesta:{" "}
                        <strong className="text-slate-200">
                          {typeof userAns === "number"
                            ? cp.options![userAns]?.text || "—"
                            : "Sin responder"}
                        </strong>{" "}
                        &bull; Correcta:{" "}
                        <strong className="text-emerald-400">
                          {correctIdx >= 0 ? cp.options![correctIdx]?.text : "—"}
                        </strong>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        Tu respuesta:{" "}
                        <strong className="text-slate-200">{userAns || "Sin responder"}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Barra inferior del video + marcadores */}
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-750">
        <div className="flex items-center gap-2 min-w-0">
          <Video className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{video.caption || video.url}</span>
          {isClip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-mono shrink-0">
              <Scissors className="w-2.5 h-2.5" />
              {formatSeconds(startSec)} – {endSec !== undefined ? formatSeconds(endSec) : "Fin"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {cuePoints.length > 0 && (
            <>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pausas ({cuePoints.length}):
              </span>
              {cuePoints.map((cp, idx) => (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => handleOpenCueManually(cp)}
                  title={cp.prompt}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border transition-colors ${
                    triggeredIds.has(cp.id)
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                  }`}
                >
                  #{idx + 1} · {formatSeconds(cp.timeSeconds)}
                </button>
              ))}
            </>
          )}

          {cuePoints.length > 0 && feedbackMode !== "immediate" && (
            <button
              type="button"
              onClick={() => setShowSummary(!showSummary)}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
            >
              Ver Respuestas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoEmbedList: React.FC<VideoEmbedListProps> = ({ videos, compact = false }) => {
  if (!videos || videos.length === 0) return null;

  return (
    <div className={`space-y-2.5 ${compact ? "my-2" : "my-3"}`}>
      {videos.map((v) => (
        <InteractiveVideoCard key={v.id} video={v} compact={compact} />
      ))}
    </div>
  );
};
