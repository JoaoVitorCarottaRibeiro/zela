"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LMap } from "leaflet";
import { useAuth } from "@/lib/auth";
import type { Usuario } from "@/lib/tipos";
import estilos from "./MapaCliente.module.css";

/* ------------------------------------------------------------------ *
 * Soluções 100% gratuitas e sem chave de API:
 *  - Mapa e tiles: Leaflet + OpenStreetMap
 *  - Unidades próximas: Overpass API (dados do OpenStreetMap)
 *  - Tempo a pé / de carro: Valhalla público (valhalla1.openstreetmap.de)
 *  - Transporte público: link direto para o Google Maps (modo transit)
 * ------------------------------------------------------------------ */

interface Local {
  id: string;
  nome: string;
  tipo: string;
  lat: number;
  lon: number;
  endereco: string | null;
  distancia: number; // metros, em linha reta
}

interface Coord {
  lat: number;
  lon: number;
}

// Fallback final: Vila Andrade (SP), caso não haja localização nem endereço.
const FALLBACK: Coord = { lat: -23.6339, lon: -46.7389 };

/** Geocodifica o endereço cadastrado do usuário (via Nominatim) para usar como
 *  base do mapa quando a localização atual não está disponível. */
async function geocodeEndereco(u: Usuario): Promise<Coord | null> {
  const partes = [u.logradouro, u.bairro, u.cidade, u.uf].filter(Boolean);
  const tentativas: string[] = [];
  if (partes.length) tentativas.push(partes.join(", ") + ", Brasil");
  if (u.cep) tentativas.push(`${u.cep}, Brasil`);
  for (const q of tentativas) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
        `&format=jsonv2&limit=1&countrycodes=br`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) continue;
      const j = await r.json();
      if (Array.isArray(j) && j[0]) {
        const lat = parseFloat(j[0].lat);
        const lon = parseFloat(j[0].lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
      }
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
}

// --------------------------- utilidades --------------------------- //

function haversine(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function formatarDistancia(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatarDuracao(seg: number | null): string {
  if (seg == null) return "indisponível";
  const min = Math.round(seg / 60);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Diz se a unidade é PÚBLICA (SUS) e com que rótulo. Devolve null para o que
 *  não tem sinal público (ex.: hospitais particulares), para não entrar na
 *  lista — a Zela é para quem depende do SUS. Conservador de propósito: prefere
 *  deixar de fora um público mal cadastrado a mostrar um particular. */
function sinalPublico(tags: Record<string, string>): string | null {
  const nome = (tags.name || tags["name:pt"] || "").toLowerCase();
  const operador = (tags.operator || "").toLowerCase();
  const tipoOperador = (tags["operator:type"] || "").toLowerCase();
  const texto = `${nome} ${operador}`;

  // UPA / Pronto-socorro (público)
  if (/\bupa\b|pronto[ -]?socorro|pronto[ -]?atendimento/.test(nome))
    return "UPA / Pronto-atendimento";
  // UBS / posto / centro de saúde / ESF / AMA / CAPS (público)
  if (
    /\bubs\b|unidade b[áa]sica|posto de sa[úu]de|centro de sa[úu]de|centro de refer[êe]ncia|sa[úu]de da fam[íi]lia|\besf\b|\bama\b|assist[êe]ncia m[ée]dica ambulatorial|\bcaps\b/.test(
      nome,
    )
  )
    return "UBS / Posto de saúde";

  // Centro de saúde (healthcare=centre) é, no Brasil, quase sempre UBS pública —
  // inclusive quando o nome é de um médico (ex.: "Dra. Fulana"). Só fica de fora
  // se estiver explicitamente marcado como privado.
  if (tags.healthcare === "centre" && tipoOperador !== "private")
    return "UBS / Posto de saúde";

  // Marcadores de gestão pública (operador ou nome)
  const publicoKw =
    /prefeitura|munic[íi]p|estadual|estado de|governo|secretaria[^.]*sa[úu]de|\bsus\b|\bsms\b|universit[áa]ri|hospital das cl[íi]nicas|hospital regional|santa casa|\bp[úu]blic/;
  if (tipoOperador === "public" || tipoOperador === "government" || publicoKw.test(texto)) {
    if (tags.amenity === "hospital" || tags.healthcare === "hospital")
      return "Hospital público";
    return "Unidade de saúde pública";
  }

  return null;
}

function montarEndereco(end: Record<string, string>): string | null {
  const rua = end.road || end["addr:street"];
  const num = end.house_number || end["addr:housenumber"];
  const bairro =
    end.suburb || end.neighbourhood || end["addr:suburb"] || end["addr:neighbourhood"];
  const partes: string[] = [];
  if (rua) partes.push(num ? `${rua}, ${num}` : rua);
  if (bairro) partes.push(bairro);
  return partes.length ? partes.join(" — ") : null;
}

function decodePolyline(str: string, precision = 6): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: [number, number][] = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / factor, lng / factor]);
  }
  return coords;
}

