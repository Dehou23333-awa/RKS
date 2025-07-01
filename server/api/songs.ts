let songData = {};
let isChartDataLoaded = false;
let loadingPromise = null;

async function loadChartData() {
    const storage = useStorage('assets:server');
    try {
        console.log("Reading chart data from server assets...");
        const [difficultyContent, infoContent] = await Promise.all([
            storage.getItem('difficulty.tsv'),
            storage.getItem('info.tsv')
        ]);

        if (!difficultyContent || !infoContent) {
            throw new Error('Required assets not found or empty');
        }

        const tempData = {};

        const diffLines = difficultyContent.split('\n');
        for (let line of diffLines) {
            line = line.trim();
            if (!line) continue;
            const parts = line.split('\t');
            const songId = parts[0];
            const difficulties = parts.slice(1).map(s => Number(s)).filter(n => !isNaN(n));
            
            tempData[songId] = {
                id: songId,
                charts: {
                    EZ: difficulties[0] ? { difficulty: difficulties[0] } : null,
                    HD: difficulties[1] ? { difficulty: difficulties[1] } : null,
                    IN: difficulties[2] ? { difficulty: difficulties[2] } : null,
                    AT: difficulties[3] ? { difficulty: difficulties[3] } : null
                }
            };
        }

        const infoLines = infoContent.split('\n');
        for (let line of infoLines) {
            line = line.trim();
            if (!line) continue;
            const parts = line.split('\t');
            const songId = parts[0];
            
            if (!tempData[songId]) {
                tempData[songId] = { 
                    id: songId,
                    charts: {}
                };
            }

            Object.assign(tempData[songId], {
                name: parts[1] || '',
                composer: parts[2] || '',
                illustrator: parts[3] || '',
            });

            const chartTypes = ['EZ', 'HD', 'IN', 'AT'];
            chartTypes.forEach((type, index) => {
                const charter = parts[index + 4];
                if (charter || tempData[songId].charts[type]) {
                    tempData[songId].charts[type] = {
                        ...tempData[songId].charts[type],
                        charter: charter || ''
                    };
                }
            });
        }

        songData = tempData;
        console.log("Chart data loaded and merged successfully.");
    } catch (error) {
        console.error("Error loading chart data:", error);
        throw error;
    }
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

// API 事件处理器
export default defineEventHandler(async (event) => {
    try {
        await ensureChartDataLoaded();
        
        const query = getQuery(event);
        const songId = query.songId;
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 20;
        const searchTerm = (query.search as string || '').toLowerCase();
        
        // 处理单曲查询
        if (songId) {
            const song = songData[songId];
            if (!song) {
                throw createError({
                    statusCode: 404,
                    message: `Song with ID ${songId} not found`
                });
            }
            return song;
        }
        
        // 处理搜索
        let filteredSongs = Object.values(songData);
        if (searchTerm) {
            filteredSongs = filteredSongs.filter(song => 
                song.name?.toLowerCase().includes(searchTerm) ||
                song.composer?.toLowerCase().includes(searchTerm)
            );
        }
        
        // 处理分页
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedSongs = filteredSongs.slice(start, end);
        
        return {
            songs: paginatedSongs,
            pagination: {
                total: filteredSongs.length,
                page,
                limit,
                totalPages: Math.ceil(filteredSongs.length / limit)
            }
        };
        
    } catch (error) {
        console.error('Error in chart data handler:', error);
        throw createError({
            statusCode: 500,
            message: 'Failed to retrieve chart data',
            cause: error
        });
    }
});

interface ChartInfo {
    difficulty?: number;
    charter?: string;
}

interface SongData {
    id: string;
    name: string;
    composer: string;
    illustrator: string;
    charts: {
        EZ?: ChartInfo;
        HD?: ChartInfo;
        IN?: ChartInfo;
        AT?: ChartInfo;
    };
}