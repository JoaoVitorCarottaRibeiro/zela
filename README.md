# Zela

Solução **CitizenTech** de triagem e orientação em saúde para **comunidades**. A Zela começa no próprio cidadão, por voz, foto ou conversa com uma IA, e só encaminha para um humano (UBS, telessaúde ou SAMU) quem realmente precisa.

Princípio que guia o projeto: **não exige smartphone, não exige saber ler e não exige internet.**

> **FIAP · Global Solution (CitizenTech) · 2026.2** · Prazo: 19/11/2026
> **Repositório:** https://github.com/JoaoVitorCarottaRibeiro/zela
> Repositório único usado nas 3 disciplinas sob nossa responsabilidade: **SOA e Web Services**, **Mobile Development e IOT** e **Cybersecurity**.

**Integrantes:**

- João Vitor Carotta Ribeiro (RM 555187)
- Arthur Bueno de Oliveira (RM 558396)
- Victor Magdaleno Marcos (RM 556729)

---

# Parte 1 — Visão geral (vale para as 3 matérias)

## A solução em 6 perguntas (briefing da GS)

1. **Quem é o cidadão beneficiado?** Morador de comunidade com baixo acesso a saúde, baixa alfabetização e internet ruim ou inexistente.
2. **Qual problema será resolvido?** A demora e a dificuldade de orientação: a pessoa não sabe se o caso é leve, se deve ir à UBS ou se é emergência.
3. **Como a solução funciona?** Triagem e orientação que começam no próprio cidadão (voz, foto, conversa com IA) e só encaminham ao humano quem precisa.
4. **Quais tecnologias?** React Native/Expo, FastAPI, Supabase, IA (Gemini + Whisper + Piper) e regras de triagem offline.
5. **Quem participa do ecossistema?** Cidadão, agente comunitário de saúde (ACS), UBS/telessaúde e SAMU.
6. **Como medir e ampliar o impacto?** Nº de triagens, % de casos resolvidos sem deslocamento, tempo até a orientação e encaminhamentos corretos.

## ODS (identificados e explicados)

- **ODS 3 — Saúde e bem-estar:** a Zela orienta e prioriza o acesso à saúde, reduzindo a demora até a orientação correta e evitando que casos graves esperem.
- **ODS 10 — Redução das desigualdades:** atende quem tem menos acesso (baixa alfabetização, internet ruim), funcionando por voz e sem exigir smartphone nem leitura.
- **ODS 9 — Inovação e infraestrutura:** usa IA e uma infraestrutura leve (modo offline com regras e Piper) que roda até em hardware simples.
- **ODS 11 — Cidades e comunidades sustentáveis:** conecta o cidadão aos serviços públicos locais (UBS, UPA, SAMU), inclusive por um mapa de unidades públicas próximas.

- **Unidades de saúde no mapa:** OpenStreetMap, via Overpass API (dados públicos), filtrando só unidades públicas (UBS, UPA, postos).
- **IA de triagem, conversa e visão:** Google Gemini (free tier).
- **Voz:** transcrição com Whisper e síntese offline com Piper.
- **Dados de teste e seed:** criados por nós, fictícios (ex.: CPF `000.000.000-00`).

## Prompts de IA

Os prompts usados estão versionados e explicados em **[`docs/prompts.md`](docs/prompts.md)**. No código, eles vivem em: `app/services/triagem_service.py` (`PROMPT_SISTEMA`, `PROMPT_CONVERSA`), `app/services/exame_service.py` (`PROMPT_EXAME`), `app/services/visao_service.py` (`PROMPT_VISAO`) e `app/seguranca/risco.py` (`PROMPT_RISCO`).

## Estrutura do repositório (monorepo)

| Pasta | O que é | Matéria | Tecnologia |
| --- | --- | --- | --- |
| `ia/` | IA (voz, visão, triagem) + API REST + banco | **SOA** | Python + FastAPI + SQLAlchemy |
| `ia/app/seguranca/` | Proteção de PII, taint e painel de Risco Cidadão | **Cybersecurity** | Python |
| `mobile/` | App do cidadão | **Mobile e IOT** | React Native + Expo + TypeScript |
| `web/` | Site do cidadão e painel (apoio à solução) | — | Next.js + TypeScript |
| `brand/` | Identidade visual (logo, ícone) | — | — |
| `docs/` | Documentação, prompts e evidências (`docs/evidencias/`) | — | — |

## Como rodar (resumo)

```bash
git clone https://github.com/JoaoVitorCarottaRibeiro/zela.git
cd zela

# IA + API (pasta ia/)
cd ia && python -m venv .venv && . .venv/Scripts/activate && pip install -r requirements.txt
cp .env.example .env            # preencha GEMINI_API_KEY e DATABASE_URL
alembic upgrade head            # cria as tabelas no banco
uvicorn app.main:app --reload   # http://localhost:8000/docs

# Mobile (pasta mobile/)
cd mobile && npm install && npx expo start

# Web (pasta web/)
cd web && npm install && npm run dev
```

