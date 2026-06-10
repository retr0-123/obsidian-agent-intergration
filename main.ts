import { Plugin, WorkspaceLeaf } from "obsidian";
import { OpencodeSession } from "./src/OpencodeSession";
import { OpencodeView, VIEW_TYPE_OPENCODE } from "./src/OpencodeView";
import { OpencodeSettingTab } from "./src/OpencodeSettingTab";
import { normalizeSettings, OpencodeSettings } from "./src/settings";
import "./src/styles.css";

export default class OpencodePlugin extends Plugin {
  settings: OpencodeSettings;
  private session: OpencodeSession;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.session = new OpencodeSession(this.app, this.manifest.dir, this.settings.agentCommand);
    this.session.start();

    this.registerView(
      VIEW_TYPE_OPENCODE,
      (leaf: WorkspaceLeaf) => new OpencodeView(leaf, this.session, this.settings.agentName),
    );

    this.addRibbonIcon("terminal", `Open ${this.settings.agentName}`, () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-opencode",
      name: `Open ${this.settings.agentName}`,
      callback: () => {
        void this.activateView();
      },
    });

    this.addSettingTab(new OpencodeSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_OPENCODE);
    this.session?.dispose();
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_OPENCODE).first();

    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.getTargetLeaf();
    await leaf.setViewState({
      type: VIEW_TYPE_OPENCODE,
      active: true,
    });
    this.app.workspace.revealLeaf(leaf);
  }

  private getTargetLeaf(): WorkspaceLeaf {
    if (this.settings.openLocation === "right") {
      return this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf("tab");
    }

    if (this.settings.openLocation === "left") {
      return this.app.workspace.getLeftLeaf(false) || this.app.workspace.getLeaf("tab");
    }

    if (this.settings.openLocation === "split") {
      return this.app.workspace.getLeaf("split", "vertical");
    }

    return this.app.workspace.getLeaf("tab");
  }

  private async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
