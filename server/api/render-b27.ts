import { defineEventHandler, getQuery, getCookie, createError } from 'h3'
import satori from 'satori'

// Import the query logic
import { Buffer } from 'node:buffer'
import { createDecipheriv } from 'node:crypto'
import JSZip from 'jszip'

// --- Configuration ---
const GLOBAL_HEADERS = {
  'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
  'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
  'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
  'Accept': 'application/json',
}
const AES_KEY = Buffer.from("6Jaa0qVAJZuXkZCLiOa/Ax5tIZVu+taKUN1V1nqwkks=", 'base64')
const AES_IV = Buffer.from("Kk/wisgNYwcAV8WVGMgyUw==", 'base64')
const URL_API = 'https://rak3ffdi.cloud.tds1.tapapis.cn'
const LEVELS = ["EZ", "HD", "IN", "AT"]

let difficulty: Record<string, number[]> = {}
let songInfo: Record<string, { name: string; composer: string }> = {}
let isChartDataLoaded = false
let loadingPromise: Promise<void> | null = null

function getBool(num: number, index: number): boolean {
  return (num & (1 << index)) !== 0
}

class ByteReader {
  data: Buffer
  position: number

  constructor(data: Buffer) {
    this.data = data
    this.position = 0
  }

  readVarShort(): number {
    const num = this.data[this.position]
    if (num < 128) {
      this.position += 1
    } else {
      this.position += 2
    }
    return num
  }

  readString(): string {
    const length = this.data[this.position]
    this.position += 1
    const strBuffer = this.data.slice(this.position, this.position + length)
    this.position += length
    return strBuffer.toString('utf8')
  }

  readScoreAcc(): { score: number; acc: number } {
    const score = this.data.readInt32LE(this.position)
    this.position += 4
    const acc = this.data.readFloatLE(this.position)
    this.position += 4
    return { score, acc }
  }

  readRecord(songId: string): any[] {
    const recordLength = this.data[this.position]
    const endPosition = this.position + recordLength + 1
    this.position += 1
    const exists = this.data[this.position]
    this.position += 1
    const fc = this.data[this.position]
    this.position += 1
    const diff = difficulty[songId]
    if (!diff) {
      this.position = endPosition
      return []
    }
    const records: any[] = []
    for (let level = 0; level < diff.length; level++) {
      if (getBool(exists, level)) {
        const scoreAcc = this.readScoreAcc() as any
        scoreAcc.level = LEVELS[level]
        scoreAcc.fc = getBool(fc, level)
        scoreAcc.songId = songId
        scoreAcc.difficulty = diff[level]
        scoreAcc.rks = Math.pow((scoreAcc.acc - 55) / 45, 2) * scoreAcc.difficulty
        const info = songInfo[songId]
        if (info) {
          scoreAcc.songName = info.name
          scoreAcc.composer = info.composer
        } else {
          scoreAcc.songName = songId
          scoreAcc.composer = 'Unknown'
        }
        records.push(scoreAcc)
      }
    }
    this.position = endPosition
    return records
  }
}

