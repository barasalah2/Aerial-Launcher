import { readFileSync } from 'node:fs'
import path from 'node:path'

type Eglv2Installation = {
  artifactId: string
  dir: string
  launchCommand?: string
  version?: string
}

/** Later lines replace or delete records with the same installationId */
export function getEglv2Installation(artifactId: string) {
  try {
    const installations = new Map<string, Eglv2Installation>()
    const lines = readFileSync(
      path.join(
        `${process.env.LOCALAPPDATA}`,
        'com.epicgames.eglv2',
        'installations.jsonl'
      ),
      'utf8'
    ).split('\n')

    for (const line of lines) {
      if (!line.trim()) {
        continue
      }

      const record = JSON.parse(line)

      if (record.deleted) {
        installations.delete(record.installationId)
      } else if (record.installationId) {
        installations.set(record.installationId, record)
      }
    }

    return (
      [...installations.values()].find(
        (installation) => installation.artifactId === artifactId
      ) ?? null
    )
  } catch {
    return null
  }
}
