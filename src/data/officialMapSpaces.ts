import type { ServiceType, StandGeometry } from '../types/index.ts'

export const OFFICIAL_SOURCE_WIDTH = 7955
export const OFFICIAL_SOURCE_HEIGHT = 6436

export interface OfficialMapSpace {
  code: string
  bounds: [number, number, number, number]
  serviceType?: ServiceType
  displayName?: string
  routeOrigin?: boolean
  height?: number
}

const space = (code: string, x1: number, y1: number, x2: number, y2: number, height = .55): OfficialMapSpace => ({
  code,
  bounds: [x1, y1, x2, y2],
  height
})

const service = (code: string, type: ServiceType, x1: number, y1: number, x2: number, y2: number): OfficialMapSpace => ({
  code,
  serviceType: type,
  bounds: [x1, y1, x2, y2],
  height: .35
})

const gate = (number: number, x1: number, y1: number, x2: number, y2: number): OfficialMapSpace => ({
  code: `P${number}`,
  displayName: `Portão ${number}`,
  routeOrigin: true,
  serviceType: 'gate',
  bounds: [x1, y1, x2, y2],
  height: .45
})

const area = (code: string, name: string, type: ServiceType, x1: number, y1: number, x2: number, y2: number, height = .25): OfficialMapSpace => ({
  code,
  displayName: name,
  serviceType: type,
  bounds: [x1, y1, x2, y2],
  height
})

/**
 * Public vector layer transcribed from mapa-bienal-v4.webp (7955x6436).
 * Labels deliberately contain only stand codes or compact service symbols.
 */
