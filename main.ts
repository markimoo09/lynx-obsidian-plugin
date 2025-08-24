import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface LynxPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: LynxPluginSettings = {
	mySetting: "default",
};

export default class LynxPlugin extends Plugin {
	settings: LynxPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("dice", "Greet", () => {
			new Notice("Hello, world!");
		});

		this.addCommand({
			id: "create-ai-profile",
			name: "Create AI Profile",
			callback: () => {
				new ProfileCreationModal(this.app, (profile, description) => {
					console.log(profile, description);
				}).open();
			},
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LynxSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

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
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ProfileCreationModal extends Modal {
	onSubmit: (profile: string, description: string) => void;

	constructor(
		app: App,
		onSubmit: (profile: string, description: string) => void
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.setTitle("Create a new AI Profile");
	}

	profileName: string;
	profileDescription: string;

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("p", {
			text: "Profiles should be distinct for each note file and will help the AI understand the context of the note.",
		});

		const profileCreationDiv = contentEl.createEl("div", {
			cls: "profile-creation-container",
		});
		const profileNameField = profileCreationDiv.createEl("input", {
			placeholder: "Profile Name",
		});

		profileNameField.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLInputElement;
			this.profileName = target.value;
		});

		const profileDescription = profileCreationDiv.createEl("textarea", {
			placeholder: "Profile Description",
		});

		profileDescription.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLTextAreaElement;
			this.profileDescription = target.value;
		});

		const createProfileButton = profileCreationDiv.createEl("button", {
			text: "Create Profile",
		});

		createProfileButton.addEventListener("click", () => {
			this.close();
			this.onSubmit(this.profileName, this.profileDescription);
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
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
