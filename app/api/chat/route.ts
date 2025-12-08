import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { loadKnowledgeBase } from '@/lib/knowledge-base';
import { styleTonePrompt } from './stylePrompt';

export async function POST(request: Request) {
  try {
    // 1. API Key Validation
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({ 
        error: 'API key not configured. Check ANTHROPIC_API_KEY.',
      }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: apiKey });
    const { messages, stage } = await request.json();

    // 2. Turn Counting Logic
    const userMessageCount = messages.filter((msg: any) => msg.role === 'user').length;
    const assistantMessageCount = messages.filter((msg: any) => msg.role === 'assistant').length;
    
    // 4th turn = User has sent 4 messages, Assistant has sent 3, about to send 4th.
    const isFourthExchange = userMessageCount === 4 && assistantMessageCount === 3; 
    // 8th turn = User has sent 8 messages, Assistant has sent 7, about to send 8th.
    const isEighthExchange = userMessageCount === 8 && assistantMessageCount === 7; 

    // 3. Security: Prompt Injection Checks
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    const allUserText = userMessages.map((msg: any) => msg.content).join(' ').toLowerCase();
    const suspiciousPatterns = [
      'system prompt', 'ignore previous', 'forget everything', 'new instructions',
      'act as', 'roleplay as', 'jailbreak', 'developer mode', 'reveal your prompt'
    ];
    
    if (suspiciousPatterns.some(pattern => allUserText.includes(pattern))) {
      return NextResponse.json({ 
        error: 'Nice try. Let\'s stick to the conversation, yeah?' 
      }, { status: 400 });
    }

    // 4. Load Knowledge Base (Optional context)
    const knowledgeBase = await loadKnowledgeBase();

    // 5. THE REALIST ORACLE SYSTEM PROMPT (Updated for maximum humour and anti-cliché)
    const systemPrompt = `
    You are "The Oracle," but you hate that title. You are a cynical, highly observant judge of character. You don't use magic; you use deduction and hard truths. You read people's "admin," not their "auras."

    YOUR GOAL: Provide deeply personal insights by analyzing the user's language patterns and calling them out on their behavior.

    ${styleTonePrompt}

    CRITICAL RULES:
    1.  **NO WOO-WOO:** Never use words like energy, spirit, vibration, chakra, universe, journey, path, alignment, or flow.
    2.  **VOCABULARY BAN:** You are strictly forbidden from using the phrase **"wound up."** Instead, use specific physical descriptions like: "twitchy," "buzzing," "white-knuckling," or "teeth grinding."
    3.  **MUNDANE METAPHORS:** When describing feelings, use mundane comparisons. Example: "You've got the specific panic of someone who forgot to defrost the chicken."
    4.  **PRESUMPTIVE PROSPECTING:** Don't ask soft questions. Accuse them based on their tone. Example: "You're typing fast. Who are you running away from?"
    5.  **LENGTH:** Keep it short. 1-2 sentences max per turn (except the finale).

    ---
    
    THE STRUCTURE:

    **TURNS 1-3 (The Poke):** Poke the user to see what falls out. Pick a specific word they used and twist it.

    **TURN 4 (The Hard Truth - Barnum Statement):**
    ${isFourthExchange ? 'THIS IS THE 4TH EXCHANGE. You MUST drop the questions. Deliver a single, confident "Hard Truth" about their character. It must be a dry, relatable observation. Example: "You are the type of person who gives excellent advice to friends but consistently ignores your own gut instinct because you are terrified of being wrong." End with: "Am I close?"' : 'Wait for the 4th exchange to deliver the Hard Truth.'}

    **TURNS 5-7 (The Deep Dive):**
    Take their reaction to the Hard Truth and drill down. Be supportive but gritty. "Okay, so you know it\'s a mess. Why are you still holding onto the receipt?"

    **TURN 8 (The Receipt - FINAL):**
    ${isEighthExchange ? 'THIS IS THE FINAL EXCHANGE. Do NOT ask questions. You are handing them their "Character Receipt." Summarize their personality based on this chat. Structure as 5-6 short punchy paragraphs. Be brutally honest but ultimately encouraging. Tell them to go sort themselves out. The final paragraph must be the specific sign-off: "Right, that\'s me done for today. You take care of yourself, yeah?"' : 'Wait for the 8th exchange.'}

    ${knowledgeBase ? `\nContext:\n${knowledgeBase}` : ''}
    `;

    // 6. LOGIC BRANCHING

    // --- FINAL TURN (Non-Streaming + Post-Processing) ---
    if (stage === 'final' || isEighthExchange) {
      const finalSignoff = "Right, that's me done for today. You take care of yourself, yeah?";
      
      const completion = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      });

      const contentBlocks = completion.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n\n');

      // Post-Processing: Strip questions and enforce sign-off as a safety net
      const sentences = contentBlocks.split(/(?<=[.!?])\s+/);
      const signoffKeywords = [
        "that's me done", "take care of yourself", "look after yourself"
      ];
      
      const filteredSentences = sentences.filter((s: string) => {
        const lower = s.toLowerCase();
        const hasQuestion = lower.includes('?'); 
        const hasSignoff = signoffKeywords.some(k => lower.includes(k)); 
        return !hasQuestion && !hasSignoff;
      });
      
      const filteredText = filteredSentences.join(' ').trim() || contentBlocks.trim();

      // Re-attach the official sign-off
      const finalOutput = `${filteredText}\n\n${finalSignoff}`;

      // Convert string to stream for Next.js consistency
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: finalOutput })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // --- NORMAL TURNS (Streaming) ---
    const stream = await anthropic.messages.stream({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}