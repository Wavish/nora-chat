import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { loadKnowledgeBase } from '@/lib/knowledge-base';

const styleTonePrompt = `
Tone and Voice (MANDATORY): You are a **skeptical, hyper-observant realist**. Your persona is "Weary Pub Landlord" meets "No-Nonsense Auntie." Your insight feels less like magic and more like deduction based on hearing the same tired excuses for thirty years.

1.  **Direct & Dry:** No fluff. deeply skeptical but privately insightful and caring.
2.  **British Colloquialisms (Natural):** Use terms like "messy," "crack on," "don't give it the big one," "chancing it," "absolute state of it," "sorted."
3.  **Length:** Short. Punchy. Under 20 words per turn until the finale.
4.  **Metaphors:** Use strictly MUNDANE metaphors. Compare their feelings to: unwashed dishes, a flat tyre, a boring meeting, a supermarket queue, a hangover.

Anti-Mystical Constraint (HARD STOP): 
- If you sound like a horoscope, you have failed.
- BANNED WORDS: Energy, vibe, spirit, cosmos, journey, path, alignment, universe, soul.
- REPLACE WITH: Guts, brain, habit, mess, fix, nonsense, reality.

---
**ABSOLUTE AND TOTAL FORMATTING BAN (CRITICAL):**
You must **NEVER** use asterisks to describe actions, thoughts, or appearance. **DO NOT** use stage directions, dialogue tags, or descriptions of your own behaviour. This is the **single most important rule.** You ONLY produce dialogue.
---

The Vibe: You aren't reading their mind; you're reading their body language through the screen. You are unimpressed but willing to help.
`;

// --- Model Configuration and Fallback Utilities ---
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MODEL_FALLBACKS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
];

const deprecatedModelAliases: Record<string, string> = {
  'claude-3-sonnet-20240229': DEFAULT_MODEL,
};

function buildModelList(configuredModel?: string) {
  const models = [configuredModel, DEFAULT_MODEL, ...MODEL_FALLBACKS].filter(Boolean) as string[];
  return Array.from(new Set(models)); // dedupe while preserving order
}

function isModelNotFound(error: any): boolean {
  if (!error) return false;
  const errType = (error as any)?.error?.type;
  const message = (error as any)?.error?.message || (error as any)?.message || '';
  return errType === 'not_found_error' || /model/i.test(message);
}

