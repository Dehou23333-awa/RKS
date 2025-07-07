function encodeSummary(params) {
    const { saveVersion, challenge, rks, gameVersion, avatar, EZ, HD, IN, AT } = params;
    if (EZ.length !== 3 || HD.length !== 3 || IN.length !== 3 || AT.length !== 3) {
        throw new Error("EZ, HD, IN, and AT level arrays must each contain exactly 3 elements.");
    }
    const avatarBuffer = Buffer.from(avatar, 'utf8');
    const avatarLength = avatarBuffer.length;
    // 猜猜问什么要多加上 1
    // const totalLength = 1 + 2 + 4 + 1 + 1 + avatarLength + (12 * 2);
    // 因为头像长度前面还有一个字节，所以总长度需要加上 1
    const totalLength = 1 + 2 + 4 + 1 + 1 + 1 + avatarLength + (12 * 2);
    console.log(`Total length of summary buffer: ${totalLength} bytes`);
    const summaryBuffer = Buffer.alloc(totalLength);
    let offset = 0;
    // 写入存档版本
    summaryBuffer.writeUInt8(saveVersion, offset);
    offset += 1;
    // 写入课题
    summaryBuffer.writeUInt16LE(challenge, offset);
    offset += 2;
    // 写入 RKS
    summaryBuffer.writeFloatLE(rks, offset);
    offset += 4;
    // 写入游戏版本
    summaryBuffer.writeUInt8(gameVersion, offset);
    offset += 1;
    // 写入头像长度前面的一个字节（就是这里）
    summaryBuffer.writeUInt8(1, offset);
    offset += 1;
    // 写入头像长度
    summaryBuffer.writeUInt8(avatarLength, offset);
    offset += 1;
    // 写入头像
    avatarBuffer.copy(summaryBuffer, offset);
    offset += avatarLength;
    // 写入等级数据
    const levelsData = [...EZ, ...HD, ...IN, ...AT];
    for (let i = 0; i < levelsData.length; i++) {
        summaryBuffer.writeUInt16LE(levelsData[i], offset);
        offset += 2;
    }
    return summaryBuffer.toString('base64');
}

export default defineEventHandler(async (event) => {
    const params = await readBody(event);
    try {
        const encodedSummary = encodeSummary(params);
        return { encodedSummary: encodedSummary };
    } catch (error) {
        console.error('Error encoding summary:', error);
        return { success: false, error: error.message };
    }
});