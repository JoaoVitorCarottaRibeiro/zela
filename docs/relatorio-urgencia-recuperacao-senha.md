# Relatório — Urgência, acesso por CPF e recuperação de senha

**Projeto:** Zela (CitizenTech) — GS FIAP 2026.2
**Data:** 06/11/2026
**Escopo deste relatório:** fluxo de urgência (triagem sem login), vínculo seguro
por CPF e recuperação de senha por e-mail.

---

## 1. Resumo

Implementamos um caminho para a pessoa **passar mal e ser atendida na hora, sem
login**, e um sistema completo de **recuperação de senha por e-mail**. As duas
coisas foram desenhadas com um cuidado central de segurança: **o CPF identifica,
mas nunca autentica** — ninguém acessa a conta de outra pessoa só por saber o CPF
dela, e nenhum administrador conhece a senha de ninguém.

Decisão de produto que norteou tudo: **separar "ser atendido agora" de "entrar na
minha conta"**. A triagem — a parte que cuida — passou a estar disponível a
convidados; o login serve para **guardar e acompanhar** o histórico. Assim, quem
esquece a senha nunca fica sem cuidado.

---

## 2. Contexto e decisões de projeto

Avaliamos (e descartamos) o método de **reconhecimento facial** do tipo gov.br:

- Ele depende de uma **base biométrica confiável do governo** (TSE/CNH) que não
  temos. Recriá-lo exigiria guardar biometria do usuário — **dado sensível na
  LGPD** —, com segurança fraca (fácil de enganar com foto) e custo alto.
- Exige **smartphone com câmera e app**, o que contraria o princípio da Zela de
  *"não exigir smartphone"* e a inclusão da persona (Regina, sem e-mail).

Também discutimos tornar o **e-mail obrigatório**: foi **descartado**, porque
excluiria quem não tem e-mail. O e-mail **continua opcional**.

Por fim, avaliamos a recuperação de senha **presencial (UBS)** como fallback.
Concluímos que forçar uma pessoa doente a ir à UBS só para redefinir senha
contraria a missão. A solução foi **não travar o atendimento**: a urgência resolve
o acesso ao cuidado, e a recuperação da conta deixa de ser uma emergência.

> Ponto de segurança levantado e corrigido durante o desenho: a ideia inicial era,
> na urgência, "puxar os dados da pessoa pelo CPF" e "associar o caso à conta na
> hora". Isso abriria um **sequestro de conta por CPF** (CPF não é segredo no
> Brasil). Ajustamos: a urgência **não mostra nenhum dado pessoal** e o vínculo à
> conta acontece **só no login com senha**, quando a pessoa prova ser a dona.

---

## 3. O que foi implementado

### 3.1. Botão "Urgência" e triagem de convidado (por CPF)

- Na tela **Entrar**, abaixo do botão "Entrar", há um botão **Urgência** em
  destaque, com a chamada *"Está passando mal? Faça a triagem agora, sem login — só
  com o seu CPF."*
- A página **`/urgencia`** pede **apenas o CPF** (somente números, 11 dígitos) e
  leva direto à triagem (texto, voz ou foto), **sem exigir senha**.
- A triagem de convidado é salva com o CPF em um campo próprio
  (`cpf_informado`), **sem dono** (`usuario_id` nulo). O convidado vê **apenas o
  resultado do seu próprio atendimento** — nunca o histórico de ninguém.
- Um aviso explica: *"Atendimento de urgência como convidado. Se você já tem conta
  com este CPF, este atendimento vai aparecer no seu histórico assim que você
  entrar."*

### 3.2. Vínculo seguro no login (nunca pelo CPF puro)

- Quando a pessoa **faz login** (CPF/e-mail + senha) **ou se cadastra**, o sistema
  vincula automaticamente à conta todas as triagens de urgência feitas com aquele
  CPF (`cpf_informado == cpf do usuário` e sem dono). É o **momento seguro**: ela
  provou ser a dona.
- Resultado: o atendimento feito na urgência aparece sozinho em **Resultados**
  depois do login — sem que o CPF sozinho, em momento algum, revele ou abra a conta.

### 3.3. Recuperação de senha por e-mail

- Páginas **`/recuperar-senha`** (pede CPF ou e-mail) e **`/redefinir-senha`**
  (cria a nova senha a partir do link recebido).
- Fluxo: pedido → geramos um **token assinado de vida curta** (expira em 30 min) →
  enviamos por e-mail um link `…/redefinir-senha?token=…` → a pessoa define a nova
  senha (com o medidor de força) → **entra já logada**.
- **Não revela se a conta existe:** a resposta de `/recuperar-senha` é **sempre a
  mesma**, tenha ou não conta/e-mail — evita descobrir quem está cadastrado.
- Só vale para quem tem **e-mail cadastrado** (coerente com e-mail opcional). Quem
  não tem e-mail usa a **urgência** para ser atendido e resolve a conta depois.

---

## 4. Segurança (resumo)

