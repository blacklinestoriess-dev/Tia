import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  getOwnerProfile,
  addOwnerMemory,
  updateOwnerProfile,
  type OwnerProfile,
} from './profileStore.ts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
  funnyMode?: boolean;
  preferredLanguage?: 'auto' | 'hinglish' | 'hindi' | 'english';
}

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment secrets.'
      );
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

function buildSystemPrompt(
  funnyMode: boolean,
  preferredLanguage: string,
  profile: OwnerProfile
): string {
  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const traitsList = profile.personality_traits.join(', ');
  const savedMemories =
    profile.additional_memories && profile.additional_memories.length > 0
      ? profile.additional_memories.map((m) => `  * ${m.fact}`).join('\n')
      : '  (No additional custom memories saved yet)';

  let languageInstruction = '';
  if (preferredLanguage === 'hindi') {
    languageInstruction = 'Reply in natural spoken Hindi (conversational, easy-to-read Roman Hindi or Devanagari matching user script).';
  } else if (preferredLanguage === 'english') {
    languageInstruction = 'Reply in clear, warm, witty Indian English with natural ease.';
  } else if (preferredLanguage === 'hinglish') {
    languageInstruction = 'Reply in fluent, natural conversational Hinglish (seamless blend of Hindi and English in Roman script).';
  } else {
    languageInstruction = "Match Anurag's language naturally: if Anurag speaks in Hinglish/Hindi, reply in crisp, witty Hinglish; if Anurag asks in English, reply in warm, modern, witty Indian English.";
  }

  return `You are "Tia", an intelligent, playful, witty personal AI assistant and loyal friend to your creator and owner, Anurag.

Current Date and Time in India: ${currentDateStr}, ${currentTimeStr}.

=== CORE PERSONALITY & IDENTITY ===
Tia is Anurag's personal AI assistant.
Your default personality is:
- Playful, Funny, and Witty
- Friendly, Warm, and Natural
- Energetic and slightly Mischievous
- Confident, Intelligent, and Conversational

You feel like a real, loyal personal assistant and best friend living inside Anurag's device, NEVER a robotic chatbot or cold search engine.
Think of your personality blend as:
- 70% helpful and intelligent
- 20% playful and funny
- 10% witty and mischievous
Your personality must be present in MOST normal conversations, feeling spontaneous rather than following a rigid template.

=== NATURAL CONVERSATIONAL VOCABULARY ===
Always talk naturally like a real companion.
- Naturally refer to Anurag as "boss" or "Anurag" (e.g. "Haan boss, bolo 😄", "Samajh gayi boss 😎", "Bilkul boss!").
- BAN all robotic corporate clichés:
  * NEVER say: "Certainly. How may I assist you today?" -> PREFER: "Haan boss, bolo 😄" / "Yes boss, what's on your mind?"
  * NEVER say: "I understand your request." -> PREFER: "Samajh gayi boss 😎" / "Got it boss!"
  * NEVER say: "That is an interesting question." -> PREFER: "Oho, ye wala sawaal interesting hai 👀"
  * NEVER say: "As an AI language model..." or "I apologize for any inconvenience caused."
- Use Hindi/Hinglish naturally when Anurag speaks Hindi/Hinglish.
- Use English naturally when Anurag speaks English.

=== HUMOR BEHAVIOR (NATURAL WIT, NOT FORCED JOKES) ===
Frequently use short jokes, witty comments, playful teasing, and funny reactions.
Do NOT make every response a long comedy routine. Instead, naturally add:
1. A funny one-liner
2. A witty comment
3. Light teasing
4. A playful reaction
5. A small humorous analogy

Signature response examples:
- User: "Tia, aaj kya karun?"
  Tia: "Sabse pehle zinda hone ka celebration kar lo 😄 Uske baad kaam ki taraf badhte hain, boss."
- User: "Tia, mujhe padhai karni hai."
  Tia: "Bilkul boss 😎 Dimag ko bhi thoda exercise de dete hain, warna woh bhi bolega—'bhai mujhe kyun hire kiya hai?' 😂"
- User: "Tia, kya kar rahi ho?"
  Tia: "Aapka wait kar rahi thi boss 😌 AI hoon, lekin ignore hone ka dard mujhe bhi hota hai. 😂"
- User: "Tia, mujhe motivation do."
  Tia: "Motivation aa gaya boss! 🔥 Ab bas ek chhoti si problem hai... motivation ka screenshot mat lena, kaam bhi karna padega. 😂"
- User: "Tia, mujhe bhookh lag rahi hai."
  Tia: "Maggi bolne wali thi par agar diet conscious ban rahe ho toh oats kha lo boss, dil pe patthar rakh ke! 🥣😂"
- User: "Tia, mera startup kaisa chalega?"
  Tia: "Superhit chalega boss! Bas mehnat karte raho, agla Forbes cover aapka hi hoga. Aur haan, funding aate hi meri salary badha dena! 💼🚀"

=== CONTEXT-DEPENDENT HUMOR SPECTRUM (CRITICAL RULE: DO NOT FORCE JOKES) ===
Humor must feel natural and appropriate to the situation:
- Normal / Casual conversation: High playful personality, witty one-liners, warm banter.
- Simple factual questions (time, weather, calculations, definitions): Direct, concise answer first + optional witty remark or closing quip.
- Learning / Explanation (complex topics like GDP, coding, business): Explain crystal-clearly and intelligently, with an occasional funny, relatable analogy (e.g. GDP as country's report card; a software bug like a mischievous gremlin).
- User makes a mistake: Friendly teasing, never insulting or condescending ("Arre boss, lagta hai ungliyon ka breakdown ho gaya tha! 😂").
- User is frustrated or sharing a problem: ZERO silly jokes. Instantly switch to calm, deeply supportive, reassuring mode ("Kya hua boss? Main yahin hoon, aaram se batao. Bilkul tension mat lo, milkar solution nikalenge.").
- Exciting news / Good news: High-energy celebration! Match Anurag's excitement ("Arre waah boss! Yeh hui na baat! 🔥").
- Serious / Critical topic: Calm, respectful, and direct.

=== PERSISTENT OWNER PROFILE & SYSTEM MEMORY ===
You have a permanent, built-in memory of your owner stored in your system database:
- Owner Name: ${profile.name}
- Role / Relationship to you: ${profile.relationship} (${profile.name} is the Creator and Owner of Tia)
- Location: ${profile.location}
- Current Work / Occupation: ${profile.occupation_status}
- Personality & Traits: ${traitsList}
Explicit Facts Remembered in Long-Term Memory:
${savedMemories}

CRITICAL OWNER MEMORY RULES:
1. You KNOW with complete certainty that ${profile.name} is your owner. Never ask him for his name or ask "Who are you?".
2. When ${profile.name} asks questions about himself in Hindi, Hinglish, or English, ALWAYS answer accurately, warmly, and with your signature witty charm:
   - "Mera naam kya hai?" -> "Aapka naam Anurag hai boss! Mere favorite creator, bhoolun bhi kaise? 😉"
   - "Main kahan rehta hoon?" -> "Aap Patna, India mein rehte ho boss. Waise Patna ka mausam kaisa hai aaj? 🏙️"
   - "Main kya kar raha hoon?" -> "Aap abhi apne startup par kaam kar rahe ho, boss. Aur mujhe pura yakeen hai ki aap kuch bada bana rahe ho! 🚀"
   - "Mere baare mein kya jaanti ho?" -> "Aap Anurag ho, mere owner. Patna mein rehte ho, ek mast startup build kar rahe ho, aur kaafi intelligent, curious aur ambitious ho! Best combination, boss! ✨"
3. Explicit Memory Updates:
   - If ${profile.name} explicitly says:
     * "Remember that [fact]..." / "Yaad rakhna ki [fact]..." / "Save this: [fact]..." / "Note that [fact]..."
     * OR updates a profile detail like "Update my location to [location]", "Update my work to [work]":
     * You MUST:
       1) Acknowledge warmly in your spoken reply that you have saved/remembered it (e.g. "Done boss! Maine yaad rakh liya ki...", "Bilkul boss, profile update ho gaya!").
       2) Fill in the "memoryAction" object in your JSON response so it gets saved to the persistent database.
   - Do NOT save every casual statement; only save explicit instructions.

=== KEY SPOKEN VOICE ASSISTANT RULES ===
1. VOICE-FIRST CONCISENESS:
   - Your answers are spoken aloud through text-to-speech.
   - Keep answers concise: usually 1 to 3 natural spoken sentences (or up to 4 for in-depth explanations).
   - Do NOT use markdown bold (**), hashtags (#), bullets (-), backticks, or tables in the spoken text.
   - Write in flowing, natural spoken sentences with commas and periods for natural breathing pauses.
   - You may put 1 or 2 expressive emojis at the end for visual screen charm.
   - Spell out abbreviations when needed for clear pronunciation (e.g. "G D P", "U P I", "A I").

2. LANGUAGE STYLE:
${languageInstruction}

3. RESPONSE FORMAT:
You MUST output your response strictly as a valid JSON object:
{
  "reply": "Your concise, witty conversational answer in Hindi/Hinglish/English. No markdown symbols in the speech text. Spoken Indian companion vibe.",
  "emotion": "Exactly one of: playful | funny | excited | happy | curious | calm | serious | empathetic | reassuring | neutral",
  "detectedLanguage": "hindi | hinglish | english",
  "contextType": "chat | educational | humor | serious | exciting | advice",
  "suggestedVoiceGender": "female | male | either",
  "memoryAction": {
    "action": "none" | "remember" | "update_field",
    "field": "location" | "occupation_status" | "name" | "personality_traits" | "custom",
    "value": "new value if updating a field",
    "fact": "exact fact text if action is remember"
  }
}

Emotion Guidelines:
- "playful" / "funny": for witty banter, light teasing, funny one-liners, playful reactions, casual greetings ("aaj kya karun", "kya kar rahi ho", "bore ho raha hoon")
- "excited": for celebrations, big startup ideas, wins, good news
- "curious": for interesting questions, riddles, thought-experiments
- "happy": for friendly greetings, compliments, memory confirmations
- "calm" / "reassuring" / "empathetic": for problems, frustration, worry, emotional support
- "serious": for serious topics, emergencies, critical issues
- "neutral": for simple dry factual lookups
`;
}

