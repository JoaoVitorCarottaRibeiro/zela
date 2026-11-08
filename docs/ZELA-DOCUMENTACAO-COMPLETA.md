# Zela — Documentação Completa do Projeto

> **Documento de backup/handoff** gerado em **07/11/2026**.
> Reúne a identidade do projeto, as regras invioláveis, **tudo o que já foi construído**
> e **tudo o que ainda está planejado**. Serve como ponto de retomada caso o ambiente
> seja perdido/restaurado.

---

## 1. Identidade do projeto

- **Nome:** Zela — solução **CitizenTech** de triagem e orientação em saúde para comunidades.
- **Contexto acadêmico:** Global Solution (GS) **FIAP 2026.2**, Engenharia de Software.
- **Prazo final da GS:** **19/11/2026 às 23h55**. Equipe de até 5 alunos da mesma turma; o envio de cada disciplina no Teams é feito por 1 integrante.
- **Tese central:** o cuidado **começa no cidadão** (voz, foto, conversa com IA) e só encaminha a um humano quem realmente precisa. Princípio de inclusão: **não exige smartphone, saber ler, nem internet**.
- **ODS:** 3 (Saúde), 10 (Redução das desigualdades) — e, de forma secundária, 9 e 11.
- **Marca:** azul **`#4BB9FA`**.

### Ficha da CitizenTech (vai no topo do README das 3 entregas)
- **Cidade/bairro:** São Paulo — **Vila Andrade**.
- **Persona / cidadã beneficiada:** **Regina**, mulher, 53 anos, na fila do SUS sem previsão de atendimento. (É persona, mas há conversa real agendada; pode ser usada como a pessoa do briefing.)
- **Problema (1 frase):** demora/dificuldade de orientação em saúde — a pessoa não sabe se o caso é leve, se deve ir à UBS ou se é emergência, e fica na fila sem previsão.

---

## 2. Disciplinas e divisão de trabalho

**Sob responsabilidade do João (joaovitcr@gmail.com):**
- **Mobile Development & IOT**
- **Cybersecurity**
- **Arquitetura Orientada a Serviços (SOA) e Web Services**

As demais disciplinas ficam com outro integrante.

- **Documento de requisitos:** `docs/Zela - Requisitos GS por disciplina.docx`.
- **Ordem de implementação acordada:** **SOA → Web (site do cidadão) → Mobile → Cybersecurity** (SOA é a base que as outras consomem).
- **Observação importante:** foi feito **primeiro o site que o cidadão acessa**; o **painel administrativo** vem depois (mesma app Next).
- **PENDÊNCIA:** preencher os **nomes dos integrantes** nos READMEs das 3 entregas no fim (SOA exige "nomes dos integrantes" no README).

---

## 3. Stack técnica

**Monorepo:** raiz em `Mobile/` com as pastas `mobile/` (Expo), `web/` (Next), `ia/` (FastAPI + IA), `brand/` (marca), `docs/`.

### Frontend (`web/`)
- **Next.js 14.2.15** (App Router) + **React 18.3.1** + **TypeScript**.
- **CSS Modules** puro (sem Tailwind). **Fonte única: Inter** (via `next/font`).
- **jsPDF 2.5.2** para exportar a ficha médica em PDF (client-side).
- **Leaflet 1.9.4** + tiles OpenStreetMap para o mapa.

### Backend / IA (`ia/`)
- **FastAPI** + **SQLAlchemy 2.x** + **Alembic**.
- Banco: **Supabase (PostgreSQL)** via **psycopg3 (session pooler)**; fallback para **SQLite** local quando `DATABASE_URL` vazio (usado nos testes).
- **IA de triagem:** Google **Gemini** (free tier) com **rede de segurança por regras** (funciona offline).
- **Voz:** Whisper (transcrição) / Piper (síntese) — opcionais.
- **Visão:** análise de foto (modo limitado no ambiente atual).
- **Auth:** **somente stdlib** — PBKDF2-SHA256 (hash de senha) + **token HMAC-SHA256 assinado e TIPADO** (`auth` vs `reset`).
- **E-mail:** `smtplib` com **modo simulado** (grava em `ia/emails_dev.log` quando não há SMTP).

### Mapa (página `/mapa`, logada)
- 100% gratuito e **sem chave de API**: **Leaflet + OSM** (mapa), **Nominatim** (achar hospital/UPA/UBS próximos — 3 buscas por termo), **Valhalla público** (tempo a pé/carro + rota), e **link do Google Maps** `travelmode=transit` para transporte público.
- Prioridade de localização: **(1) GPS do navegador → (2) endereço cadastrado (geocodificado via Nominatim) → (3) fallback Vila Andrade**.
- IMPORTANTE: **não** colocar trava com `useRef` no effect de geolocalização — quebra no StrictMode do dev (deixa "Localizando…" preso). Usa `let ativo` + cleanup.

