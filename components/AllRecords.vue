<template>
    <div>
        <div class="background">
            <img :src="getProxiedUrl(`https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationBlur/${gameuser.background.id}.png`)" alt="曲绘-模糊" />
        </div>
        <div class="title">
            <div class="playerInfo">
                <div class="blackBlock"></div>
                <div class="avatar">
                    <img :src="getProxiedUrl(`https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/avatar/${gameuser.avatar}.png`)">
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
                <div class="backgroundName">
                    <p name="pvis">BackGround: {{ gameuser.background.name }}</p>
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
            <!-- 只有在传入了stdDeviation且不为null/undefined时才显示 -->
            <div class="stdDeviationInfo" v-if="stdDeviation !== null && stdDeviation !== undefined">
                <div class="stdDeviationTitle">
                    <p>stdDeviation</p>
                </div>
                <div class="stdDeviationValue">
                    <p>{{ stdDeviation.toFixed(4) }}</p>
                </div>
            </div>
        </div>
        <div class="b27">
            <!-- B27 List Loop -->
            <template v-for="(song, index) in b27_list" :key="`b27-song-${index}`">
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
                                <p>{{ song.rank }} {{ song.difficulty.toFixed(1) }}</p>
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
        <div class="accStatsBar" v-if='mode === "b27"'>
            <div class="avgAccSection">
                <div class="avgAccTitle">
                    <p>Average ACC</p>
                </div>
                <div class="avgAccValue">
                    <p>{{ averageAcc.toFixed(2) }}%</p>
                </div>
            </div>
            <div class="accDistribution">
                <div class="accDistItem perfect">
                    <div class="accDistLabel">>99.5%</div>
                    <div class="accDistCount">{{ accDistribution.a }}</div>
                </div>
                <div class="accDistItem">
                    <div class="accDistLabel">99.0-99.5%</div>
                    <div class="accDistCount">{{ accDistribution.b }}</div>
                </div>
                <div class="accDistItem">
                    <div class="accDistLabel">98-99%</div>
                    <div class="accDistCount">{{ accDistribution.c }}</div>
                </div>
                <div class="accDistItem">
                    <div class="accDistLabel">97-98%</div>
                    <div class="accDistCount">{{ accDistribution.d }}</div>
                </div>
                <div class="accDistItem">
                    <div class="accDistLabel">&lt;97%</div>
                    <div class="accDistCount">{{ accDistribution.e }}</div>
                </div>
            </div>
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
    mode: {
        type: String,
        required: true
    },
    gameuser: {
        type: Object,
        required: true,
    },
    formattedDate: {
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
    b27_list: {
        type: Array,
        required: true
    },
    stdDeviation: {
        type: Number,
        default: null
    },
    _plugin: {
        type: String,
        default: 'Phigros Plugin'
    },
    Version: {
        type: Object,
        default: () => ({ ver: 'v0.1.0' })
    }
});

// Import the CSS for this component
import '~/assets/b27/b27.css';
import { getProxiedUrl } from '~/utils/proxyUtils';

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