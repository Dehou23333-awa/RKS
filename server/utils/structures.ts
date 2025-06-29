import { Reader } from './binary-parser'

// ===================================================================
//                        HELPER FUNCTIONS
// ===================================================================

/**
 * Reads a single byte and extracts a specified number of bits from it.
 * This is used for types like `Bits[N]` from the Python code.
 */
function readBitsFromByte(reader: Reader, count: number): number[] {
  // This uses the reader's `readByte` which correctly handles alignment.
  const byte = reader.readByte();
  const bits: number[] = [];
  for (let i = 0; i < count; i++) {
    bits.push((byte >> i) & 1);
  }
  return bits;
}


// ===================================================================
//                       MAIN STRUCTURE PARSERS
// ===================================================================

function parseGameRecord(reader: Reader): Record<string, any> {
  const allRecords: Record<string, any> = {}
  const diffList = ['EZ', 'HD', 'IN', 'AT', 'Legacy'] as const
  const songSum = reader.readVarInt()

  for (let i = 0; i < songSum; i++) {
    const songName = reader.readString().replace(/\.0$/, '')
    const dataLength = reader.readVarInt()
    const endPosition = reader.position + dataLength
    const unlockByte = reader.readByte()
    const fcByte = reader.readByte()
    const songRecords: Record<string, any> = {}

    for (let j = 0; j < 5; j++) {
      if ((unlockByte >> j) & 1) {
        songRecords[diffList[j]] = {
          score: reader.readInt(),
          acc: reader.readFloat(),
          fc: (fcByte >> j) & 1,
        }
      }
    }
    allRecords[songName] = songRecords

    if (reader.position !== endPosition) {
      reader.position = endPosition
    }
  }
  return allRecords
}

function parseUser01(reader: Reader): Record<string, any> {
  const showPlayerId = reader.readByte();
  const selfIntro = reader.readString();
  const avatar = reader.readString();
  const background = reader.readString();
  return { showPlayerId, selfIntro, avatar, background };
}

function parseSettings01(reader: Reader): Record<string, any> {
  const chordSupport = reader.readBit();
  const fcAPIndicator = reader.readBit();
  const enableHitSound = reader.readBit();
  const lowResolutionMode = reader.readBit();
  
  const deviceName = reader.readString();
  const bright = reader.readFloat();
  const musicVolume = reader.readFloat();
  const effectVolume = reader.readFloat();
  const hitSoundVolume = reader.readFloat();
  const soundOffset = reader.readFloat();
  const noteScale = reader.readFloat();
  return {
    chordSupport, fcAPIndicator, enableHitSound, lowResolutionMode,
    deviceName, bright, musicVolume, effectVolume,
    hitSoundVolume, soundOffset, noteScale
  };
}

function parseKeyList(reader: Reader): Record<string, any> {
  const allKeys: Record<string, any> = {}
  const keySum = reader.readVarInt()

  for (let i = 0; i < keySum; i++) {
    const name = reader.readString()
    const length = reader.readByte()
    const oneKey: Record<string, any> = {}
    
    // type is 5 bits from a single byte
    oneKey.type = readBitsFromByte(reader, 5)
    
    // flag is (length - 1) bytes
    const flag: number[] = []
    for (let j = 0; j < length - 1; j++) {
      flag.push(reader.readByte())
    }
    oneKey.flag = flag
    allKeys[name] = oneKey
  }
  return allKeys
}

function parseGameKey02(reader: Reader): Record<string, any> {
  const keyList = parseKeyList(reader);
  const lanotaReadKeys = readBitsFromByte(reader, 6);
  const camelliaReadKey = readBitsFromByte(reader, 8); // Bits without length is 8
  return { keyList, lanotaReadKeys, camelliaReadKey };
}

function parseGameKey03(reader: Reader): Record<string, any> {
  const data = parseGameKey02(reader);
  data.sideStory4BeginReadKey = reader.readByte();
  data.oldScoreClearedV390 = reader.readByte();
  return data;
}

function parseGameProgress03(reader: Reader): Record<string, any> {
    const isFirstRun = reader.readBit();
    const legacyChapterFinished = reader.readBit();
    const alreadyShowCollectionTip = reader.readBit();
    const alreadyShowAutoUnlockINTip = reader.readBit();
    
    const completed = reader.readString();
    const songUpdateInfo = reader.readVarInt();
    const challengeModeRank = reader.readShort();
    
    const money: number[] = [];
    for (let i = 0; i < 5; i++) {
        money.push(reader.readVarInt());
    }

    const unlockFlagOfSpasmodic = readBitsFromByte(reader, 4);
    const unlockFlagOfIgallta = readBitsFromByte(reader, 4);
    const unlockFlagOfRrharil = readBitsFromByte(reader, 4);
    
    const flagOfSongRecordKey = readBitsFromByte(reader, 8);
    const randomVersionUnlocked = readBitsFromByte(reader, 6);
    
    const chapter8UnlockBegin = reader.readBit();
    const chapter8UnlockSecondPhase = reader.readBit();
    const chapter8Passed = reader.readBit();
    
    const chapter8SongUnlocked = readBitsFromByte(reader, 6);
    
    return {
        isFirstRun, legacyChapterFinished, alreadyShowCollectionTip, alreadyShowAutoUnlockINTip,
        completed, songUpdateInfo, challengeModeRank, money,
        unlockFlagOfSpasmodic, unlockFlagOfIgallta, unlockFlagOfRrharil,
        flagOfSongRecordKey, randomVersionUnlocked,
        chapter8UnlockBegin, chapter8UnlockSecondPhase, chapter8Passed, chapter8SongUnlocked
    };
}

function parseGameProgress04(reader: Reader): Record<string, any> {
    const data = parseGameProgress03(reader);
    data.flagOfSongRecordKeyTakumi = readBitsFromByte(reader, 3);
    return data;
}


// ===================================================================
//                        MAIN EXPORTED FUNCTION
// ===================================================================

/**
 * Selects the correct parser based on the file's name and header byte.
 * This replicates the logic from `Structure/__init__.py`.
 */
export function getStructureParser(fileName: string, fileHead: Buffer): ((reader: Reader) => Record<string, any>) | null {
  const headByte = fileHead.readUInt8(0)

  switch (fileName) {
    case 'gameRecord':
      if (headByte === 0x01) return parseGameRecord
      break
    case 'user':
      if (headByte === 0x01) return parseUser01
      break
    case 'settings':
      if (headByte === 0x01) return parseSettings01
      break
    case 'gameProgress':
      if (headByte === 0x04) return parseGameProgress04
      if (headByte === 0x03) return parseGameProgress03
      break
    case 'gameKey':
      if (headByte === 0x03) return parseGameKey03
      if (headByte === 0x02) return parseGameKey02
      break
  }

  return null
}