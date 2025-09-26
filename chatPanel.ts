import { ItemView, WorkspaceLeaf } from "obsidian";

export const CHAT_PANNEL_VIEW_TYPE = "chat-pannel";

export class ChatPannelView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return CHAT_PANNEL_VIEW_TYPE;
	}

	getDisplayText() {
		return "Chat Pannel";
	}

	message: string;

	async onOpen() {
		const container = this.contentEl;
		const mainDiv = container.createEl("div", {
			cls: "chat-panel-container",
		});

		const convoWindow = mainDiv.createEl("div");

		const chatInputWindow = mainDiv.createEl("div", {
			cls: "chat-input-container",
		});

		const chatInput = chatInputWindow.createEl("textarea");
		chatInput.placeholder = "Enter a message";

		// Auto-resize textarea
		const autoResize = () => {
			chatInput.style.height = "auto";
			chatInput.style.height = chatInput.scrollHeight + "px";
		};

		chatInput.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLInputElement;
			this.message = target.value;
			autoResize();
		});

		// Initial resize
		autoResize();

		const chatInputButtonRow = chatInputWindow.createEl("div", {
			cls: "chat-input-button-row",
		});

		const sendButton = chatInputButtonRow.createEl("button", {
			text: "↑",
		});
	}

	async onClose() {}
}
