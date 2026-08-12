import type { StandGeometry } from '../types/index.ts'

/**
 * Initial Stand Geometries (7955x6436 reference plan coordinates normalized to 0..1).
 * Maps every exhibitor whose stand exists in the official floor plan.
 */
export const INITIAL_STAND_GEOMETRIES: StandGeometry[] = [
  // ==========================================
  // 1. RUA A
  // ==========================================
  {
    id: "stand-a58",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "amazon",
    standCode: "A58",
    type: "polygon",
    polygon: [
      { x: 2655 / 7955, y: 4324 / 6436 },
      { x: 3045 / 7955, y: 4324 / 6436 },
      { x: 3045 / 7955, y: 4481 / 6436 },
      { x: 2655 / 7955, y: 4481 / 6436 }
    ],
    height: 1.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-a60",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "novo-seculo",
    standCode: "A60",
    type: "polygon",
    polygon: [
      { x: 2320 / 7955, y: 4324 / 6436 },
      { x: 2551 / 7955, y: 4324 / 6436 },
      { x: 2551 / 7955, y: 4481 / 6436 },
      { x: 2320 / 7955, y: 4481 / 6436 }
    ],
    height: 1.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-a80",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "flyve",
    standCode: "A80",
    type: "polygon",
    polygon: [
      { x: 1423 / 7955, y: 4324 / 6436 },
      { x: 1550 / 7955, y: 4324 / 6436 },
      { x: 1550 / 7955, y: 4481 / 6436 },
      { x: 1423 / 7955, y: 4481 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 2. RUA B
  // ==========================================
  {
    id: "stand-b79",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "uiclap",
    standCode: "B79",
    type: "polygon",
    polygon: [
      { x: 1610 / 7955, y: 4105 / 6436 },
      { x: 1700 / 7955, y: 4105 / 6436 },
      { x: 1700 / 7955, y: 4183 / 6436 },
      { x: 1610 / 7955, y: 4183 / 6436 }
    ],
    height: 1.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 3. RUA C
  // ==========================================
  {
    id: "stand-c20",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "faro-editorial",
    standCode: "C20",
    type: "polygon",
    polygon: [
      { x: 5544 / 7955, y: 3728 / 6436 },
      { x: 6000 / 7955, y: 3728 / 6436 },
      { x: 6000 / 7955, y: 3887 / 6436 },
      { x: 5544 / 7955, y: 3887 / 6436 }
    ],
    height: 1.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-c28",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "drummond-livraria",
    standCode: "C28",
    type: "polygon",
    polygon: [
      { x: 5125 / 7955, y: 3728 / 6436 },
      { x: 5435 / 7955, y: 3728 / 6436 },
      { x: 5435 / 7955, y: 3887 / 6436 },
      { x: 5125 / 7955, y: 3887 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 4. RUA D
  // ==========================================
  {
    id: "stand-d30",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "sextante-e-arqueiro",
    standCode: "D30",
    type: "polygon",
    polygon: [
      { x: 4885 / 7955, y: 3432 / 6436 },
      { x: 5435 / 7955, y: 3432 / 6436 },
      { x: 5435 / 7955, y: 3588 / 6436 },
      { x: 4885 / 7955, y: 3588 / 6436 }
    ],
    height: 1.7,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-d58",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "harper-collins",
    standCode: "D58",
    type: "polygon",
    polygon: [
      { x: 2655 / 7955, y: 3432 / 6436 },
      { x: 3045 / 7955, y: 3432 / 6436 },
      { x: 3045 / 7955, y: 3588 / 6436 },
      { x: 2655 / 7955, y: 3588 / 6436 }
    ],
    height: 1.7,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 5. RUA E
  // ==========================================
  {
    id: "stand-e18",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "qualis",
    standCode: "E18",
    type: "polygon",
    polygon: [
      { x: 6358 / 7955, y: 3101 / 6436 },
      { x: 6516 / 7955, y: 3101 / 6436 },
      { x: 6516 / 7955, y: 3259 / 6436 },
      { x: 6358 / 7955, y: 3259 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-e30",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "intrinseca",
    standCode: "E30",
    type: "polygon",
    polygon: [
      { x: 4885 / 7955, y: 3101 / 6436 },
      { x: 5435 / 7955, y: 3101 / 6436 },
      { x: 5435 / 7955, y: 3259 / 6436 },
      { x: 4885 / 7955, y: 3259 / 6436 }
    ],
    height: 1.7,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-e60",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "companhia-das-letras",
    standCode: "E60",
    type: "polygon",
    polygon: [
      { x: 2320 / 7955, y: 3101 / 6436 },
      { x: 2551 / 7955, y: 3101 / 6436 },
      { x: 2551 / 7955, y: 3259 / 6436 },
      { x: 2320 / 7955, y: 3259 / 6436 }
    ],
    height: 1.8,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-e70",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-globo",
    standCode: "E70",
    type: "polygon",
    polygon: [
      { x: 1785 / 7955, y: 3101 / 6436 },
      { x: 1924 / 7955, y: 3101 / 6436 },
      { x: 1924 / 7955, y: 3259 / 6436 },
      { x: 1785 / 7955, y: 3259 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 6. RUA F
  // ==========================================
  {
    id: "stand-f14",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-caliope",
    standCode: "F14",
    type: "polygon",
    polygon: [
      { x: 6278 / 7955, y: 2851 / 6436 },
      { x: 6358 / 7955, y: 2851 / 6436 },
      { x: 6358 / 7955, y: 3009 / 6436 },
      { x: 6278 / 7955, y: 3009 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-f40",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "autentica",
    standCode: "F40",
    type: "polygon",
    polygon: [
      { x: 4050 / 7955, y: 2851 / 6436 },
      { x: 4666 / 7955, y: 2851 / 6436 },
      { x: 4666 / 7955, y: 3009 / 6436 },
      { x: 4050 / 7955, y: 3009 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-f60",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "grupo-editorial-record",
    standCode: "F60",
    type: "polygon",
    polygon: [
      { x: 2320 / 7955, y: 2851 / 6436 },
      { x: 2551 / 7955, y: 2851 / 6436 },
      { x: 2551 / 7955, y: 3009 / 6436 },
      { x: 2320 / 7955, y: 3009 / 6436 }
    ],
    height: 1.8,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-f70",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-rocco",
    standCode: "F70",
    type: "polygon",
    polygon: [
      { x: 1785 / 7955, y: 2851 / 6436 },
      { x: 1924 / 7955, y: 2851 / 6436 },
      { x: 1924 / 7955, y: 3009 / 6436 },
      { x: 1785 / 7955, y: 3009 / 6436 }
    ],
    height: 1.8,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 7. RUA G
  // ==========================================
  {
    id: "stand-g03",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "avec-editora",
    standCode: "G03",
    type: "polygon",
    polygon: [
      { x: 6610 / 7955, y: 2910 / 6436 },
      { x: 6658 / 7955, y: 2910 / 6436 },
      { x: 6658 / 7955, y: 3035 / 6436 },
      { x: 6610 / 7955, y: 3035 / 6436 }
    ],
    height: 1.4,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-g36",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "aditora-aleph",
    standCode: "G36",
    type: "polygon",
    polygon: [
      { x: 4885 / 7955, y: 2552 / 6436 },
      { x: 5073 / 7955, y: 2552 / 6436 },
      { x: 5073 / 7955, y: 2710 / 6436 },
      { x: 4885 / 7955, y: 2710 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-g40",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-planeta",
    standCode: "G40",
    type: "polygon",
    polygon: [
      { x: 4050 / 7955, y: 2552 / 6436 },
      { x: 4189 / 7955, y: 2552 / 6436 },
      { x: 4189 / 7955, y: 2710 / 6436 },
      { x: 4050 / 7955, y: 2710 / 6436 }
    ],
    height: 1.7,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-g50",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "vr-editora-plataforma-21-amore-latitude",
    standCode: "G50",
    type: "polygon",
    polygon: [
      { x: 2655 / 7955, y: 2552 / 6436 },
      { x: 2812 / 7955, y: 2552 / 6436 },
      { x: 2812 / 7955, y: 2710 / 6436 },
      { x: 2655 / 7955, y: 2710 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-g70",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "citadel-e-altabooks",
    standCode: "G70",
    type: "polygon",
    polygon: [
      { x: 1500 / 7955, y: 2552 / 6436 },
      { x: 1650 / 7955, y: 2552 / 6436 },
      { x: 1650 / 7955, y: 2710 / 6436 },
      { x: 1500 / 7955, y: 2710 / 6436 }
    ],
    height: 1.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 8. RUA H
  // ==========================================
  {
    id: "stand-h60",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "universo-dos-livros",
    standCode: "H60",
    type: "polygon",
    polygon: [
      { x: 2320 / 7955, y: 2271 / 6436 },
      { x: 2551 / 7955, y: 2271 / 6436 },
      { x: 2551 / 7955, y: 2429 / 6436 },
      { x: 2320 / 7955, y: 2429 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-h70",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-buzz",
    standCode: "H70",
    type: "polygon",
    polygon: [
      { x: 1545 / 7955, y: 2271 / 6436 },
      { x: 1673 / 7955, y: 2271 / 6436 },
      { x: 1673 / 7955, y: 2429 / 6436 },
      { x: 1545 / 7955, y: 2429 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // 9. RUA J & K (Curadoria Sáfica Destacada)
  // ==========================================
  {
    id: "stand-j76",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "autores-independentes-do-brasil",
    standCode: "J76",
    type: "polygon",
    polygon: [
      { x: 1500 / 7955, y: 2084 / 6436 },
      { x: 1575 / 7955, y: 2084 / 6436 },
      { x: 1575 / 7955, y: 2163 / 6436 },
      { x: 1500 / 7955, y: 2163 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-k28",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "cabana-vermelha",
    standCode: "K28",
    type: "polygon",
    polygon: [
      { x: 5160 / 7955, y: 1589 / 6436 },
      { x: 5310 / 7955, y: 1589 / 6436 },
      { x: 5310 / 7955, y: 1825 / 6436 },
      { x: 5160 / 7955, y: 1825 / 6436 }
    ],
    height: 1.6,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-k33",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-sunbee",
    standCode: "K33",
    type: "polygon",
    polygon: [
      { x: 4850 / 7955, y: 1589 / 6436 },
      { x: 4905 / 7955, y: 1589 / 6436 },
      { x: 4905 / 7955, y: 1825 / 6436 },
      { x: 4850 / 7955, y: 1825 / 6436 }
    ],
    height: 2.0,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-k66",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "euphoria",
    standCode: "K66",
    type: "polygon",
    polygon: [
      { x: 2107 / 7955, y: 1589 / 6436 },
      { x: 2164 / 7955, y: 1589 / 6436 },
      { x: 2164 / 7955, y: 1707 / 6436 },
      { x: 2107 / 7955, y: 1707 / 6436 }
    ],
    height: 1.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-k70",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "new-pop",
    standCode: "K70",
    type: "polygon",
    polygon: [
      { x: 1924 / 7955, y: 1589 / 6436 },
      { x: 2034 / 7955, y: 1589 / 6436 },
      { x: 2034 / 7955, y: 1825 / 6436 },
      { x: 1924 / 7955, y: 1825 / 6436 }
    ],
    height: 2.0,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },

  // ==========================================
  // SKEELO - ESPAÇO DIGITAL E-BOOKS (29º EXPOSITOR)
  // ==========================================
  {
    id: "stand-skeelo",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "skeelo",
    standCode: "B30",
    type: "polygon",
    polygon: [
      { x: 1900 / 7955, y: 4550 / 6436 },
      { x: 2495 / 7955, y: 4550 / 6436 },
      { x: 2495 / 7955, y: 4750 / 6436 },
      { x: 1900 / 7955, y: 4750 / 6436 }
    ],
    height: 0.5,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal",
    notes: "Espaço digital Skeelo de leitura e e-books no Pavilhão Principal (A61)."
  },
  {
    id: "stand-h85",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-venus",
    standCode: "H85",
    type: "polygon",
    polygon: [
      { x: 320 / 1420, y: 437 / 940 },
      { x: 339 / 1420, y: 437 / 940 },
      { x: 339 / 1420, y: 454 / 940 },
      { x: 320 / 1420, y: 454 / 940 }
    ],
    height: 1,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  },
  {
    id: "stand-k40",
    mapVersionId: "v1-bienal-sp-2026",
    exhibitorId: "editora-bezz",
    standCode: "K40",
    type: "polygon",
    polygon: [
      { x: 857 / 1420, y: 240 / 940 },
      { x: 868 / 1420, y: 240 / 940 },
      { x: 868 / 1420, y: 266 / 940 },
      { x: 857 / 1420, y: 266 / 940 }
    ],
    height: 1,
    neutral: false,
    verified: true,
    verifiedBy: "admin-bienal"
  }
]