## Como as 3 matérias se encaixam

- **SOA** é o cérebro e servidor: a API FastAPI + Supabase que guarda e serve os dados.
- **Mobile** é a porta de entrada: o app Expo que o cidadão usa (voz, foto, orientação).
- **Cybersecurity** é o escudo: protege os dados de saúde (PII) que trafegam entre o app e o backend.

## Identidade visual (marca)

Cor principal **`#4BB9FA`** (azul-céu) + branco; acento em `#2E9BE6`. Os arquivos (ícone, wordmark e símbolo) ficam em `brand/`. No produto, o ícone vai para `mobile/assets/` (Expo) e `web/public/` (Next.js).

---

# Parte 2 — Por matéria

## 🟦 1. SOA e Web Services — pasta `ia/`

Backend da Zela: estruturação do domínio, banco de dados, APIs REST e testes automatizados. FastAPI + SQLAlchemy 2.x + Alembic + Supabase (PostgreSQL), com fallback para SQLite local quando `DATABASE_URL` está vazio (usado nos testes).

### Arquitetura em camadas

Separação inspirada em DDD: cada camada só conhece a de baixo, e o **domínio** (as regras de negócio) não depende de framework, banco nem HTTP. Isso deixa as regras testáveis isoladamente.

```
HTTP  (clientes: app mobile, site web)
  │
  ▼
Interface / API        app/routers/ , app/main.py , app/schemas.py , app/deps.py
  │   rotas REST, contratos (Pydantic), autenticação, middlewares
  ▼
Aplicação / Serviços   app/services/ , app/crud.py
  │   orquestra os casos de uso (triagem, voz, visão, exame) e a persistência
  ▼
Domínio (regras puras) app/dominio/
  │   classificação por sinais, destino por nível, validações, erros
  ▼
Infraestrutura         app/models/ , app/db/ , app/core/
      ORM (SQLAlchemy), sessão/engine, config, segurança, e-mail
  │
  ▼
Banco de dados  (Supabase / PostgreSQL  ·  SQLite no modo offline)
```

| Camada | Pasta(s) | Responsabilidade |
| --- | --- | --- |
| **Domínio** | `app/dominio/` | Regras de negócio **puras** (sem framework): `triagem.py` (sinais vermelhos/amarelos e classificação), `encaminhamento.py` (destino por nível), `enums.py`, `erros.py` (`RegraViolada`). |
| **Aplicação** | `app/services/`, `app/crud.py` | Casos de uso: triagem (regras + IA + conversa), voz, visão, exame; e as operações de persistência das entidades. |
| **Infraestrutura** | `app/models/`, `app/db/`, `app/core/` | Mapeamento ORM das entidades; conexão e sessão do banco; config, segurança (hash PBKDF2 + token HMAC), e-mail. |
| **Interface / API** | `app/routers/`, `app/main.py`, `app/schemas.py`, `app/deps.py` | HTTP: endpoints REST, contratos de entrada/saída (Pydantic), dependências (usuário atual), montagem do app. |
| **Segurança (transversal)** | `app/seguranca/` | Módulo da disciplina de Cybersecurity (PII, taint, Risco Cidadão); protege os dados que atravessam as camadas. |

**Regra de dependência:** as setas apontam sempre para dentro. Um `router` chama um `service`; o `service` aplica as regras do `dominio` e persiste via `crud` + `models`; o `dominio` **não importa** nada de FastAPI nem de SQLAlchemy. Por isso os testes do domínio (`tests/test_dominio.py`) rodam sem subir a API nem o banco.

**Exemplo de fluxo (registrar uma triagem):** `POST /triagens` (interface) chama `triagem_service.triar()` (aplicação), que usa `dominio/triagem.classificar_por_sinais()` (regra de ouro: um sinal vermelho nunca é rebaixado pela IA); em seguida `crud.criar_triagem()` grava a triagem e já abre o `Encaminhamento` conforme `dominio/encaminhamento.destino_para()`.

### Entidades (domínio)

- **Cidadão** (`cidadaos`): a pessoa atendida. *1 cidadão para N triagens.*
- **Triagem** (`triagens`): um atendimento (sintomas, nível, orientação, origem, canal). *1 triagem para N encaminhamentos.*
- **Encaminhamento** (`encaminhamentos`): o destino gerado (casa / UBS / telessaúde / SAMU) e seu status.

### Banco e migrações (Alembic)

A conexão lê `DATABASE_URL` do `.env` (Supabase, via Session pooler). São **7 migrações** versionadas.

