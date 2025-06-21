// 新文件路径: server/utils/structure-builder.ts

import { Writer } from './binary-writer'

// ===================================================================
//                        HELPER FUNCTIONS
// ===================================================================

function writeMoney(writer: Writer, money: number[]): void {
  for (let i = 0; i < 5; i++) {
    writer.writeVarInt(money[i] || 0);
  }
}

function writeKeyList(writer: Writer, keyList: Record<string, any>): void {
  const keyNames = Object.keys(keyList);
  writer.writeVarInt(keyNames.length);

  for (const name of keyNames) {
    const oneKey = keyList[name];
    writer.writeString(name);
    
    const flag = oneKey.flag as number[];
    writer.writeByte(flag.length + 1);

    // This corresponds to the parser's `readBitsFromByte(reader, 5)`
    writer.writeBitsToByte(oneKey.type, 5);
    
    for (const flagByte of flag) {
      writer.writeByte(flagByte);
    }
  }
}

// ===================================================================
//                       MAIN STRUCTURE BUILDERS
// ===================================================================

function buildGameRecord(writer: Writer, data: Record<string, any>): void {
  const songNames = Object.keys(data);
  writer.writeVarInt(songNames.length);

  const diffList = ['EZ', 'HD', 'IN', 'AT', 'Legacy'];
  const diffMap: Record<string, number> = { EZ: 0, HD: 1, IN: 2, AT: 3, Legacy: 4 };

  for (const songName of songNames) {
    const songData = data[songName];
    // Write song name (with the .0 suffix as in the python code)
    writer.writeString(songName + '.0');

    // Use a temporary writer to build the song's record data to calculate its length
    const songRecordWriter = new Writer();
    
    let unlockByte = 0;
    let fcByte = 0;
    
    const recordContentWriter = new Writer();

    for (const diff of diffList) {
      if (songData[diff]) {
        const record = songData[diff];
        const diffIndex = diffMap[diff];
        
        unlockByte |= (1 << diffIndex);
        if (record.fc) {
          fcByte |= (1 << diffIndex);
        }

        recordContentWriter.writeInt(record.score);
        recordContentWriter.writeFloat(record.acc);
      }
    }

    songRecordWriter.writeByte(unlockByte);
    songRecordWriter.writeByte(fcByte);
    songRecordWriter.writeBytes(recordContentWriter.getBuffer());

    const songRecordBuffer = songRecordWriter.getBuffer();
    
    writer.writeVarInt(songRecordBuffer.length);
    writer.writeBytes(songRecordBuffer);
  }
}

function buildUser01(writer: Writer, data: any): void {
  writer.writeByte(data.showPlayerId);
  writer.writeString(data.selfIntro);
  writer.writeString(data.avatar);
  writer.writeString(data.background);
}

function buildSettings01(writer: Writer, data: any): void {
  writer.writeBit(data.chordSupport);
  writer.writeBit(data.fcAPIndicator);
  writer.writeBit(data.enableHitSound);
  writer.writeBit(data.lowResolutionMode);

  writer.writeString(data.deviceName);
  writer.writeFloat(data.bright);
  writer.writeFloat(data.musicVolume);
  writer.writeFloat(data.effectVolume);
  writer.writeFloat(data.hitSoundVolume);
  writer.writeFloat(data.soundOffset);
  writer.writeFloat(data.noteScale);
}

function buildGameKey02(writer: Writer, data: any): void {
  writeKeyList(writer, data.keyList);
  writer.writeBitsToByte(data.lanotaReadKeys, 6);
  writer.writeBitsToByte(data.camelliaReadKey, 8);
}

function buildGameKey03(writer: Writer, data: any): void {
  buildGameKey02(writer, data);
  writer.writeByte(data.sideStory4BeginReadKey);
  writer.writeByte(data.oldScoreClearedV390);
}

function buildGameProgress03(writer: Writer, data: any): void {
  writer.writeBit(data.isFirstRun);
  writer.writeBit(data.legacyChapterFinished);
  writer.writeBit(data.alreadyShowCollectionTip);
  writer.writeBit(data.alreadyShowAutoUnlockINTip);

  writer.writeString(data.completed);
  writer.writeVarInt(data.songUpdateInfo);
  writer.writeShort(data.challengeModeRank);
  
  writeMoney(writer, data.money);
  
  writer.writeBitsToByte(data.unlockFlagOfSpasmodic, 4);
  writer.writeBitsToByte(data.unlockFlagOfIgallta, 4);
  writer.writeBitsToByte(data.unlockFlagOfRrharil, 4);
  
  writer.writeBitsToByte(data.flagOfSongRecordKey, 8);
  writer.writeBitsToByte(data.randomVersionUnlocked, 6);

  writer.writeBit(data.chapter8UnlockBegin);
  writer.writeBit(data.chapter8UnlockSecondPhase);
  writer.writeBit(data.chapter8Passed);
  
  writer.writeBitsToByte(data.chapter8SongUnlocked, 6);
}

function buildGameProgress04(writer: Writer, data: any): void {
  buildGameProgress03(writer, data);
  writer.writeBitsToByte(data.flagOfSongRecordKeyTakumi, 3);
}

// ===================================================================
//                        MAIN EXPORTED FUNCTIONS
// ===================================================================

/**
 * Determines the correct file head (version byte) for each file based on the data.
 * This is crucial for selecting the right builder and ensuring compatibility.
 */
export function getFileHead(saveData: Record<string, any>): Record<string, Buffer> {
  const fileHeads: Record<string, Buffer> = {};
  
  for (const key in saveData) {
    const fileDict = saveData[key];
    if (!fileDict || typeof fileDict !== 'object') continue;

    let head: number | null = null;
    switch (key) {
      case 'gameKey':
        head = 'oldScoreClearedV390' in fileDict ? 0x03 : 0x02;
        break;
      case 'gameProgress':
        head = 'flagOfSongRecordKeyTakumi' in fileDict ? 0x04 : 0x03;
        break;
      case 'gameRecord':
      case 'settings':
      case 'user':
        head = 0x01;
        break;
    }

    if (head !== null) {
      fileHeads[key] = Buffer.from([head]);
    }
  }
  return fileHeads;
}

/**
 * Selects the correct builder function based on the file's name and header byte.
 */
export function getStructureBuilder(fileName: string, fileHead: Buffer): ((writer: Writer, data: any) => void) | null {
  const headByte = fileHead.readUInt8(0);

  switch (fileName) {
    case 'gameRecord':
      if (headByte === 0x01) return buildGameRecord;
      break;
    case 'user':
      if (headByte === 0x01) return buildUser01;
      break;
    case 'settings':
      if (headByte === 0x01) return buildSettings01;
      break;
    case 'gameProgress':
      if (headByte === 0x04) return buildGameProgress04;
      if (headByte === 0x03) return buildGameProgress03;
      break;
    case 'gameKey':
      if (headByte === 0x03) return buildGameKey03;
      if (headByte === 0x02) return buildGameKey02;
      break;
  }

  return null;
}