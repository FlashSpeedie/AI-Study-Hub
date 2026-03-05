import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyllabusCategory {
  name: string;
  weight: number;
}

interface SyllabusData {
  subjectName: string;
  categories: SyllabusCategory[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pdfContent, fileName } = await req.json();

    if (!pdfContent) {
      return new Response(
        JSON.stringify({ error: "PDF content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert at analyzing course syllabi. Your task is to extract course and grading information from syllabus text.

Extract the following from the syllabus:

1. COURSE/SUBJECT NAME: The name of the course (e.g., "Introduction to Computer Science", "Calculus I", "Physics 101")
2. GRADING CATEGORIES: All grading categories and their weight percentages

Common grading categories include:
- Exams, Tests, Quizzes
- Homework, Assignments
- Projects
- Labs
- Participation
- Final Exam
- Presentations
- Essays/Papers
- Attendance
- Midterm
- Final Project

For each grading category, provide:
1. The category name (standardize common variations)
2. The weight percentage (as a number)

IMPORTANT: 
- Return ONLY a valid JSON object with "subjectName" and "categories" properties
- Do NOT include any other text or explanation
- The category weights should sum to 100% (or close to it)
- If you cannot find exact percentages, estimate based on typical course structures but note it
- Extract EVERY category mentioned, don't skip any
- Look for the course name in the title, header, or first page of the syllabus
- If you cannot find grading information, return an empty categories array and set subjectName to empty string

Example output format:
{"subjectName": "CS 101: Introduction to Programming", "categories": [{"name": "Exams", "weight": 40}, {"name": "Homework", "weight": 30}, {"name": "Projects", "weight": 20}, {"name": "Participation", "weight": 10}]}`;

    const userMessage = `Extract all grading categories and their weight percentages from this course syllabus file: ${fileName}

Please analyze the syllabus content and extract the grading breakdown. Look for sections like:
- Grading
- Evaluation  
- Grading Policy
- Grade Breakdown
- Assessment
- Course Requirements
- Tests and Exams
- Homework
- Projects
- Participation
- Final Exam

Return a JSON object with:
- "subjectName": The course name
- "categories": Array of {name, weight} objects for each grading category

If you cannot find clear grading information, still try to identify any mentioned categories and estimate weights, or return an empty array if absolutely nothing is found.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    const geminiRequest = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: userMessage }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
        responseMimeType: "application/json"
      }
    };

    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequest),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", errorText);
      
      if (aiResponse.status === 401 || errorText.includes("API_KEY_INVALID")) {
        throw new Error("Invalid Gemini API key. Please check your GEMINI_API_KEY in the environment variables.");
      } else if (aiResponse.status === 403 || errorText.includes("permission")) {
        throw new Error("Gemini API access denied. Please check your API key permissions.");
      } else if (aiResponse.status === 429) {
        throw new Error("Gemini API rate limit exceeded. Please try again later.");
      }
      throw new Error(`Failed to analyze syllabus with AI: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("Gemini response structure:", aiData);
      throw new Error("No content returned from Gemini AI. The response format was unexpected.");
    }

    let categories: SyllabusCategory[] = [];
    let subjectName = "";
    
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.subjectName) {
        subjectName = parsed.subjectName;
      } else if (parsed.courseName) {
        subjectName = parsed.courseName;
      } else if (parsed.course) {
        subjectName = parsed.course;
      } else if (parsed.name) {
        subjectName = parsed.name;
      }
      
      if (Array.isArray(parsed)) {
        categories = parsed;
      } else if (parsed.categories) {
        categories = Array.isArray(parsed.categories) ? parsed.categories : [];
        
        if (categories.length === 0) {
          const keys = Object.keys(parsed);
          for (const key of keys) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0 && typeof parsed[key][0] === 'object') {
              categories = parsed[key];
              break;
            }
          }
        }
      } else if (parsed.grading || parsed.gradeBreakdown || parsed.assessments) {
        categories = parsed.grading || parsed.gradeBreakdown || parsed.assessments;
      }
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("Raw content:", content);
      throw new Error("Failed to parse AI response as JSON. The AI returned invalid JSON format.");
    }

    categories = categories.filter((cat: SyllabusCategory) => 
      cat.name && typeof cat.weight === "number" && cat.weight > 0
    );

    if (categories.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          subjectName: subjectName,
          categories: [],
          message: "Could not find clear grading categories in the syllabus. Please add them manually."
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subjectName: subjectName,
        categories: categories,
        message: `Found ${categories.length} grading categories for ${subjectName || 'unknown course'}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
