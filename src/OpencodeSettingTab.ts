import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { Plugin } from "obsidian";
import { normalizeNonEmptyString, OpenLocation } from "./settings";
import { OpencodeSettings } from "./settings";

interface OpencodeSettingsPlugin extends Plugin {
  settings: OpencodeSettings;
  saveSettings(): Promise<void>;
}

const OPEN_LOCATION_LABELS: Record<OpenLocation, string> = {
  left: "Left sidebar",
  right: "Right sidebar",
  split: "Split right of active pane",
  tab: "New tab",
};

export class OpencodeSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: OpencodeSettingsPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Agent name")
      .setDesc("Display name for the terminal agent.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.agentName)
          .onChange(async (value) => {
            this.plugin.settings.agentName = normalizeNonEmptyString(value, "opencode");
            await this.plugin.saveSettings();
            new Notice("Restart Obsidian to apply the agent name.");
          });
      });

    new Setting(containerEl)
      .setName("Agent command")
      .setDesc("Command to run inside the vault root, for example opencode.cmd, codex, or claude.")
      .addText((text) => {
        text
          .setPlaceholder("opencode.cmd")
          .setValue(this.plugin.settings.agentCommand)
          .onChange(async (value) => {
            this.plugin.settings.agentCommand = normalizeNonEmptyString(value, "opencode.cmd");
            await this.plugin.saveSettings();
            new Notice("Restart Obsidian to apply the agent command.");
          });
      });

    new Setting(containerEl)
      .setName("Open location")
      .setDesc("Choose where the Opencode view opens.")
      .addDropdown((dropdown) => {
        dropdown
          .addOptions(OPEN_LOCATION_LABELS)
          .setValue(this.plugin.settings.openLocation)
          .onChange(async (value) => {
            this.plugin.settings.openLocation = value as OpenLocation;
            await this.plugin.saveSettings();
          });
      });
  }
}
