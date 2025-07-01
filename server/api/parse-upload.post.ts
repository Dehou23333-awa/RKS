import { parseSaveFile } from '~/server/utils/save-parser'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    
    const uploadedFile = formData?.find(part => part.name === 'savefile')

    if (!uploadedFile || !uploadedFile.data) {
      throw new Error('No save file was uploaded.')
    }

    if (uploadedFile.type !== 'application/zip' && uploadedFile.type !== 'application/x-zip-compressed') {
       console.warn(`Received file with unexpected type: ${uploadedFile.type}`)
    }
    
    const saveFileBuffer = uploadedFile.data

    const parsedSaveData = await parseSaveFile(saveFileBuffer)

    return {
      success: true,
      data: parsedSaveData,
    }
  } catch (error: any) {
    event.node.res.statusCode = 400
    return {
      success: false,
      error: error.message || 'Failed to parse the uploaded file.',
    }
  }
})