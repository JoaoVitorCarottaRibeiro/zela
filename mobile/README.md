# Zela — Mobile

App do **cidadão**. **React Native + Expo (Expo Router) + TypeScript**. Consome a
mesma API da pasta `ia/` e grava o histórico no banco (Supabase) pela API.

## Ficha da CitizenTech
| Campo | Conteúdo |
| --- | --- |
| Nome | Zela |
| Cidade/bairro | São Paulo — Vila Andrade |
| Cidadão | Regina (persona), 53 anos, na fila do SUS |
| Problema | A pessoa não sabe se o caso é leve, se deve ir à UBS ou se é emergência. |
| O que o app faz | Triagem por voz, foto ou texto, com orientação na hora e histórico. |
| ODS | 3 (Saúde), 10 (Desigualdades). |

**Integrantes:** _(preencher antes da entrega)_

## Como rodar

1. Suba a API (pasta `ia/`): `uvicorn app.main:app --port 8000`.
2. Na pasta `mobile/`:

```bash
npm install
```

3. Aponte o app para a API. Crie um `.env` a partir do `.env.example`:

```
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:8000
```

> Em celular físico, **não use `localhost`** — use o IP da sua máquina na rede
> (ex.: `http://192.168.0.10:8000`). No emulador Android, use `http://10.0.2.2:8000`.

4. Inicie o Expo e abra no app **Expo Go** (QR Code) ou num emulador:

```bash
npx expo start
```

> Se aparecer aviso de versão de pacote, rode `npx expo install --fix`.

## Telas (Expo Router, pasta `app/`)
| Rota | Tela |
| --- | --- |
| `index` | Início (apresentação + entrar/criar conta) |
| `login`, `cadastro` | Autenticação |
| `(tabs)/triagem` | Triagem conversacional (texto, **voz** e **foto**), com a Zela **falando** as respostas |
| `(tabs)/resultados` | Histórico das triagens (salvo no banco) |
| `(tabs)/ajuda` | Emergência (ligar 192), orientações e sair |

## Acessibilidade
- **Voz primeiro:** fale os sintomas (microfone) e **ouça** a resposta (TTS, `expo-speech`).
- Fontes grandes, alto contraste, ícones e alvos de toque generosos.
- Botões de resposta rápida para quem tem dificuldade de digitar.

## Estrutura
| Pasta | Papel |
| --- | --- |
| `app/` | Rotas/telas (Expo Router) |
| `src/lib/` | API, autenticação (token em `expo-secure-store`), tipos |
| `src/components/` | Componentes de UI reutilizáveis |
| `src/theme.ts` | Cores, espaçamentos e tamanhos de fonte |
| `assets/` | Ícone do app |
