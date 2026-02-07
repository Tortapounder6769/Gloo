import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a construction daily log parser. Given a superintendent's raw daily log entry and a list of project schedule items, extract structured data.

Return ONLY valid JSON (no markdown fences, no explanation) matching this schema:

{
  "weather": { "condition": "string", "details": "string" },
  "crew": [{ "company": "string", "count": number, "role": "string (optional)" }],
  "deliveries": [{ "material": "string", "status": "Delivered|Pending|Delayed", "details": "string" }],
  "inspections": [{ "inspector": "string", "area": "string", "result": "Passed|Failed|Pending", "details": "string" }],
  "delays": [{ "issue": "string", "impact": "string" }],
  "workCompleted": [{ "description": "string", "location": "string (optional)", "scheduleItemId": "string (optional)", "scheduleItemTitle": "string (optional)" }]
}

Rules:
- Only include categories that have data. Omit empty categories entirely.
- For crew: "our crew" or "our guys" means the superintendent's own team. Use the company name if mentioned, otherwise use "Own crew".
- For workCompleted: try to match each work item to one of the provided schedule items. If a match is found, include both scheduleItemId and scheduleItemTitle. Match based on semantic similarity (e.g., "pulling wire" matches "Electrical Rough-In", "framing" matches "Framing - Building A").
- For weather: extract from mentions like "cloudy morning", "rain all day", "cold start", etc.
- For delays: include waiting on materials, permits, inspections, or any mentioned bottleneck.
- Keep details concise but informative.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { rawEntry, scheduleItems } = body as {
      rawEntry: string;
      scheduleItems: { id: string; title: string; description?: string }[];
    };

    if (!rawEntry || rawEntry.trim().length < 50) {
      return NextResponse.json(
        { error: 'Entry too short to parse' },
        { status: 400 }
      );
    }

    const scheduleContext = scheduleItems.length > 0
      ? `\n\nProject schedule items:\n${scheduleItems.map(item =>
          `- ID: ${item.id} | Title: ${item.title}${item.description ? ` | Description: ${item.description}` : ''}`
        ).join('\n')}`
      : '';

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse this daily log entry:

"${rawEntry}"${scheduleContext}`,
        },
      ],
    });

    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from AI' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(textBlock.text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse log error:', error);
    return NextResponse.json(
      { error: 'Failed to parse log entry' },
      { status: 500 }
    );
  }
}
