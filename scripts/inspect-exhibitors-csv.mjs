import fs from 'node:fs/promises'
import { Workbook } from '@oai/artifact-tool'
import { INITIAL_EXHIBITORS } from '../src/data/initialExhibitors.ts'

const source = process.argv[2]
const csvText = await fs.readFile(source, 'utf8')
const workbook = await Workbook.fromCSV(csvText, { sheetName: 'Expositores' })
const overview = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 12000,
  tableMaxRows: 35,
  tableMaxCols: 20,
  tableMaxCellChars: 240
})
console.log(overview.ndjson)

const sheet = workbook.worksheets.getItem('Expositores')
const rows = sheet.getUsedRange().values
const sourceRows = rows.slice(1).map(row => ({ id: row[0], logo: row[1], name: row[2], standCode: row[5] }))
const initialById = new Map(INITIAL_EXHIBITORS.map(item => [item.id, item]))
const sourceIds = new Set(sourceRows.map(item => item.id))
const differences = sourceRows.flatMap(item => {
  const initial = initialById.get(item.id)
  if (!initial) return [{ id: item.id, issue: 'ausente no seed local' }]
  const fields = ['logo', 'name', 'standCode']
  return fields.filter(field => initial[field] !== item[field]).map(field => ({ id: item.id, field, csv: item[field], local: initial[field] }))
})
const extras = INITIAL_EXHIBITORS.filter(item => !sourceIds.has(item.id)).map(item => item.id)
console.log(JSON.stringify({ csvRows: sourceRows.length, localRows: INITIAL_EXHIBITORS.length, differences, extras }, null, 2))
