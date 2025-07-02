<template>
  <div class="page-wrapper">
    <!-- 用户输入和控制区域 -->
    <div class="controls-wrapper">
      <input class="sessionToken" v-model="sessionToken" type="text" placeholder="在此输入 Session Token" />
      <button @click="generateReport" :disabled="isLoading">
        {{ isLoading ? '正在生成...' : '生成B27成绩' }}
      </button>
      <button @click="queryAllRecords" :disabled="isQuerying">
        {{ isQuerying ? '正在查询...' : '查询全部记录' }}
      </button>
      <button @click="exportAsImage" :disabled="isExporting || !reportData">
        {{ isExporting ? '正在导出...' : '导出为图片' }}
      </button>
      <button @click="exportRecord" :disabled="!reportData">
        导出记录
      </button>
      <input type="file" ref="fileInput" @change="handleFileImport" accept=".txt" style="display: none" />
      <button @click="triggerFileInput">
        导入记录
      </button>
    </div>

    <!-- 加载和错误状态显示 -->
    <div v-if="isLoading" class="status-placeholder">
      正在从服务器获取玩家数据，请稍候...
    </div>
    <div v-if="isQuerying" class="status-placeholder">
      正在查询全部记录，请稍候...
    </div>
    <div v-if="error" class="status-placeholder error">
      发生错误: {{ error }}
    </div>

    <!-- 图片加载进度条 -->
    <div v-if="isLoadingImages && reportData" class="progress-container">
      <div class="progress-text">正在加载图片资源...</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${imageLoadProgress}%` }"></div>
      </div>
      <div class="progress-info">{{ loadedImages }}/{{ totalImages }} 已加载</div>
    </div>

    <!-- B27成绩容器，现在由 reportData 和图片加载状态驱动 -->
    <div ref="reportContainerRef" class="report-container">
      <!-- 只有在 reportData 存在且所有图片加载完成时才渲染 B19Report -->
      <B19Report v-if="reportData && !isLoadingImages" :gameuser="reportData.gameuser" :formattedDate="reportData.Date"
        :spInfo="reportData.spInfo" :stats="reportData.stats" :phi="reportData.phi" :b19_list="reportData.b19_list"
        :_plugin="reportData._plugin" :Version="reportData.Version" />
      <!-- 初始状态的占位符 -->
      <div v-else-if="!isLoading && !error && !isQuerying && !reportData" class="status-placeholder">
        请输入 Session Token 并点击"生成B27成绩"或"查询全部记录"。
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
const isQuerying = ref(false);
const error = ref(null);
const fileInput = ref(null);

// 图片加载相关状态
const isLoadingImages = ref(false);
const loadedImages = ref(0);
const totalImages = ref(0);
const imageLoadProgress = ref(0);

const triggerFileInput = () => {
  fileInput.value.click();
};

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

const getRandomBackground = async () => {
  try {
    const response = await fetch('/api/songs');
    const data = await response.json();
    const songs = data.songs;

    const randomSong = songs[Math.floor(Math.random() * songs.length)];

    return `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationBlur/${randomSong.id}.png`;
  } catch (error) {
    console.error('Failed to get random background:', error);
    return null;
  }
};

const getSuggest = (acc, rks, difficulty, pRks) => {
  // 目标rks
  const targetRks = parseFloat(rks.toFixed(2)) + 0.01 - 0.005;
  // 当前单曲rks
  const currentRks = Math.pow((acc - 55) / 45, 2) * difficulty;

  // 目标单曲rks
  const targetSongRks = targetRks * 30 - (rks * 30 - currentRks);
  const targetAcc = (Math.sqrt(targetSongRks / difficulty) * 45 + 55);
  // 判断
  if (targetAcc > 100) {
    if (currentRks != difficulty) {
      //原来的p3 rks
      let p3_rks = 0;
      for (let i = 0; i < pRks.length; i++) p3_rks += pRks[i];
      //模拟AP
      const simulatedRks = [...pRks, difficulty];
      simulatedRks.sort((a, b) => a - b);
      simulatedRks.shift();
      //现在的p3 rks
      let new_rks = rks * 30 - p3_rks;
      for (let i = 0; i < pRks.length; i++) new_rks += simulatedRks[i];
      new_rks /= 30;
      if (new_rks.toFixed(4) > rks.toFixed(4))//涨了！
      {
        return "100.00%"
      }
    }
    return '无法推分';
  }
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

// 性能优化：缓存计算结果
const ratingCache = new Map();
const getCachedRating = (score, fc) => {
  const key = `${score}_${fc}`;
  if (!ratingCache.has(key)) {
    ratingCache.set(key, getRatingFromScore(score, fc));
  }
  return ratingCache.get(key);
};

// 图片预加载函数
const preloadImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) {
    return Promise.resolve();
  }

  isLoadingImages.value = true;
  loadedImages.value = 0;
  totalImages.value = imageUrls.filter(url => url).length;
  imageLoadProgress.value = 0;

  const promises = imageUrls
    .filter(url => url)
    .map((url, index) => {
      return new Promise((resolve, reject) => {
        const img = new Image();

        const onLoad = () => {
          loadedImages.value++;
          imageLoadProgress.value = Math.round((loadedImages.value / totalImages.value) * 100);
          resolve(url);
        };

        const onError = () => {
          console.warn(`Failed to load image: ${url}`);
          loadedImages.value++;
          imageLoadProgress.value = Math.round((loadedImages.value / totalImages.value) * 100);
          resolve(url);
        };

        img.onload = onLoad;
        img.onerror = onError;

        img.crossOrigin = 'anonymous';
        img.src = url;

        // 如果图片已经缓存，可能不会触发onload事件
        if (img.complete) {
          onLoad();
        }
      });
    });

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Some images failed to load:', error);
  } finally {
    // 延迟一点点时间让进度条动画完成
    setTimeout(() => {
      isLoadingImages.value = false;
    }, 200);
  }
};

// 收集所有需要预加载的图片URL
const collectImageUrls = (data) => {
  const urls = [];

  // 背景图片
  if (data.gameuser?.background) {
    urls.push(data.gameuser.background);
  }

  // 头像
  if (data.gameuser?.avatar) {
    urls.push(data.gameuser.avatar);
  }

  // Phi歌曲曲绘
  if (data.phi) {
    data.phi.forEach(song => {
      if (song?.illustration) {
        urls.push(song.illustration);
      }
    });
  }

  // B19歌曲曲绘
  if (data.b19_list) {
    data.b19_list.forEach(song => {
      if (song?.illustration) {
        urls.push(song.illustration);
      }
    });
  }

  return urls;
};

// 新增：查询全部记录并转换为B27格式
const queryAllRecords = async () => {
  if (!sessionToken.value) {
    alert('请输入 Session Token！');
    return;
  }

  isQuerying.value = true;
  error.value = null;
  reportData.value = null;

  try {
    // 并行获取基础数据和全部记录
    const [playerData, summaryData, allRecords, money] = await Promise.all([
      fetchData('playerID', sessionToken.value),
      fetchData('summary', sessionToken.value),
      fetchData('record', sessionToken.value),
      fetchData('getUserMoney', sessionToken.value)
    ]);

    const challengeValue = summaryData.challenge.toString();

    // --- 基础数据转换 ---
    const gameuser = {
      background: await getRandomBackground(),
      PlayerId: playerData.playerID,
      avatar: summaryData.avatar,
      rks: summaryData.rks,
      ChallengeMode: challengeValue.slice(0, 1),
      ChallengeModeRank: challengeValue.slice(1, 3),
      data: getMoney(money),
    };

    const formattedDate = new Date(summaryData.updatedAt).toLocaleString('sv-SE');
    const stats = [
      { title: 'EZ', cleared: summaryData.EZ[0], fc: summaryData.EZ[1], phi: summaryData.EZ[2] },
      { title: 'HD', cleared: summaryData.HD[0], fc: summaryData.HD[1], phi: summaryData.HD[2] },
      { title: 'IN', cleared: summaryData.IN[0], fc: summaryData.IN[1], phi: summaryData.IN[2] },
      { title: 'AT', cleared: summaryData.AT[0], fc: summaryData.AT[1], phi: summaryData.AT[2] },
    ];

    // --- 性能优化：批量处理记录数据 ---
    // 预排序，避免重复排序
    const sortedRecords = allRecords.sort((a, b) => b.rks - a.rks);

    // 批量转换记录数据
    const transformedRecords = sortedRecords.map((song, index) => ({
      song: song.songName,
      illustration: `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${song.songId}.png`,
      rank: song.level,
      difficulty: song.difficulty,
      rks: song.rks,
      Rating: getCachedRating(song.score, song.fc), // 使用缓存
      score: song.score,
      acc: song.acc,
      num: index + 1, // 全部记录都编号
      // suggest: 'Not Calculated',
    }));

    // 分离 Phi 和其他记录
    const phiSongs = [];
    const otherSongs = [];

    transformedRecords.forEach(song => {
      if (phiSongs.length < 3 && song.Rating === 'phi') {
        phiSongs.push(song);
      } else {
        otherSongs.push(song);
      }
    });

    // 确保 phi 列表有3个元素
    while (phiSongs.length < 3) {
      phiSongs.push(null);
    }

    // 组装最终数据 - 使用全部记录而不是只有B19
    const finalData = {
      gameuser,
      Date: formattedDate,
      spInfo: `全部记录 (共 ${allRecords.length} 首)`,
      stats,
      phi: phiSongs,
      b19_list: otherSongs, // 这里包含全部其他记录
      _plugin: 'Generated by RKS',
      Version: { ver: '0.0.0' },
    };

    // 先设置数据，然后预加载图片
    reportData.value = finalData;

    // 收集并预加载所有图片
    const imageUrls = collectImageUrls(finalData);
    await preloadImages(imageUrls);

  } catch (err) {
    console.error('查询全部记录失败:', err);
    error.value = err.message;
  } finally {
    isQuerying.value = false;
  }
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
      background: await getRandomBackground(),
      PlayerId: playerData.playerID,
      avatar: summaryData.avatar,
      rks: summaryData.rks,
      ChallengeMode: challengeValue.slice(0, 1),
      ChallengeModeRank: challengeValue.slice(1, 3),
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
    let p3Rks = [];

    b27Data.forEach((song, index) => {
      const transformedSong = {
        song: song.songName,
        illustration: `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${song.songId}.png`,
        rank: song.level,
        difficulty: song.difficulty,
        rks: song.rks,
        Rating: getCachedRating(song.score, song.fc), // 使用缓存
        score: song.score,
        acc: song.acc,
        suggest: getSuggest(song.acc, summaryData.rks, song.difficulty, p3Rks),
      };

      // 判定是 Phi 还是 B19
      if (index < 3 && transformedSong.Rating === 'phi') {
        phiSongs.push(transformedSong);
        p3Rks.push(transformedSong.rks);
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
    const finalData = {
      gameuser,
      Date: formattedDate,
      spInfo: '',
      stats,
      phi: phiSongs,
      b19_list: b19Songs,
      _plugin: 'Generated by RKS',
      Version: { ver: '0.0.0' },
    };

    // 先设置数据，然后预加载图片
    reportData.value = finalData;
    console.log(reportData.value.gameuser.background);

    // 收集并预加载所有图片
    const imageUrls = collectImageUrls(finalData);
    await preloadImages(imageUrls);

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

const exportRecord = () => {
  if (!reportData.value) {
    alert('没有可导出的记录！');
    return;
  }

  try {
    const exportData = {
      timestamp: new Date().toISOString(),
      data: {
        playerData: reportData.value,
      }
    };

    // 转换为JSON字符串并Base64编码
    const jsonStr = JSON.stringify(exportData);
    const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));

    // 创建并下载文件
    const blob = new Blob([base64Data], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Phigros-B27-Record-${reportData.value.gameuser.PlayerId}-${reportData.value.gameuser.rks.toFixed(4)}-${reportData.value.Date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('导出记录时发生错误:', error);
    alert('导出记录失败，请查看控制台获取更多信息。');
  }
};

const handleFileImport = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isLoading.value = true;
  error.value = null;

  try {
    const text = await file.text();
    // 解码Base64数据
    const jsonStr = decodeURIComponent(escape(atob(text)));
    const importedData = JSON.parse(jsonStr);

    // 验证导入的数据格式
    if (!importedData.data || !importedData.data.playerData) {
      throw new Error('无效的记录文件格式');
    }

    // 更新数据并预加载图片
    sessionToken.value = '';
    reportData.value = importedData.data.playerData;

    // 收集并预加载所有图片
    const imageUrls = collectImageUrls(importedData.data.playerData);
    await preloadImages(imageUrls);

    // 显示导入成功消息
    alert(`成功导入记录！\n记录时间: ${new Date(importedData.timestamp).toLocaleString()}`);

  } catch (error) {
    console.error('导入记录时发生错误:', error);
    alert('导入记录失败，请确保文件格式正确。');
    reportData.value = null;
  } finally {
    event.target.value = '';
    isLoading.value = false;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
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

.sessionToken {
  display: none;
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

/* 进度条样式 */
.progress-container {
  width: 1200px;
  padding: 2rem;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.progress-text {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 10px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background-image: linear-gradient(-45deg,
      rgba(255, 255, 255, 0.2) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.2) 75%,
      transparent 75%,
      transparent);
  background-size: 20px 20px;
  animation: move 1s linear infinite;
}

@keyframes move {
  0% {
    background-position: 0 0;
  }

  100% {
    background-position: 20px 20px;
  }
}

.progress-info {
  font-size: 1rem;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {

  .progress-container,
  .report-container,
  .status-placeholder {
    width: 100%;
    max-width: 100vw;
  }

  .controls-wrapper {
    flex-direction: column;
    align-items: center;
  }

  .controls-wrapper input,
  .controls-wrapper button {
    width: 100%;
    max-width: 300px;
  }
}
</style>