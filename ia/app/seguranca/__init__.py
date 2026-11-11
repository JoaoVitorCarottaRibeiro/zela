"""Módulo de Cybersecurity da Zela (CitizenTech GS 2026.2).

O "escudo" da Zela: protege os dados de saúde (PII) que trafegam entre o app, o
backend e o banco. Três pilares, construídos do zero (sem repo-base):

1. pii        — Mapeamento de PII (detecta CPF, saúde, senhas... por regex+validação).
2. taint      — Taint Analysis (rastreia o dado sensível e bloqueia saídas inseguras).
3. risco      — Tradução via IA: falha técnica -> alerta de "Risco Cidadão".

Apoio: auditoria (indicador do painel), scanner (varredura/evidências),
log_filter (redige PII nos logs) e servico (orquestra os três pilares).
"""
