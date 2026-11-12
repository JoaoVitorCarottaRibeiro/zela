import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useAuth } from "@/lib/auth";
import type { Usuario } from "@/lib/tipos";
import { cores, espaco, fonte, raio } from "@/theme";

interface Coord {
  lat: number;
  lon: number;
}
interface Local {
  id: string;
  nome: string;
  tipo: string;
  lat: number;
  lon: number;
  endereco: string | null;
  distancia: number;
}

// Fallback final: Vila Andrade (SP).
const FALLBACK: Coord = { lat: -23.6339, lon: -46.7389 };

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

/** Diz se a unidade é PÚBLICA (SUS) e com que rótulo. Null = descarta (particular). */
function sinalPublico(tags: Record<string, string>): string | null {
  const nome = (tags.name || tags["name:pt"] || "").toLowerCase();
  const operador = (tags.operator || "").toLowerCase();
  const tipoOperador = (tags["operator:type"] || "").toLowerCase();
  const texto = `${nome} ${operador}`;

  if (/\bupa\b|pronto[ -]?socorro|pronto[ -]?atendimento/.test(nome))
    return "UPA / Pronto-atendimento";
  if (
    /\bubs\b|unidade b[áa]sica|posto de sa[úu]de|centro de sa[úu]de|centro de refer[êe]ncia|sa[úu]de da fam[íi]lia|\besf\b|\bama\b|assist[êe]ncia m[ée]dica ambulatorial|\bcaps\b/.test(
      nome,
    )
  )
    return "UBS / Posto de saúde";
  if (tags.healthcare === "centre" && tipoOperador !== "private")
    return "UBS / Posto de saúde";

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
  const rua = end["addr:street"];
  const num = end["addr:housenumber"];
  const bairro = end["addr:suburb"] || end["addr:neighbourhood"];
  const partes: string[] = [];
  if (rua) partes.push(num ? `${rua}, ${num}` : rua);
  if (bairro) partes.push(bairro);
  return partes.length ? partes.join(" — ") : null;
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

interface OverpassEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

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

async function buscarLocais(centro: Coord): Promise<Local[]> {
  const { lat, lon } = centro;
  const raioBusca = 8000;
  const query =
    `[out:json][timeout:25];(` +
    `nwr["amenity"="hospital"](around:${raioBusca},${lat},${lon});` +
    `nwr["amenity"="clinic"](around:${raioBusca},${lat},${lon});` +
    `nwr["amenity"="doctors"](around:${raioBusca},${lat},${lon});` +
    `nwr["healthcare"="centre"](around:${raioBusca},${lat},${lon});` +
    `);out center 150 tags;`;

  const elementos = await overpassFetch(query);
  const vistos = new Set<string>();
  const locais: Local[] = [];
  for (const el of elementos) {
    const tags = el.tags || {};
    const nome = tags.name || tags["name:pt"] || tags.official_name;
    if (!nome) continue;
    const rotulo = sinalPublico(tags);
    if (!rotulo) continue;
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

function linkGoogle(o: Coord | null, d: Coord): string {
  const dest = `${d.lat},${d.lon}`;
  const origem = o ? `&origin=${o.lat},${o.lon}` : "";
  return `https://www.google.com/maps/dir/?api=1${origem}&destination=${dest}&travelmode=driving`;
}

function mapaHtml(centro: Coord, locais: Local[]): string {
  const dados = JSON.stringify({ centro, locais });
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#mapa{margin:0;height:100%;width:100%}</style>
</head><body><div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var D = ${dados};
  var map = L.map('mapa', { scrollWheelZoom: true }).setView([D.centro.lat, D.centro.lon], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  var vc = L.divIcon({ className:'', html:'<div style="width:16px;height:16px;border-radius:50%;background:#2d7ff9;border:3px solid #fff;box-shadow:0 0 0 3px rgba(45,127,249,.35)"></div>', iconSize:[16,16], iconAnchor:[8,8] });
  L.marker([D.centro.lat, D.centro.lon], { icon: vc }).addTo(map).bindPopup('Você está aqui');
  var bounds = [[D.centro.lat, D.centro.lon]];
  D.locais.forEach(function(l){
    var ic = L.divIcon({ className:'', html:'<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.6 8 12 8 12s8-6.4 8-12c0-4.4-3.6-8-8-8z" fill="#1f8a5b" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>', iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-26] });
    L.marker([l.lat, l.lon], { icon: ic }).addTo(map).bindPopup('<strong>'+l.nome+'</strong><br/>'+l.tipo);
    bounds.push([l.lat, l.lon]);
  });
  if (bounds.length > 1) { try { map.fitBounds(bounds, { padding:[40,40] }); } catch(e){} }
</script></body></html>`;
}

export default function TelaMapa() {
  const { usuario } = useAuth();
  const [posicao, setPosicao] = useState<Coord | null>(null);
  const [aproximado, setAproximado] = useState(false);
  const [locais, setLocais] = useState<Local[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // 1) Localização: GPS -> endereço cadastrado -> região aproximada.
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (ativo) setPosicao({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          return;
        }
      } catch {
        /* cai no fallback */
      }
      const coord = usuario ? await geocodeEndereco(usuario) : null;
      if (!ativo) return;
      setPosicao(coord ?? FALLBACK);
      setAproximado(true);
    })();
    return () => {
      ativo = false;
    };
  }, [usuario]);

  // 2) Busca unidades quando a posição é conhecida.
  useEffect(() => {
    if (!posicao) return;
    let ativo = true;
    setLocais(null);
    setErro(null);
    buscarLocais(posicao)
      .then((lista) => ativo && setLocais(lista))
      .catch(() => ativo && setErro("Não foi possível buscar as unidades agora. Tente novamente."));
    return () => {
      ativo = false;
    };
  }, [posicao]);

  const html = useMemo(
    () => (posicao ? mapaHtml(posicao, locais ?? []) : null),
    [posicao, locais],
  );

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Unidades públicas perto de você</Text>
      </View>

      {aproximado && (
        <Text style={estilos.aviso}>
          Não foi possível usar sua localização atual. Mostrando uma região
          aproximada. Permita a localização ou cadastre seu endereço para mais
          precisão.
        </Text>
      )}

      <View style={estilos.mapaBox}>
        {html ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View style={estilos.centro}>
            <ActivityIndicator color={cores.azulEscuro} />
            <Text style={estilos.carregandoTxt}>Localizando você…</Text>
          </View>
        )}
      </View>

      <ScrollView style={estilos.lista} contentContainerStyle={{ padding: espaco.md }}>
        <Text style={estilos.listaTitulo}>Mais próximas</Text>
        {erro && <Text style={estilos.erroTxt}>{erro}</Text>}
        {locais === null && !erro && (
          <View style={{ paddingVertical: espaco.lg }}>
            <ActivityIndicator color={cores.azulEscuro} />
            <Text style={estilos.carregandoTxt}>Buscando unidades públicas (SUS)…</Text>
          </View>
        )}
        {locais !== null && locais.length === 0 && !erro && (
          <Text style={estilos.erroTxt}>
            Nenhuma unidade encontrada por perto. Tente ampliar a busca no Google Maps.
          </Text>
        )}
        {locais?.map((l) => (
          <Pressable
            key={l.id}
            style={estilos.item}
            onPress={() => Linking.openURL(linkGoogle(posicao, l))}
          >
            <Text style={estilos.itemNome}>{l.nome}</Text>
            <Text style={estilos.itemMeta}>
              {l.tipo} · {formatarDistancia(l.distancia)}
            </Text>
            {l.endereco && <Text style={estilos.itemEndereco}>{l.endereco}</Text>}
            <Text style={estilos.itemRota}>Abrir rota no Google Maps →</Text>
          </Pressable>
        ))}
        <View style={{ height: espaco.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: espaco.lg, paddingVertical: espaco.sm },
  titulo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta },
  aviso: {
    fontSize: fonte.pequeno,
    color: cores.texto,
    backgroundColor: cores.amareloSuave,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    lineHeight: 19,
  },
  mapaBox: { height: 260, backgroundColor: cores.fundoSuave },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  carregandoTxt: { color: cores.textoSuave, marginTop: espaco.sm, textAlign: "center", fontSize: fonte.pequeno },
  lista: { flex: 1 },
  listaTitulo: { fontSize: fonte.medio, fontWeight: "800", color: cores.tinta, marginBottom: espaco.sm },
  erroTxt: { color: cores.textoSuave, fontSize: fonte.base, paddingVertical: espaco.md },
  item: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.sm,
  },
  itemNome: { fontSize: fonte.base, fontWeight: "700", color: cores.tinta },
  itemMeta: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: 2 },
  itemEndereco: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: 2 },
  itemRota: { fontSize: fonte.pequeno, color: cores.azulProfundo, fontWeight: "700", marginTop: espaco.sm },
});
