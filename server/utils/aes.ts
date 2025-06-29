import { createDecipheriv, createCipheriv } from 'node:crypto'

// Constants from the Python code
const AES_KEY_B64 = '6Jaa0qVAJZuXkZCLiOa/Ax5tIZVu+taKUN1V1nqwkks='
const AES_IV_B64 = 'Kk/wisgNYwcAV8WVGMgyUw=='

const aesKey = Buffer.from(AES_KEY_B64, 'base64')
const aesIv = Buffer.from(AES_IV_B64, 'base64')

/**
 * Decrypts data using AES-256-CBC, replicating the Python implementation.
 * @param data The encrypted data buffer.
 * @returns The decrypted data buffer.
 */
export function decrypt(data: Buffer): Buffer {
  // aes-256-cbc is the correct algorithm for a 32-byte (256-bit) key.
  const decipher = createDecipheriv('aes-256-cbc', aesKey, aesIv)
  
  // The Python pycryptodome `unpad` function defaults to PKCS#7 padding.
  // Node's crypto handles this by default when setAutoPadding is true.
  decipher.setAutoPadding(true)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted
}
/**
 * Encrypts data using AES-256-CBC, replicating the Python implementation.
 * @param data The plaintext data buffer.
 * @returns The encrypted data buffer.
 */
export function encrypt(data: Buffer): Buffer {
  // aes-256-cbc is the correct algorithm for a 32-byte (256-bit) key.
  const cipher = createCipheriv('aes-256-cbc', aesKey, aesIv)
  
  // The Python pycryptodome `pad` function defaults to PKCS#7 padding.
  // Node's crypto handles this by default when setAutoPadding is true.
  cipher.setAutoPadding(true)

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  return encrypted
}