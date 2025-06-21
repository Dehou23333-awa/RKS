<template>
  <div class="page-container">
    <h1>查询歌曲信息</h1>

    <div class="input-group">
      <label for="sessionToken">Session Token:</label>
      <input type="text" id="sessionToken" v-model="sessionToken" placeholder="请输入Session Token" />
      <button @click="fetchSongData">查询</button>
    </div>

    <div v-if="loading" class="message">加载中...</div>
    <div v-else-if="error" class="message error-message">查询失败: {{ error }}</div>
    <div v-else-if="songData.length === 0 && queried" class="message">
      没有找到歌曲信息。
    </div>

    <div v-else-if="songData.length > 0" class="song-list">
      <SongCard
        v-for="song in formattedSongData"
        :key="song.songId"
        :song="song"
      />
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import SongCard from '~/components/SongCard.vue'; // 导入SongCard组件

export default {
  components: {
    SongCard, // 注册组件
  },
  data() {
    return {
      sessionToken: 'rasn7zjcdqeaem3xo0w0mw3f0',
      rawSongData: [], // 存储原始API数据
      loading: false,
      error: null,
      queried: false,
    };
  },
  computed: {
    // 格式化歌曲数据，以匹配 SongCard 组件的props
    formattedSongData() {
      return this.rawSongData.map((s, index) => ({
        rank: index + 1, // 假设按顺序排列
        score: s.score,
        acc: s.acc,
        level: s.level,
        fc: s.fc,
        songId: s.songId,
        difficulty: s.difficulty,
        rks: s.rks,
        // 从 songId 中提取歌曲名称，您可能需要更健壮的解析方法
        name: s.songId.replace(/([A-Z][a-z]+)/g, ' $1').trim().replace('.M2U', ''),
      }));
    },
  },
  methods: {
    async fetchSongData() {
      this.loading = true;
      this.error = null;
      this.rawSongData = [];
      this.queried = true;

      const apiUrl = `http://localhost:3000/api/b19?action=b27&sessionToken=${this.sessionToken}`;

      try {
        const response = await axios.get(apiUrl);
        if (response.data && Array.isArray(response.data)) {
          this.rawSongData = response.data;
        } else {
          this.error = 'API返回的数据格式不正确。';
        }
      } catch (e) {
        console.error('Error fetching song data:', e);
        this.error = e.message || '未知错误';
      } finally {
        this.loading = false;
      }
    },
  },
  // mounted() {
  //   this.fetchSongData();
  // }
};
</script>

<style scoped>
.page-container {
  padding: 20px;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center; /* 居中显示内容 */
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group label {
  font-weight: bold;
}

.input-group input[type="text"] {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1em;
  width: 250px;
}

.input-group button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.input-group button:hover {
  background-color: #0056b3;
}

.message {
  margin-top: 20px;
  font-size: 1.1em;
  color: #555;
}

.error-message {
  color: #d9534f; /* 更醒目的红色 */
  font-weight: bold;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 20px; /* 卡片之间的间距 */
  width: 100%;
  max-width: 400px; /* 限制列表的最大宽度与卡片一致 */
}
</style>