import { getSummary, getSaveFile } from '~/server/utils/phigros-api'
import { parseSaveFile } from '~/server/utils/save-parser'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { token } = body

    if (!token || typeof token !== 'string' || token.length !== 25) {
      throw new Error('Invalid sessionToken provided.')
    }

    // 1. Get save summary
    const summary = await getSummary(token)
    
    // 2. Get the save file from the URL in the summary
    const saveFileBuffer = await getSaveFile(summary.gameFile.url, summary.gameFile.metaData._checksum)

    // 3. Unzip, decrypt, and parse the save file
    const parsedSaveData = await parseSaveFile(saveFileBuffer)

    return {
      success: true,
      data: parsedSaveData,
    }
  }
  catch (error: any) {
    // Set the status code for errors
    event.node.res.statusCode = 400
    return {
      success: false,
      error: error.message || 'An unknown error occurred.',
    }
  }
})