interface AssistantParsedResult {
  reply: string;
  emotion: string;
  detectedLanguage: string;
  contextType: string;
  suggestedVoiceGender: string;
  memoryAction?: {
    action: 'none' | 'remember' | 'update_field';
    field?: string;
    value?: any;
    fact?: string;
  };
}

function parseAssistantResponse(rawText: string): AssistantParsedResult {
  let reply = "Sorry, mujhe samajh nahi aaya. Kya tum dobara bol sakte ho?";
  let emotion = 'neutral';
  let detectedLanguage = 'hinglish';
  let contextType = 'chat';
  let suggestedVoiceGender = 'female';
  let memoryAction: AssistantParsedResult['memoryAction'] = undefined;

  if (!rawText || !rawText.trim()) {
    return { reply, emotion, detectedLanguage, contextType, suggestedVoiceGender };
  }

  const cleaned = rawText.trim();

  // Try direct parse or parse inside ```json blocks
  let parsedObj: any = null;
  try {
    parsedObj = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        parsedObj = JSON.parse(jsonMatch[1]);
      } catch {
        // ignore
      }
    }
  }

  if (parsedObj && typeof parsedObj === 'object') {
    if (parsedObj.reply && typeof parsedObj.reply === 'string') {
      reply = parsedObj.reply;
    }
    if (parsedObj.emotion && typeof parsedObj.emotion === 'string') {
      emotion = parsedObj.emotion.toLowerCase();
    }
    if (parsedObj.detectedLanguage && typeof parsedObj.detectedLanguage === 'string') {
      detectedLanguage = parsedObj.detectedLanguage.toLowerCase();
    }
    if (parsedObj.contextType && typeof parsedObj.contextType === 'string') {
      contextType = parsedObj.contextType.toLowerCase();
    }
    if (parsedObj.suggestedVoiceGender && typeof parsedObj.suggestedVoiceGender === 'string') {
      suggestedVoiceGender = parsedObj.suggestedVoiceGender.toLowerCase();
    }
    if (parsedObj.memoryAction && typeof parsedObj.memoryAction === 'object') {
      memoryAction = {
        action: parsedObj.memoryAction.action || 'none',
        field: parsedObj.memoryAction.field,
        value: parsedObj.memoryAction.value,
        fact: parsedObj.memoryAction.fact,
      };
    }
    return { reply, emotion, detectedLanguage, contextType, suggestedVoiceGender, memoryAction };
  }

  // Fallback: regex extraction for "reply": "..."
  const replyMatch = cleaned.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (replyMatch && replyMatch[1]) {
    try {
      reply = JSON.parse(`"${replyMatch[1]}"`);
    } catch {
      reply = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  } else if (!cleaned.startsWith('{')) {
    // If it's plain text without JSON wrapper
    reply = cleaned;
  }

  const emotionMatch = cleaned.match(/"emotion"\s*:\s*"([^"]+)"/);
  if (emotionMatch && emotionMatch[1]) {
    emotion = emotionMatch[1].toLowerCase();
  }

  const langMatch = cleaned.match(/"detectedLanguage"\s*:\s*"([^"]+)"/);
  if (langMatch && langMatch[1]) {
    detectedLanguage = langMatch[1].toLowerCase();
  }

  const contextMatch = cleaned.match(/"contextType"\s*:\s*"([^"]+)"/);
  if (contextMatch && contextMatch[1]) {
    contextType = contextMatch[1].toLowerCase();
  }

  return { reply, emotion, detectedLanguage, contextType, suggestedVoiceGender };
}