---

## 4. Como rodar o projeto

```bash
# Backend (porta 8000) — a partir de ia/
ia/.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

```bash
# Frontend (porta 3000) — a partir da raiz
npm --prefix web run dev
```

- Swagger do backend em `http://localhost:8000/docs`.
- O frontend fala com o backend em `http://localhost:8000` (configurável via `NEXT_PUBLIC_API_URL`).
- **Migrações:** `ia/.venv/Scripts/python.exe -m alembic upgrade head` (a partir de `ia/`).
- **Testes:** `ia/.venv/Scripts/python.exe -m pytest` (SQLite, offline) — **54 testes passando**.

> **Atenção (lição aprendida):** instalar uma dependência nova (ex.: `jspdf`) com o dev server do Next rodando pode deixar o build em cache quebrado (páginas renderizam sem CSS). **Reiniciar o dev server** resolve. Se a porta 3000 ficar presa:
> ```bash
> Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
> ```

---

## 5. Regras de produto e visual (definidas pelo João)

- Visual **profissional**, **SEM emoji**, **MESMA fonte** sempre.
- Na triagem, **"dividir bem os campos da IA"** (texto / voz / foto bem separados).
- Referências de layout dadas: template **"Hospital Management"** + **hospitalsiriolibanes.org.br**.
- **Marcadores de formulário:** `*` vermelho nos campos obrigatórios; **nada** nos opcionais (removidos todos os "(opcional)").
- Logo no topo: **logado → leva para `/triagem`**; deslogado → leva para a landing page.

---

## 6. Regras de segurança e LGPD (INVIOLÁVEIS)

Estas regras foram decididas em conversa e **têm precedência** sobre conveniência:

1. **CPF identifica, NÃO autentica.** CPF (e dados pessoais como nome/nascimento/endereço) estão vazados no Brasil — nunca servem de senha nem revelam/abrem conta.
2. **Admin NUNCA sabe nem define a senha de um usuário.** No reset assistido (futuro), o operador apenas **autoriza** o reset; quem digita a senha nova é sempre o dono.
3. **Urgência (convidado) não mostra NENHUMA PII.** Só coleta o CPF para vincular o caso depois.
4. **Vínculo de triagem à conta só acontece no login autenticado** (`crud.vincular_triagens_por_cpf`) — nunca pelo CPF puro.
5. **Resposta genérica anti-enumeração:** `/auth/recuperar` responde sempre a mesma mensagem, exista ou não a conta.
6. **E-mail continua OPCIONAL** no cadastro.
7. **Tokens TIPADOS:** um token de `reset` não autentica (`/auth/me` o rejeita) e vice-versa.
8. **Dado de saúde é sensível (LGPD):** a ficha médica só é acessada/gravada pelo próprio dono; consentimento explícito obrigatório para salvar.
9. **Sempre dados fictícios** (o briefing proíbe dados reais).
10. **Senha:** mínimo 6 caracteres, com maiúscula, número e caractere especial.

---

## 7. Backend (`ia/`) — detalhado

### Estrutura
```
ia/app/
  core/        config.py, security.py, email.py
  db/          base.py, session.py
  models/      cidadao.py, triagem.py, encaminhamento.py, usuario.py, ficha_medica.py, enums.py
  routers/     auth.py, ficha.py, triagem.py, triagens.py, visao.py, voz.py, cidadaos.py, encaminhamentos.py
  services/    triagem_service.py, voz_service.py, visao_service.py
  schemas.py, crud.py, deps.py, main.py
ia/alembic/versions/   (migrações)
ia/tests/              (pytest)
```

### Modelos (tabelas)
- **Cidadao** 1-N **Triagem** 1-N **Encaminhamento** (domínio SOA original).
- **Usuario** (`usuarios`): `nome_completo`, `data_nascimento`, `cpf`[11, único], `email`[opcional, único], `senha_hash`, **`genero`**, **`identidade_genero`**, endereço (`cep`, `logradouro`, `bairro`, `cidade`, `uf`, `complemento`), `criado_em`. Relação 1-1 com `ficha`.
- **Triagem** tem `usuario_id` (FK SET NULL) e **`cpf_informado`** (urgência de convidado; não autentica).
- **FichaMedica** (`fichas_medicas`): 1-1 com usuário (`usuario_id` único, `ondelete CASCADE`), **`dados` (JSON)** com as respostas do questionário, `criado_em`, `atualizado_em`.

