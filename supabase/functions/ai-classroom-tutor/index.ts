import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, course, generateQuiz } = await req.json();

    const API_KEY = Deno.env.get("API_KEY");
    if (!API_KEY) {
      throw new Error("API_KEY is not configured");
    }

    // Enhanced system prompt for whiteboard commands
    const enhancedSystemPrompt = `${systemPrompt}

IMPORTANT: When explaining concepts that would benefit from visual aid, you must respond with a structured JSON format that includes both your natural language explanation AND explicit whiteboard drawing commands.

Format your response as JSON (no markdown code blocks):
{
  "dialogue": "Your natural language explanation and conversation here...",
  "whiteboard_commands": [
    // For headers/titles on the whiteboard:
    { "action": "draw_text", "x": 50, "y": 30, "content": "Main Topic Header", "type": "header", "size": 28 },
    
    // For bullet points:
    { "action": "draw_text", "x": 50, "y": 100, "content": "• First key point here", "type": "bullet", "size": 18 },
    { "action": "draw_text", "x": 50, "y": 140, "content": "• Second key point here", "type": "bullet", "size": 18 },
    
    // For equations/formulas:
    { "action": "draw_text", "x": 50, "y": 200, "content": "E = mc²", "type": "equation", "size": 24 },
    
    // For highlighting important concepts:
    { "action": "draw_rect", "x": 40, "y": 250, "width": 400, "height": 60, "color": "#e0f2fe" },
    { "action": "draw_text", "x": 50, "y": 270, "content": "Important Concept!", "type": "highlight", "size": 20 },
    
    // For diagrams/visual elements:
    { "action": "draw_line", "x1": 100, "y1": 300, "x2": 300, "y2": 300, "color": "#3b82f6", "width": 2 },
    
    // For connecting arrows:
    { "action": "draw_arrow", "x1": 150, "y1": 250, "x2": 200, "y2": 300, "color": "#ef4444" },
    
    // For circles/emphasis:
    { "action": "draw_circle", "x": 200, "y": 200, "radius": 30, "color": "#fef3c7" }
  ]
}

Guidelines for whiteboard_commands:
- Use "draw_text" for all text (headers use size 24-32, bullets use size 16-20, equations use size 20-24)
- Use x coordinates from 20-700 and y coordinates from 30-500 for positioning
- For multiple items, increment y by 35-40 for each bullet point
- Use "draw_rect" with light background colors (#e0f2fe, #fef3c7, #dcfce7) for highlighting boxes
- Use "draw_line" for lines and dividers
- Use "draw_arrow" for pointing to relationships
- Use "draw_circle" for emphasis circles
- Only include whiteboard_commands when you actually want to draw something
- The dialogue should contain your full explanation

If you don't need to draw anything, respond with just:
{ "dialogue": "Your response here...", "whiteboard_commands": [] }`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages,
        ],
        max_tokens: generateQuiz ? 800 : 2048,
        temperature: generateQuiz ? 0.3 : 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Try to parse the response as JSON to extract whiteboard commands
    let content = rawContent;
    let whiteboardCommands: any[] = [];
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawContent.match(/\{[\s\S]*"dialogue"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        content = parsed.dialogue || rawContent;
        whiteboardCommands = parsed.whiteboard_commands || [];
      }
    } catch (parseError) {
      // If parsing fails, treat the whole response as dialogue and use client-side parsing
      console.log("Response was not in JSON format, using client-side parsing");
    }

    return new Response(
      JSON.stringify({ content, whiteboardCommands, course }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});