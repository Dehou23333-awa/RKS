<template>
  <div class="page-wrapper">
    <!-- 用户输入和控制区域 -->
    <div class="controls-wrapper">
      <input 
        v-model="sessionToken" 
        type="text" 
        placeholder="在此输入 Session Token"
      />
      <button @click="generateReport" :disabled="isLoading">
        {{ isLoading ? '正在生成...' : '生成B27成绩' }}
      </button>
      <button @click="exportAsImage" :disabled="isExporting || !reportData">
        {{ isExporting ? '正在导出...' : '导出为图片' }}
      </button>
    </div>

    <!-- 加载和错误状态显示 -->
    <div v-if="isLoading" class="status-placeholder">
      正在从服务器获取玩家数据，请稍候...
    </div>
    <div v-if="error" class="status-placeholder error">
      发生错误: {{ error }}
    </div>

    <!-- B27成绩容器，现在由 reportData 驱动 -->
    <div ref="reportContainerRef" class="report-container">
      <!-- 只有在 reportData 存在时才渲染 B19Report -->
      <B19Report 
        v-if="reportData"
        :gameuser="reportData.gameuser"
        :formattedDate="reportData.Date"
        :spInfo="reportData.spInfo"
        :stats="reportData.stats"
        :phi="reportData.phi"
        :b19_list="reportData.b19_list"
        :_plugin="reportData._plugin"
        :Version="reportData.Version"
      />
      <!-- 初始状态的占位符 -->
      <div v-else-if="!isLoading && !error" class="status-placeholder">
        请输入 Session Token 并点击“生成B27成绩”。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import domtoimage from 'dom-to-image-more';
import B19Report from '~/components/B27.vue';
import Cookies from 'js-cookie';

// --- 状态管理 Refs ---
const reportContainerRef = ref(null);
const sessionToken = ref('');
const reportData = ref(null);
const isLoading = ref(false);
const isExporting = ref(false);
const error = ref(null);

// --- 辅助函数 ---
const getRatingFromScore = (score, fc) => {
  if (score === 1000000) return 'phi';
  if (fc) return 'FC';
  if (score > 960000) return 'V';
  if (score > 920000) return 'S';
  if (score > 880000) return 'A';
  if (score > 820000) return 'B';
  if (score > 700000) return 'C';
  return 'F';
};
const getSuggest = (acc, rks, difficulty) => {
  // 目标rks
  const targetRks = parseFloat(rks.toFixed(2)) + 0.01 - 0.005;
  // 当前单曲rks
  const currentRks = Math.pow((acc - 55) / 45, 2) * difficulty
  // 目标单曲rks
  const targetSongRks = targetRks * 30 - (rks * 30 - currentRks);
  const targetAcc = (Math.sqrt(targetSongRks / difficulty) * 45 + 55);
  // 判断
  if (targetAcc > 100) return '无法推分';
  else return `${targetAcc.toFixed(2)}%`;
};
const getMoney = (money) => {
  let data = "";
  if (money.money["4"]) data += `${money.money["4"]} PB`;
  if (money.money["3"]) data += ` ${money.money["3"]} TB`;
  if (money.money["2"]) data += ` ${money.money["2"]} GB`;
  if (money.money["1"]) data += ` ${money.money["1"]} MB`;
  if (money.money["0"]) data += ` ${money.money["0"]} KB`;
  return data;
};
const fetchData = async (action, token) => {
  const response = await fetch(`/api/query?action=${action}&sessionToken=${token}`);
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`API action '${action}' failed: ${errData.body || response.statusText}`);
  }
  return response.json();
};