function linkGoogle(o: Coord, d: Coord, modo: "walking" | "driving" | "transit"): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lon}&destination=${d.lat},${d.lon}&travelmode=${modo}`;
}

// ------------------------- chamadas externas ----------------------- //

interface OverpassEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Vários espelhos públicos do Overpass: se um estiver ocupado (502/429), tenta o
// próximo, antes de cair no Nominatim. Melhora muito a confiabilidade.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function overpassFetch(query: string): Promise<OverpassEl[]> {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      const j = await res.json();
      if (Array.isArray(j?.elements)) return j.elements as OverpassEl[];
    } catch {
      /* tenta o próximo espelho */
    }
  }
  throw new Error("overpass-indisponivel");
}

function coordDe(el: OverpassEl): Coord | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lon };
}

/** Busca unidades de saúde pelo OpenStreetMap (Overpass) e mantém só as
 *  PÚBLICAS (ver sinalPublico). É a fonte principal. */
async function buscarViaOverpass(centro: Coord): Promise<Local[]> {
  const { lat, lon } = centro;
  const raio = 8000;
  const query =
    `[out:json][timeout:25];(` +
    `nwr["amenity"="hospital"](around:${raio},${lat},${lon});` +
    `nwr["amenity"="clinic"](around:${raio},${lat},${lon});` +
    `nwr["amenity"="doctors"](around:${raio},${lat},${lon});` +
    `nwr["healthcare"="centre"](around:${raio},${lat},${lon});` +
    `);out center 150 tags;`;

  const elementos = await overpassFetch(query);

  const vistos = new Set<string>();
  const locais: Local[] = [];
  for (const el of elementos) {
    const tags = el.tags || {};
    const nome = tags.name || tags["name:pt"] || tags.official_name;
    if (!nome) continue;
    const rotulo = sinalPublico(tags);
    if (!rotulo) continue; // descarta particulares
    const c = coordDe(el);
    if (!c) continue;
    const distancia = haversine(centro, c);
    if (distancia > 7000) continue;
    const chave = `${nome}@${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    locais.push({
      id: `${el.type}${el.id}`,
      nome,
      tipo: rotulo,
      lat: c.lat,
      lon: c.lon,
      endereco: montarEndereco(tags),
      distancia,
    });
  }
  locais.sort((a, b) => a.distancia - b.distancia);
  return locais.slice(0, 15);
}

// Fallback: Nominatim com termos públicos, também filtrado por sinalPublico.
interface ItemNominatim {
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}

async function consultarNominatim(termo: string, viewbox: string): Promise<ItemNominatim[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(termo)}` +
    `&format=jsonv2&limit=20&bounded=1&viewbox=${viewbox}&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  return (await res.json()) as ItemNominatim[];
}

