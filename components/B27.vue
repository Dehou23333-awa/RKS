<template>
  <div>
    <div class="background">
        <img
            :src="gameuser.background"
            alt="曲绘-模糊"
            id="bkg"
        />
    </div>
    <div class="title">
        <div class="playerInfo">
            <div class="blackBlock"></div>
            <div class="avatar">
                <img :src="`/b27/avatar/${gameuser.avatar}.png`" :alt="gameuser.avatar">
            </div>
            <div class="playerId">
                <p name="pvis">{{ gameuser.PlayerId }}</p>
            </div>
            <div class="rks">
                <p>{{ gameuser.rks.toFixed(4) }}</p>
            </div>
            <div class="clgBox">
                <div class="Challenge">
                <img :src="`/b27/otherimg/${gameuser.ChallengeMode}.png`" alt="Challenge">
                <p>{{ gameuser.ChallengeModeRank }}</p>
                </div>
            </div>
            <div class="date">
                <p>{{ formattedDate }}</p>
            </div>
            <div class="dataBox">
                <img src="/b27/otherimg/data.png" alt="data">
                <p>{{ gameuser.data }}</p>
            </div>
            <div v-if="spInfo" class="spInfo colorful-background">
                <p>{{ spInfo }}</p>
            </div>
        </div>
        <div class="recordInfo">
            <div class="whiteLine"></div>
            <div class="sheet">
                <div class="row">
                    <div class="poz">
                        <p>\</p>
                    </div>
                    <div v-for="(v, i) in stats" :key="`title-${i}`" class="poz">
                        <p>{{ v.title }}</p>
                    </div>
                </div>
                <div class="row">
                    <div class="poz">
                        <p>C</p>
                    </div>
                    <div v-for="(v, i) in stats" :key="`cleared-${i}`" class="poz">
                        <p>{{ v.cleared }}</p>
                    </div>
                </div>
                <div class="row">
                    <div class="poz">
                        <p>FC</p>
                    </div>
                    <div v-for="(v, i) in stats" :key="`fc-${i}`" class="poz">
                        <p>{{ v.fc }}</p>
                    </div>
                </div>
                <div class="row">
                    <div class="poz">
                        <p>Phi</p>
                    </div>
                    <div v-for="(v, i) in stats" :key="`phi-${i}`" class="poz">
                        <p>{{ v.phi }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="b19">
        <!-- Phi Songs Loop -->
        <template v-for="(song, index) in phi" :key="`phi-song-${index}`">
            <div v-if="song" class="song phi_song">
                <div class="ill-box">
                    <div class="num">
                        <p name="pvis">P{{ index + 1 }}</p>
                    </div>
                    <div class="ill">
                        <img :src="song.illustration" alt="ill">
                    </div>
                    <div :class="`rank-${song.rank}`">
                        <div class="org">
                            <p>{{ song.rank }} {{ song.difficulty.toFixed(1) }}</p>
                        </div>
                        <div class="rel">
                            <p>{{ song.rks.toFixed(2) }}</p>
                        </div>
                    </div>
                </div>
                <div :class="`info-${song.rank}`">
                    <div class="songname">
                        <p name="pvis">{{ song.song }}</p>
                    </div>
                    <div class="songinfo">
                        <div class="Rating">
                            <img :src="`/b27/otherimg/${song.Rating}.png`" :alt="song.Rating">
                        </div>
                        <div class="chengji">
                            <div class="score">
                                <p>{{ song.score }}</p>
                            </div>
                            <div class="line"></div>
                            <div class="acc-box">
                                <div class="acc">
                                    <p>{{ song.acc.toFixed(2) }}%</p>
                                </div>
                                <div class="suggest" v-if="song.suggest">
                                    <p>>> {{ song.suggest }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="Nosignal">
                <div class="border_corner border_corner_left_top"></div>
                <div class="border_corner border_corner_right_top"></div>
                <div class="border_corner border_corner_left_bottom"></div>
                <div class="border_corner border_corner_right_bottom"></div>
                <div class="line"></div>
                <div class="timeout">
                    <p>TIME_OUT</p>
                </div>
                <div class="client">
                    <p>>>> PhigrOS Client Finding Phi.score</p>
                </div>
                <div class="sqrt"></div>
            </div>
        </template>

        <!-- B19 List Loop -->
        <template v-for="(song, index) in b19_list" :key="`b19-song-${index}`">
            <div v-if="index === 27" class="over_flow">
                <div class="flow_line_box_l">
                    <div class="flow_line" v-for="n in 6" :key="n"></div>
                </div>
                <p><i>OVER FLOW</i></p>
                <div class="flow_line_box_r">
                    <div class="flow_line" v-for="n in 6" :key="n"></div>
                </div>
            </div>

            <div class="song" :class="{ 'b_song': index < 27 }">
                <div class="ill-box">
                    <div class="num">
                        <p name="pvis">#{{ song.num }}</p>
                    </div>
                    <div class="ill">
                        <img :src="song.illustration" alt="ill">
                    </div>
                    <div :class="`rank-${song.rank}`">
                        <div class="org">
                            <p>{{ song.rank }} {{ song.difficulty.toFixed(1) }}</p>
                        </div>
                        <div class="rel">
                            <p>{{ song.rks.toFixed(2) }}</p>
                        </div>
                    </div>
                </div>
                <div :class="`info-${song.rank}`">
                    <div class="songname">
                        <p name="pvis">{{ song.song }}</p>
                    </div>
                    <div class="songinfo">
                        <div class="Rating">
                            <img :src="`/b27/otherimg/${song.Rating}.png`" :alt="song.Rating">
                        </div>
                        <div class="chengji">
                            <div class="score">
                                <p>{{ song.score }}</p>
                            </div>
                            <div class="line"></div>
                            <div class="acc-box">
                                <div class="acc">
                                    <p>{{ song.acc.toFixed(2) }}%</p>
                                </div>
                                <div class="suggest" v-if="song.suggest">
                                    <p>>> {{ song.suggest }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
    <div class="createdbox">
        <div class="phi-plugin">
            <p>{{ _plugin }}</p>
        </div>
        <div class="ver">
            <p>{{ Version.ver }}</p>
        </div>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  gameuser: {
    type: Object,
    required: true,
  },
  formattedDate: { // Renamed from 'Date' to avoid conflict with JS Date object
    type: String,
    required: true
  },
  spInfo: {
    type: String,
    default: ''
  },
  stats: {
    type: Array,
    required: true
  },
  phi: {
    type: Array,
    required: true
  },
  b19_list: {
    type: Array,
    required: true
  },
  _plugin: {
    type: String,
    default: 'Phigros Plugin'
  },
  Version: {
    type: Object,
    default: () => ({ ver: 'v1.0.0' })
  }
});
// Import the CSS for this component
import '~/assets/b27/b27.css';

function adjustFontSize() {
    const elements = document.getElementsByName("pvis");
    for (let i = 0; i < elements.length; ++i) {
        const pElement = elements[i];
        const parentElement = pElement.parentElement;

        if (!parentElement || parentElement.offsetWidth === 0) {
            continue;
        }

        let maxFontSize = 25; // 降低最大字体大小
        let minFontSize = 1;  // 设置最小字体大小
        let fontSize = maxFontSize;
        
        // 二分查找合适的字体大小
        while (maxFontSize - minFontSize > 1) {
            fontSize = Math.floor((maxFontSize + minFontSize) / 2);
            pElement.style.fontSize = fontSize + "px";
            
            if (pElement.scrollWidth > parentElement.offsetWidth ||
                pElement.scrollHeight > parentElement.offsetHeight) {
                maxFontSize = fontSize;
            } else {
                minFontSize = fontSize;
            }
        }
        
        pElement.style.fontSize = minFontSize + "px";
    }
}

onMounted(() => {
  adjustFontSize();
  window.addEventListener('resize', adjustFontSize);
});

onUpdated(() => {
  adjustFontSize();
});

onUnmounted(() => {
  window.removeEventListener('resize', adjustFontSize);
});
</script>