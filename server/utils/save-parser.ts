import JSZip from 'jszip'
import { decrypt } from './aes'
import { Reader } from './binary-parser'
import { getStructureParser } from './structures'

/**
 * Unzips the save file buffer into a dictionary of file names and their buffer content.
 */
async function unzipSave(zipData: Buffer): Promise<Record<string, Buffer>> {
  const zip = await JSZip.loadAsync(zipData)
  const saveDict: Record<string, Buffer> = {}
  
  for (const fileName in zip.files) {
    if (!zip.files[fileName].dir) {
      saveDict[fileName] = await zip.files[fileName].async('nodebuffer')
    }
  }
  
  return saveDict
}

/**
 * Decrypts and parses the raw save file dictionary.
 */
function decryptAndParseSave(saveDict: Record<string, Buffer>): Record<string, any> {
  const parsedData: Record<string, any> = {}

  for (const fileName in saveDict) {
    const rawFileData = saveDict[fileName]
    
    // The first byte is the "file head" or version.
    const fileHead = rawFileData.subarray(0, 1)
    const encryptedData = rawFileData.subarray(1)

    // Decrypt the data
    const decryptedData = decrypt(encryptedData)
    
    // Select the correct parser based on file name and head
    const parser = getStructureParser(fileName, fileHead)

    if (parser) {
      const reader = new Reader(decryptedData)
      try {
        parsedData[fileName] = parser(reader)
        if (reader.remaining() > 0) {
           // This log helps debug if a structure definition is wrong
           console.warn(`File ${fileName} (head: 0x${fileHead.toString('hex')}) has ${reader.remaining()} unread bytes.`)
        }
      } catch (e) {
        console.error(`Error parsing ${fileName}:`, e)
        parsedData[fileName] = { error: `Failed to parse: ${(e as Error).message}` }
      }
    } else {
      // If no parser, store raw decrypted data for inspection
      parsedData[fileName] = {
        _head: `0x${fileHead.toString('hex')}`,
        _decryptedData: decryptedData.toString('hex'),
        _message: "No parser available for this file/version yet."
      }
    }
  }
  
  return parsedData
}

/**
 * High-level function to process a raw save file buffer.
 */
export async function parseSaveFile(saveData: Buffer): Promise<Record<string, any>> {
  const unzipped = await unzipSave(saveData)
  return decryptAndParseSave(unzipped)
}