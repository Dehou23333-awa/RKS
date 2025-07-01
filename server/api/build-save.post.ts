import { buildSaveFile } from '~/server/utils/save-builder'

export default defineEventHandler(async (event) => {
  try {
    const parsedData = await readBody(event)

    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Invalid save data provided in the request body.')
    }

    const saveFileBuffer = await buildSaveFile(parsedData)

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