```bash
alembic upgrade head                               # aplica as migrações (cria as tabelas)
alembic revision --autogenerate -m "sua mensagem"  # gera uma migração a partir dos modelos
alembic current -v                                 # mostra a revisão aplicada no banco
```

### Endpoints

**IA (sem estado):** `POST /triagem`, `POST /triagem/conversa`, `POST /voz/transcrever`, `POST /voz/falar`, `POST /visao/analisar`.
**Autenticação:** `POST /auth/cadastro`, `POST /auth/login`, `GET|PATCH /auth/me`, recuperação de senha.
**Ficha e exame:** `GET|PUT /ficha`, `POST /exame/analisar`, `POST /exame/salvar`, `GET /exame/meus`, `DELETE /exame/{id}`.
**Recursos persistidos:** CRUD de `/cidadaos`, `/triagens` (abre o encaminhamento), `/encaminhamentos`.
**Segurança (Cyber):** `/seguranca/scan`, `/seguranca/demo-vazamento`, `/seguranca/indicador`, `/seguranca/auditoria`, `/seguranca/painel`.
**Infra:** `GET /health`. Documentação automática (Swagger) em `/docs`.

### Modelos de IA (todos gratuitos)

| Necessidade | Online (MVP) | Offline / local |
| --- | --- | --- |
| Triagem (raciocínio) | Gemini Flash (free tier) | regras do domínio (offline) |
| Voz, ouvir (fala→texto) | Gemini / Whisper | faster-whisper (`small`) |
| Voz, falar (texto→voz) | — | **Piper** (offline) |
| Visão (analisar foto) | Gemini Flash (multimodal) | — |

> **Voz offline (Piper):** o `POST /voz/falar` usa o Piper. Baixe o binário do Windows e uma voz PT (`pt_BR-faber-medium.onnx`) e aponte `PIPER_BIN` e `PIPER_VOICE` no `.env` (formato `C:/...`). As pastas pesadas (`ia/piper/`, `ia/models/`) estão no `.gitignore`.

### Testes

```bash
cd ia && pytest
```

**85 testes** passando (SQLite em memória, offline). Cobrem CRUD, triagem, encaminhamento automático, domínio puro e o módulo de segurança.

### Evidências (prints) — em `docs/evidencias/`

- `swagger-docs-1.jpg` e `swagger-docs-2.jpg`: Swagger com todos os endpoints. ✅
- `migracoes-alembic.jpg` (+ `.txt`): Supabase na revisão head, 7/7 migrações aplicadas. ✅

<img width="800" height="1555" alt="swagger-docs-1" src="https://github.com/user-attachments/assets/56f50f51-3a2c-4fd5-bbb7-8c809663099a" />

<img width="800" height="1555" alt="swagger-docs-2" src="https://github.com/user-attachments/assets/eefa60f9-10b0-42c5-96f8-a1f807dc86a4" />


### Vídeo pitch (até 3 min): **(adicionar o link aqui)**

---

## 🟩 2. Mobile Development e IOT — pasta `mobile/`

App do cidadão em Expo (React Native + TypeScript + Expo Router), que consome a mesma API da pasta `ia/` e grava o histórico no Supabase pela API.

### Como rodar

1. Suba a API (pasta `ia/`): `uvicorn app.main:app --port 8000`.
2. Na pasta `mobile/`: `npm install`.
3. Crie um `.env` a partir do `.env.example` e aponte para a API:

```
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:8000
```

> Em celular físico, **não use `localhost`**, use o IP da sua máquina na rede (ex.: `http://192.168.0.10:8000`). No emulador Android, use `http://10.0.2.2:8000`.

4. Inicie o Expo: `npx expo start` e abra no **Expo Go** (QR Code) ou num emulador. Se aparecer aviso de versão, rode `npx expo install --fix`.

### Telas (Expo Router, pasta `app/`)

| Rota | Tela |
| --- | --- |
| `index` | Início (apresentação + entrar/criar conta) |
| `login`, `cadastro` | Autenticação |
| `(tabs)/triagem` | Triagem conversacional (texto, **voz** e **foto**), com a Zela **falando** as respostas |
| `(tabs)/resultados` | Histórico das triagens (salvo no banco) |
| `(tabs)/ajuda` | Emergência (ligar 192), orientações e sair |

### Acessibilidade

- **Voz primeiro:** fale os sintomas (microfone) e **ouça** a resposta (TTS, `expo-speech`).
- Fontes grandes, alto contraste, ícones e alvos de toque generosos.
- Botões de resposta rápida para quem tem dificuldade de digitar.

### Estrutura

| Pasta | Papel |
| --- | --- |
| `app/` | Rotas/telas (Expo Router) |
| `src/lib/` | API, autenticação (token em `expo-secure-store`), tipos |
| `src/components/` | Componentes de UI reutilizáveis |
| `src/theme.ts` | Cores, espaçamentos e tamanhos de fonte |
| `assets/` | Ícone do app |

