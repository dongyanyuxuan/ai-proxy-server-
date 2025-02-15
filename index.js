const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// 添加简单的请求限制
const requestLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1分钟
const MAX_REQUESTS_PER_WINDOW = 20; // 每分钟最多20个请求

function isRateLimited(ip) {
  const now = Date.now();
  const userRequests = requestLimits.get(ip) || [];
  
  // 清理旧的请求记录
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // 更新请求记录
  requestLimits.set(ip, recentRequests);
  
  // 检查是否超出限制
  return recentRequests.length >= MAX_REQUESTS_PER_WINDOW;
}

function addRequest(ip) {
  const userRequests = requestLimits.get(ip) || [];
  userRequests.push(Date.now());
  requestLimits.set(ip, userRequests);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // 增加请求体大小限制

// 健康检查接口
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Gemini API代理 - 使用免费层级
app.post('/api/gemini', async (req, res) => {
  const clientIP = req.ip;

  // 检查请求限制
  if (isRateLimited(clientIP)) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: '请求过于频繁，请稍后再试'
    });
  }

  try {
    // 记录请求
    addRequest(clientIP);

    // 添加随机延迟 (500ms - 1500ms)
    const delay = Math.floor(Math.random() * 1000) + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log('Received request:', {
      promptLength: req.body.prompt.length,
      model: req.body.model,
      hasImage: !!req.body.image
    });

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
      
    console.log('Calling Gemini API:', {
      url: apiUrl,
      apiKey: process.env.GEMINI_API_KEY ? 'Present' : 'Missing'
    });

    const requestData = {
      contents: [{
        parts: [
          { text: req.body.prompt }
        ]
      }]
    };

    // 如果有图片，添加到 parts 数组
    if (req.body.image) {
      requestData.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: req.body.image.split(',')[1]
        }
      });
    }

    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Origin': 'https://ai-proxy-server-cu1n.onrender.com',
        'Referer': 'https://ai-proxy-server-cu1n.onrender.com/'
      },
      params: {
        key: process.env.GEMINI_API_KEY
      },
      data: requestData,
      timeout: 30000 // 30秒超时
    });
    
    console.log('Gemini API Response:', {
      status: response.status,
      hasData: !!response.data,
      hasCandidates: !!response.data?.candidates
    });

    res.json(response.data);
  } catch (error) {
    console.error('Detailed API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });

    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      details: error.response?.data
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 