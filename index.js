const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // 增加请求体大小限制

// 健康检查接口
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Gemini API代理 - 使用免费层级
app.post('/api/gemini', async (req, res) => {
  try {
    console.log('Received request with prompt length:', req.body.prompt.length);
    if (req.body.image) {
      console.log('Received image with length:', req.body.image.length);
    }

    const response = await axios({
      method: 'post',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        key: process.env.GEMINI_API_KEY
      },
      data: {
        contents: [{
          parts: [
            { text: req.body.prompt },
            req.body.image ? {
              inline_data: {
                mime_type: 'image/jpeg',
                data: req.body.image.split(',')[1]  // 移除 data:image/jpeg;base64, 前缀
              }
            } : null
          ].filter(Boolean)
        }]
      }
    });
    
    console.log('API Response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
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