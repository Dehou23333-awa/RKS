import { createHash } from 'node:crypto'

const BASE_URL = 'https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/'

// This function fetches data using Nuxt's built-in $fetch
async function phigrosRequest(sessionToken: string, endpoint: string, options: any = {}) {
  const headers = {
    'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
    'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
    'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
    'Accept': 'application/json',
    'X-LC-Session': sessionToken,
    ...options.headers,
  }

  // In server routes, $fetch is available globally.
  return $fetch(endpoint, {
    baseURL: BASE_URL,
    ...options,
    headers,
  })
}

interface SummaryResult {
  gameFile: {
    metaData: { _checksum: string };
    url: string;
  };
  // Add other summary fields if needed
}

/**
 * Gets the player's save summary, which contains the URL to the save file.
 */
export async function getSummary(sessionToken: string): Promise<SummaryResult> {
  const response: any = await phigrosRequest(sessionToken, 'classes/_GameSave?limit=1')
  if (!response.results || response.results.length === 0) {
    throw new Error('No save file found for this session token.')
  }
  return response.results[0]
}

/**
 * Downloads the save file and verifies its checksum.
 */
export async function getSaveFile(url: string, expectedChecksum: string): Promise<Buffer> {
  // Use $fetch to get the file as a Buffer
  const saveData: ArrayBuffer = await $fetch(url, { responseType: 'arrayBuffer' })
  const saveDataBuffer = Buffer.from(saveData)

  if (saveDataBuffer.length < 30) {
    throw new Error(`Downloaded save file is too small (${saveDataBuffer.length} bytes), it might be corrupted.`)
  }

  // Verify MD5 checksum
  const hash = createHash('md5')
  hash.update(saveDataBuffer)
  const actualChecksum = hash.digest('hex')

  if (actualChecksum !== expectedChecksum) {
    throw new Error(`Save file checksum mismatch! Expected: ${expectedChecksum}, Got: ${actualChecksum}`)
  }

  return saveDataBuffer
}