> **Qualidade:** `expo-doctor` 18/18 e `tsc` sem erros.

### Evidências (prints das telas) — em `docs/evidencias/prints mobile zela`

<img width="1080" height="2400" alt="Print-do-app" src="https://github.com/user-attachments/assets/1e6106b8-ba0e-45c2-ac84-e4506f493184" />

<img width="1080" height="2400" alt="Tela-inicial" src="https://github.com/user-attachments/assets/9247224b-937a-4fe4-9d6c-8761b365306e" />

<img width="1080" height="2400" alt="Triagem" src="https://github.com/user-attachments/assets/c60be067-895a-4728-bef9-392453c0a716" />

<img width="1080" height="2400" alt="Meus-resultados-triagem" src="https://github.com/user-attachments/assets/7c198b3b-c194-436e-97f5-dd578e87bcce" />

<img width="1080" height="2400" alt="Meus resultados-exames" src="https://github.com/user-attachments/assets/f1337c0c-33af-4a96-b6e9-9ec0e2f4c92b" />

<img width="1080" height="2400" alt="Mapa" src="https://github.com/user-attachments/assets/574d4ab3-a791-483f-aeca-befaa2d08ad3" />

<img width="1080" height="2400" alt="Mias-opcoes" src="https://github.com/user-attachments/assets/f3ff8f9a-e4b7-47d1-9747-d98b4a5fda78" />

<img width="720" height="1600" alt="Perfil" src="https://github.com/user-attachments/assets/342077de-cc25-4eb6-bd15-efd429c33f8a" />

<img width="1080" height="2400" alt="Ficha-médica" src="https://github.com/user-attachments/assets/db1422b2-e547-455d-a895-2b531902703e" />

<img width="1080" height="2400" alt="Entenda-exame" src="https://github.com/user-attachments/assets/7e74649a-8ab0-430c-a0fd-6160d1dd7e9f" />


### Vídeo pitch (até 3 min): **(adicionar o link aqui)**

---

## 🟥 3. Cybersecurity — módulo `ia/app/seguranca/`

O escudo da Zela: protege os dados de saúde (PII) que a solução processa. Construído do zero (sem repositório-base).

### Entrega (3 pilares)

1. **Mapeamento de PII** (`pii.py`): detecta CPF, Cartão SUS, telefone, e-mail, senhas e termos de saúde.
2. **Taint Analysis** (`taint.py`): rastreia o dado sensível e bloqueia saída insegura (log, resposta, tela, banco sem proteção).
3. **Tradução via IA** (`risco.py`): transforma a falha técnica em alerta de **Risco Cidadão** (Gemini, com fallback offline).

Apoio: painel de Risco Cidadão (`/seguranca/painel`), filtro que redige PII nos logs (`log_filter.py`) e auditoria (`auditoria.py`).

### Como rodar

- Suba a API (`uvicorn app.main:app --reload`) e abra `http://localhost:8000/seguranca/painel`.
- Auditoria pelo terminal: `cd ia && python seguranca_scan.py`.
- Testes: `pytest -q` (17 testes do módulo; 85 no total).

### Destaques da rubrica

- Detecção de PII + taint com bloqueio de vazamento demonstrável.
- Painel gerando o indicador de Risco Cidadão.
- Evidências de auditoria (vazamento detectado e bloqueado).

### Entrega em ZIP

O módulo `ia/app/seguranca/` + `ia/tests/test_seguranca.py` + `ia/seguranca_scan.py`.

### Evidências (prints) — em `docs/evidencias/`

- `cyber-painel.png`: painel de Risco Cidadão com a demonstração.
- `cyber-auditoria.png`: saída do `seguranca_scan.py`.

<img width="366" height="467" alt="cyber-painel" src="https://github.com/user-attachments/assets/0f4a993d-c3c8-43dc-af55-24878f7b636a" />

<img width="606" height="590" alt="cyber-auditoria" src="https://github.com/user-attachments/assets/1a3e4806-0900-4ff0-b7bd-f56ab0ca92cf" />


### Vídeo pitch (até 3 min): **(adicionar o link aqui)**

---

## Web — site do cidadão (apoio) — pasta `web/`

Front-end em Next.js (App Router) + TypeScript. É o site onde a pessoa faz a triagem por texto, voz ou foto e recebe o próximo passo. Não é uma das 3 matérias avaliadas aqui, mas faz parte da solução.

- **Rodar:** `cd web && npm install && npm run dev` (abre em `http://localhost:3000`). Configure `NEXT_PUBLIC_API_URL=http://localhost:8000` no `.env.local`.
- **Páginas:** `/` (início), `/triagem` (os três canais de IA), `/sobre`, `/resultados`, `/exame`.
- Marca `#4BB9FA`, fonte única (Inter), ícones em SVG, layout responsivo.
