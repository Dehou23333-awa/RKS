// 新文件路径: server/utils/save-builder.ts

import JSZip from 'jszip'
import { encrypt } from './aes'
import { Writer } from './binary-writer'
import { getFileHead, getStructureBuilder } from './structure-builder'

/**
 * Zips a dictionary of files into a single buffer.
 */
async function zipSave(files: Record<string, Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const fileName in files) {
    zip.file(fileName, files[fileName]);
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });
}

/**
 * Builds and encrypts the individual files from the parsed JSON data.
 */
function buildAndEncryptSave(parsedData: Record<string, any>): Record<string, Buffer> {
  const builtFiles: Record<string, Buffer> = {};
  const fileHeads = getFileHead(parsedData);

  for (const fileName in parsedData) {
    const fileData = parsedData[fileName];
    const fileHead = fileHeads[fileName];

    if (!fileData || !fileHead) {
      console.warn(`Skipping build for ${fileName}: No data or file head found.`);
      continue;
    }
    
    const builder = getStructureBuilder(fileName, fileHead);
    if (!builder) {
      console.warn(`Skipping build for ${fileName} (head: 0x${fileHead.toString('hex')}): No builder available.`);
      continue;
    }

    try {
      const writer = new Writer();
      builder(writer, fileData);
      const plainTextBuffer = writer.getBuffer();
      
      const encryptedBuffer = encrypt(plainTextBuffer);
      
      // Prepend the file head
      builtFiles[fileName] = Buffer.concat([fileHead, encryptedBuffer]);

    } catch (e) {
      console.error(`Error building ${fileName}:`, e);
      // Depending on requirements, you might want to re-throw or handle this
    }
  }
  
  return builtFiles;
}

/**
 * High-level function to build a full save file buffer from parsed JSON data.
 * This is the counterpart to `parseSaveFile`.
 * @param parsedData The parsed save data object.
 * @returns A Buffer containing the raw, zipped, and encrypted save file, ready for upload.
 */
export async function buildSaveFile(parsedData: Record<string, any>): Promise<Buffer> {
  // Use a defined order to ensure consistency, matching Python's SAVE_LIST where applicable
  const fileOrder = ['user', 'settings', 'gameProgress', 'gameKey', 'gameRecord'];
  const orderedData: Record<string, any> = {};

  for (const key of fileOrder) {
      if (parsedData[key]) {
          orderedData[key] = parsedData[key];
      }
  }
  // Add any other files from the source that weren't in the standard list
  for (const key in parsedData) {
      if (!orderedData[key]) {
          orderedData[key] = parsedData[key];
      }
  }

  const builtAndEncrypted = buildAndEncryptSave(orderedData);
  return zipSave(builtAndEncrypted);
}