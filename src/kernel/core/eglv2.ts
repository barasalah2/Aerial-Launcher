import childProcess from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

type Eglv2Installation = {
  installationId: string
  artifactId: string
  namespace: string
  dir: string
  complete?: boolean
  parentInstallationId?: string
  launchCommand?: string
  launchExecutable?: string
  version?: string
}

const execFile = promisify(childProcess.execFile)

const eglv2DataPath = path.join(
  `${process.env.LOCALAPPDATA}`,
  'com.epicgames.eglv2'
)

export const eglv2ApiPath = path.join(eglv2DataPath, 'api.json')

/** Later lines replace or delete records with the same installationId */
export function getEglv2Installations() {
  try {
    const installations = new Map<string, Eglv2Installation>()
    const lines = readFileSync(
      path.join(eglv2DataPath, 'installations.jsonl'),
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

    return [...installations.values()]
  } catch {
    return []
  }
}

export function getEglv2Installation(artifactId: string) {
  return (
    getEglv2Installations().find(
      (installation) => installation.artifactId === artifactId
    ) ?? null
  )
}

export async function isEglv2Running() {
  const { stdout } = await execFile('tasklist', [
    '/FI',
    'IMAGENAME eq EpicGamesLauncher.exe',
    '/NH',
  ])

  return stdout.includes('EpicGamesLauncher.exe')
}
