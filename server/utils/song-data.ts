interface ChartInfo {
    difficulty?: number;
    charter?: string;
}

export interface SongData {
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

let songData: Record<string, SongData> = {};
let isChartDataLoaded = false;
let loadingPromise: Promise<void> | null = null;

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

        const tempData: Record<string, any> = {};

        const diffLines = (difficultyContent as string).split('\n');
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

        const infoLines = (infoContent as string).split('\n');
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

export async function ensureSongDataLoaded(): Promise<Record<string, SongData>> {
    if (isChartDataLoaded) {
        return songData;
    }
    if (loadingPromise) {
        await loadingPromise;
        return songData;
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
    return songData;
}
