import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const AnalyzerSchema = z.object({
	profile: z.object({
		name: z.string(),
		description: z.string(),
	}),
	prompt: z.string(),
	note: z.string(),
});

const GENERAL_SYSTEM_PROMPT = `
You are a helpful notes assistant that will enhance, summarize, or process notes to make it more meanginful, organized, and useful.

You will be given a 'profile' for the note that you will be analyzing and enhancing. This profile will contain a description of the note and give you context.
In the profile, you will also be given a prompt that will guide you on what to do and how to do it.

Note Enhancement Process:
- Analyze and Understand the Context of the Note Profile (description and name)
- Understand the Prompt Guidelines
- Analyze the note content itself
- Perform the task specified in the prompt

`;

const gemini = new GoogleGenAI({
	apiKey: GEMINI_API_KEY,
});

async function analyzeNote(data: z.infer<typeof AnalyzerSchema>) {
	// Validate data structure
	try {
		AnalyzerSchema.parse(data);
	} catch (error) {
		console.error("Invalid data structure:", error);
		return null;
	}

	const { profile, prompt, note } = data;

	const response = await gemini.models.generateContent({
		model: "gemini-2.5-flash-lite",
		contents: "",
	});
}
