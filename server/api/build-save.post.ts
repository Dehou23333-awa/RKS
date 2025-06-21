import { buildSaveFile } from '~/server/utils/save-builder'

export default defineEventHandler(async (event) => {
  try {
    // 1. Get the parsed save data from the request body
    const parsedData = await readBody(event)

    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Invalid save data provided in the request body.')
    }

    // 2. Build the save file buffer
    const saveFileBuffer = await buildSaveFile(parsedData)

    // 3. Return the buffer as a response (e.g., for client-side download or upload)
    // Set appropriate headers for a binary file download
    event.node.res.setHeader('Content-Type', 'application/zip');
    event.node.res.setHeader('Content-Disposition', 'attachment; filename="gameFile"');
    
    return saveFileBuffer

  } catch (error: any) {
    event.node.res.statusCode = 400
    return {
      success: false,
      error: error.message || 'Failed to build the save file.',
    }
  }
})