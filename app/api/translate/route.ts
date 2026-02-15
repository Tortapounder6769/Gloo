import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { text, from, to } = body as { text: string; from: string; to: string }

    if (!text || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: text, from, to' },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a translator for construction daily logs. Translate the following text from ${from} to ${to}. Return ONLY the translated text, no explanations or formatting. Preserve construction terminology accurately.`,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    })

    const textBlock = message.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({ translated: textBlock.text })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Failed to translate text' },
      { status: 500 }
    )
  }
}
