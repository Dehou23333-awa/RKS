// api/login.ts
import type { IncomingMessage, ServerResponse } from 'http';
import { defineEventHandler, readBody } from 'h3';
import axios from 'axios';

// Initialize a shared axios instance for consistent headers
const taptapClient = axios.create({
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'TapTapAndroidSDK/3.16.5',
  },
});

const phiClient = axios.create({
  headers: {
    'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
    'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
    'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
    'Content-Type': 'application/json',
  },
});

export default defineEventHandler(async (event) => {
  const deviceId = await readBody(event);
  const url = 'https://www.taptap.com/oauth2/v1/device/code';
  const payload = `client_id=rAK3FfdieFob2Nn8Am&response_type=device_code&scope=basic_info&version=1.2.0&platform=unity&info=%7b%22device_id%22%3a%22${deviceId}%22%7d`;

  try {
    const response = await taptapClient.post(url, payload);
    return response.data.data;
  } catch (error: any) {
    // You might want to handle errors more robustly here
    console.error('Login error:', error.response?.data || error.message);
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?.statusText || 'Internal Server Error',
      data: error.response?.data || { message: 'An unknown error occurred' },
    });
  }
});