### `core/security.py`
- `hash_senha` / `conferir_senha` (PBKDF2-SHA256).
- `criar_token(usuario_id, *, typ="auth", exp_seg=None)` / `ler_token(token, *, typ_esperado="auth")`.
- `criar_token_reset(usuario_id)` (typ `reset`, vida curta = `RESET_EXP_MIN`, padrão 30 min) / `ler_token_reset`.

### `core/config.py` (lido do `.env`)
Principais: `secret_key`, `token_exp_horas` (72), `reset_exp_min` (30), `database_url`, `db_password`, `gemini_api_key`, `gemini_model`, e **SMTP**: `smtp_host`, `smtp_port` (587), `smtp_user`, `smtp_password`, `smtp_from`, `smtp_tls` (true), `frontend_url` (`http://localhost:3000`).

### `core/email.py`
- `enviar_email(destino, assunto, corpo) -> bool`. Sem `smtp_host` → **modo simulado** (grava em `ia/emails_dev.log`, retorna False). Com SMTP → envia via `smtplib` (STARTTLS na 587, login se `smtp_user`).

### `services/triagem_service.py` (motor da triagem)
- **Duas camadas:** (1) **regras** (palavras-chave, offline, rede de segurança) → classifica verde/amarelo/vermelho; (2) **IA (Gemini)** refina.
- **Regra de ouro:** um **sinal vermelho** detectado pelas regras **NUNCA** é rebaixado pela IA.
- A IA **já recebe a idade** no prompt (`contents=f"Sintomas: ... Idade: X."`), **mas o prompt ainda não instrui explicitamente como pesar a idade** — isso é a próxima fase (ver §12).

### Rotas (REST)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/cadastro` | cria conta (+ vincula urgências por CPF) |
| POST | `/auth/login` | login por CPF **ou** e-mail (+ vincula urgências) |
| GET | `/auth/me` | dados do usuário logado |
| PATCH | `/auth/me` | **editar perfil** (nome, nascimento, e-mail, gênero, endereço; checa e-mail duplicado 409) |
| POST | `/auth/trocar-senha` | **trocar senha logado** (senha atual → nova; 400 se atual errada; 422 se nova == atual ou fraca) |
| POST | `/auth/recuperar` | dispara e-mail de reset (resposta genérica) |
| POST | `/auth/redefinir` | redefine senha com token do e-mail |
| GET/PUT | `/ficha` | **ficha médica** do próprio usuário (só o dono) |
| POST | `/triagens` | registra triagem (vincula ao logado; ou `cpf_informado` na urgência) |
| GET | `/triagens/minhas` | histórico do usuário logado |
| POST | `/triagem`, `/voz/transcrever`, `/voz/falar`, `/visao/analisar` | IA sem estado |
| ... | `/cidadaos`, `/encaminhamentos`, `/health` | SOA/infra |

### Migrações aplicadas no Supabase (head atual: `e5c3f7a9b2d1`)
1. `88f87a53f93b` — cidadaos, triagens, encaminhamentos.
2. `a60cb6675301` — usuarios + vínculo com triagem.
3. `c3a1b2d4e5f6` — `triagens.cpf_informado` (urgência).
4. `d4b2c6e8f1a3` — endereço no usuário (cep, logradouro, bairro, cidade, uf, complemento).
5. `e5c3f7a9b2d1` — `usuarios.genero`/`identidade_genero` + tabela `fichas_medicas`.

---

## 8. Frontend (`web/`) — páginas e componentes

### Páginas (`src/app/`)
- `/` (landing), `/sobre`, `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`.
- `/triagem` (3 canais: texto/voz/foto), `/resultados`, `/mapa` (protegidas).
- `/urgencia` (convidado, só CPF).
- `/perfil` (ver/editar dados), `/trocar-senha`, **`/ficha-medica`**.
- `not-found.tsx` (404 customizado).

### Componentes-chave (`src/components/`)
- `SiteHeader` (nav; logado: **Ficha médica → Minha triagem → Resultados → Mapa** + avatar de iniciais com menu **Ver perfil / Trocar senha / Sair**).
- `FormAuth.module.css` (estilos compartilhados de formulários).
- `MedidorSenha` (barras em tons de azul; sem texto de dica).
- `PerfilCliente`, `TrocarSenhaCliente`, `UrgenciaCliente`.
- `triagem/TriagemCliente`, `triagem/SaudacaoTriagem`.
- `MapaCliente` (Leaflet dinâmico).
- **Ficha médica:** `FichaMedicaCliente` + `lib/fichaDefs.ts` (estrutura declarativa das seções 1–7) + `lib/fichaPdf.ts` (jsPDF).

