import JSZip from 'jszip'
import { ensureSongDataLoaded } from '../utils/song-data'

async function fetchFile(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
    }
    return await response.arrayBuffer()
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const songId = query.songId as string
    const difficulty = query.difficulty as string

    if (!songId || !difficulty) {
        throw createError({ statusCode: 400, message: 'Missing songId or difficulty' })
    }

    const validDifficulties = ['EZ', 'HD', 'IN', 'AT']
    if (!validDifficulties.includes(difficulty)) {
        throw createError({ statusCode: 400, message: 'Invalid difficulty' })
    }

    const songData = await ensureSongDataLoaded()
    const song = songData[songId]
    if (!song) {
        throw createError({ statusCode: 404, message: `Song ${songId} not found` })
    }

    const chart = song.charts[difficulty as keyof typeof song.charts]
    if (!chart) {
        throw createError({ statusCode: 404, message: `Chart ${difficulty} not found for song ${songId}` })
    }

    const zip = new JSZip()

    // 生成 info.txt
    const infoTxt = `#
Name: ${song.name}
Song: ${songId}.ogg
Picture: ${songId}.png
Chart: ${difficulty}.json
Level: ${difficulty} Lv.${chart.difficulty}
Composer: ${song.composer}
Illustrator: ${song.illustrator}
Charter: ${chart.charter}`
    zip.file('info.txt', infoTxt)

    // 使用低清曲绘
    const illustrationUrl = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${songId}.png`
    const musicUrl = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/music/${songId}.ogg`
    const chartUrl = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/chart/${songId}.0/${difficulty}.json`

    try {
        const [musicData, illustrationData, chartData] = await Promise.all([
            fetchFile(musicUrl),
            fetchFile(illustrationUrl).catch((err) => { console.warn(`Failed to fetch illustration: ${err.message}`); return null; }),
            fetchFile(chartUrl)
        ])

        zip.file(`${songId}.ogg`, musicData)
        if (illustrationData) {
            zip.file(`${songId}.png`, illustrationData)
        }
        zip.file(`${difficulty}.json`, chartData)
    } catch (error: any) {
        throw createError({ statusCode: 502, message: `Failed to fetch resources: ${error.message}` })
    }

    const zipBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
    })

    const fileName = `${songId}.${difficulty}.pez`
    setResponseHeaders(event, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(zipBuffer.byteLength)
    })

    return zipBuffer
})
