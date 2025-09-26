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
		const mainDiv = container.createEl("div");

		const convoWindow = mainDiv.createEl("div");

		const chatInputWindow = mainDiv.createEl("div");
		const chatInput = chatInputWindow.createEl("input", {
			placeholder: "Enter a message",
		});

		chatInput.addEventListener("input", (event: Event) => {
			const target = event.target as HTMLInputElement;
			this.message = target.value;
		});

		const sendButton = chatInputWindow.createEl("button", {
			text: "Send",
		});
	}

	async onClose() {}
}
