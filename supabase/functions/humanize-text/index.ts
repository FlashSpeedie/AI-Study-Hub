import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEURISTIC_PATTERNS = [
  /\bFurthermore\b/gi, /\bMoreover\b/gi, /\bAdditionally\b/gi, /\bConsequently\b/gi,
  /\bTherefore\b/gi, /\bHowever\b/gi, /\bNevertheless\b/gi, /\bNonetheless\b/gi,
  /\bin conclusion\b/gi, /\bto conclude\b/gi, /\bin summary\b/gi,
  /\bit is important to note\b/gi, /\b it is worth noting\b/gi,
  /\bfirstly\b|\bsecondly\b|\bthirdly\b/gi,
  /In today's rapidly evolving world/gi,
  /\bWith the advent of\b/gi, /\bgiven these circumstances\b/gi,
];

const SEMANTIC_TECHNIQUES = [
  function addConversationalMarkers(text: string): string {
    const markers = [
      "you know?", "I mean,", "honestly?", "basically,", "actually,",
      "like I said,", "right?", "sure thing.", "yeah,",
    ];
    if (Math.random() > 0.7) {
      const sentences = text.split(/([.!?]+)/);
      if (sentences.length > 4) {
        const insertPos = Math.floor(Math.random() * (sentences.length / 2)) * 2;
        const marker = markers[Math.floor(Math.random() * markers.length)];
        sentences.splice(insertPos, 0, ` ${marker}`);
        return sentences.join('');
      }
    }
    return text;
  },
  
  function varySentenceOpeners(text: string): string {
    return text
      .replace(/^(However|Therefore|Additionally|Furthermore|Most importantly),\s+/gim, '$1, ')
      .replace(/^(\w+)\s+is\s+/gim, (_, subject) => {
        if (Math.random() > 0.5) {
          return `So, ${subject.toLowerCase()} is `;
        }
        return _;
      });
  },
  
  function addHumanImperfections(text: string): string {
    if (Math.random() > 0.6) {
      text = text.replace(/\bdo not\b/gi, "don't");
      text = text.replace(/\bdoes not\b/gi, "doesn't");
      text = text.replace(/\bdid not\b/gi, "didn't");
      text = text.replace(/\bwould not\b/gi, "wouldn't");
      text = text.replace(/\bcould not\b/gi, "couldn't");
      text = text.replace(/\bshould not\b/gi, "shouldn't");
    }
    return text;
  },
  
  function removeFormalStructures(text: string): string {
    return text
      .replace(/\bIt is (interesting|important|crucial|essential) to note that\b/gi, "Here's the thing:")
      .replace(/\bIn the (current|present) (climate|landscape|environment)\b/gi, "These days")
      .replace(/\bDue to the fact that\b/gi, "Because")
      .replace(/\bin order to\b/gi, "to")
      .replace(/\bwith regard to\b/gi, "about")
      .replace(/\bin regards to\b/gi, "regarding")
      .replace(/\bat this point in time\b/gi, "now")
      .replace(/\bin the near future\b/gi, "soon")
      .replace(/\bhas the capability to\b/gi, "can")
      .replace(/\bis able to\b/gi, "can")
      .replace(/\bit must be stated that\b/gi, "");
  },
  
  function addNaturalRhythm(text: string): string {
    return text
      .replace(/, (but|and yet)/gim, ' — $1')
      .replace(/\.\.\.\s*/gim, '... ');
  },
];

function applySemanticPreprocessing(text: string): string {
  let result = text;
  
  // Remove detected AI patterns
  for (const pattern of HEURISTIC_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // Replace with more natural alternatives
      const replacements: Record<string, string> = {
        'Furthermore': 'Also',
        'Moreover': 'Also',
        'Additionally': 'Oh, and',
        'Consequently': 'So',
        'Therefore': 'So',
        'However': 'But',
        'Nevertheless': 'Still',
        'Nonetheless': 'Still',
        'in conclusion': 'Wrapping up',
        'to conclude': 'To sum up',
        'in summary': 'Bottom line',
      };
      return replacements[match] || '';
    });
  }
  
  for (const technique of SEMANTIC_TECHNIQUES) {
    result = technique(result);
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, currentScore, iteration = 0 } = await req.json();
    const API_KEY = Deno.env.get('API_KEY');

    if (!API_KEY) {
      throw new Error('API_KEY is not configured');
    }

    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Please provide at least 50 characters of text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Humanizing text, iteration ${iteration}, current score: ${currentScore}%`);

    // Pre-process text to remove basic heuristics
    const preprocessedText = applySemanticPreprocessing(text);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at rewriting AI-generated text to sound authentically human while bypassing all AI detection systems.

CRITICAL: Your output must be completely indistinguishable from natural human writing. Detection systems analyze for:
1. Low perplexity (predictability)
2. Low burstiness (uniform sentence lengths)
3. Overuse of formal connectors (furthermore, moreover, however, therefore)
4. Perfect but unnatural grammar
5. Lack of personal voice or perspective
6. Formulaic structures and transitions
7. Overly consistent vocabulary

Your rewriting strategy MUST include:

1. **Semantic Depth**: Add genuine insights, personal perspectives, and nuanced observations that show real understanding - not just restated facts.

2. **Natural Variation**: Vary sentence length dramatically (1-2 words to 25+ words). Use fragments, run-ons, and interruptions naturally.

3. **Conversational Authenticity**: Include:
   - Informal expressions and slang where appropriate
   - Hedging language ("I think", "maybe", "kind of", "sort of")
   - Direct address to reader ("you know?", "right?")
   - Self-corrections and mid-thought changes

4. **Structural Imperfection**: Humans don't write perfectly structured paragraphs. Mix it up with:
   - Unexpected paragraph breaks
   - Some sentences that trail off
   - Occasional fragments that work
   - Em-dashes and parenthetical asides

5. **Voice and Personality**: Add:
   - Specific examples from experience (even if generic)
   - Rhetorical questions
   - Tone shifts within the piece
   - Unique phrasings that feel personal

6. **Avoid AI Red Flags**: Never use:
   - "Furthermore", "Moreover", "Additionally" (use "also", "oh and")
   - "In conclusion", "To summarize" (use "so basically", "right")
   - "It is important to note" (just say it)
   - Overly consistent paragraph lengths
   - Perfect transitions between every point

7. **Post-Processing**: Apply natural imperfections:
   - Occasional comma splices for flow
   - Sentence fragments for emphasis
   - Vary punctuation (mix in em-dashes, parentheses)

Your output must preserve the original information and meaning while being 100% human-sounding.

IMPORTANT: Output ONLY the rewritten text. No explanations, no meta-text, no formatting marks.`
          },
          {
            role: 'user',
            content: `Rewrite this text to sound completely human-written and bypass all AI detection systems. Maintain all facts and meaning but make it sound like a real person wrote it:

${preprocessedText}`
          }
        ],
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const humanizedText = data.choices?.[0]?.message?.content?.trim();

    if (!humanizedText) {
      throw new Error('No response from AI');
    }

    const finalText = applySemanticPreprocessing(humanizedText);

    return new Response(
      JSON.stringify({ 
        humanizedText: finalText,
        iteration: iteration + 1 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in humanize-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
