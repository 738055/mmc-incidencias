# Bugzito — clipes de vídeo do mascote da IA

Solte aqui os clipes do **Bugzito**, **um por expressão**. O componente
`<MascotAvatar>` troca de clipe conforme o que a IA está fazendo.

## Arquivos esperados (nomes exatos)

| Arquivo                          | Expressão        | Quando toca                                   |
| -------------------------------- | ---------------- | --------------------------------------------- |
| `idle.webm` / `idle.mp4`         | parado           | esperando o usuário / exibindo a resposta     |
| `thinking.webm` / `.mp4`         | pensando         | enquanto a IA processa a pergunta             |
| `confused.webm` / `.mp4`         | confuso          | respondeu mas não achou tutorial/base         |
| `error.webm` / `.mp4`            | error            | falha de conexão / erro ao responder          |
| `sad.webm` / `.mp4`              | triste/cansado   | IA não configurada / não conseguiu ajudar     |

> Pode fornecer só `.mp4` ou só `.webm`. O componente tenta `.webm` primeiro
> (suporta transparência) e cai para `.mp4`. Sem os arquivos, aparece um
> fallback animado — nada quebra.

## Recomendações de exportação

- **Fundo transparente** (mascote "flutuando"): exporte em **WebM (VP9 com canal
  alpha)**. MP4 **não** tem transparência. (No Safari, WebM com alpha não
  funciona; se precisar de Safari com transparência, exporte HEVC com alpha.)
- **Fundo sólido** (ex.: navy da marca): qualquer `.mp4` serve — o avatar já é
  recortado num quadrado arredondado.
- **Loops curtos** (2–5 s), **mudos**, comprimidos (≈ ≤ 2–3 MB cada) para
  carregar rápido. Resolução quadrada (ex.: 512×512) cai bem.
