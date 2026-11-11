# Zela — IA + Backend (SOA)

Serviço de **voz, visão e triagem** + **API REST com banco de dados**. Python + FastAPI + SQLAlchemy + Supabase (PostgreSQL).

Esta pasta (`ia/`) é o **backend da CitizenTech Zela** e atende à disciplina de **Arquitetura Orientada a Serviços (SOA) e Web Services**.

---

## 📇 Ficha da CitizenTech

| Campo | Conteúdo |
| --- | --- |
| **Nome** | Zela |
| **Cidade e bairro** | São Paulo — Vila Andrade |
| **Cidadão beneficiado** | Regina (persona), 53 anos, na fila do SUS sem previsão de atendimento |
| **Problema (1 frase)** | A pessoa não sabe se o caso é leve, se deve ir à UBS ou se é emergência — e espera sem orientação. |
| **Como funciona** | A triagem começa no próprio cidadão (voz, foto ou conversa com IA) e só encaminha a um humano (UBS, telessaúde, SAMU) quem precisa. Funciona sem exigir smartphone, saber ler ou internet. |
| **O que esta parte faz** | Backend: expõe a IA de triagem e guarda cidadãos, triagens e encaminhamentos (API REST + banco). |
| **Link do repositório** | _(preencher)_ |
| **Indicador de impacto** | nº de triagens, % resolvidas sem deslocamento, tempo até orientação, encaminhamentos por nível. |
| **ODS conectados** | 3 (Saúde), 10 (Desigualdades), 9 (Inovação/Infraestrutura), 11 (Cidades e comunidades). |

**Integrantes:**

- João Vitor Carotta Ribeiro (RM 555187)
- Arthur Bueno de Oliveira (RM 558396)
- Victor Magdaleno Marcos (RM 556729)

---

## Como rodar

```bash
python -m venv .venv
. .venv/Scripts/activate        # Windows (Git Bash) | Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # preencha GEMINI_API_KEY e DATABASE_URL

alembic upgrade head            # cria as tabelas no banco (migrações)
uvicorn app.main:app --reload
```

Abra **http://localhost:8000/docs** para a documentação automática (Swagger) e testar os endpoints.

> Sem `DATABASE_URL` no `.env`, o backend cai num **SQLite local** (`zela.db`) — útil para rodar sem internet.

---

## Arquitetura em camadas

A API segue uma separação em camadas inspirada em DDD: cada camada só conhece a de baixo, e o **domínio** (as regras de negócio) não depende de framework, banco nem HTTP. Isso deixa as regras testáveis isoladamente e o código fácil de evoluir.

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

---

## Banco de dados e domínio (SOA)

**Entidades** (SQLAlchemy, em `app/models/`):

- **Cidadão** (`cidadaos`) — a pessoa atendida. *1 cidadão → N triagens.*
- **Triagem** (`triagens`) — um atendimento: sintomas, nível (verde/amarelo/vermelho), orientação, origem (regras/IA) e canal. *1 triagem → N encaminhamentos.*
- **Encaminhamento** (`encaminhamentos`) — o destino gerado pela triagem (casa / UBS / telessaúde / SAMU) e seu status.

Ao registrar uma triagem (`POST /triagens`), o backend roda a lógica (regras + IA) e **já abre o encaminhamento** adequado: verde→casa, amarelo→UBS, vermelho→SAMU.

### Conexão

A conexão lê `DATABASE_URL` do `.env` (Supabase, via *Session pooler*). Formato:

```
DATABASE_URL=postgresql+psycopg://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
```

> Se a senha tiver caracteres especiais, use letras/números (reset no Supabase) ou faça o *URL-encode* (`@`→`%40`, `#`→`%23`, …).

### Migrações (Alembic)

```bash
alembic upgrade head                               # aplica as migrações (cria as tabelas)
alembic revision --autogenerate -m "sua mensagem"  # gera uma migração a partir dos modelos
alembic downgrade -1                               # desfaz a última
```

### Testes

```bash
pytest
```

Os testes rodam num **SQLite em memória** (offline, isolado) e cobrem CRUD, a integração com a triagem e o encaminhamento automático.

---

## Endpoints

**IA (sem estado):**
- `POST /triagem` — sintomas (texto) → nível + orientação (não grava nada; offline-first)
- `POST /voz/transcrever` — áudio → texto
- `POST /voz/falar` — texto → áudio (Piper)
- `POST /visao/analisar` — foto → descrição/risco

**Recursos persistidos (SOA):**
- `POST|GET /cidadaos`, `GET|PUT|DELETE /cidadaos/{id}`, `GET /cidadaos/{id}/triagens`
- `POST|GET /triagens`, `GET /triagens/{id}` — registra a triagem e abre o encaminhamento
- `GET /encaminhamentos` (filtra por `status`), `GET|PATCH /encaminhamentos/{id}`
- `GET /health`

## Modelos de IA usados (todos gratuitos)

| Necessidade | Online (MVP) | Offline / local |
| --- | --- | --- |
| **Triagem** (raciocínio) | Gemini Flash (free tier) | Llama / Qwen / Gemma pequenos + regras |
| **Voz — ouvir** (fala→texto) | Gemini Flash (aceita áudio) | faster-whisper (`small`) |
| **Voz — falar** (texto→voz) | — | **Piper** (offline, roda até em Raspberry Pi) |
| **Visão** (analisar foto) | Gemini Flash (multimodal) | Qwen2.5-VL / LLaVA |

> Para o MVP, **um único modelo gratuito (Gemini Flash) cobre voz, visão e triagem**
> quando há internet. Piper e faster-whisper cobrem o modo offline.

## Voz offline (Piper)

O `POST /voz/falar` usa o Piper, que roda **offline**. Para configurar numa máquina nova:

1. Baixe o binário do Windows `piper_windows_amd64.zip` em
   https://github.com/rhasspy/piper/releases (release 2023.11.14-2) e extraia em `ia/piper/`.
2. Baixe uma voz PT (`pt_BR-faber-medium.onnx` e `.onnx.json`) de
   https://huggingface.co/rhasspy/piper-voices (pasta `pt/pt_BR/faber/medium`) para `ia/models/`.
3. No `ia/.env`, aponte os caminhos **no formato Windows** (`C:/...`, não `/c/...`):

   ```
   PIPER_BIN=C:/.../ia/piper/piper/piper.exe
   PIPER_VOICE=C:/.../ia/models/pt_BR-faber-medium.onnx
   ```

> `ia/piper/` e `ia/models/` estão no `.gitignore` (arquivos pesados) — cada pessoa baixa na sua máquina.
