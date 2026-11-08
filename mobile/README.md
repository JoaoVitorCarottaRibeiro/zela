# Zela — Mobile

App do **cidadão** e do **agente comunitário**. React Native + Expo + TypeScript, offline-first.

## Inicializar o projeto Expo

A pasta já tem a estrutura de `src/`. Para gerar o projeto Expo por cima:

```bash
# na pasta mobile/
npx create-expo-app@latest . --template blank-typescript
npx expo start
```

## Estrutura de `src/`

| Pasta | Papel |
| --- | --- |
| `screens/` | Telas (triagem por voz/foto, resultado, acompanhamento, modo agente) |
| `components/` | Componentes reutilizáveis (botão de voz, ícones de sintoma, "toque onde dói") |
| `services/` | Chamadas à API de IA, sincronização offline, armazenamento local (SQLite) |
| `navigation/` | Navegação entre telas |
| `i18n/` | Textos e áudios em português simples |
| `assets/` | Ícones, imagens e áudios |

## Pontos de atenção (do escopo)

- **Voz primeiro:** a pessoa fala e ouve; leitura é opcional.
- **Offline-first:** triagem leve local; sincroniza quando há sinal (store-and-forward, SQLite).
- **Ícones grandes** e "toque onde dói" no lugar de formulários.