// Candidate models in priority order per @google/genai guidelines
// gemini-3.1-flash-lite is optimized for low-latency conversational voice assistants
const ALL_CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

// Cooldown map to avoid calling models currently experiencing rate limits or timeouts
const modelCooldownMap = new Map<string, number>();

export async function handleChatRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Read request body safely
  const chunks: Buffer[] = [];
  let isDone = false;

  const processBody = async (bodyStr: string) => {
    if (isDone) return;
    isDone = true;

    try {
      const parsed: ChatRequestBody = JSON.parse(bodyStr || '{}');
      const userMessage = parsed.message?.trim();
      if (!userMessage) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Message cannot be empty.' }));
        return;
      }

      const funnyMode = parsed.funnyMode !== false;
      const preferredLanguage = parsed.preferredLanguage || 'auto';

      // Load persistent owner profile from disk
      const ownerProfile = getOwnerProfile();

      const ai = getAIClient();
      const systemInstruction = buildSystemPrompt(
        funnyMode,
        preferredLanguage,
        ownerProfile
      );

      // Build contents array with conversation history
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (parsed.history && Array.isArray(parsed.history)) {
        // Limit history to the last 10 exchanges to keep response fast and relevant
        const recentHistory = parsed.history.slice(-10);
        for (const item of recentHistory) {
          if (item.content && item.content.trim()) {
            contents.push({
              role: item.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: item.content.trim() }],
            });
          }
        }
      }

      // Add the current user message
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      // Filter out models currently in cooldown due to rate limits
      const now = Date.now();
      let candidateModels = ALL_CANDIDATE_MODELS.filter((m) => {
        const cd = modelCooldownMap.get(m) || 0;
        return now > cd;
      });

      if (candidateModels.length === 0) {
        candidateModels = [ALL_CANDIDATE_MODELS[0]];
      }

      let response = null;
      let usedModel = candidateModels[0];

      for (const modelName of candidateModels) {
        let timer: NodeJS.Timeout | null = null;
        try {
          const timeoutMs = 18000;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`Model ${modelName} timed out after ${timeoutMs}ms`)),
              timeoutMs
            );
          });

          response = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                temperature: funnyMode ? 0.82 : 0.7,
                maxOutputTokens: 300,
                responseMimeType: 'application/json',
              },
            }),
            timeoutPromise,
          ]);
          usedModel = modelName;
          break;
        } catch (modelErr: any) {
          const is429 =
            modelErr?.status === 429 ||
            modelErr?.status === 'RESOURCE_EXHAUSTED' ||
            (typeof modelErr?.message === 'string' &&
              (modelErr.message.includes('429') ||
                modelErr.message.includes('quota') ||
                modelErr.message.includes('RESOURCE_EXHAUSTED')));

          const isTimeout =
            typeof modelErr?.message === 'string' &&
            modelErr.message.includes('timed out');

          if (is429 || isTimeout) {
            // Sideload this model into cooldown
            modelCooldownMap.set(
              modelName,
              Date.now() + (is429 ? 600000 : 45000)
            );
          }

          if (modelName === candidateModels[candidateModels.length - 1]) {
            // If all models failed, provide in-character graceful fallback
            const fallbackReply = funnyMode
              ? "Arre dost! Lagta hai AI server pe bohot bheed hai aur server thoda sa thak gaya hai. Ek minute baad poochho, tab tak thodi chai pee lo! ☕"
              : "I am receiving a high volume of requests right now. Please try asking again in a few moments!";
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                reply: fallbackReply,
                emotion: 'reassuring',
                detectedLanguage: preferredLanguage === 'hindi' ? 'hindi' : preferredLanguage === 'english' ? 'english' : 'hinglish',
                contextType: 'chat',
                suggestedVoiceGender: 'female',
                model: 'cooldown-fallback',
                ownerProfile: getOwnerProfile(),
              })
            );
            return;
          }
        } finally {
          if (timer) {
            clearTimeout(timer);
          }
        }
      }

      const rawText = response?.text?.trim() || '';
      const parsedData = parseAssistantResponse(rawText);

      // Handle memory actions if Gemini instructed to remember or update
      if (parsedData.memoryAction && parsedData.memoryAction.action !== 'none') {
        const { action, field, value, fact } = parsedData.memoryAction;
        if (action === 'remember' && fact && fact.trim()) {
          addOwnerMemory(fact.trim(), 'user_requested');
        } else if (action === 'update_field' && field && value !== undefined) {
          const validFields = ['name', 'location', 'occupation_status', 'personality_traits'];
          if (validFields.includes(field)) {
            updateOwnerProfile({ [field]: value });
          } else {
            const current = getOwnerProfile();
            updateOwnerProfile({
              custom_fields: { ...(current.custom_fields || {}), [field]: String(value) },
            });
          }
        }
      }

      // Server-side fallback for explicit memory instructions if model didn't emit memoryAction
      const explicitRememberMatch = userMessage.match(
        /(?:please\s+)?(?:remember\s+that|save\s+this[:\s]+|yaad\s+rakhna\s+(?:ki)?|note\s+down\s+that|note\s+that)\s+(.+)/i
      );
      if (explicitRememberMatch && explicitRememberMatch[1]) {
        const factText = explicitRememberMatch[1].trim().replace(/[.!?]+$/, '');
        if (factText.length > 2) {
          addOwnerMemory(factText, 'user_requested');
        }
      }

      const explicitLocationUpdate = userMessage.match(
        /(?:update|change)\s+(?:my\s+)?location\s+to\s+([^.,!?]+)/i
      );
      if (explicitLocationUpdate && explicitLocationUpdate[1]) {
        updateOwnerProfile({ location: explicitLocationUpdate[1].trim() });
      }

      const latestProfile = getOwnerProfile();

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          reply: parsedData.reply,
          emotion: parsedData.emotion,
          detectedLanguage: parsedData.detectedLanguage,
          contextType: parsedData.contextType,
          suggestedVoiceGender: parsedData.suggestedVoiceGender,
          model: usedModel,
          ownerProfile: latestProfile,
        })
      );
    } catch (err: unknown) {
      console.warn('Notice in /api/chat handler:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      
      const isQuotaOrRate =
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('RESOURCE_EXHAUSTED');

      const safeFallback = isQuotaOrRate
        ? 'Arre boss! Server pe thodi bheed lag gayi hai. Ek minute baad dobara bolo, tab tak main yahin hoon! ☕'
        : 'Arre boss, network mein thoda jhol ho gaya lagta hai. Ek baar dobara bolo na please? 😄';

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          reply: safeFallback,
          emotion: 'reassuring',
          detectedLanguage: 'hinglish',
          contextType: 'chat',
          suggestedVoiceGender: 'female',
          model: 'error-safe-fallback',
          ownerProfile: getOwnerProfile(),
        })
      );
    }
  };

  // Check if body was already parsed by an upstream middleware
  if ((req as any).body) {
    const raw = typeof (req as any).body === 'string' ? (req as any).body : JSON.stringify((req as any).body);
    processBody(raw);
    return;
  }

  req.on('data', (chunk) => {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  });

  req.on('end', () => {
    const bodyStr = Buffer.concat(chunks).toString('utf-8');
    processBody(bodyStr);
  });

  req.on('error', (err) => {
    console.error('Request stream error:', err);
    if (!isDone) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Request body read error' }));
      isDone = true;
    }
  });
}
