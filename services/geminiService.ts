import { GoogleGenAI, Type, ChatSession } from "@google/genai";
import type { Schema } from "@google/genai";
import { PodcastAssets } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment. Make sure GEMINI_API_KEY is set.");
  }
  console.log('API Key present:', apiKey ? 'Yes' : 'No');
  return new GoogleGenAI({ apiKey });
};

export const generatePodcastAssets = async (transcript: string): Promise<PodcastAssets> => {
  const ai = getAIClient();

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      episodeTitles: {
        type: Type.ARRAY,
        description: "A list of 3 to 5 viral, high-CTR titles. Only include titles that pass the 'curiosity gap' test. If only 2 are excellent, only provide 2. Do not exceed 5.",
        items: { type: Type.STRING }
      },
      hook: {
        type: Type.STRING,
        description: "A 'Cold Open' paragraph for the show notes. Start with a story, a shocking stat, or a counter-intuitive statement from the episode. Do NOT start with 'In this episode'.",
      },
      showNotes: {
        type: Type.STRING,
        description: "Optimized text for Apple Podcasts/Spotify/YouTube Audio. BEST PRACTICES: 1. First sentence must hook the listener immediately (no 'In this episode'). 2. Include a 'What You Will Learn' section with 3-5 bullet points. 3. Brief 'Resources' section placeholder. Total length under 300 words. Use basic formatting.",
      },
      blogPost: {
        type: Type.STRING,
        description: "A comprehensive, SEO-optimized blog post for the podcaster's website (600-800 words). Use H2 headers (Markdown ##) to break up text. Use a storytelling tone. Optimize for readability with short paragraphs.",
      },
      timestamps: {
        type: Type.ARRAY,
        description: "EXTREMELY IMPORTANT: Only extract timestamps if they explicitly exist in the source text (like an SRT file). If the source text has no timecodes, return an empty array. DO NOT INVENT TIMESTAMPS.",
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            topic: { type: Type.STRING },
          },
        },
      },
      newsletterDraft: {
        type: Type.STRING,
        description: "A personal, 'friend-to-friend' email draft. Use a curiosity-based subject line. Use the 'Story-Lesson-Link' framework.",
      },
      guestSwipeEmail: {
        type: Type.STRING,
        description: "An email written from the perspective of the GUEST to send to THEIR audience promoting this appearance. Flatter the host slightly.",
      },
      linkedinCarousel: {
        type: Type.ARRAY,
        description: "Content for a 5-7 slide educational carousel (PDF style).",
        items: {
          type: Type.OBJECT,
          properties: {
            slideNumber: { type: Type.INTEGER },
            title: { type: Type.STRING, description: "Big bold text for the slide" },
            content: { type: Type.STRING, description: "Supporting details for the slide" },
          },
        },
      },
      viralQuotes: {
        type: Type.ARRAY,
        description: "3-5 short, punchy, tweetable quotes from the transcript. Under 280 characters.",
        items: { type: Type.STRING },
      },
      socialHooks: {
        type: Type.ARRAY,
        description: "3 distinct social media angles (e.g., Controversial, Story-driven, Data-driven).",
        items: {
          type: Type.OBJECT,
          properties: {
            platform: { type: Type.STRING },
            content: { type: Type.STRING },
          },
        },
      },
      youtube: {
        type: Type.OBJECT,
        description: "Assets specifically for YouTube optimization.",
        properties: {
          titles: {
             type: Type.ARRAY,
             description: "3 options for YouTube titles. Must be click-driven, under 60 chars. (e.g., 'I Quit Sugar (Here is what happened)')",
             items: { type: Type.STRING }
          },
          description: {
             type: Type.STRING,
             description: "First 3 lines of the YouTube description. Must include keywords and a link hook."
          },
          thumbnailText: {
             type: Type.ARRAY,
             description: "3 options for text overlay on the thumbnail image. Short (2-4 words). e.g., 'STOP DOING THIS'.",
             items: { type: Type.STRING }
          },
          tags: {
             type: Type.ARRAY,
             items: { type: Type.STRING }
          },
          shorts: {
             type: Type.ARRAY,
             description: "Identify 3 moments that would make viral 60-second shorts.",
             items: {
                type: Type.OBJECT,
                properties: {
                   timestamp: { type: Type.STRING },
                   hook: { type: Type.STRING, description: "Why this specific moment will stop the scroll." },
                   score: { type: Type.INTEGER, description: "Viral potential score 1-10" }
                }
             }
          }
        }
      }
    },
    required: ["episodeTitles", "hook", "showNotes", "blogPost", "timestamps", "newsletterDraft", "guestSwipeEmail", "linkedinCarousel", "viralQuotes", "socialHooks", "youtube"],
  };

  // Using gemini-2.5-flash for speed and large context window
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", 
    contents: {
      parts: [
        {
          text: `
            You are 'The Content Factory', a world-class showrunner for top health and wellness influencers like Mel Robbins, Lewis Howes, and JJ Virgin.
            
            **YOUR STYLE GUIDE (CRITICAL):**
            1.  **NO AI FLUFF:** Banned words: "Delves into", "Comprehensive landscape", "Uncover", "Realm", "Tapestry", "Game-changer", "In this episode...".
            2.  **TONE:** High-energy, empathetic, direct, and value-driven. Speak to the listener's pain points and desired identity.
            3.  **FORMAT:** Use short paragraphs. Punchy sentences.
            4.  **TITLES:** Provide 3-5 options.
            5.  **TIMESTAMPS:** CRITICAL. Only return timestamps if the user provided an SRT or text with explicit timecodes (e.g., [00:12:30]). If it's a plain text block, return an empty array for timestamps. Do NOT hallucinate times.
            
            **DELIVERABLES:**
            1. **Platform Show Notes:** Optimized for Apple Podcasts. Short, punchy, bullet points.
            2. **Blog Post:** Long-form, SEO optimized, H2 headers, detailed.
            3. **Other Assets:** As per schema.

            TRANSCRIPT:
            ${transcript}
          `,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.4, 
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response generated from Gemini.");
  }

  try {
    return JSON.parse(text) as PodcastAssets;
  } catch (error) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Failed to parse generated assets.");
  }
};

export const createChatSession = (transcript: string) => {
  const ai = getAIClient();
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: [
      {
        role: 'user',
        parts: [{ text: `Here is the transcript for the podcast episode I am working on. Please use this context to answer my future questions. \n\n ${transcript}` }],
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I have analyzed the transcript and am ready to help you refine content, write new posts, or answer specific questions about the episode." }],
      },
    ],
  });
  return chat;
};