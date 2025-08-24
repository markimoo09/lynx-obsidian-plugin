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

import { analyzeNote } from "./analyzer";

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

				const result = await analyzeNote(
					{
						profile: {
							name: profile.name,
							description: profile.description,
						},
						prompt: profile.prompt,
						note: selectedText,
					},
					this.settings.geminiApiKey
				);

				if (result) {
					console.log("result", result);
				}
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