async function readGameRecord(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch game record: ${response.statusText}`)
  }
  const zipBuffer = Buffer.from(await response.arrayBuffer())
  const zip = new JSZip()
  await zip.loadAsync(zipBuffer)
  const gameRecordEntry = zip.file('gameRecord')
  if (!gameRecordEntry) {
    throw new Error("gameRecord file not found in the ZIP archive.")
  }
  const gameRecordContent = await gameRecordEntry.async('nodebuffer')
  if (gameRecordContent[0] !== 0x01) {
    throw new Error("版本号不正确，可能协议已更新。")
  }
  return gameRecordContent.slice(1)
}

function decrypt_gameRecord(gameRecordBuffer: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-cbc', AES_KEY, AES_IV)
  decipher.setAutoPadding(false)
  let decrypted = decipher.update(gameRecordBuffer)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  const padLength = decrypted[decrypted.length - 1]
  if (padLength > decrypted.length || padLength === 0) {
    throw new Error('Invalid padding or no padding applied.')
  }
  for (let i = 0; i < padLength; i++) {
    if (decrypted[decrypted.length - 1 - i] !== padLength) {
      throw new Error('Invalid PKCS7 padding bytes.')
    }
  }
  return decrypted.slice(0, decrypted.length - padLength)
}

function parse_b27(gameRecordBuffer: Buffer): any[] {
  const records: any[] = []
  const reader = new ByteReader(gameRecordBuffer)
  const numSongs = reader.readVarShort()
  for (let i = 0; i < numSongs; i++) {
    const songId = reader.readString().slice(0, -2)
    const record = reader.readRecord(songId)
    records.push(...record)
  }
  records.sort((a, b) => b.rks - a.rks)
  const phiRecords = records.filter(x => x.score === 1000000)
  phiRecords.sort((a, b) => b.difficulty - a.difficulty)
  const BEST_PHI_COUNT = 3
  const BEST_NON_PHI_COUNT = 33
  const resultList: any[] = []
  const includedSongs = new Set<string>()
  for (let i = 0; i < Math.min(BEST_PHI_COUNT, phiRecords.length); i++) {
    const record = phiRecords[i]
    resultList.push(record)
    includedSongs.add(`${record.songId}-${record.level}`)
  }
  let count = 0
  for (const record of records) {
    if (count >= BEST_NON_PHI_COUNT) break
    const recordKey = `${record.songId}-${record.level}`
    if (!includedSongs.has(recordKey)) {
      resultList.push(record)
      includedSongs.add(recordKey)
      count++
    }
  }
  return resultList
}

async function loadChartData(): Promise<void> {
  const storage = useStorage('assets:server')
  const [difficultyContent, infoContent] = await Promise.all([
    storage.getItem('difficulty.tsv'),
    storage.getItem('info.tsv')
  ])
  if (!difficultyContent) {
    throw new Error('Asset not found or is empty: server/assets/difficulty.tsv')
  }
  const newDifficultyData: Record<string, number[]> = {}
  const diffLines = (difficultyContent as string).split('\n')
  for (let line of diffLines) {
    line = line.trim()
    if (!line) continue
    const parts = line.split('\t')
    const songId = parts[0]
    const diff = parts.slice(1).map(s => Number(s)).filter(n => !isNaN(n))
    newDifficultyData[songId] = diff
  }
  difficulty = newDifficultyData
  if (!infoContent) {
    throw new Error('Asset not found or is empty: server/assets/info.tsv')
  }
  const newSongInfo: Record<string, { name: string; composer: string }> = {}
  const infoLines = (infoContent as string).split('\n')
  for (let line of infoLines) {
    line = line.trim()
    if (!line) continue
    const parts = line.split('\t')
    const songId = parts[0]
    newSongInfo[songId] = {
      name: parts[1] || '',
      composer: parts[2] || '',
    }
  }
  songInfo = newSongInfo
}

async function ensureChartDataLoaded(): Promise<void> {
  if (isChartDataLoaded) return
  if (loadingPromise) {
    await loadingPromise
    return
  }
  try {
    loadingPromise = loadChartData()
    await loadingPromise
    isChartDataLoaded = true
  } catch (error) {
    loadingPromise = null
    isChartDataLoaded = false
    throw new Error('Failed to ensure chart data was loaded.')
  } finally {
    loadingPromise = null
  }
}

async function getPlayerId(sessionToken: string): Promise<string> {
  const headers = { ...GLOBAL_HEADERS, 'X-LC-Session': sessionToken }
  const response = await fetch(`${URL_API}/1.1/users/me`, { headers })
  if (!response.ok) {
    throw new Error(`Failed to get player ID: ${response.status} - ${response.statusText}`)
  }
  const result = await response.json() as any
  return result.nickname
}

async function getSummary(sessionToken: string): Promise<any> {
  const headers = { ...GLOBAL_HEADERS, 'X-LC-Session': sessionToken }
  const response = await fetch(`${URL_API}/1.1/classes/_GameSave`, { headers })
  if (!response.ok) {
    throw new Error(`Failed to get summary: ${response.status} - ${response.statusText}`)
  }
  const result = await response.json() as any
  if (!result.results || result.results.length === 0) {
    throw new Error("No game save results found.")
  }
  const gameSave = result.results[0]
  const updatedAt = gameSave.updatedAt
  const url = gameSave.gameFile.url
  const summaryBase64 = gameSave.summary
  const summaryBuffer = Buffer.from(summaryBase64, 'base64')
  const challenge = summaryBuffer.readUInt16LE(1)
  const rks = summaryBuffer.readFloatLE(3)
  const avatarLength = summaryBuffer.readUInt8(9)
  const avatar = summaryBuffer.toString('utf8', 10, 10 + avatarLength)
  let currentOffset = 10 + avatarLength
  const levelsData: number[] = []
  for (let i = 0; i < 12; i++) {
    if (currentOffset + 2 > summaryBuffer.length) break
    levelsData.push(summaryBuffer.readUInt16LE(currentOffset))
    currentOffset += 2
  }
  return {
    updatedAt,
    url,
    challenge,
    rks,
    avatar,
    EZ: levelsData.slice(0, 3),
    HD: levelsData.slice(3, 6),
    IN: levelsData.slice(6, 9),
    AT: levelsData.slice(9, 12),
  }
}

async function getb27(sessionToken: string): Promise<any[]> {
  const summaryData = await getSummary(sessionToken)
  const gameRecord = await readGameRecord(summaryData.url)
  const decryptedGameRecord = decrypt_gameRecord(gameRecord)
  return parse_b27(decryptedGameRecord)
}

// Helper functions
function getRatingFromScore(score: number, fc: boolean): string {
  if (score === 1000000) return 'phi'
  if (fc) return 'FC'
  if (score > 960000) return 'V'
  if (score > 920000) return 'S'
  if (score > 880000) return 'A'
  if (score > 820000) return 'B'
  if (score > 700000) return 'C'
  return 'F'
}

function getSuggest(acc: number, rks: number, difficultyVal: number, pRks: number[]): string {
  const targetRks = parseFloat(rks.toFixed(2)) + 0.01 - 0.005
  const currentRks = Math.pow((acc - 55) / 45, 2) * difficultyVal
  const targetSongRks = targetRks * 30 - (rks * 30 - currentRks)
  const targetAcc = (Math.sqrt(targetSongRks / difficultyVal) * 45 + 55)
  if (targetAcc > 100) {
    if (currentRks !== difficultyVal) {
      let p3_rks = 0
      for (let i = 0; i < pRks.length; i++) p3_rks += pRks[i]
      const simulatedRks = [...pRks, difficultyVal]
      simulatedRks.sort((a, b) => a - b)
      simulatedRks.shift()
      let new_rks = rks * 30 - p3_rks
      for (let i = 0; i < pRks.length; i++) new_rks += simulatedRks[i]
      new_rks /= 30
      if (new_rks.toFixed(4) > rks.toFixed(4)) {
        return "100.00%"
      }
    }
    return '无法推分'
  } else {
    return `${targetAcc.toFixed(2)}%`
  }
}

function calculatestdDeviation(phiSongs: any[], b27Songs: any[]): number {
  const allRks: number[] = []
  phiSongs.forEach(song => {
    if (song) allRks.push(song.rks)
  })
  b27Songs.slice(0, 27).forEach(song => {
    allRks.push(song.rks)
  })
  const mean = allRks.reduce((sum, rks) => sum + rks, 0) / allRks.length
  const stdDeviation = allRks.reduce((sum, rks) => sum + Math.pow(rks - mean, 2), 0) / allRks.length
  return Math.sqrt(stdDeviation)
}

// Font loading cache
let fontDataCache: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontDataCache) return fontDataCache
  
  // Load Noto Sans for CJK support from Google Fonts
  const fontUrl = 'https://cdn.jsdelivr.net/gh/AoEiuV020/w3/resources/fonts/NotoSansSC-Medium.otf'
  const response = await fetch(fontUrl)
  if (!response.ok) {
    throw new Error('Failed to load font')
  }
  fontDataCache = await response.arrayBuffer()
  return fontDataCache
}

// Create the B27 image JSX for Satori
function createB27ImageJSX(data: {
  playerName: string
  rks: number
  challenge: string
  challengeRank: string
  avatar: string
  formattedDate: string
  stats: any[]
  phi: any[]
  b27_list: any[]
  stdDeviation: number
  background: { id: string; name: string }
}): any {
  const { playerName, rks, challenge, challengeRank, avatar, formattedDate, stats, phi, b27_list, stdDeviation, background } = data

  // Create song card element
  const createSongCard = (song: any, index: number, isPhi: boolean) => {
    if (!song) {
      // Nosignal card for missing phi songs
      return {
        type: 'div',
        props: {
          style: {
            width: '330px',
            height: '100px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: 'rgba(112, 112, 112, 0.4)',
            margin: '8px',
            padding: '10px',
            position: 'relative',
          },
          children: [
            {
              type: 'div',
              props: {
                style: { color: 'white', fontSize: '24px' },
                children: 'TIME_OUT'
              }
            },
            {
              type: 'div',
              props: {
                style: { color: '#00b0f0', fontSize: '10px' },
                children: '>>> PhigrOS Client Finding Phi.score'
              }
            }
          ]
        }
      }
    }

    const rankColor: Record<string, string> = {
      'AT': '#6e6e6e',
      'IN': '#ff0000',
      'HD': '#00b0f0',
      'EZ': '#92d050'
    }

    const infoColor: Record<string, string> = {
      'AT': 'rgba(240, 0, 0, 0.3)',
      'IN': 'rgba(0, 183, 240, 0.3)',
      'HD': 'rgba(0, 183, 240, 0.3)',
      'EZ': 'rgba(0, 183, 240, 0.3)'
    }

    return {
      type: 'div',
      props: {
        style: {
          width: '360px',
          height: '100px',
          display: 'flex',
          flexDirection: 'row',
          margin: '8px',
          position: 'relative',
        },
        children: [
          // Illustration box
          {
            type: 'div',
            props: {
              style: {
                width: '180px',
                height: '95px',
                position: 'relative',
                display: 'flex',
              },
              children: [
                // Number badge
                {
                  type: 'div',
                  props: {
                    style: {
                      position: 'absolute',
                      top: '4px',
                      left: '10px',
                      backgroundColor: 'white',
                      padding: '2px 8px',
                      fontSize: '10px',
                      color: 'black',
                      zIndex: 10,
                    },
                    children: isPhi ? `P${index + 1}` : `#${song.num}`
                  }
                },
                // Illustration image
                {
                  type: 'img',
                  props: {
                    src: song.illustration,
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }
                  }
                },
                // Rank badge
                {
                  type: 'div',
                  props: {
                    style: {
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      backgroundColor: rankColor[song.rank] || '#6e6e6e',
                      padding: '4px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: { color: 'white', fontSize: '12px' },
                          children: `${song.rank} ${song.difficulty.toFixed(1)}`
                        }
                      },
                      {
                        type: 'span',
                        props: {
                          style: { color: 'white', fontSize: '13px' },
                          children: song.rks.toFixed(2)
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          // Song info box
          {
            type: 'div',
            props: {
              style: {
                flex: 1,
                backgroundColor: infoColor[song.rank] || 'rgba(0, 183, 240, 0.3)',
                borderRight: `3px solid ${song.rank === 'AT' ? '#ff0000' : '#00b0f0'}`,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
              },
              children: [
                // Song name
                {
                  type: 'div',
                  props: {
                    style: {
                      color: 'white',
                      fontSize: '14px',
                      textAlign: 'center',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    children: song.song
                  }
                },
                // Score info
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                    children: [
                      // Rating image placeholder (text for now)
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '30px',
                            color: song.Rating === 'phi' ? '#FFD700' : 'white',
                            fontSize: '10px',
                          },
                          children: song.Rating
                        }
                      },
                      // Score and ACC
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                          },
                          children: [
                            {
                              type: 'span',
                              props: {
                                style: { color: 'white', fontSize: '20px' },
                                children: song.score.toString()
                              }
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  borderBottom: '2px solid white',
                                  width: '90%',
                                  marginBottom: '4px',
                                }
                              }
                            },
                            {
                              type: 'div',
                              props: {
                                style: { display: 'flex', alignItems: 'center' },
                                children: [
                                  {
                                    type: 'span',
                                    props: {
                                      style: { color: 'white', fontSize: '14px' },
                                      children: `${song.acc.toFixed(2)}%`
                                    }
                                  },
                                  song.suggest ? {
                                    type: 'span',
                                    props: {
                                      style: { color: '#F8DDAD', fontSize: '10px', marginLeft: '8px' },
                                      children: `>> ${song.suggest}`
                                    }
                                  } : null
                                ].filter(Boolean)
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  }

  // Calculate average ACC
  const b27Only = b27_list.slice(0, 27)
  const averageAcc = b27Only.length > 0 
    ? b27Only.reduce((sum, song) => sum + song.acc, 0) / b27Only.length 
    : 0

  // Calculate ACC distribution
  const accDistribution = {
    a: b27Only.filter(s => s.acc >= 99.5).length,
    b: b27Only.filter(s => s.acc >= 99 && s.acc < 99.5).length,
    c: b27Only.filter(s => s.acc >= 98 && s.acc < 99).length,
    d: b27Only.filter(s => s.acc >= 97 && s.acc < 98).length,
    e: b27Only.filter(s => s.acc < 97).length,
  }

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        fontFamily: 'Noto Sans SC',
        position: 'relative',
      },
      children: [
        // Background (as solid color since we can't use blur effects in SVG easily)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a2e',
              zIndex: -1,
            }
          }
        },
        // Title section
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '140px',
              marginTop: '32px',
              marginBottom: '32px',
              position: 'relative',
            },
            children: [
              // Player info section
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '16px',
                    width: '500px',
                  },
                  children: [
                    // Avatar
                    {
                      type: 'img',
                      props: {
                        src: `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/avatar/${avatar}.png`,
                        style: {
                          width: '80px',
                          height: '80px',
                          marginRight: '16px',
                        }
                      }
                    },
                    // Player name and RKS
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { color: 'white', fontSize: '24px' },
                              children: playerName
                            }
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                backgroundColor: 'white',
                                color: 'black',
                                padding: '4px 16px',
                                fontSize: '18px',
                                marginTop: '8px',
                              },
                              children: rks.toFixed(4)
                            }
                          }
                        ]
                      }
                    },
                    // Challenge badge
                    {
                      type: 'div',
                      props: {
                        style: {
                          marginLeft: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { color: 'white', fontSize: '16px' },
                              children: `Lv.${challenge}`
                            }
                          },
                          {
                            type: 'div',
                            props: {
                              style: { color: 'white', fontSize: '20px' },
                              children: challengeRank
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              // Record info section (stats)
              {
                type: 'div',
                props: {
                  style: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '16px',
                    marginLeft: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                  },
                  children: [
                    // Header row
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', color: 'white', fontSize: '14px', marginBottom: '8px' },
                        children: ['\\', 'EZ', 'HD', 'IN', 'AT'].map(t => ({
                          type: 'span',
                          props: {
                            style: { width: '50px', textAlign: 'center' },
                            children: t
                          }
                        }))
                      }
                    },
                    // C row
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', color: 'white', fontSize: '14px', marginBottom: '4px' },
                        children: ['C', ...stats.map(s => s.cleared.toString())].map(t => ({
                          type: 'span',
                          props: {
                            style: { width: '50px', textAlign: 'center' },
                            children: t
                          }
                        }))
                      }
                    },
                    // FC row
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', color: 'white', fontSize: '14px', marginBottom: '4px' },
                        children: ['FC', ...stats.map(s => s.fc.toString())].map(t => ({
                          type: 'span',
                          props: {
                            style: { width: '50px', textAlign: 'center' },
                            children: t
                          }
                        }))
                      }
                    },
                    // Phi row
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', color: 'white', fontSize: '14px' },
                        children: ['Phi', ...stats.map(s => s.phi.toString())].map(t => ({
                          type: 'span',
                          props: {
                            style: { width: '50px', textAlign: 'center' },
                            children: t
                          }
                        }))
                      }
                    }
                  ]
                }
              },
              // Std deviation
              {
                type: 'div',
                props: {
                  style: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '16px',
                    marginLeft: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { color: '#00b0f0', fontSize: '12px', marginBottom: '8px' },
                        children: 'stdDeviation'
                      }
                    },
                    {
                      type: 'div',
                      props: {
                        style: { color: 'white', fontSize: '18px' },
                        children: stdDeviation.toFixed(4)
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        // Date
        {
          type: 'div',
          props: {
            style: {
              color: 'white',
              fontSize: '12px',
              textAlign: 'right',
              marginRight: '100px',
              marginTop: '-20px',
            },
            children: formattedDate
          }
        },
        // B27 songs section
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              padding: '16px',
            },
            children: [
              // Phi songs
              ...phi.map((song, i) => createSongCard(song, i, true)),
              // B27 songs
              ...b27_list.map((song, i) => {
                const cards: any[] = []
                // Add overflow marker before #28
                if (i === 27) {
                  cards.push({
                    type: 'div',
                    props: {
                      style: {
                        width: '100%',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '20px',
                      },
                      children: 'OVER FLOW'
                    }
                  })
                }
                cards.push(createSongCard(song, i, false))
                return cards
              }).flat()
            ]
          }
        },
        // ACC stats bar
        {
          type: 'div',
          props: {
            style: {
              width: '96%',
              height: '60px',
              margin: '16px auto',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
            },
            children: [
              // Average ACC
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRight: '2px solid rgba(255, 255, 255, 0.3)',
                    paddingRight: '16px',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#92d050', fontSize: '12px' },
                        children: 'Average ACC'
                      }
                    },
                    {
                      type: 'span',
                      props: {
                        style: { color: 'white', fontSize: '18px' },
                        children: `${averageAcc.toFixed(2)}%`
                      }
                    }
                  ]
                }
              },
              // ACC distribution
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    flex: 1,
                  },
                  children: [
                    { label: '>99.5%', count: accDistribution.a },
                    { label: '99.0-99.5%', count: accDistribution.b },
                    { label: '98-99%', count: accDistribution.c },
                    { label: '97-98%', count: accDistribution.d },
                    { label: '<97%', count: accDistribution.e },
                  ].map(item => ({
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        margin: '0 12px',
                      },
                      children: [
                        {
                          type: 'span',
                          props: {
                            style: { color: '#00b0f0', fontSize: '10px' },
                            children: item.label
                          }
                        },
                        {
                          type: 'span',
                          props: {
                            style: { color: 'white', fontSize: '16px' },
                            children: item.count.toString()
                          }
                        }
                      ]
                    }
                  }))
                }
              }
            ]
          }
        },
        // Footer
        {
          type: 'div',
          props: {
            style: {
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              padding: '32px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { color: 'white', fontSize: '24px' },
                  children: 'Generated by RKS'
                }
              }
            ]
          }
        }
      ]
    }
  }
}

