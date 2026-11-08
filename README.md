# Zela

Solução **CitizenTech** de triagem e orientação em saúde para **comunidades**.
Começa no próprio cidadão — por voz, foto ou conversa com uma IA — e só encaminha
para um humano (telessaúde ou agente comunitário) quem realmente precisa.

> **FIAP — Global Solution (Citizen Tech) · 2026**
> Documento de escopo: https://claude.ai/artifact/9s9gwXcATjcWjFA6qALsjR

Princípio que guia o projeto: **não exige smartphone, não exige saber ler e não exige internet.**

## Estrutura do repositório

| Pasta | O que é | Tecnologia |
| --- | --- | --- |
| `mobile/` | App do cidadão e do agente comunitário | React Native + Expo + TypeScript |
| `web/` | Painel de gestão da UBS | Next.js + TypeScript |
| `ia/` | Serviço de IA: voz, visão e triagem | Python + FastAPI |
| `brand/` | Identidade visual (logo, ícone) | — |
| `docs/` | Documentação do projeto | — |

> Observação: esta pasta (`Mobile`) está sendo usada como **raiz do projeto Zela**.
> Se preferir, renomeie-a para `zela`. Os três módulos podem virar repositórios
> separados depois — por ora ficam juntos (monorepo) para facilitar.

## Como rodar (resumo)

```bash
# IA (Python)
cd ia && python -m venv .venv && . .venv/Scripts/activate && pip install -r requirements.txt
uvicorn app.main:app --reload

# Mobile (depois de inicializar o Expo — ver mobile/README.md)
cd mobile && npm install && npx expo start

# Web (depois de inicializar o Next — ver web/README.md)
cd web && npm install && npm run dev
```

## ODS

ODS 3 (Saúde e bem-estar) e 10 (Redução das desigualdades).
