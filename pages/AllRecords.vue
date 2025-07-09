<template>
  <div class="page-wrapper">
    <!-- 用户输入和控制区域 -->
    <div class="controls-wrapper">
      <button @click="goHome">
        返回首页
      </button>
      <button @click="queryAllRecords" :disabled="isQuerying">
        {{ isQuerying ? '正在查询...' : '查询全部记录' }}
      </button>
      <button @click="goToB27">
        生成B27成绩
      </button>
      <button @click="exportAsImage" :disabled="isExporting || !reportData">
        {{ isExporting ? (isMobileDevice ? '导出中(请耐心等待)...' : '正在导出...') : '导出为图片' }}
      </button>
      <button @click="createPublicLink" :disabled="!reportData">
        创建公开链接
      </button>
    </div>

    <!-- 公开链接弹窗 -->
    <div v-if="showLinkModal" class="modal-overlay" @click="closeLinkModal">
      <div class="modal-content" @click.stop>
        <h3>公开链接已生成</h3>
        <div class="link-container">
          <input ref="linkInput" :value="publicLink" readonly class="link-input" @click="selectLink" />
          <button @click="copyLink" class="copy-button">
            {{ linkCopied ? '已复制' : '复制链接' }}
          </button>
        </div>
        <p class="link-hint">分享此链接即可让他人查看您的全部记录</p>
        <button @click="closeLinkModal" class="close-button">关闭</button>
      </div>
    </div>

    <!-- 加载和错误状态显示 -->
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

    <!-- 全部记录容器 -->
    <div ref="reportContainerRef" class="report-container" :class="{ 'exporting': isExporting }">
      <B27Report v-if="reportData && !isLoadingImages" :mode="reportData.gameuser.mode" :gameuser="reportData.gameuser"
        :formattedDate="reportData.Date" :spInfo="reportData.spInfo" :stats="reportData.stats" :phi="reportData.phi"
        :b27_list="reportData.b27_list" :stdDeviation="reportData.stdDeviation" :_plugin="reportData._plugin"
        :Version="reportData.Version" />
      <div v-else-if="!isQuerying && !error && !reportData" class="status-placeholder">
        请点击"查询全部记录"。
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: '全部 成绩生成 | RKS',
  meta: [
    { name: 'description', content: '查看你的 Phigros 全部游玩记录，包括所有歌曲的成绩、评级和完成度统计。支持导出和分享。' },
    { name: 'keywords', content: 'Phigros,游玩记录,成绩统计,音游记录' },
    { property: 'og:title', content: 'Phigros 全部记录 | RKS' },
    { property: 'og:description', content: '查看你的 Phigros 全部游玩记录，包括所有歌曲的成绩、评级和完成度统计。' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
})
import { ref, onMounted } from 'vue';
import domtoimage from 'dom-to-image-more';
import B27Report from '~/components/B27.vue';
import Cookies from 'js-cookie';

// 导入共享的工具函数
import {
  getRandomBackground,
  getMoney,
  fetchData,
  getCachedRating,
  preloadImages,
  collectImageUrls
} from '~/utils/phigrosUtils';

// 状态管理
const reportContainerRef = ref(null);
const reportData = ref(null);
const isQuerying = ref(false);
const isExporting = ref(false);
const error = ref(null);
const isMobileDevice = ref(false);

// 图片加载相关状态
const isLoadingImages = ref(false);
const loadedImages = ref(0);
const totalImages = ref(0);
const imageLoadProgress = ref(0);

// 公开链接相关状态
const showLinkModal = ref(false);
const publicLink = ref('');
const linkCopied = ref(false);
const linkInput = ref(null);

const goHome = () => {
  navigateTo('/')
}

const goToB27 = () => {
  navigateTo(`/b27`)
}

