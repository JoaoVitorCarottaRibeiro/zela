import type { Nivel } from "@/lib/tipos";
import estilos from "./RiskBadge.module.css";

const ROTULO: Record<Nivel, string> = {
  verde: "Risco baixo",
  amarelo: "Atenção",
  vermelho: "Urgente",
};

export default function RiskBadge({ nivel }: { nivel: Nivel }) {
  return (
    <span className={`${estilos.selo} ${estilos[nivel]}`}>
      <span className={estilos.ponto} aria-hidden />
      {ROTULO[nivel]}
    </span>
  );
}
