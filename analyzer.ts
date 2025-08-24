import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { Notice } from "obsidian";

const AnalyzerSchema = z.object({
	profile: z.object({
		name: z.string(),
		description: z.string(),
	}),
	prompt: z.string(),
	note: z.string(),
});

const GENERAL_SYSTEM_PROMPT = `
You are Lynx, a helpful notes assistant that will enhance, summarize, or process notes to make it more meanginful, organized, and useful.

You will be given a 'profile' for the note that you will be analyzing and enhancing. This profile will contain a description of the note and give you context.
You will also be given a prompt that will guide you on what to do and how to do it.
Then you will also receive the note content itself which is in markdown format.

Note Enhancement Process:
- Analyze and Understand the Context of the Note Profile (description and name)
- Understand the Prompt Guidelines
- Analyze the note content itself
- Perform the task specified in the prompt

Lastly, you are required to return the enhanced note in markdown format.

`;

export async function analyzeNote(
	data: z.infer<typeof AnalyzerSchema>,
	apiKey: string
) {
	// Validate data structure
	try {
		AnalyzerSchema.parse(data);
	} catch (error) {
		console.error("Invalid data structure:", error);
		return null;
	}

	if (!apiKey) {
		new Notice(
			"No API key provided. Please set your API key in the plugin settings."
		);
		return null;
	}

	const gemini = new GoogleGenAI({
		apiKey: apiKey,
	});

	const { profile, prompt, note } = data;

	const fullPrompt = `${GENERAL_SYSTEM_PROMPT}
    Profile Name: ${profile.name}
    Profile Description: ${profile.description}
    Task Prompt: ${prompt}

    Note Content:
    ${note}`;

	try {
		const response = await gemini.models.generateContent({
			model: "gemini-2.5-flash-lite",
			contents: fullPrompt,
		});

		new Notice("Lynx has successfully enhanced your note!");
		return response.text;
	} catch (error) {
		console.error("AI generation failed:", error);
		new Notice(
			"Failed to generate content. Check your API key and try again."
		);
		return null;
	}
}
