export type TemaVisual = 'default' | 'dark-gold' | 'black' | 'light' | 'light-gold';

export const TEMAS_INFO: {
  id: TemaVisual;
  nombre: string;
  descripcion: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
  isDark: boolean;
}[] = [
  {
    id: 'default',
    nombre: 'Default (Oscuro Clásico)',
    descripcion: 'Pizarra oscura suave con acentos azul cielo equilibrados',
    previewBg: '#0f172a',
    previewCard: '#1e293b',
    previewAccent: '#0284c7',
    isDark: true,
  },
  {
    id: 'dark-gold',
    nombre: 'Elegante Oscuro',
    descripcion: 'Grafito carbón mate con acentos en bronce champán suave (cero reflejos)',
    previewBg: '#101319',
    previewCard: '#181c24',
    previewAccent: '#a4804c',
    isDark: true,
  },
  {
    id: 'black',
    nombre: 'Negro Puro (Alto Contraste)',
    descripcion: 'Fondo negro absoluto (OLED) con contraste máximo y texto nítido',
    previewBg: '#000000',
    previewCard: '#111111',
    previewAccent: '#3b82f6',
    isDark: true,
  },
  {
    id: 'light',
    nombre: 'Tema Claro',
    descripcion: 'Gris perla mate con tarjetas blancas y azul sereno descansado',
    previewBg: '#f4f6f9',
    previewCard: '#ffffff',
    previewAccent: '#0e74b2',
    isDark: false,
  },
  {
    id: 'light-gold',
    nombre: 'Elegante Claro',
    descripcion: 'Marfil cálido y lino con sutiles toques champán (filtra la luz azul)',
    previewBg: '#f6f3eb',
    previewCard: '#ffffff',
    previewAccent: '#94703c',
    isDark: false,
  },
];

export const ESCALAS_UI: { factor: number; label: string; desc: string }[] = [
  { factor: 0.5, label: 'x0,5', desc: 'Compacto' },
  { factor: 1, label: 'x1', desc: 'Normal' },
  { factor: 1.5, label: 'x1,5', desc: 'Ampliado' },
  { factor: 2, label: 'x2', desc: 'Grande' },
  { factor: 3, label: 'x3', desc: 'Extra' },
];

export function aplicarTemaVisual(tema: TemaVisual) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('app_tema_visual', tema);
  const isLight = tema === 'light' || tema === 'light-gold';
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
}

export function aplicarEscalaUI(factor: number) {
  const baseSize = 16;
  const targetPx = Math.round(baseSize * factor);
  document.documentElement.style.fontSize = `${targetPx}px`;
  if (document.body) {
    document.body.style.fontSize = `${targetPx}px`;
  }
  document.documentElement.style.setProperty('--ui-scale-factor', String(factor));
  localStorage.setItem('app_ui_scale', String(factor));
  localStorage.setItem('bpmim_zoom_level_v1', String(Math.round(factor * 100)));
}

export function inicializarTemaYEscala(defaultTema?: TemaVisual, defaultEscala?: number) {
  const savedTheme =
    (localStorage.getItem('app_tema_visual') as TemaVisual) ||
    defaultTema ||
    'default';

  let savedScale = Number(localStorage.getItem('app_ui_scale'));
  if (!savedScale) {
    const legacyZoom = Number(localStorage.getItem('bpmim_zoom_level_v1'));
    if (legacyZoom) {
      savedScale = legacyZoom / 100;
    }
  }
  if (!savedScale) savedScale = defaultEscala || 1;

  aplicarTemaVisual(savedTheme);
  aplicarEscalaUI(savedScale);
}
