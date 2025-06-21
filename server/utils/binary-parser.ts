/**
 * A robust, stateful binary parser that correctly handles mixed bit/byte reads,
 * accurately replicating the Python original's state management.
 */
export class Reader {
  private buffer: Buffer;
  public position: number;

  private bit_read_active: boolean;
  private bit_read_byte: number;
  private bit_read_pos: number; // Position within the bit_read_byte (0-7)

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.position = 0;
    this.bit_read_active = false;
    this.bit_read_byte = 0;
    this.bit_read_pos = 0;
  }

  private alignToByte() {
    if (this.bit_read_active) {
      this.bit_read_active = false;
      this.bit_read_pos = 0;
      this.position++;
    }
  }

  public readByte(): number {
    this.alignToByte();
    const value = this.buffer.readUInt8(this.position);
    this.position++;
    return value;
  }

  public readShort(): number {
    this.alignToByte();
    const value = this.buffer.readUInt16LE(this.position);
    this.position += 2;
    return value;
  }

  public readInt(): number {
    this.alignToByte();
    const value = this.buffer.readUInt32LE(this.position);
    this.position += 4;
    return value;
  }

  public readFloat(): number {
    this.alignToByte();
    const value = this.buffer.readFloatLE(this.position);
    this.position += 4;
    return value;
  }

  public readBit(): number {
    if (!this.bit_read_active) {
      this.bit_read_byte = this.buffer.readUInt8(this.position);
      this.bit_read_active = true;
      this.bit_read_pos = 0;
    }

    const bit = (this.bit_read_byte >> this.bit_read_pos) & 1;
    this.bit_read_pos++;

    if (this.bit_read_pos >= 8) {
      this.bit_read_active = false;
      this.bit_read_pos = 0;
      this.position++;
    }
    
    return bit;
  }

  public readVarInt(): number {
    this.alignToByte();
    const firstByte = this.buffer.readUInt8(this.position);
    if (firstByte > 127) {
      const secondByte = this.buffer.readUInt8(this.position + 1);
      this.position += 2;
      return (firstByte & 0x7f) ^ (secondByte << 7);
    } else {
      this.position += 1;
      return firstByte;
    }
  }

  public readString(): string {
    this.alignToByte();
    const len = this.readVarInt();
    const value = this.buffer.toString('utf-8', this.position, this.position + len);
    this.position += len;
    return value;
  }

  public readBytes(length: number): Buffer {
    this.alignToByte();
    const value = this.buffer.subarray(this.position, this.position + length);
    this.position += length;
    return value;
  }

  public remaining(): number {
    return this.buffer.length - this.position;
  }
}