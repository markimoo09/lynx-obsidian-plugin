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

	async onOpen() {
		const container = this.contentEl;
		container.createEl("h1", { text: "Chat Pannel" });
	}

	async onClose() {}
}
