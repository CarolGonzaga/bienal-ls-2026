# Mapa indoor da Bienal

## Arquitetura

- `src/data/map/mapaPngSpaces.ts`: transcrição dos estandes, serviços e módulos do `MAPA.png`.
- `src/data/map/map-layout.ts`: viewBox `1920 × 1080`, pavilhões, ruas e anotações.
- `src/data/map/map-routing-graph.ts`: portões, cruzamentos e acessos aos expositores.
- `src/components/map/BienalMap.tsx`: composição pública do mapa SVG 2D.
- `src/components/map/MapBooth.tsx`: retângulos e polígonos dos espaços.
- `scripts/audit-map-spaces.mjs`: verificação de códigos duplicados e sobreposições.

## Coordenadas e referência

O único guia geométrico é `public/mapa/mapa-guia-2d.png`, com `1920 × 1080`. PNG e SVG usam coordenadas nativas 1:1. A imagem de referência não é carregada nem exibida na página pública.

O mapa contém 269 elementos cadastrados, sendo 221 estandes. Os 29 expositores confirmados no banco são vinculados pelo código e recebem destaque de cor; os demais espaços permanecem cinza.

## Rótulos e navegação

- Estandes mostram somente o código.
- Ruas A–K e AA–DD usam placas pequenas.
- Áreas de serviço mantêm seus nomes funcionais.
- Módulos sem texto no desenho original são vetorizados sem rótulo inventado.
- Formas irregulares como K20, IF02 e IF04A usam polígonos para não sobrepor espaços vizinhos.

## Câmera e zoom

- Escala inicial: `130%` (duas vezes a apresentação anterior).
- Escala mínima: `55%`.
- Escala máxima: `1000%`.
- Foco automático em estandes: `440%`.
- O botão **Centralizar** retorna para `130%`.
- Roda, pinça, arraste e duplo clique atuam somente sobre a superfície do mapa; cabeçalho, legendas e controles permanecem fixos.
- Os limites de arraste são calculados conforme a escala atual; cliques sem deslocamento não alteram a câmera e o clique final de um arraste é suprimido.

## Validação

Execute:

```text
node --experimental-strip-types scripts/audit-map-spaces.mjs
npm run test:map
npm run build
```

A auditoria deve retornar listas vazias em `overlaps` e `duplicateCodes`.

## URLs de rota

Exemplo:

```text
/?origin=P8&destination=H70
```

Origens aceitas incluem portões, nós centrais das ruas e acessos dos expositores.