export const OFFICIAL_MAP_SPACES: OfficialMapSpace[] = [
  // Large official areas
  space('K86', 647, 1530, 1118, 1927, .8),
  space('IF07', 357, 2013, 1087, 2429, .25),
  space('IF06', 357, 2562, 828, 3250, .25),
  space('IF05', 357, 3400, 828, 3825, .25),
  space('K20', 5841, 1589, 6648, 2003, .35),
  space('A61', 1900, 4550, 2495, 4750, .45),
  space('D28', 5544, 3399, 5858, 3588, .45),
  space('C88', 953, 3640, 1345, 3798, .45),

  // Rua K
  space('K76', 1645, 1606, 1695, 1717),
  space('K74', 1645, 1717, 1695, 1825),
  space('K68', 2107, 1589, 2164, 1707),
  space('K58', 5255, 1589, 5445, 1825),
  space('K56', 4050, 1589, 4120, 1707),
  space('K54', 4050, 1707, 4120, 1825),
  space('K42', 4850, 1589, 4905, 1707),
  space('K40', 4850, 1707, 4905, 1825),
  space('K38', 5000, 1589, 5160, 1825),
  space('K32', 5160, 1589, 5310, 1825),
  space('K30', 5310, 1589, 5385, 1825),
  space('K26', 4400, 1707, 4495, 1825),

  // Rua J
  space('J86', 1164, 2005, 1320, 2163),
  space('J80', 1320, 2005, 1430, 2084),
  space('J78', 1430, 2005, 1500, 2084),
  space('J74', 1500, 2084, 1575, 2163),
  space('J70', 1635, 2005, 1924, 2163),
  space('J68', 2034, 2005, 2222, 2163),
  space('J66', 2222, 2084, 2320, 2163),
  space('J60', 2320, 2005, 2551, 2163),
  space('J58', 2655, 2005, 2890, 2163),
  space('J52', 4150, 2084, 4275, 2163),
  space('J48', 4275, 2084, 4440, 2163),
  space('J44', 4440, 2084, 4600, 2163),
  space('J40', 4600, 2005, 4775, 2163),
  space('J38', 4885, 2005, 5050, 2163),
  space('J36', 5050, 2005, 5180, 2084),
  space('J32', 5180, 2005, 5255, 2084),
  space('J30', 5325, 2005, 5435, 2163),
  space('J28', 5606, 2005, 5794, 2163),
  space('J26', 5794, 2005, 5875, 2163),
  space('J20', 5875, 2005, 6000, 2163),

  // Rua H
  space('H86', 1164, 2271, 1320, 2429),
  space('H80', 1320, 2271, 1476, 2350),
  space('H78', 1476, 2271, 1545, 2429),
  space('H76', 1545, 2271, 1673, 2429),
  space('H58', 2655, 2271, 3045, 2429),
  space('H50', 4200, 2271, 4290, 2429),
  space('H48', 4290, 2271, 4390, 2429),
  space('H40', 4390, 2271, 4775, 2429),
  space('H38', 4885, 2271, 5125, 2429),
  space('H34', 5125, 2350, 5310, 2429),
  space('H30', 5310, 2271, 5435, 2429),

  // Rua G
  space('G88', 953, 2552, 1140, 2710),
  space('G84', 1140, 2631, 1300, 2710),
  space('G82', 1300, 2552, 1380, 2710),
  space('G80', 1380, 2552, 1500, 2710),
  space('G76', 1500, 2552, 1650, 2710),
  space('G68', 2034, 2552, 2238, 2710),
  space('G60', 2238, 2552, 2551, 2710),
  space('G58', 2655, 2552, 2812, 2710),
  space('G52', 4050, 2552, 4189, 2710),
  space('G38', 4885, 2552, 5073, 2710),
  space('G30', 5198, 2552, 5435, 2710),
  space('G28', 5544, 2552, 5716, 2710),
  space('G26', 5716, 2631, 5875, 2710),
  space('G20', 5875, 2552, 6000, 2710),
  space('G18', 6123, 2851, 6278, 3009),
  space('G14', 6278, 2851, 6358, 2930),
  space('G10', 6358, 2851, 6516, 3009),
  space('G02', 6610, 2910, 6658, 3035),

  // Rua F
  space('F88', 953, 2851, 1188, 3009),
  space('F82', 1188, 2851, 1325, 3009),
  space('F80', 1325, 2851, 1500, 3009),
  space('F76', 1500, 2851, 1650, 3009),
  space('F58', 2655, 2851, 3045, 3009),
  space('F30', 4885, 2851, 5435, 3009),
  space('F28', 5544, 2851, 5794, 3009),
  space('F20', 5794, 2851, 6000, 3009),
  space('F18', 6123, 2851, 6278, 3009),
  space('F10', 6358, 2930, 6516, 3009),
  space('F02', 6610, 3035, 6658, 3160),

  // Rua E
  space('E88', 953, 3101, 1235, 3259),
  space('E82', 1235, 3101, 1420, 3259),
  space('E80', 1420, 3101, 1500, 3259),
  space('E76', 1500, 3101, 1650, 3259),
  space('E58', 2655, 3101, 3045, 3259),
  space('E40', 4050, 3101, 4666, 3259, .75),
  space('E20', 5544, 3101, 6000, 3259),
  space('E10', 6358, 3101, 6516, 3259),
  space('E02', 6610, 3160, 6658, 3290),

  // Rua D
  space('D88', 953, 3432, 1140, 3588),
  space('D70', 1500, 3432, 1924, 3588),
  space('D60', 2034, 3432, 2551, 3588),
  space('D40', 4666, 3432, 4775, 3588),
  space('D20', 5858, 3432, 6000, 3588),
  space('D10', 6123, 3432, 6516, 3588),
  space('D02', 6610, 3432, 6658, 3530),

  // Rua C
  space('C82', 1345, 3640, 1450, 3798),
  space('C80', 1450, 3640, 1545, 3798),
  space('C78', 1545, 3640, 1650, 3798),
  space('C77', 4050, 3728, 4190, 3808),
  space('C76', 4050, 3808, 4190, 3887),
  space('C72', 4190, 3728, 4390, 3887),
  space('C70', 4390, 3728, 4495, 3887),
  space('C60', 4558, 3728, 5008, 3887),
  space('C58', 5008, 3728, 5255, 3887),
  space('C40', 4558, 3728, 4775, 3887, .75),
  space('C30', 4885, 3728, 5435, 3887),
  space('C10', 6123, 3728, 6360, 3887),

  // Rua B
  space('B90', 349, 4026, 413, 4105),
  space('B88', 953, 4026, 1423, 4183),
  space('B80', 1423, 4105, 1550, 4183),
  space('B78', 1610, 4105, 1700, 4183),
  space('B76', 1700, 4026, 1785, 4183),
  space('B70', 1785, 4026, 1924, 4183),
  space('B68', 2034, 4026, 2222, 4183),
  space('B66', 2222, 4026, 2320, 4183),
  space('B60', 2320, 4026, 2551, 4183),
  space('B58', 2655, 4026, 3045, 4183),
  space('B40', 4150, 4026, 4775, 4183),
  space('B38', 4885, 4026, 5125, 4183),
  space('B30', 5125, 4026, 5435, 4183),
  space('B20', 5544, 4026, 6000, 4183),

  // Rua A
  space('A88', 953, 4324, 1188, 4481),
  space('A86', 1188, 4324, 1313, 4481),
  space('A89', 969, 4550, 1088, 4710),
  space('A85', 1188, 4550, 1313, 4710),
  space('A81', 1313, 4550, 1438, 4710),
  space('A79', 1438, 4550, 1550, 4710),
  space('A68', 2034, 4324, 2222, 4481),
  space('A66', 2222, 4324, 2320, 4481),
  space('A50', 4200, 4324, 4390, 4481),
  space('A40', 4390, 4324, 4775, 4481),
  space('A30', 4885, 4324, 5435, 4481),
  space('A55', 4200, 4550, 4390, 4750),
  space('A47', 4390, 4550, 4495, 4750),
  space('A41', 4600, 4550, 4775, 4750),

  // Lateral leste do mapa oficial
  area('PRAÇA CLARO', 'Praça Claro', 'stage', 5370, 4435, 6605, 5180, .18),
  area('AUTÓGRAFOS 1', 'Espaço de Autógrafos 1', 'stage', 6970, 3370, 7335, 3830, .35),
  area('AUTÓGRAFOS 2', 'Espaço de Autógrafos 2', 'stage', 7335, 3370, 7690, 3830, .35),
  area('FOOD LESTE', 'Praça de Alimentação Leste', 'food', 7580, 3890, 7890, 4660, .22),
  area('FOOD CENTRAL', 'Praça de Alimentação Central', 'food', 6610, 3890, 6925, 4660, .22),
  area('CLARO', 'Espaço Claro', 'info', 5570, 4575, 6290, 5015, .2),
  area('PROFESSORES', 'Acesso Profissionais do Setor e Professores', 'info', 6660, 4760, 7870, 4910, .16),

  // Gates, emergency exits and services (compact markers at official positions)
  gate(5, 120, 4720, 300, 4900),
  gate(7, 90, 1150, 270, 1330),
  gate(8, 3420, 790, 3600, 970),
  gate(9, 4340, 820, 4520, 1000),
  gate(10, 5210, 1150, 5390, 1330),
  service('P.A', 'gate', 170, 4740, 360, 4900),
  service('P.B', 'gate', 1190, 1320, 1320, 1435),
  service('P.C', 'gate', 2420, 1320, 2550, 1435),
  service('P.D', 'gate', 3650, 1320, 3780, 1435),
  service('P.E', 'gate', 4300, 1320, 4430, 1435),
  service('P.F', 'gate', 5600, 1320, 5730, 1435),
  service('SAÍDA', 'gate', 1710, 1320, 1840, 1435),
  service('SAÍDA', 'gate', 4000, 1320, 4130, 1435),
  service('SAÍDA', 'gate', 6000, 1320, 6130, 1435),
  service('+', 'medical', 3650, 1622, 3894, 1825),
  service('WC', 'restroom', 300, 1450, 520, 1800),
  service('WC', 'restroom', 1260, 1450, 1510, 1800),
  service('WC', 'restroom', 3100, 1450, 3350, 1800),
  service('WC', 'restroom', 4400, 1450, 4650, 1800),
  service('WC', 'restroom', 6800, 1450, 7050, 1800),
  service('FOOD', 'food', 500, 2050, 850, 2400),
  service('FOOD', 'food', 500, 2600, 850, 3000),
  service('FOOD', 'food', 6200, 2100, 6550, 2500),
  service('PCD', 'accessibility', 520, 1450, 650, 1580),
  service('i', 'info', 3600, 4485, 3740, 4610)
]