const queryAllRecords = async () => {

  isQuerying.value = true;
  error.value = null;
  reportData.value = null;

  try {
    const apiData = await fetchData("Allreport");
    const playerName = apiData.playerName;
    const summaryData = apiData.summary;
    const money = apiData.money;
    const allRecords = apiData.record;
    const challengeValue = summaryData.challenge.toString();
    console.log(allRecords)

    const gameuser = {
      mode: "AllRecords",
      background: await getRandomBackground(),
      PlayerId: playerName,
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

    const sortedRecords = allRecords.sort((a, b) => b.rks - a.rks);

    const transformedRecords = sortedRecords.map((song, index) => ({
      song: song.songName,
      illustration: `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${song.songId}.png`,
      rank: song.level,
      difficulty: song.difficulty,
      rks: song.rks,
      Rating: getCachedRating(song.score, song.fc),
      score: song.score,
      acc: song.acc,
      num: index + 1,
    }));

    const phiSongs = [];
    const otherSongs = [];

    transformedRecords.forEach(song => {
      if (phiSongs.length < 3 && song.Rating === 'phi') {
        phiSongs.push(song);
      } else {
        otherSongs.push(song);
      }
    });

    while (phiSongs.length < 3) {
      phiSongs.push(null);
    }

    const finalData = {
      gameuser,
      Date: formattedDate,
      spInfo: `全部记录 (共 ${allRecords.length} 首)`,
      stats,
      phi: phiSongs,
      b27_list: otherSongs,
      _plugin: 'Generated by RKS',
    };

    reportData.value = finalData;

    const imageUrls = collectImageUrls(finalData);
    await preloadImages(imageUrls, isLoadingImages, loadedImages, totalImages, imageLoadProgress);

  } catch (err) {
    console.error('查询全部记录失败:', err);
    error.value = err.message;
  } finally {
    isQuerying.value = false;
  }
};

const exportAsImage = async () => {
  const node = reportContainerRef.value;
  if (!node || !reportData.value) {
    alert('没有可导出的全部记录内容！');
    return;
  }

  // 更精确的移动设备检测
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768 ||
    'ontouchstart' in window;

  isExporting.value = true;

  // 添加用户提示
  if (isMobile) {
    // 在移动端显示特殊提示
    const shouldContinue = confirm('移动设备导出可能需要较长时间，建议关闭其他应用释放内存。是否继续？');
    if (!shouldContinue) {
      isExporting.value = false;
      return;
    }
  }

  try {
    // 移动端和低内存设备使用更激进的优化
    let scale, quality, format;

    if (isMobile) {
      scale = 0.85;
      quality = 0.85;
      format = 'jpeg';
    } else {
      scale = 1.5;
      quality = 0.9;
      format = 'png';
    }

    const options = {
      width: node.scrollWidth * scale,
      height: node.scrollHeight * scale,
      quality: quality,
      style: {
        'transform': `scale(${scale})`,
        'transform-origin': 'top left'
      },
      cacheBust: false,
      filter: (node) => {
        if (node.tagName === 'SCRIPT') return false;
        if (node.tagName === 'STYLE') return false;
        if (node.classList && node.classList.contains('no-export')) return false;
        return true;
      }
    };

    // 添加超时机制
    const exportPromise = format === 'jpeg'
      ? domtoimage.toJpeg(node, options)
      : domtoimage.toPng(node, options);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('导出超时')), isMobile ? 30000 : 60000);
    });

    // 使用Promise.race来实现超时
    const dataUrl = await Promise.race([exportPromise, timeoutPromise]);

    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataUrl;
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    link.download = `Phigros-AllRecords-${reportData.value.gameuser.PlayerId}-${reportData.value.gameuser.rks.toFixed(4)}-${reportData.value.Date}.${extension}`;

    // 添加到DOM并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('导出图片时发生错误:', error);

    // 更详细的错误处理
    let errorMessage = '导出失败';
    if (error.message.includes('超时')) {
      errorMessage = '导出超时，请尝试关闭其他应用释放内存后重试';
    } else if (error.message.includes('memory') || error.message.includes('内存')) {
      errorMessage = '内存不足，请关闭其他应用后重试';
    } else if (isMobile) {
      errorMessage = '移动设备导出失败，建议在桌面设备上尝试';
    }


    alert(errorMessage);
  } finally {
    isExporting.value = false;
  }
};

