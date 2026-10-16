import { mkdir, writeFile } from 'node:fs/promises'
import { initialSettings } from '../src/lib/studio'
import { imageWorkflow, videoWorkflow, validateGraph } from '../src/lib/workflow'
const directory = new URL('../workflows/', import.meta.url)
await mkdir(directory, { recursive: true })
for (const [name, graph] of [
  ['take7-sdxl-api.json', imageWorkflow(initialSettings)],
  ['take7-ltx23-api.json', videoWorkflow({ ...initialSettings, kind: 'video' })],
] as const) {
  validateGraph(graph)
  await writeFile(new URL(name, directory), `${JSON.stringify(graph, null, 2)}\n`)
  console.log(`Exported ${name}`)
}