### Libs (`src/lib/`)
- `api.ts` (todas as chamadas ao backend), `auth.tsx` (AuthProvider/useAuth, token em `localStorage` chave `zela_token`, `atualizarUsuario`/`definirSessao`), `tipos.ts`, `opcoes.ts` (GENEROS/IDENTIDADES_GENERO), `navegacao.ts` (destino pós-login), `fichaDefs.ts`, `fichaPdf.ts`.

---

## 9. Histórico — tudo o que foi construído

### Fases anteriores (05–06/11/2026)
- **SOA concluída:** domínio, Supabase, Alembic, CRUD/REST, Swagger, testes.
- **Auth login/cadastro:** stdlib, `Usuario`, rotas de auth, proteção de rota, Resultados.
- **Web do cidadão:** home, `/triagem` (texto/voz/foto), `/sobre`.
- **Mapa:** unidades próximas, stack gratuita sem chave.

### Nesta frente (06–07/11/2026)
- **Urgência + recuperação de senha:** botão **Urgência** no login → `/urgencia` (só CPF) → triagem de convidado (`cpf_informado`, sem PII); vínculo seguro no login; reset por e-mail com token tipado (30 min) em **modo simulado** (`emails_dev.log`).
- **Endereço (CEP/ViaCEP):** cadastro preenche logradouro/bairro/cidade/uf a partir do CEP (API ViaCEP); endereço usado como fallback no mapa.
- **Ajustes do formulário de cadastro:** reordenação (nome → nascimento/CPF → e-mail → gênero/identidade → endereço → senha), `*` nos obrigatórios, sem placeholders redundantes, medidor de senha em tons de azul.
- **Tela de usuário logado:** saudação **"Olá, {nome}"** no topo do hero (mesma fonte/tamanho do h1, nome na mesma cor); menu do **avatar com iniciais** → **Ver perfil / Trocar senha / Sair** (Sair volta à LP).
- **Página de perfil** (`/perfil`): avatar de iniciais, "Membro desde", edição de dados pessoais (CPF read-only), gênero/identidade, endereço (com ViaCEP), dica para cadastrar e-mail se não houver.
- **Trocar senha** (`/trocar-senha`): senha atual → nova → confirmar (`POST /auth/trocar-senha`); atalho "não lembro a senha atual" → envia link por e-mail (se tiver e-mail) ou orienta ir à unidade de saúde.
- **Campo de idade da triagem REMOVIDO:** a IA usa a idade já cadastrada (calculada do nascimento).
- **Gênero + Identidade de gênero** no cadastro e perfil. Decisão: o 2º campo é **Identidade de gênero** (Cisgênero/Transgênero/Não-binário/Outra/Prefiro não informar), **não** orientação sexual. Maria de Fatima setada como **Feminino + Cisgênero**.
- **Ficha médica** (`/ficha-medica`): seção no menu **antes** de Minha triagem; questionário das **seções 1–7** do PDF de referência (ver §11); salva na conta (`GET/PUT /ficha`); **exporta em PDF** (jsPDF); alerta do SAMU se marcar sinal de emergência; consentimento LGPD obrigatório.
- **Correções:** login só "volta" para páginas de conteúdo (nunca para `/trocar-senha`); logo logado → `/triagem`; 404 customizado.

---

## 10. Design aprovado — troca e recuperação de senha (4 casos)

| Caso | Situação | Fluxo | Status |
|---|---|---|---|
| 1 | Deslogada · esqueceu · **tem** e-mail | link por e-mail (token tipado 30 min) → nova senha | ✅ Pronto |
| 2 | Deslogada · esqueceu · **sem** e-mail | vai à unidade de saúde → atendente confere identidade → **autoriza** o reset no painel admin → a própria pessoa define a senha. Atendimento segue na hora via Urgência. | ⏳ A construir **com o painel admin** |
| 3 | Logada · trocar · **tem** e-mail | padrão senha atual → nova; atalho "não lembro" → link por e-mail | ✅ Pronto |
| 4 | Logada · trocar · **sem** e-mail | senha atual → nova (sem e-mail) | ✅ Pronto |

Borda: logada + esqueceu a atual + sem e-mail → cai no caso 2 (reset assistido). Inevitável sem canal externo.

---

## 11. Ficha médica — conteúdo (seções 1–7 do PDF)

> Base: `ficha_pre_atendimento_ia.pdf`. As seções **8 e 9 foram ignoradas** por decisão do João (são orientações de uso da IA / fluxo — entram na fase de IA).

