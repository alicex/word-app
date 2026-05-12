import express from 'express'
import dotenv from 'dotenv'
import { Client } from '@notionhq/client'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.static('public'))

const notion = new Client({
  auth: process.env.NOTION_TOKEN
})

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

app.post('/api/words', async (req, res) => {
  try {
    const { word, memo } = req.body

    if (!word) {
      return res.status(400).json({ message: '単語を入力してください' })
    }

    const prompt = `
以下の単語をわかりやすく2行程度で整理してください。
専門用語を使いすぎず、自分の理解メモとして残しやすい文章にしてください。

単語: ${word}
補足メモ: ${memo || 'なし'}
`

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    })

    const summary = response.text

    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: word
              }
            }
          ]
        },
        Summary: {
          rich_text: [
            {
              text: {
                content: summary
              }
            }
          ]
        },
        Tags: {
          multi_select: []
        },
        date: {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        }
      }
    })

    res.json({ summary })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '登録に失敗しました' })
  }
})

app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})