const generateReport = async () => {
  if (!sessionToken.value) {
    alert('请输入 Session Token！');
    return;
  }

  isLoading.value = true;
  error.value = null;
  reportData.value = null;

  try {
    const [playerData, summaryData, b27Data, money] = await Promise.all([
      fetchData('playerID', sessionToken.value),
      fetchData('summary', sessionToken.value),
      fetchData('b27', sessionToken.value),
      fetchData('getUserMoney', sessionToken.value)
    ]);

    const challengeValue = summaryData.challenge.toString();
    
    // --- 数据转换 ---
    const gameuser = {
      PlayerId: playerData.playerID,
      avatar: summaryData.avatar,
      rks: summaryData.rks,
      ChallengeMode: challengeValue.slice(0,1), 
      ChallengeModeRank: challengeValue.slice(1,3),
      data: getMoney(money),
    };
    const formattedDate = new Date(summaryData.updatedAt).toLocaleString('sv-SE');
    const stats = [
      { title: 'EZ', cleared: summaryData.EZ[0], fc: summaryData.EZ[1], phi: summaryData.EZ[2] },
      { title: 'HD', cleared: summaryData.HD[0], fc: summaryData.HD[1], phi: summaryData.HD[2] },
      { title: 'IN', cleared: summaryData.IN[0], fc: summaryData.IN[1], phi: summaryData.IN[2] },
      { title: 'AT', cleared: summaryData.AT[0], fc: summaryData.AT[1], phi: summaryData.AT[2] },
    ];
    
    const phiSongs = [];
    const b19Songs = [];
    let b19Counter = 0;

    b27Data.forEach((song, index) => {
      const transformedSong = {
        song: song.songName,
        illustration: `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${song.songId}.png`,
        rank: song.level,
        difficulty: song.difficulty,
        rks: song.rks,
        Rating: getRatingFromScore(song.score, song.fc),
        score: song.score,
        acc: song.acc,
        suggest: getSuggest(song.acc, summaryData.rks, song.difficulty),
      };

      // 判定是 Phi 还是 B19
      if (index < 3 && transformedSong.Rating === 'phi') {
          phiSongs.push(transformedSong);
      } else {
          b19Counter++;
          transformedSong.num = b19Counter;
          b19Songs.push(transformedSong);
      }
    });

    // 确保 phi 列表有3个元素
    while (phiSongs.length < 3) {
      phiSongs.push(null);
    }

    // 组装最终B27成绩数据
    reportData.value = {
      gameuser,
      Date: formattedDate,
      spInfo: '',
      stats,
      phi: phiSongs,
      b19_list: b19Songs,
      _plugin: 'Generated by Phigros-Bot-Nuxt',
      Version: { ver: '3.0.0-API' },
    };

  } catch (err) {
    console.error('生成B27成绩失败:', err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};
const exportAsImage = async () => {
  const node = reportContainerRef.value;
  if (!node || !reportData.value) {
    alert('没有可导出的B27成绩内容！');
    return;
  }
  
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  isExporting.value = true;
  try {
    // 移动端使用较低的缩放比例和质量
    const scale = isMobile ? 1 : 2;
    const quality = isMobile ? 0.75 : 1.0;
    
    const options = {
      width: node.scrollWidth * scale,
      height: node.scrollHeight * scale,
      quality: quality,
      style: {
        'transform': `scale(${scale})`,
        'transform-origin': 'top left'
      }
    };
    const dataUrl = await domtoimage.toPng(node, options);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Phigros-B27-${reportData.value.gameuser.PlayerId}-${reportData.value.gameuser.rks.toFixed(4)}-${reportData.value.Date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('导出图片时发生错误:', error);
    alert('导出失败，请查看控制台获取更多信息。');
  } finally {
    isExporting.value = false;
  }
};
onMounted(() => {
  // 优先从 URL 查询参数读取
  const params = new URLSearchParams(window.location.search);
  const token = params.get('sessionToken');
  if (token) {
    sessionToken.value = token;
    generateReport();
    return;
  }
  // 尝试从 Cookie 读取 session_token
  try {
    const taptapToken = Cookies.get('session_token');
    if (taptapToken) {
      sessionToken.value = taptapToken;
      generateReport();
    }
  } catch (e) {
    // 忽略 Cookie 读取错误
  }
});
</script>

<style>
body {
  margin: 0;
  background-color: #f0f2f5;
}

.report-container {
  width: 1200px; 
}

.page-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1.5rem;
}

.controls-wrapper {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.controls-wrapper input {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 300px;
}

.controls-wrapper button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s;
  white-space: nowrap;
}

.controls-wrapper button:hover {
  background-color: #0056b3;
}

.controls-wrapper button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.status-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 500px;
  font-size: 1.5rem;
  color: #555;
  background-color: #f9f9f9;
  border: 2px dashed #ccc;
  width: 1200px;
  border-radius: 10px;
}

.status-placeholder.error {
  color: #d9534f;
  background-color: #f2dede;
  border-color: #d9534f;
}
</style>