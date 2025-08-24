import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

import { z } from "zod";
import { createModel, GENERAL_SYSTEM_PROMPT } from "./analyzer";

const AnalyzerSchema = z.object({
	profile: z.object({
		name: z.string(),
		description: z.string(),
	}),
	prompt: z.string(),
	note: z.string(),
});

interface LynxPluginSettings {
	mySetting: string;
	profiles: LynxProfile[];
	geminiApiKey: string;
}

interface LynxProfile {
	name: string;
	description: string;
	prompt: string;
	fileName: string;
}

const DEFAULT_SETTINGS: LynxPluginSettings = {
	mySetting: "default",
	profiles: [],
	geminiApiKey: "",
};

export default class LynxPlugin extends Plugin {
	settings: LynxPluginSettings;
	profiles: LynxProfile[] = [];

	async onload() {
		await this.loadSettings();

		// Load profiles from settings
		this.profiles = this.settings.profiles;
		console.log("profiles", this.profiles);

		this.addRibbonIcon("dice", "Greet", () => {
			new Notice("Hello, world!");
		});

		this.addCommand({
			id: "create-ai-profile",
			name: "Create AI Profile",
			callback: () => {
				new ProfileCreationModal(
					this.app,
					this,
					(profile, description, prompt) => {
						this.createProfile(profile, description, prompt);
					}
				).open();
			},
		});

		this.addCommand({
			id: "enhance-note",
			name: "Enhance Note",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();
				if (!selectedText.trim())
					return new Notice("Select a Text Section First!");

				const profile = this.profiles.find(
					(profile) => profile.fileName === view.file?.path
				);

				if (!profile)
					return new Notice("No profile found for this note!");

				const prompt = profile.prompt;

				const gemini = await createModel(this.settings.geminiApiKey);
				if (!gemini) throw new Error("Failed to create model");

				const fullPrompt = `${GENERAL_SYSTEM_PROMPT}
					Profile Name: ${profile.name}
					Profile Description: ${profile.description}
					Task Prompt: ${prompt}
			
					Note Content:
					${selectedText}`;

				try {
					const response = await gemini.models.generateContentStream({
						model: "gemini-2.5-flash-lite",
						contents: fullPrompt,
					});

					const endOfSelection = editor.getCursor("to");

					editor.replaceRange("\n\n", endOfSelection);

					let insertPosition = {
						line: endOfSelection.line + 2,
						ch: 0,
					};

					for await (const chunk of response) {
						const chunkText = chunk.text || "";
						editor.replaceRange(chunkText, insertPosition);

						const lines = chunkText.split("\n");
						if (lines.length > 1) {
							// Multi-line chunk
							insertPosition = {
								line: insertPosition.line + lines.length - 1,
								ch: lines[lines.length - 1].length,
							};
						} else {
							// Single line chunk
							insertPosition = {
								line: insertPosition.line,
								ch: insertPosition.ch + chunkText.length,
							};
						}
					}
				} catch (error) {
					console.error("AI generation failed:", error);
					new Notice(
						"Failed to generate content. Check your API key and try again."
					);
				}

				new Notice("Lynx has successfully enhanced your note!");
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LynxSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createProfile(
		profileName: string,
		profileDescription: string,
		profilePrompt: string
	) {
		const profile: LynxProfile = {
			name: profileName,
			description: profileDescription,
			prompt: profilePrompt,
			fileName: this.app.workspace.getActiveFile()?.path || "",
		};

		this.profiles.push(profile);
		this.settings.profiles = this.profiles;
		await this.saveSettings();

		console.log("profile created", profile);
	}
}

class ProfileCreationModal extends Modal {
	plugin: LynxPlugin;
	onSubmit: (profile: string, description: string, prompt: string) => void;

	constructor(
		app: App,
		plugin: LynxPlugin,
		onSubmit: (profile: string, description: string, prompt: string) => void
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.setTitle("Create a new AI Profile");
	}

	profileName: string;
	profileDescription: string;
	profilePrompt: string;
	fileName: string;

	profiles: LynxProfile[] = [];
	filteredFiles: TFile[] = [];

	onOpen() {
		this.profiles = this.plugin.profiles || [];
		console.log("profiles", this.profiles);
		this.filteredFiles = this.app.vault.getFiles().filter((file) => {
			return !this.profiles.some(
				(profile) => profile.fileName === file.path
			);
		});

		const { contentEl } = this;
		contentEl.createEl("p", {
			text: "Profiles should be distinct for each note file, thus you cannot select the same file twice in the options.",
		});

		const profileCreationDiv = contentEl.createEl("div", {
			cls: "profile-creation-container",
		});
		const profileNameField = profileCreationDiv.createEl("input", {
			placeholder: "Enter a name for the profile",
		});

		profileNameField.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLInputElement;
			this.profileName = target.value;
		});

		const profileDescription = profileCreationDiv.createEl("textarea");
		profileDescription.placeholder = "Enter a description of the profile";

		profileDescription.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLTextAreaElement;
			this.profileDescription = target.value;
		});

		const profilePrompt = profileCreationDiv.createEl("textarea");
		profilePrompt.placeholder =
			"Specify how you want the AI to summarize, enhance, or process the notes";
		profilePrompt.required = true;

		profilePrompt.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLTextAreaElement;
			this.profilePrompt = target.value;
		});

		const selectLabel = profileCreationDiv.createEl("label", {
			text: "Select a file:",
		});

		const selectedFile = profileCreationDiv.createEl("select");
		selectLabel.setAttribute("for", "file-select");
		selectedFile.setAttribute("id", "file-select");
		selectedFile.required = true;

		this.filteredFiles.forEach((file) => {
			const option = selectedFile.createEl("option", {
				text: file.basename,
				value: file.path,
			});
			option.value = file.path;
		});

		selectedFile.addEventListener("change", (event: Event) => {
			const target = event.target as HTMLInputElement;
			this.fileName = target.value;
		});

		const createProfileButton = profileCreationDiv.createEl("button", {
			text: "Create Profile",
		});

		createProfileButton.addEventListener("click", () => {
			if (
				!this.profileName ||
				!this.profileDescription ||
				!this.profilePrompt ||
				!this.fileName
			) {
				new Notice("Please fill in all fields");
				return;
			}

			this.close();
			this.onSubmit(
				this.profileName,
				this.profileDescription,
				this.profilePrompt
			);
		});
	}
}

class LynxSettingTab extends PluginSettingTab {
	plugin: LynxPlugin;

	constructor(app: App, plugin: LynxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Gemini API Key")
			.setDesc("Enter your Google Gemini API key")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Gemini API key")
					.setValue(this.plugin.settings.geminiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.geminiApiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
