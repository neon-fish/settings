import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DEFAULT_SETTINGS_FILENAME = "settings.json";

export interface SettingsSettings<T> {
  /**
   * Initial settings values
   */
  initial: T,
  /**
   * The path within the user's home
   */
  path: string,
  /**
   * The name of the settings file
   * @default settings.json
   */
  fileName?: string,
  /**
   * The `path` setting is an absolute path, and the user's home will not be prepended
   */
  pathIsAbsolute?: boolean,
}

export class Settings<T> {

  settings: T;

  private filePath: string;

  constructor(settings: SettingsSettings<T>) {
    this.settings = settings.initial;

  }

  load() {
    const cassDir = Utils.getCassDir();
    const settingsFilePath = join(cassDir, DEFAULT_SETTINGS_FILENAME);

    if (existsSync(settingsFilePath)) {
      const settingsFileStr = readFileSync(settingsFilePath, { encoding: "utf-8" });
      const loadedSettings = JSON.parse(settingsFileStr) as Partial<SettingsValues>;
      
      if (loadedSettings.model !== undefined) this.settings.model = loadedSettings.model;
      if (loadedSettings.totalTokens !== undefined) this.settings.totalTokens = loadedSettings.totalTokens;
      if (loadedSettings.responseTokensMax !== undefined) this.settings.responseTokensMax = loadedSettings.responseTokensMax;
      if (loadedSettings.historyTokensMax !== undefined) this.settings.historyTokensMax = loadedSettings.historyTokensMax;
      if (loadedSettings.userName !== undefined) this.settings.userName = loadedSettings.userName;
      if (loadedSettings.userLocation !== undefined) this.settings.userLocation = loadedSettings.userLocation;

    } else {
      this.save();
    }
  }

  save() {
    const cassDir = Utils.getCassDir();
    const settingsFilePath = join(cassDir, DEFAULT_SETTINGS_FILENAME);

    writeFileSync(settingsFilePath, JSON.stringify(this.settings, null, 2), { encoding: "utf-8" });
  }

}