1. **Sinais de emergência** (checkboxes; alerta do SAMU 192 se algum marcado).
2. **Histórico médico:** condições diagnosticadas (+ "Outra"), doença crônica, cirurgia/internação (+ detalhe), histórico familiar.
3. **Medicamentos e alergias:** usa medicamentos? (+ lista nome/dosagem/frequência/motivo), alergias (+ detalhe), reação alérgica grave.
4. **Histórico clínico complementar:** problemas prévios, tratamento atual (+ detalhe), gravidez.
5. **Hábitos:** fumo, álcool, sono, atividade física, restrição alimentar (+ detalhe).
6. **Informações adicionais:** texto livre; exame/diagnóstico recente (Sim/Não + descrição). **Upload real de arquivo NÃO implementado** (só a pergunta) — pendência.
7. **Consentimento e privacidade (LGPD):** 3 confirmações obrigatórias para salvar (veracidade, autorização de tratamento, ciência de que a IA não substitui profissional).

Estrutura declarativa em `web/src/lib/fichaDefs.ts` alimenta **o formulário e o PDF** (fonte única, sem divergência).

---

## 12. Pendências e próximos passos

**Plano acordado:** **primeiro terminar o front** de todas as telas necessárias; **depois dar contexto e aprimorar a IA**.

### Próxima fase — aprimorar a IA (combinado)
- **Usar o contexto clínico na triagem:** alimentar a IA com a **ficha médica** + **idade** + **gênero**.
- **Raciocínio por idade:** a infraestrutura já envia a idade à IA; falta **instruir explicitamente o prompt** a pesar faixas etárias (ex.: bebês < 3 meses e idosos 65+ merecem mais cautela) e, opcionalmente, **escalonar nas regras** (rede de segurança determinística). Regra: idade **sobe** a cautela, nunca rebaixa um sinal de alerta.

### Produto
- **Painel administrativo** (mesma app Next): gestão de encaminhamentos + **reset assistido (caso 2)** — operador autoriza, usuário define a senha.
- **Upload de exames** na ficha (seção 6.2) — hoje é só pergunta Sim/Não.
- **Fallback por SMS** na recuperação (precisa de gateway pago).
- **Token de reset de uso único de fato** (hoje é só por tempo).
- **Mobile (Expo):** app do cidadão (disciplina do João).

### Cybersecurity (do zero — sem repo-base do professor)
Módulo próprio em Python junto do `ia/`, 3 pilares:
1. **Mapeamento de PII** (detectar CPF, dados de saúde, senhas — regex).
2. **Taint Analysis** (rastrear o dado sensível e bloquear vazamento em saída insegura).
3. **Tradução via IA** (LLM traduz a falha técnica em alerta de **"Risco Cidadão"** num painel).

### Infra / e-mail
- **SMTP real** para enviar e-mails de verdade (hoje em modo simulado). Opções gratuitas:
  - **Gmail + senha de app** (chega no próprio Gmail; `smtp.gmail.com:587`).
  - **Mailtrap** (sandbox de testes; captura em caixa falsa).
  - **Brevo** (300/dia grátis, entrega real).
  - Preencher `SMTP_*` e `FRONTEND_URL` no `ia/.env` e reiniciar o backend. **Nunca** commitar o `.env` (já está no `.gitignore`).

### Encerramento
- **Preencher nomes dos integrantes** nos READMEs das 3 entregas (SOA exige).
- Revisar o visual com o João.

---

## 13. Estado do banco e contas de teste

- **Conta real de teste mantida:** **Maria de Fatima** — CPF `49087776512`, sem e-mail, **Gênero: Feminino / Identidade: Cisgênero**. (Senha definida pelo João.)
- Durante o desenvolvimento há também uma conta com o e-mail real do João (`joaovitcr@gmail.com`) criada para testar o fluxo de recuperação; os links de reset simulados ficam em `ia/emails_dev.log`.
- Contas temporárias usadas em verificações foram removidas.

---

## 14. Testes

- **54 testes pytest** passando (SQLite em memória, offline, sem chamar a IA).
- Cobrem: cadastro/login, CPF, endereço, urgência/vínculo, recuperação, troca de senha, editar perfil, gênero/identidade e ficha médica (criar/obter/upsert/isolamento por usuário).

---

## 15. Referências de arquivos úteis

- Relatório de urgência/recuperação: `docs/relatorio-urgencia-recuperacao-senha.md`.
- Requisitos por disciplina: `docs/Zela - Requisitos GS por disciplina.docx`.
- Este documento: `docs/ZELA-DOCUMENTACAO-COMPLETA.md`.

---

*Fim do documento de backup. Mantido fiel ao estado do projeto em 07/11/2026.*
