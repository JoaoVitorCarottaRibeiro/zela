// Ícones em traço (SVG), sem emoji. Herdam a cor via currentColor.
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconeTexto(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
      <path d="M8.5 11.5h7M8.5 14.5h4" />
    </svg>
  );
}

export function IconeVoz(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function IconeFoto(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconeCasa(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10.5V19h12v-8.5" />
      <path d="M10 19v-4h4v4" />
    </svg>
  );
}

export function IconeUbs(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M5 20V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V20" />
      <path d="M3 20h18" />
      <path d="M12 8.5v5M9.5 11h5" />
    </svg>
  );
}

export function IconeTelessaude(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="M15 10.5 21 7v10l-6-3.5" />
      <path d="M9 10.5v3M7.5 12h3" />
    </svg>
  );
}

export function IconeSamu(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H14v9H3Z" />
      <path d="M14 9h3.5L21 12.5V15h-7Z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="16.5" cy="18" r="1.8" />
      <path d="M8 10.5v3M6.5 12h3" />
    </svg>
  );
}

export function IconeEscudo(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3 5 6v5.5c0 4.3 3 7.5 7 9 4-1.5 7-4.7 7-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconeOuvido(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M6 11a6 6 0 1 1 12 0c0 2.2-1.6 3-2.6 3.9-1 .9-1.4 1.6-1.4 2.6a2.4 2.4 0 0 1-4.8.2" />
      <path d="M9.5 10.5a2.5 2.5 0 0 1 5 0" />
    </svg>
  );
}

export function IconeRede(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5.5" cy="18" r="2.2" />
      <circle cx="18.5" cy="18" r="2.2" />
      <path d="M10.6 6.8 7 15.8M13.4 6.8 17 15.8M7.7 18h8.6" />
    </svg>
  );
}

export function IconeRelogio(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconeSeta(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconeCheck(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}
