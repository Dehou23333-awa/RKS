// 性能优化：缓存计算结果
const ratingCache = new Map();

export const getRatingFromScore = (score, fc) => {
  if (score === 1000000) return 'phi';
  if (fc) return 'FC';
  if (score > 960000) return 'V';
  if (score > 920000) return 'S';
  if (score > 880000) return 'A';
  if (score > 820000) return 'B';
  if (score > 700000) return 'C';
  return 'F';
};

export const getCachedRating = (score, fc) => {
  const key = `${score}_${fc}`;
  if (!ratingCache.has(key)) {
    ratingCache.set(key, getRatingFromScore(score, fc));
  }
  return ratingCache.get(key);
};

export const getRandomBackground = async () => {
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

export const getSuggest = (acc, rks, difficulty, pRks) => {
  const targetRks = parseFloat(rks.toFixed(2)) + 0.01 - 0.005;
  const currentRks = Math.pow((acc - 55) / 45, 2) * difficulty;
  const targetSongRks = targetRks * 30 - (rks * 30 - currentRks);
  const targetAcc = (Math.sqrt(targetSongRks / difficulty) * 45 + 55);
  
  if (targetAcc > 100) {
    if (currentRks != difficulty) {
      let p3_rks = 0;
      for (let i = 0; i < pRks.length; i++) p3_rks += pRks[i];
      const simulatedRks = [...pRks, difficulty];
      simulatedRks.sort((a, b) => a - b);
      simulatedRks.shift();
      let new_rks = rks * 30 - p3_rks;
      for (let i = 0; i < pRks.length; i++) new_rks += simulatedRks[i];
      new_rks /= 30;
      if (new_rks.toFixed(4) > rks.toFixed(4)) {
        return "100.00%"
      }
    }
    return '无法推分';
  } else {
    return `${targetAcc.toFixed(2)}%`;
  }
};

export const calculatestdDeviation = (phiSongs, b27Songs) => {
  const allRks = [];
  phiSongs.forEach(song => {
    if (song) allRks.push(song.rks);
  });
  b27Songs.slice(0, 27).forEach(song => {
    allRks.push(song.rks);
  });
  const mean = allRks.reduce((sum, rks) => sum + rks, 0) / allRks.length;
  const stdDeviation = allRks.reduce((sum, rks) => sum + Math.pow(rks - mean, 2), 0) / allRks.length;
  return Math.sqrt(stdDeviation);
};

export const getMoney = (money) => {
  let data = "";
  if (money.money["4"]) data += `${money.money["4"]} PB`;
  if (money.money["3"]) data += ` ${money.money["3"]} TB`;
  if (money.money["2"]) data += ` ${money.money["2"]} GB`;
  if (money.money["1"]) data += ` ${money.money["1"]} MB`;
  if (money.money["0"]) data += ` ${money.money["0"]} KB`;
  return data;
};

export const fetchData = async (op) => {
  const response = await fetch(`/api/query?action=${op}`);
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`API action '${action}' failed: ${errData.body || response.statusText}`);
  }
  return response.json();
};

export const preloadImages = async (imageUrls, isLoadingImages, loadedImages, totalImages, imageLoadProgress) => {
  if (!imageUrls || imageUrls.length === 0) {
    return Promise.resolve();
  }

  isLoadingImages.value = true;
  loadedImages.value = 0;
  totalImages.value = imageUrls.filter(url => url).length;
  imageLoadProgress.value = 0;

  const promises = imageUrls
    .filter(url => url)
    .map((url) => {
      return new Promise((resolve) => {
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
    setTimeout(() => {
      isLoadingImages.value = false;
    }, 200);
  }
};

export const collectImageUrls = (data) => {
  const urls = [];
  if (data.gameuser?.background) {
    urls.push(data.gameuser.background);
  }
  if (data.gameuser?.avatar) {
    urls.push(data.gameuser.avatar);
  }
  if (data.phi) {
    data.phi.forEach(song => {
      if (song?.illustration) {
        urls.push(song.illustration);
      }
    });
  }
  if (data.b27_list) {
    data.b27_list.forEach(song => {
      if (song?.illustration) {
        urls.push(song.illustration);
      }
    });
  }
  return urls;
};