async function buscarViaNominatim(centro: Coord): Promise<Local[]> {
  const { lat, lon } = centro;
  const dd = 0.05; // ~5,5 km
  const viewbox = `${lon - dd},${lat - dd},${lon + dd},${lat + dd}`;
  const termos = [
    "UBS",
    "UPA",
    "posto de saúde",
    "hospital municipal",
    "hospital estadual",
  ];

  const vistos = new Set<string>();
  const locais: Local[] = [];
  for (const termo of termos) {
    let itens: ItemNominatim[] = [];
    try {
      itens = await consultarNominatim(termo, viewbox);
    } catch {
      itens = [];
    }
    for (const it of itens) {
      const nome = it.name || it.display_name?.split(",")[0];
      if (!nome) continue;
      const rotulo = sinalPublico({ name: nome });
      if (!rotulo) continue;
      const c = { lat: parseFloat(it.lat), lon: parseFloat(it.lon) };
      if (Number.isNaN(c.lat) || Number.isNaN(c.lon)) continue;
      const distancia = haversine(centro, c);
      if (distancia > 7000) continue;
      const chave = `${nome}@${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      locais.push({
        id: `${it.osm_type || "n"}${it.osm_id ?? chave}`,
        nome,
        tipo: rotulo,
        lat: c.lat,
        lon: c.lon,
        endereco: montarEndereco(it.address || {}),
        distancia,
      });
    }
  }
  locais.sort((a, b) => a.distancia - b.distancia);
  return locais.slice(0, 15);
}

async function buscarLocais(centro: Coord): Promise<Local[]> {
  try {
    const viaOverpass = await buscarViaOverpass(centro);
    if (viaOverpass.length > 0) return viaOverpass;
  } catch {
    /* Overpass indisponível — cai para o Nominatim */
  }
  return buscarViaNominatim(centro);
}

interface Trajeto {
  tempo: number | null;
  shape: [number, number][];
}

async function calcularTrajeto(
  o: Coord,
  d: Coord,
  costing: "pedestrian" | "auto",
): Promise<Trajeto> {
  try {
    const res = await fetch("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          { lat: o.lat, lon: o.lon },
          { lat: d.lat, lon: d.lon },
        ],
        costing,
        units: "kilometers",
      }),
    });
    if (!res.ok) return { tempo: null, shape: [] };
    const j = await res.json();
    const tempo: number | null = j?.trip?.summary?.time ?? null;
    const shapeStr: string | undefined = j?.trip?.legs?.[0]?.shape;
    return { tempo, shape: shapeStr ? decodePolyline(shapeStr, 6) : [] };
  } catch {
    return { tempo: null, shape: [] };
  }
}

// ------------------------------ ícones ----------------------------- //

function iconeUsuario(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "zela-icone",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#2d7ff9;border:3px solid #fff;box-shadow:0 0 0 3px rgba(45,127,249,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function iconeLocal(L: typeof import("leaflet"), ativo: boolean) {
  const cor = ativo ? "#d23b4a" : "#1f8a5b";
  return L.divIcon({
    className: "zela-icone",
    html: `<svg viewBox="0 0 24 24" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.6 8 12 8 12s8-6.4 8-12c0-4.4-3.6-8-8-8z" fill="${cor}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="3" fill="#fff"/></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

// ----------------------------- ícones UI --------------------------- //

const SVG = {
  pe: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20l3-8 5 2 2 6" />
      <path d="M7 12l-1-6 6-1 1 4" />
      <circle cx="13" cy="4" r="1.5" />
    </svg>
  ),
  carro: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 13l2-5a2 2 0 012-1.5h8A2 2 0 0117 8l2 5" />
      <path d="M2 13h20v4H2z" />
      <circle cx="6.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  ),
  onibus: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <circle cx="8" cy="20" r="1.4" />
      <circle cx="16" cy="20" r="1.4" />
    </svg>
  ),
};

// ------------------------------ componente ------------------------- //

export default function MapaCliente() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const camadaMarcadores = useRef<LayerGroup | null>(null);
  const camadaRota = useRef<LayerGroup | null>(null);

  const { usuario } = useAuth();

  const [posicao, setPosicao] = useState<Coord | null>(null);
  const [aproximado, setAproximado] = useState(false);
  const [baseEndereco, setBaseEndereco] = useState(false);
  const [carregandoGeo, setCarregandoGeo] = useState(true);

  const [locais, setLocais] = useState<Local[] | null>(null);
  const [erroLocais, setErroLocais] = useState<string | null>(null);

  const [selId, setSelId] = useState<string | null>(null);
  const [tempos, setTempos] = useState<{ aPe: number | null; deCarro: number | null } | null>(null);
  const [carregandoTempos, setCarregandoTempos] = useState(false);
  const [shapes, setShapes] = useState<{ pe: [number, number][]; carro: [number, number][] }>({
    pe: [],
    carro: [],
  });
  const [modo, setModo] = useState<"pe" | "carro">("pe");
  const [mapaPronto, setMapaPronto] = useState(false);

  const selecionado = locais?.find((l) => l.id === selId) ?? null;

  // 1) Localização do usuário.
  //    Prioridade: localização atual (GPS/navegador). Se negada/indisponível,
  //    cai para o endereço cadastrado; e, se nem isso houver, para uma região
  //    aproximada de São Paulo.
  useEffect(() => {
    let ativo = true;

    async function usarFallback() {
      const coord = usuario ? await geocodeEndereco(usuario) : null;
      if (!ativo) return;
      if (coord) {
        setPosicao(coord);
        setBaseEndereco(true);
      } else {
        setPosicao(FALLBACK);
        setBaseEndereco(false);
      }
      setAproximado(true);
      setCarregandoGeo(false);
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      usarFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!ativo) return;
        setPosicao({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCarregandoGeo(false);
      },
      () => {
        usarFallback();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );

    return () => {
      ativo = false;
    };
  }, [usuario]);

  // 2) Busca unidades quando a posição é conhecida
  useEffect(() => {
    if (!posicao) return;
    let ativo = true;
    setLocais(null);
    setErroLocais(null);
    buscarLocais(posicao)
      .then((lista) => {
        if (ativo) setLocais(lista);
      })
      .catch(() => {
        if (ativo) setErroLocais("Não foi possível buscar as unidades agora. Tente novamente.");
      });
    return () => {
      ativo = false;
    };
  }, [posicao]);

  // 3) Inicializa o mapa Leaflet
  useEffect(() => {
    if (!posicao || !containerRef.current || mapRef.current) return;
    let ativo = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!ativo || mapRef.current || !containerRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [posicao.lat, posicao.lon],
        14,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      L.marker([posicao.lat, posicao.lon], { icon: iconeUsuario(L) })
        .addTo(map)
        .bindPopup("Você está aqui");
      camadaMarcadores.current = L.layerGroup().addTo(map);
      camadaRota.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapaPronto(true);
      // Garante que os tiles preencham todo o container depois do layout.
      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 700);
    })();
    return () => {
      ativo = false;
    };
  }, [posicao]);

  // Recalcula o tamanho do mapa ao redimensionar/revelar e o remove ao desmontar
  useEffect(() => {
    function aoRedimensionar() {
      mapRef.current?.invalidateSize();
    }
    window.addEventListener("resize", aoRedimensionar);
    let obs: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      obs = new ResizeObserver(() => mapRef.current?.invalidateSize());
      obs.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener("resize", aoRedimensionar);
      obs?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const selecionar = useCallback(
    async (id: string) => {
      // Clicar de novo na mesma unidade fecha (toggle).
      if (id === selId) {
        setSelId(null);
        setTempos(null);
        setShapes({ pe: [], carro: [] });
        setCarregandoTempos(false);
        return;
      }
      setSelId(id);
      setTempos(null);
      setShapes({ pe: [], carro: [] });
      setModo("pe");
      const local = locais?.find((l) => l.id === id);
      if (!local || !posicao) return;
      mapRef.current?.setView([local.lat, local.lon], 15);
      setCarregandoTempos(true);
      const [pe, carro] = await Promise.all([
        calcularTrajeto(posicao, local, "pedestrian"),
        calcularTrajeto(posicao, local, "auto"),
      ]);
      setTempos({ aPe: pe.tempo, deCarro: carro.tempo });
      setShapes({ pe: pe.shape, carro: carro.shape });
      setCarregandoTempos(false);
    },
    [locais, posicao, selId],
  );

  // 4) Marcadores das unidades
  useEffect(() => {
    const L = LRef.current;
    const grupo = camadaMarcadores.current;
    if (!L || !grupo || !locais) return;
    grupo.clearLayers();
    locais.forEach((l) => {
      const m = L.marker([l.lat, l.lon], { icon: iconeLocal(L, l.id === selId) });
      m.bindPopup(`<strong>${l.nome}</strong>`);
      m.on("click", () => selecionar(l.id));
      m.addTo(grupo);
    });
  }, [locais, selId, mapaPronto, selecionar]);

  // 5) Desenha a rota do modo escolhido
  useEffect(() => {
    const L = LRef.current;
    const grupo = camadaRota.current;
    const map = mapRef.current;
    if (!L || !grupo || !map) return;
    grupo.clearLayers();
    const traj = modo === "pe" ? shapes.pe : shapes.carro;
    if (traj.length < 2) return;
    const linha = L.polyline(traj, { color: "#1f6fb2", weight: 5, opacity: 0.85 });
    linha.addTo(grupo);
    map.fitBounds(linha.getBounds(), { padding: [40, 40] });
  }, [shapes, modo, mapaPronto]);

  // ------------------------------- render -------------------------- //

  return (
    <div className={estilos.wrap}>
      {aproximado && (
        <p className={estilos.avisoLocal}>
          {baseEndereco
            ? "Não foi possível acessar sua localização atual, então usamos o endereço cadastrado no seu perfil como referência. Permita a localização e recarregue para resultados mais precisos."
            : "Não foi possível usar sua localização e não há endereço no seu perfil, então mostramos uma região aproximada de São Paulo. Permita a localização ou cadastre seu endereço para resultados mais precisos."}
        </p>
      )}

      <div className={estilos.layout}>
        <aside className={estilos.painel}>
          {selecionado && tempos !== null && (
            <div className={estilos.detalhe}>
              <h3 className={estilos.detalheNome}>{selecionado.nome}</h3>
              <span className={estilos.detalheTipo}>{selecionado.tipo}</span>
              {selecionado.endereco && (
                <p className={estilos.detalheEndereco}>{selecionado.endereco}</p>
              )}
              <p className={estilos.detalheDist}>
                {formatarDistancia(selecionado.distancia)} em linha reta
              </p>

              <div className={estilos.modos}>
                <button
                  type="button"
                  className={`${estilos.modo} ${modo === "pe" ? estilos.modoAtivo : ""}`}
                  onClick={() => setModo("pe")}
                >
                  <span className={estilos.modoIcone}>{SVG.pe}</span>
                  <span className={estilos.modoRotulo}>A pé</span>
                  <span className={estilos.modoTempo}>
                    {carregandoTempos ? "…" : formatarDuracao(tempos.aPe)}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${estilos.modo} ${modo === "carro" ? estilos.modoAtivo : ""}`}
                  onClick={() => setModo("carro")}
                >
                  <span className={estilos.modoIcone}>{SVG.carro}</span>
                  <span className={estilos.modoRotulo}>De carro</span>
                  <span className={estilos.modoTempo}>
                    {carregandoTempos ? "…" : formatarDuracao(tempos.deCarro)}
                  </span>
                </button>

                <a
                  className={estilos.modo}
                  href={posicao ? linkGoogle(posicao, selecionado, "transit") : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={estilos.modoIcone}>{SVG.onibus}</span>
                  <span className={estilos.modoRotulo}>Transporte público</span>
                  <span className={estilos.modoLink}>Ver no Google Maps</span>
                </a>
              </div>

              <a
                className={`botao botao--primario ${estilos.rotaBtn}`}
                href={posicao ? linkGoogle(posicao, selecionado, modo === "pe" ? "walking" : "driving") : "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir rota no Google Maps
              </a>
            </div>
          )}

          <div className={estilos.lista}>
            <h2 className={estilos.listaTitulo}>Mais próximas</h2>

            {carregandoGeo && <p className={estilos.estado}>Localizando você…</p>}
            {!carregandoGeo && locais === null && !erroLocais && (
              <p className={estilos.estado}>Buscando unidades públicas (SUS)…</p>
            )}
            {erroLocais && <p className={estilos.estado}>{erroLocais}</p>}
            {locais !== null && locais.length === 0 && !erroLocais && (
              <p className={estilos.estado}>
                Nenhuma unidade encontrada por perto. Tente ampliar a busca pelo
                Google Maps.
              </p>
            )}

            {locais?.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`${estilos.item} ${l.id === selId ? estilos.itemAtivo : ""}`}
                onClick={() => selecionar(l.id)}
              >
                <span className={estilos.itemNome}>{l.nome}</span>
                <span className={estilos.itemMeta}>
                  {l.tipo} · {formatarDistancia(l.distancia)}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className={estilos.mapaBox}>
          <div ref={containerRef} className={estilos.mapa} />
        </div>
      </div>
    </div>
  );
}
