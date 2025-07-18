import { Buffer } from 'node:buffer';
import { createDecipheriv } from 'node:crypto';
import JSZip from 'jszip';
import { getCookie } from 'h3'
// --- Configuration (Equivalent to global_headers, key, iv) ---
const GLOBAL_HEADERS = {
    'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
    'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
    'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
    'Accept': 'application/json',
};
const AES_KEY = Buffer.from("6Jaa0qVAJZuXkZCLiOa/Ax5tIZVu+taKUN1V1nqwkks=", 'base64');
const AES_IV = Buffer.from("Kk/wisgNYwcAV8WVGMgyUw==", 'base64');
const URL = 'https://rak3ffdi.cloud.tds1.tapapis.cn'
const LEVELS = ["EZ", "HD", "IN", "AT"];
let difficulty = {};
let songInfo = {};
let isChartDataLoaded = false;
let loadingPromise = null;
function getBool(num, index) {
    return (num & (1 << index)) !== 0;
}
class ByteReader {
    constructor(data) {
        this.data = data;
        this.position = 0;
    }
    readVarShort() {
        const num = this.data[this.position];
        if (num < 128) {
            this.position += 1;
        } else {
            this.position += 2;
        }
        return num;
    }
    readString() {
        const length = this.data[this.position];
        this.position += 1;
        const strBuffer = this.data.slice(this.position, this.position + length);
        this.position += length;
        return strBuffer.toString('utf8');
    }
    readScoreAcc() {
        const score = this.data.readInt32LE(this.position);
        this.position += 4;
        const acc = this.data.readFloatLE(this.position);
        this.position += 4;
        return { score, acc };
    }
    readRecord(songId) {
        const recordLength = this.data[this.position];
        const endPosition = this.position + recordLength + 1;
        this.position += 1;
        const exists = this.data[this.position];
        this.position += 1;
        const fc = this.data[this.position];
        this.position += 1;
        const diff = difficulty[songId];
        if (!diff) {
            console.warn(`Difficulty not found for songId: ${songId}. Skipping record.`);
            this.position = endPosition;
            return [];
        }
        const records = [];
        for (let level = 0; level < diff.length; level++) {
            if (getBool(exists, level)) {
                const scoreAcc = this.readScoreAcc();
                scoreAcc.level = LEVELS[level];
                scoreAcc.fc = getBool(fc, level);
                scoreAcc.songId = songId;
                scoreAcc.difficulty = diff[level];
                scoreAcc.rks = Math.pow((scoreAcc.acc - 55) / 45, 2) * scoreAcc.difficulty;
                const info = songInfo[songId];
                if (info) {
                    scoreAcc.songName = info.name;
                    scoreAcc.composer = info.composer;
                } else {
                    scoreAcc.songName = songId;
                    scoreAcc.composer = 'Unknown';
                }
                records.push(scoreAcc);
            }
        }
        this.position = endPosition;
        return records;
    }
}
async function readGameRecord(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch game record: ${response.statusText}`);
    }
    const zipBuffer = Buffer.from(await response.arrayBuffer());

    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    const gameRecordEntry = zip.file('gameRecord');
    if (!gameRecordEntry) {
        throw new Error("gameRecord file not found in the ZIP archive.");
    }

    const gameRecordContent = await gameRecordEntry.async('nodebuffer');

    if (gameRecordContent[0] !== 0x01) {
        throw new Error("版本号不正确，可能协议已更新。");
    }
    return gameRecordContent.slice(1);
}
function decrypt_gameRecord(gameRecordBuffer) {
    const decipher = createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
    decipher.setAutoPadding(false);
    let decrypted = decipher.update(gameRecordBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const padLength = decrypted[decrypted.length - 1];
    if (padLength > decrypted.length || padLength === 0) {
        throw new Error('Invalid padding or no padding applied.');
    }
    for (let i = 0; i < padLength; i++) {
        if (decrypted[decrypted.length - 1 - i] !== padLength) {
            throw new Error('Invalid PKCS7 padding bytes.');
        }
    }
    return decrypted.slice(0, decrypted.length - padLength);
}
function parse_b27(gameRecordBuffer) {
    const records = [];
    const reader = new ByteReader(gameRecordBuffer);
    const numSongs = reader.readVarShort();
    for (let i = 0; i < numSongs; i++) {
        const songId = reader.readString().slice(0, -2);
        const record = reader.readRecord(songId);
        records.push(...record);
    }

    records.sort((a, b) => b.rks - a.rks);

    const phiRecords = records.filter(x => x.score === 1000000);
    phiRecords.sort((a, b) => b.difficulty - a.difficulty);

    const BEST_PHI_COUNT = 3;
    const BEST_NON_PHI_COUNT = 33;

    const resultList = [];
    const includedSongs = new Set();

    for (let i = 0; i < Math.min(BEST_PHI_COUNT, phiRecords.length); i++) {
        const record = phiRecords[i];
        resultList.push(record);
        includedSongs.add(`${record.songId}-${record.level}`);
    }

    let count = 0;
    for (const record of records) {
        if (count >= BEST_NON_PHI_COUNT) {
            break;
        }
        const recordKey = `${record.songId}-${record.level}`;
        if (!includedSongs.has(recordKey)) {
            resultList.push(record);
            includedSongs.add(recordKey);
            count++;
        }
    }

    return resultList;
}
function parse_record(gameRecordBuffer) {
    const records = [];
    const reader = new ByteReader(gameRecordBuffer);
    const numSongs = reader.readVarShort();
    for (let i = 0; i < numSongs; i++) {
        const songId = reader.readString().slice(0, -2);
        const record = reader.readRecord(songId);
        records.push(...record);
    }
    records.sort((a, b) => b.rks - a.rks);
    const phiRecords = records.filter(x => x.score === 1000000);
    let bestFcRecord = null;
    if (phiRecords.length > 0) {
        bestFcRecord = phiRecords.reduce((max, current) =>
            current.difficulty > max.difficulty ? current : max, phiRecords[0]
        );
    }
    return records;
}
async function loadChartData() {
    const storage = useStorage('assets:server');
    try {
        console.log("Reading chart data (difficulty and info) from server assets...");
        const [difficultyContent, infoContent] = await Promise.all([
            storage.getItem('difficulty.tsv'),
            storage.getItem('info.tsv')
        ]);
        if (!difficultyContent) {
            throw new Error('Asset not found or is empty: server/assets/difficulty.tsv');
        }
        const newDifficultyData = {};
        const diffLines = difficultyContent.split('\n');
        for (let line of diffLines) {
            line = line.trim();
            if (!line) continue;
            const parts = line.split('\t');
            const songId = parts[0];
            const diff = parts.slice(1).map(s => Number(s)).filter(n => !isNaN(n));
            newDifficultyData[songId] = diff;
        }
        difficulty = newDifficultyData;
        console.log("Difficulty data loaded successfully.");
        if (!infoContent) {
            throw new Error('Asset not found or is empty: server/assets/info.tsv');
        }
        const newSongInfo = {};
        const infoLines = infoContent.split('\n');
        for (let line of infoLines) {
            line = line.trim();
            if (!line) continue;
            const parts = line.split('\t');
            const songId = parts[0];
            newSongInfo[songId] = {
                name: parts[1] || '',
                composer: parts[2] || '',
                illustrator: parts[3] || '',
                chartEZ: parts[4] || '',
                chartHD: parts[5] || '',
                chartIN: parts[6] || '',
                chartAT: parts[7] || ''
            };
        }
        songInfo = newSongInfo;
        console.log("Song info data loaded successfully.")
    } catch (error) {
        console.error("Error loading chart data from assets:", error);
        throw error;
    }
}

async function getPlayerId(sessionToken) {
    const headers = { ...GLOBAL_HEADERS, 'X-LC-Session': sessionToken };
    const response = await fetch(`${URL}/1.1/users/me`, { headers });
    if (!response.ok) {
        throw new Error(`Failed to get player ID: ${response.status} - ${response.statusText}`);
    }
    const result = await response.json();
    return result.nickname;
}
async function getSummary(sessionToken) {
    const headers = { ...GLOBAL_HEADERS, 'X-LC-Session': sessionToken };
    const response = await fetch(`${URL}/1.1/classes/_GameSave`, { headers });
    if (!response.ok) {
        throw new Error(`Failed to get summary: ${response.status} - ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.results || result.results.length === 0) {
        throw new Error("No game save results found.");
    }
    const gameSave = result.results[0];
    const updatedAt = gameSave.updatedAt;
    const url = gameSave.gameFile.url;
    const checksum = (gameSave.gameFile.metaData._checksum);
    const summaryBase64 = gameSave.summary;
    const summaryBuffer = Buffer.from(summaryBase64, 'base64');
    const version = summaryBuffer.readUInt8(0);
    const challenge = summaryBuffer.readUInt16LE(1);
    const rks = summaryBuffer.readFloatLE(3);
    const gameVersion = summaryBuffer.readUInt8(7);
    const avatarLength = summaryBuffer.readUInt8(9);
    const avatar = summaryBuffer.toString('utf8', 10, 10 + avatarLength);
    let currentOffset = 10 + avatarLength;
    const levelsData = [];
    for (let i = 0; i < 12; i++) {
        if (currentOffset + 2 > summaryBuffer.length) {
            console.warn("Not enough bytes for all 12 level shorts in summary. Data might be truncated.");
            break;
        }
        levelsData.push(summaryBuffer.readUInt16LE(currentOffset));
        currentOffset += 2;
    }
    return {
        updatedAt,
        url,
        checksum,
        saveVersion: version,
        challenge: challenge,
        rks: rks,
        gameVersion: gameVersion,
        avatar: avatar,
        EZ: levelsData.slice(0, 3),
        HD: levelsData.slice(3, 6),
        IN: levelsData.slice(6, 9),
        AT: levelsData.slice(9, 12),
    };
}
async function getOriginSummary(sessionToken) {
    const headers = { ...GLOBAL_HEADERS, 'X-LC-Session': sessionToken };
    const response = await fetch(`${URL}/1.1/classes/_GameSave`, { headers });
    if (!response.ok) {
        throw new Error(`Failed to get summary: ${response.status} - ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.results || result.results.length === 0) {
        throw new Error("No game save results found.");
    }
    return {
        results: result.results[0]
    };
}
async function getb27(sessionToken) {
    const summaryData = await getSummary(sessionToken);
    const gameRecord = await readGameRecord(summaryData.url);
    const decryptedGameRecord = decrypt_gameRecord(gameRecord);
    return parse_b27(decryptedGameRecord);
}
async function getRecord(sessionToken) {
    const summaryData = await getSummary(sessionToken);
    const gameRecord = await readGameRecord(summaryData.url);
    const decryptedGameRecord = decrypt_gameRecord(gameRecord);
    return parse_record(decryptedGameRecord);
}
async function ensureChartDataLoaded() {
    if (isChartDataLoaded) {
        return;
    }
    if (loadingPromise) {
        await loadingPromise;
        return;
    }
    try {
        loadingPromise = loadChartData();
        await loadingPromise;
        isChartDataLoaded = true;
    } catch (error) {
        loadingPromise = null;
        isChartDataLoaded = false;
        throw new Error('Failed to ensure chart data was loaded.', { cause: error });
    } finally {
        loadingPromise = null;
    }
}
import { getSaveFile } from '~/server/utils/phigros-api'
import { parseSaveFile } from '~/server/utils/save-parser'

async function getUserMoney(sessionToken) {
    const summary = await getSummary(sessionToken)
    const saveFileBuffer = await getSaveFile(summary.url, summary.checksum)
    const parsedSaveData = await parseSaveFile(saveFileBuffer)
    return {
        money: parsedSaveData.gameProgress.money,
    }
}
export default defineEventHandler(async (event) => {
    await ensureChartDataLoaded();
    // 尝试从查询参数中获取 sessionToken，没有的话从 cookies 中获取
    let { sessionToken, action } = getQuery(event);
    if (!action) {
        return {
            statusCode: 400,
            body: 'Missing action parameter',
        };
    }
    if (!sessionToken) {
        sessionToken = getCookie(event, 'session_token');
    }
    if (!sessionToken) {
        return {
            statusCode: 401,
            body: 'Missing session_token in cookies',
        };
    }

    try {
        let result;
        if (action === 'playerID') {
            const playerName = await getPlayerId(sessionToken);
            result = { playerID: playerName };
        } else if (action === 'summary') {
            result = await getSummary(sessionToken);
        } else if (action === 'b27') {
            result = await getb27(sessionToken);
        } else if (action === 'record') {
            result = await getRecord(sessionToken)
        } else if (action === 'b27report') {
            const [b27, playerName, summary, money] = await Promise.all([
                getb27(sessionToken),
                getPlayerId(sessionToken),
                getSummary(sessionToken),
                getUserMoney(sessionToken)
            ]);
            result = { playerName: playerName, summary: summary, money: money, b27: b27 };
        } else if (action === 'Allreport') {
            const [record, playerName, summary, money] = await Promise.all([
                getRecord(sessionToken),
                getPlayerId(sessionToken),
                getSummary(sessionToken),
                getUserMoney(sessionToken)
            ]);
            result = { playerName: playerName, summary: summary, money: money, record: record };
        } else if (action === 'OriginSummary') {
            result = await getOriginSummary(sessionToken);
        } else if (action === 'getUserMoney') {
            result = await getUserMoney(sessionToken);
        }
        else {
            return {
                statusCode: 400,
                body: 'Invalid action',
            };
        }
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            body: `Internal Server Error: ${error.message}`,
        };
    }
});