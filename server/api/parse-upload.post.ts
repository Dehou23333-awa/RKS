// 新文件路径: server/api/parse-upload.post.ts

import { parseSaveFile } from '~/server/utils/save-parser'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    
    // Find the file part in the form data. We'll name it 'savefile' on the frontend.
    const uploadedFile = formData?.find(part => part.name === 'savefile')

    if (!uploadedFile || !uploadedFile.data) {
      throw new Error('No save file was uploaded.')
    }

    if (uploadedFile.type !== 'application/zip' && uploadedFile.type !== 'application/x-zip-compressed') {
       console.warn(`Received file with unexpected type: ${uploadedFile.type}`)
    }
    
    // The `uploadedFile.data` is already a Buffer
    const saveFileBuffer = uploadedFile.data

    // Use the existing parseSaveFile utility to process the buffer
    const parsedSaveData = await parseSaveFile(saveFileBuffer)

    return {
      success: true,
      data: parsedSaveData,
    }
  } catch (error: any) {
    // Set the status code for errors
    event.node.res.statusCode = 400
    return {
      success: false,
      error: error.message || 'Failed to parse the uploaded file.',
    }
  }
})