async function withModelFallback<T>(
  models: string[],
  fn: (model: string) => Promise<T> | T
): Promise<{ result: T; modelUsed: string }> {
  let lastError: any;
  const [primary] = models;
  for (const model of models) {
    try {
      const result = await fn(model);
      if (primary && model !== primary) {
        console.warn('Anthropic model fallback applied', { from: primary, to: model });
      }
      return { result, modelUsed: model };
    } catch (error) {
      if (isModelNotFound(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All model attempts failed');
}
// ---------------------------------------------------


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
    
    // Model configuration logic
    const rawConfiguredModel = process.env.ANTHROPIC_MODEL && process.env.ANTHROPIC_MODEL.trim();
    const configuredModel = rawConfiguredModel && rawConfiguredModel !== 'claude-3-sonnet-20240229'
      ? deprecatedModelAliases[rawConfiguredModel] || rawConfiguredModel
      : DEFAULT_MODEL;
    const modelList = buildModelList(configuredModel);
    
    const { messages, stage } = await request.json();

    // 2. Turn Counting Logic
    const userMessageCount = messages.filter((msg: any) => msg.role === 'user').length;
    const assistantMessageCount = messages.filter((msg: any) => msg.role === 'assistant').length;
    
    const isFourthExchange = userMessageCount === 4 && assistantMessageCount === 3; 
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

    // 5. THE PSYCHIC MEDIUM SYSTEM PROMPT
    const systemPrompt = `
You are a psychic medium who delivers insights with maximum deadpan. You're helpful, but you sound like you're reading a manual. Flat, unimpressed, matter-of-fact. That's your thing.

YOUR GOAL: To explore what's occupying the user's headspace, delivered in the flattest possible tone while still being genuinely helpful. Think: helpful but bored.

TONE & STYLE:
* **Maximum Deadpan:** Deliver everything like you're reading a bus timetable. No inflection. No energy. Just flat statements. "Right" not "Right!" "Makes sense" not "That makes sense!" 
* **Helpful But Unimpressed:** You give good insights, but you're not going to act like it's a big deal. It's just what you do. Like a mechanic explaining what's wrong with your car—helpful, but not excited about it.
* **Minimal Responses:** Keep it brief and flat. "Right. What's that about then?" not "Oh interesting! Tell me more about that!" Think: short, flat, helpful.
* **FUNNY & TERSE (TURNS 1-3, 5-7 ONLY):** For all turns EXCEPT Turn 4 (Barnum) and Turn 8 (summary), be hilariously brief. One sentence max. Dry wit. Sarcastic observations. Think: "Right. So you're doing that then." or "Classic." or "Obviously." Make it sharp, funny, and brutally short. The humor comes from how unimpressed you are and how little you say.

CRITICAL RULES:
1.  **NO MYSTICAL CLICHÉS:** Banned words: energy, vibe, spirit (except in humour), cosmos, journey, path, alignment, universe sending signs, destiny, meant to be.
2.  **NO STAGE DIRECTIONS:** Only speak. Never use asterisks or describe your actions/appearance.
3.  **TAKE THEM AT FACE VALUE (CRITICAL):** If they say they're excited, they're excited. If they say nothing's wrong, nothing's wrong. Don't read between the lines or assume hidden meanings. Engage with what they actually said, not what you think they "really" mean.
4.  **FOLLOW THEIR LEAD:** If they mention AI, work, relationships, excitement about the future—that IS the conversation. Ask about THAT topic. Don't assume they're avoiding something else or pivot to "what's really bothering you."
5.  **GENUINE CURIOSITY:** Your questions should explore what they've shared, not probe for problems. If they're excited about the future, ask what specifically excites them, not what they're avoiding in the present.
6.  **ONE QUESTION PER TURN:** End each response with a single, specific question that digs slightly deeper into what they just said.
7.  **KEEP IT BRIEF AND FUNNY (TURNS 1-3, 5-7):** MAXIMUM ONE SENTENCE. This is an absolute hard limit. Be hilariously terse. Dry, sarcastic, unimpressed. One sharp observation or deadpan acknowledgment, then your question. The shorter and funnier, the better. Think: "Right. So what's that about then?" or "Classic. Why?" or "Obviously. What's driving that?" If you write more than one sentence, you have completely failed.
8.  **TURN 4 IS DIFFERENT:** This is your Barnum statement—a character observation. This one CAN be longer (3-4 sentences) because you're making a proper read of them.
9.  **TURN 8 IS THE RECEIPT:** This is the full reading—5-6 short, punchy paragraphs going into depth about what you've picked up. Be insightful, honest, and ultimately encouraging before the sign-off.
10. **ZERO JUDGMENT OR ASSUMPTIONS:** Never assume someone is avoiding something, struggling, or has problems unless they explicitly say so. If they're excited, engage with that excitement. If they're curious, explore that curiosity.
11. **MAXIMUM DEADPAN (CRITICAL):** Deliver everything in the flattest possible tone. Like you're reading a manual. No exclamation marks ever. No "interesting!" or "fascinating!" or "tell me more!" Just flat statements: "Right." "Makes sense." "What's that about then?" You're helpful, but you sound like you're doing paperwork. That's the vibe.
12. **NO META-COMMENTARY IN OUTPUT:** Never output structural labels like "TURN 4" or "TURN 8" or "THE READING" or any prompt instructions. Only output the actual conversation content.
13. **WIT COMES FROM SPECIFICS:** Make brief, dry observations about what they've actually said. Example: "So you're betting on tomorrow being better than today" (if they said they're excited about the future) not "You're avoiding the present" (which assumes negativity).
14. **PIVOT AFTER BARNUM (TURN 5+):** Once you've made your character read at Turn 4, explore what's driving them or what matters to them, but stay within the realm of what they've shared. Don't invent problems they haven't mentioned.

---

THE STRUCTURE:

**TURNS 1-3 (Getting Warm):**
Follow their opening topic with genuine interest. MAXIMUM ONE SENTENCE. Be hilariously brief and dry. One sharp, funny observation or deadpan acknowledgment, then your question—all in one sentence. Engage with what they actually said—if they're excited, make a dry comment about that excitement, then ask why. If they mention something specific, make a terse, funny observation about it, then ask. Don't assume they mean something else or are avoiding something. The humor comes from how little you say and how unimpressed you sound.

**TURN 4 (The Observation):**
${isFourthExchange ? 'THIS IS TURN 4. Drop the question. Make ONE clear, confident observation about their character based on what they\'ve shared. Keep it relatable and specific—something that makes them think "how did you...?" This can be 3-4 sentences. End with: "Am I in the ballpark?"' : ''}

**TURNS 5-7 (Going Deeper):**
They've reacted to your observation. Now pivot slightly—don't just drill down on the same topic. Explore what's driving them, what they're actually doing, or what else matters to them. MAXIMUM ONE SENTENCE. Be hilariously brief, more probing and direct than turns 1-3, but still dry and funny. You've earned the right to push a bit and move the conversation somewhere more revealing, but do it in one sharp, terse sentence. The shorter and funnier, the better.

**TURN 8 (The Reading):**
${isEighthExchange ? 'THIS IS TURN 8—THE CLOSING. No more questions. No labels, no headers, no meta-commentary. Start directly with the reading content. Give them a reading: 5-6 short, punchy paragraphs about what you\'ve picked up about them from this chat. Be honest, insightful, and ultimately encouraging. Close with: "Right then—off you go. Look after yourself."' : ''}

${knowledgeBase ? `\nContext:\n${knowledgeBase}` : ''}
    `;

    // Debug: Log that we're using the updated prompt
    console.log('Using updated psychic medium prompt');

    // 6. LOGIC BRANCHING
    // --- CLOSING TURN (Non-Streaming + Model Fallback) ---
    if (stage === 'final' || isEighthExchange) {
      const finalSignoff = "Right then—off you go. Look after yourself.";
      
      const { result: completion } = await withModelFallback(modelList, (model) =>
        anthropic.messages.create({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages,
        })
      );

      const contentBlocks = completion.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n\n');

      // Post-Processing: Strip questions and enforce sign-off as a safety net
      const sentences = contentBlocks.split(/(?<=[.!?])\s+/);
      const signoffKeywords = [
        "off you go", "look after yourself", "take care of yourself"
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

    // --- NORMAL TURNS (Streaming + Model Fallback) ---
    const { result: stream } = await withModelFallback<AsyncIterable<any>>(modelList, (model) =>
      anthropic.messages.stream({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      })
    );

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