| Cuidado | Como foi atendido |
|---|---|
| CPF não autentica | CPF só gera triagem de convidado; nunca abre/revela conta |
| Sem vazar PII | Urgência não mostra nome nem dados pelo CPF |
| Vínculo seguro | Associação da triagem à conta só no login com senha |
| Senha nunca conhecida por terceiros | Hash PBKDF2; reset cria senha nova feita pelo próprio dono |
| Token não reutilizável entre usos | Tokens **tipados** (`auth` x `reset`): um não serve no lugar do outro |
| Link de reset de vida curta | Expira em 30 min (configurável em `RESET_EXP_MIN`) |
| Não enumerar contas | `/auth/recuperar` responde sempre a mesma mensagem |
| LGPD | Não guardamos biometria; dado de saúde protegido por autenticação real |

---

## 5. Arquivos

**Back-end (`ia/`)**
- `app/models/triagem.py` — nova coluna `cpf_informado` (String 11, indexada).
- `alembic/versions/c3a1b2d4e5f6_…py` — migração da coluna (**aplicada no Supabase**).
- `app/schemas.py` — `cpf_informado` na triagem; `RecuperarIn`, `RedefinirIn`,
  `MensagemOut`; validadores de CPF e de força de senha reaproveitados.
- `app/crud.py` — `criar_triagem` grava `cpf_informado`; `vincular_triagens_por_cpf`
  (vínculo no login); `atualizar_senha`.
- `app/core/security.py` — tokens **tipados** (`auth`/`reset`); `criar_token_reset` /
  `ler_token_reset`.
- `app/core/email.py` (novo) — envio de e-mail com **modo simulado** (grava em
  `emails_dev.log` quando não há SMTP).
- `app/core/config.py` + `.env.example` — `RESET_EXP_MIN`, `SMTP_*`, `FRONTEND_URL`.
- `app/routers/auth.py` — `/auth/recuperar`, `/auth/redefinir`; vínculo por CPF no
  login/cadastro.
- `app/routers/triagens.py` — repassa `cpf_informado` para convidados.
- `tests/test_auth.py` — novos testes (urgência, vínculo, recuperação, tipagem de token).

**Front-end (`web/`)**
- `src/app/login/page.tsx` — botão **Urgência** + link "Esqueci minha senha".
- `src/app/urgencia/page.tsx` + `src/components/UrgenciaCliente.tsx` (+ CSS) — fluxo
  de convidado por CPF.
- `src/app/recuperar-senha/page.tsx` e `src/app/redefinir-senha/page.tsx` — telas de
  recuperação.
- `src/components/MedidorSenha.tsx` (novo) — medidor de força reutilizado no cadastro
  e na redefinição.
- `src/components/triagem/TriagemCliente.tsx` — aceita `cpfConvidado`.
- `src/lib/api.ts` — `recuperarSenha`, `redefinirSenha`; `enviarTriagem` aceita CPF de
  convidado.
- `src/lib/auth.tsx` — `definirSessao` (entrar logado após redefinir).

---

## 6. Como testar

**Back-end (testes automatizados):**
```bash
cd ia
.\.venv\Scripts\python.exe -m pytest -q
```
Resultado atual: **34 testes passam** (inclui urgência, vínculo no login, token
tipado e recuperação de senha).

**Manual (com o site e a API no ar):**
1. Em **Entrar**, clique **Urgência**, informe um CPF e faça uma triagem — ela é
   salva como convidado.
2. Faça **login** com esse mesmo CPF: o atendimento aparece em **Resultados**.
3. Em **Entrar → Esqueci minha senha**, informe o CPF/e-mail. Sem SMTP, o e-mail é
   gravado em `ia/emails_dev.log`; abra o link de lá para redefinir a senha.

> Modo simulado de e-mail: sem `SMTP_HOST` no `.env`, nada é enviado de verdade — o
> conteúdo (com o link) é gravado em `ia/emails_dev.log`. Para enviar de verdade,
> basta preencher `SMTP_*` no `.env`.

---

## 7. Limitações e próximos passos

- **Fallback por SMS** (para quem não tem e-mail, mas tem celular): desenhado, mas
  não implementado — depende de um gateway pago (ex.: Zenvia/AWS SNS). A arquitetura
  já comporta adicionar como mais um canal de recuperação.
- **Token de reset**: hoje é de **vida curta por tempo** (30 min). Um reforço futuro
  é torná-lo **de uso único de fato**, invalidando-o assim que a senha muda (por
  exemplo, ligando o token ao hash atual da senha).
- **Envio de e-mail real**: em produção, configurar `SMTP_*` e trocar `SECRET_KEY`.
- **Reset assistido (balcão/UBS)**: não foi necessário implementar agora, porque a
  urgência já garante atendimento sem login; se um dia for feito, deve seguir o
  modelo seguro (código de uso único + a própria pessoa cria a senha + auditoria),
  nunca o administrador digitando a senha.
