// 新文件路径: server/utils/binary-writer.ts

/**
 * A robust, stateful binary writer that correctly handles mixed bit/byte writes,
 * accurately replicating the Python original's state management for building save files.
 */
export class Writer {
  private buffers: Buffer[] = [];
  
  private bit_write_active: boolean = false;
  private bit_write_byte: number = 0;
  private bit_write_pos: number = 0; // Position within the bit_write_byte (0-7)

  private flushBits() {
    if (this.bit_write_active) {
      this.buffers.push(Buffer.from([this.bit_write_byte]));
      this.bit_write_active = false;
      this.bit_write_byte = 0;
      this.bit_write_pos = 0;
    }
  }

  public writeByte(value: number) {
    this.flushBits();
    const buffer = Buffer.alloc(1);
    buffer.writeUInt8(value, 0);
    this.buffers.push(buffer);
  }
  
  public writeShort(value: number) {
    this.flushBits();
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value, 0);
    this.buffers.push(buffer);
  }

  public writeInt(value: number) {
    this.flushBits();
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value, 0);
    this.buffers.push(buffer);
  }
  
  public writeFloat(value: number) {
    this.flushBits();
    const buffer = Buffer.alloc(4);
    buffer.writeFloatLE(value, 0);
    this.buffers.push(buffer);
  }

  public writeBit(value: number) {
    this.bit_write_active = true;
    if (value & 1) { // if value is 1 or any odd number
      this.bit_write_byte |= (1 << this.bit_write_pos);
    }
    this.bit_write_pos++;
    if (this.bit_write_pos >= 8) {
      this.flushBits();
    }
  }
  
  public writeVarInt(value: number) {
    this.flushBits();
    if (value > 127) {
      // Write as two bytes
      this.writeByte((value & 0x7f) | 0x80);
      this.writeByte(value >> 7);
    } else {
      // Write as a single byte
      this.writeByte(value);
    }
  }

  public writeString(value: string) {
    this.flushBits();
    const strBuffer = Buffer.from(value, 'utf-8');
    this.writeVarInt(strBuffer.length);
    this.buffers.push(strBuffer);
  }

  public writeBytes(value: Buffer) {
    this.flushBits();
    this.buffers.push(value);
  }
  
  /**
   * Writes a specified number of bits from an array into a single new byte.
   * This corresponds to the parser's `readBitsFromByte` logic.
   * @param bits The array of bits (0 or 1).
   * @param count The number of bits to write from the array.
   */
  public writeBitsToByte(bits: number[], count: number) {
    this.flushBits();
    let byte = 0;
    for (let i = 0; i < count; i++) {
        if (bits[i]) {
            byte |= (1 << i);
        }
    }
    this.writeByte(byte);
  }
  
  /**
   * Finalizes any pending bit writes and returns the complete data buffer.
   */
  public getBuffer(): Buffer {
    this.flushBits();
    return Buffer.concat(this.buffers);
  }
}