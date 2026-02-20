import { ensureSongDataLoaded } from '../utils/song-data'

// API 事件处理器
export default defineEventHandler(async (event) => {
    try {
        const songData = await ensureSongDataLoaded();
        
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