const createPublicLink = () => {
  if (!reportData.value) {
    alert('请先查询全部记录！');
    return;
  }

  try {
    // 创建要分享的数据（精简版本，去除不必要的信息）
    const shareData = {
      timestamp: new Date().toISOString(),
      data: reportData.value
    };

    // 将数据压缩并编码
    const jsonStr = JSON.stringify(shareData);
    const compressed = btoa(unescape(encodeURIComponent(jsonStr)));

    // 生成公开链接
    const baseUrl = window.location.origin + window.location.pathname;
    publicLink.value = `${baseUrl}?share=${compressed}`;

    // 如果链接太长，可以考虑使用hash而不是query参数
    if (publicLink.value.length > 2000) {
      publicLink.value = `${baseUrl}#share=${compressed}`;
    }

    // 显示链接弹窗
    showLinkModal.value = true;
    linkCopied.value = false;

  } catch (error) {
    console.error('创建公开链接失败:', error);
    alert('创建公开链接失败，数据可能过大。');
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(publicLink.value);
    linkCopied.value = true;
    setTimeout(() => {
      linkCopied.value = false;
    }, 2000);
  } catch (error) {
    // 如果剪贴板API不可用，使用传统方法
    selectLink();
    document.execCommand('copy');
    linkCopied.value = true;
    setTimeout(() => {
      linkCopied.value = false;
    }, 2000);
  }
};

const selectLink = () => {
  if (linkInput.value) {
    linkInput.value.select();
  }
};

const closeLinkModal = () => {
  showLinkModal.value = false;
  publicLink.value = '';
};

// 处理从分享链接加载数据
const loadFromShareLink = async () => {
  // 检查URL参数
  const urlParams = new URLSearchParams(window.location.search);
  const shareData = urlParams.get('share');

  // 如果没有在query参数中找到，检查hash
  const hashData = window.location.hash.replace('#share=', '');
  const dataToLoad = shareData || (hashData !== window.location.hash ? hashData : null);

  if (dataToLoad) {
    isQuerying.value = true;
    try {
      // 解码数据
      const jsonStr = decodeURIComponent(escape(atob(dataToLoad)));
      const importedData = JSON.parse(jsonStr);

      if (importedData.data) {
        reportData.value = importedData.data;

        // 收集并预加载所有图片
        const imageUrls = collectImageUrls(importedData.data);
        await preloadImages(imageUrls, isLoadingImages, loadedImages, totalImages, imageLoadProgress);

        // 清除URL中的分享参数
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (error) {
      console.error('加载分享数据失败:', error);
      alert('加载分享的全部记录失败，链接可能已损坏。');
    } finally {
      isQuerying.value = false;
    }
  }
};

onMounted(async () => {
  isMobileDevice.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768 ||
    'ontouchstart' in window;

  // 首先检查是否有分享链接
  await loadFromShareLink();

  // 如果没有从分享链接加载数据，再检查其他参数
  if (!reportData.value) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('sessionToken');
    if (token) {
      queryAllRecords();
      return;
    }

    try {
      const taptapToken = Cookies.get('session_token');
      if (taptapToken) {
        queryAllRecords();
      }
    } catch (e) {
      // 忽略 Cookie 读取错误
    }
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
  position: relative;
  overflow: visible;
  min-height: 100%;
}

.page-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1.5rem;
  min-width: 1200px;
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

/* 公开链接弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
  color: #333;
  text-align: center;
}

.link-container {
  display: flex;
  gap: 10px;
  margin: 1.5rem 0;
}

.link-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  background-color: #f8f9fa;
}

.copy-button {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
  white-space: nowrap;
}

.copy-button:hover {
  background-color: #218838;
}

.link-hint {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin: 1rem 0;
}

.close-button {
  display: block;
  margin: 0 auto;
  padding: 10px 30px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.close-button:hover {
  background-color: #5a6268;
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

.export-hidden {
  display: none !important;
}

.exporting * {
  animation: none !important;
  transition: none !important;
}

@media (max-width: 768px) {
  .page-wrapper {
    padding: 1rem;
    overflow-x: auto;
  }

  .controls-wrapper {
    flex-direction: column;
    align-items: center;
    width: min(100vw - 2rem, 1200px);
  }

  .controls-wrapper input,
  .controls-wrapper button {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 1240px) {
  body {
    overflow-x: auto;
  }

  .page-wrapper::before {
    content: "💡 在移动设备上，您可以左右滑动查看完整内容";
    display: block;
    text-align: center;
    background-color: #e3f2fd;
    color: #2776d2;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    width: 100%;
    box-sizing: border-box;
  }
}

@media (min-width: 1240px) {
  .page-wrapper::before {
    display: none;
  }
}
</style>