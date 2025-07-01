import { getSummary, getSaveFile } from '~/server/utils/phigros-api'
import { parseSaveFile } from '~/server/utils/save-parser'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { token } = body

    if (!token || typeof token !== 'string' || token.length !== 25) {
      throw new Error('Invalid sessionToken provided.')
    }

    const summary = await getSummary(token)
    
    const saveFileBuffer = await getSaveFile(summary.gameFile.url, summary.gameFile.metaData._checksum)

    const parsedSaveData = await parseSaveFile(saveFileBuffer)

    return {
      success: true,
      data: parsedSaveData,
    }
  }
  catch (error: any) {
    event.node.res.statusCode = 400
    return {
      success: false,
      error: error.message || 'An unknown error occurred.',
    }
  }
})