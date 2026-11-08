# Zela — Web

Front-end web do Zela em **Next.js (App Router) + TypeScript**.

Duas frentes, construídas em etapas:

1. **Site do cidadão** (feito) — onde a pessoa faz a triagem por texto, voz ou foto e recebe o próximo passo.
2. **Painel administrativo** (próxima etapa) — gestão da UBS: fila priorizada por gravidade, comunidade em risco e visitas do dia.

## Rodar o projeto

```bash
# na pasta web/
npm install
npm run dev
```

Abre em `http://localhost:3000`. O site consome a API de IA (pasta `ia/`); suba-a em paralelo:

```bash
# na pasta ia/
uvicorn app.main:app --reload
```

Configure a URL da API em `.env.local` (veja `.env.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Estrutura de `src/`

| Pasta | Papel |
| --- | --- |
| `app/` | Rotas e páginas: `/` (início), `/triagem`, `/sobre` |
| `components/` | UI reutilizável (cabeçalho, rodapé, ícones, selo de risco, triagem) |
| `lib/` | Camada de serviços (`api.ts`) e tipos (`tipos.ts`) que espelham a API |

## Páginas do site do cidadão

- **Início (`/`)** — apresentação, canais de triagem, como funciona e princípios.
- **Triagem (`/triagem`)** — o coração do produto: três canais de IA bem separados
  (texto, voz e foto) e um painel de resultado com nível de risco, orientação e
  encaminhamento automático.
- **Sobre (`/sobre`)** — propósito, persona, princípios e ODS.

## Design

- **Uma única fonte** em todo o site (Inter, via `next/font`).
- Tokens de cor e estilo centralizados em `src/app/globals.css` (azul da marca `#4BB9FA`).
- Sem emojis; ícones em traço (SVG) próprios em `components/Icones.tsx`.
- Layout responsivo (desktop e celular).

## Camada de serviços (`lib/api.ts`)

Todas as chamadas à API passam por aqui:

| Função | Endpoint | Uso |
| --- | --- | --- |
| `enviarTriagem` | `POST /triagens` | Triagem por texto/voz + encaminhamento automático |
| `transcreverAudio` | `POST /voz/transcrever` | Fala → texto |
| `analisarFoto` | `POST /visao/analisar` | Foto → descrição + risco |