export const officialSpaceToGeometry = (item: OfficialMapSpace): StandGeometry => {
  const [x1, y1, x2, y2] = item.bounds
  return {
    id: `official-${item.serviceType || 'stand'}-${item.code}-${x1}-${y1}`,
    mapVersionId: 'v1-bienal-sp-2026',
    standCode: item.code,
    type: 'polygon',
    polygon: [
      { x: x1 / OFFICIAL_SOURCE_WIDTH, y: y1 / OFFICIAL_SOURCE_HEIGHT },
      { x: x2 / OFFICIAL_SOURCE_WIDTH, y: y1 / OFFICIAL_SOURCE_HEIGHT },
      { x: x2 / OFFICIAL_SOURCE_WIDTH, y: y2 / OFFICIAL_SOURCE_HEIGHT },
      { x: x1 / OFFICIAL_SOURCE_WIDTH, y: y2 / OFFICIAL_SOURCE_HEIGHT }
    ],
    height: item.height ?? .55,
    neutral: true,
    serviceType: item.serviceType,
    displayName: item.displayName,
    routeOrigin: item.routeOrigin,
    verified: true,
    verifiedBy: 'vetorizacao-planta-oficial'
  }
}

export const OFFICIAL_ROUTE_GATES = OFFICIAL_MAP_SPACES.filter(item => item.routeOrigin)