// Get random background
async function getRandomBackground(): Promise<{ id: string; name: string }> {
  try {
    const storage = useStorage('assets:server')
    const infoContent = await storage.getItem('info.tsv')
    if (!infoContent) {
      return { id: 'Phigros', name: 'Phigros' }
    }
    const lines = (infoContent as string).split('\n').filter(l => l.trim())
    const randomLine = lines[Math.floor(Math.random() * lines.length)]
    const parts = randomLine.split('\t')
    return { id: parts[0], name: parts[1] || parts[0] }
  } catch {
    return { id: 'Phigros', name: 'Phigros' }
  }
}

export default defineEventHandler(async (event) => {
  await ensureChartDataLoaded()

  let { sessionToken, format } = getQuery(event)
  if (!sessionToken) {
    sessionToken = getCookie(event, 'session_token')
  }
  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      message: 'Missing session_token',
    })
  }

  try {
    // Fetch data
    const [b27, playerName, summary, background] = await Promise.all([
      getb27(sessionToken as string),
      getPlayerId(sessionToken as string),
      getSummary(sessionToken as string),
      getRandomBackground(),
    ])

    const challengeValue = summary.challenge.toString()

    // Transform data
    const stats = [
      { title: 'EZ', cleared: summary.EZ[0], fc: summary.EZ[1], phi: summary.EZ[2] },
      { title: 'HD', cleared: summary.HD[0], fc: summary.HD[1], phi: summary.HD[2] },
      { title: 'IN', cleared: summary.IN[0], fc: summary.IN[1], phi: summary.IN[2] },
      { title: 'AT', cleared: summary.AT[0], fc: summary.AT[1], phi: summary.AT[2] },
    ]

    // Transform songs
    const allTransformedSongs = b27.map(song => ({
      song: song.songName,
      illustration: `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${song.songId}.png`,
      rank: song.level,
      difficulty: song.difficulty,
      rks: song.rks,
      Rating: getRatingFromScore(song.score, song.fc),
      score: song.score,
      acc: song.acc,
    }))

    // Get phi songs
    const phiSongs = allTransformedSongs
      .filter(song => song.Rating === 'phi')
      .slice(0, 3)

    const p3Rks = phiSongs.map(song => song.rks)

    // Get B27 songs
    const b27Songs = allTransformedSongs
      .sort((a, b) => b.rks - a.rks)
      .slice(0, 33)
      .map((song, index) => ({
        ...song,
        num: index + 1,
        suggest: getSuggest(song.acc, summary.rks, song.difficulty, p3Rks),
      }))

    // Add suggest to phi songs
    phiSongs.forEach(song => {
      (song as any).suggest = getSuggest(song.acc, summary.rks, song.difficulty, p3Rks)
    })

    // Pad phi songs
    while (phiSongs.length < 3) {
      phiSongs.push(null as any)
    }

    const stdDeviation = calculatestdDeviation(phiSongs, b27Songs)
    const formattedDate = new Date(summary.updatedAt).toLocaleString('sv-SE')

    // Load font and generate image
    const fontData = await loadFont()
    
    const jsx = createB27ImageJSX({
      playerName,
      rks: summary.rks,
      challenge: challengeValue.slice(0, 1),
      challengeRank: challengeValue.slice(1, 3),
      avatar: summary.avatar,
      formattedDate,
      stats,
      phi: phiSongs,
      b27_list: b27Songs,
      stdDeviation,
      background,
    })

    // If JSON format is requested, return the data for client-side rendering
    if (format === 'json') {
      return {
        playerName,
        rks: summary.rks,
        challenge: challengeValue.slice(0, 1),
        challengeRank: challengeValue.slice(1, 3),
        avatar: summary.avatar,
        formattedDate,
        stats,
        phi: phiSongs,
        b27_list: b27Songs,
        stdDeviation,
        background,
      }
    }

    // Generate SVG with Satori
    const svg = await satori(jsx, {
      width: 1200,
      height: 2400,
      fonts: [
        {
          name: 'Noto Sans SC',
          data: fontData,
          weight: 500,
          style: 'normal',
        },
      ],
    })

    // Return SVG (PNG conversion not available on Cloudflare Workers)
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="B27-${playerName}-${summary.rks.toFixed(4)}.svg"`,
      },
    })
  } catch (error: any) {
    console.error('Render B27 Error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to render B27 image: ${error.message}`,
    })
  }
})
