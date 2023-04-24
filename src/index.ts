import { existsSync, readFileSync, writeFileSync } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { Subject, throttleTime } from "rxjs";

const DEFAULT_FILENAME = "settings.json";
const DEFAULT_TIMEOUT = 100;

export interface SettingsConfig<T> {

  /**
   * Initial settings values
   */
  initial: T,

  /**
   * The path to the settings file within the user's home
   * For example: `.neonfish` results in the path: `~/.neonfish/`
   */
  path: string,

  /**
   * The name of the settings file at the specified path
   * @default settings.json
   */
  fileName?: string,

  /**
   * The `path` setting is an absolute path, and the user's home will not be prepended
   * @default false
   */
  pathIsAbsolute?: boolean,

  /**
   * A timeout in milliseconds to throttle save operations.
   * 
   * This allows `save()` to be called as often as the application likes without worrying
   * about interactions with the filesystem.
   * 
   * Set to `0` to disable this feature.
   * @default 100
   */
  timeout?: number,

  /**
   * Optionally provide a custom logger
   */
  logger?: SettingsLogger,

  /**
   * Settings are indented when stringified by default (using `JSON.stringify(s, null, 2)` ).
   * 
   * Set `dense` to true to disable this indentation (i.e. stringify using `JSON.stringify(s)` ).
   */
  dense?: boolean,

}

export interface SettingsLogger {
  debug: (...msgs: any[]) => any,
  log: (...msgs: any[]) => any,
  warn: (...msgs: any[]) => any,
  error: (...msgs: any[]) => any,
}

export class Settings<T> {

  /**
   * The current settings values.
   * `save()` must be explicitly called after modifying the values.
   */
  values: T;

  /** Internal observable used for throttling save requests */
  private requestSave = new Subject<void>();

  /** The path to the settings file */
  private filePath: string;
  /** The name of the settings file */
  private fileName: string;
  /** The full file path to the settings file */
  private fullFilePath: string;

  private logger: SettingsLogger = console;
  private dense: boolean = false;
  private timeout: number = DEFAULT_TIMEOUT;

  constructor(config: SettingsConfig<T>) {

    this.values = JSON.parse(JSON.stringify(config.initial));

    if (config.pathIsAbsolute) {
      this.filePath = config.path;
    } else {
      this.filePath = join(homedir(), config.path);
    }

    this.fileName = config.fileName ?? DEFAULT_FILENAME;
    if (!this.fileName.endsWith(".json")) {
      this.fileName = this.fileName + ".json";
    }

    this.fullFilePath = join(this.filePath, this.fileName);

    if (config.logger) { this.logger = config.logger; }
    if (config.dense) { this.dense = config.dense; }
    if (config.timeout !== undefined) { this.timeout = config.timeout; }

    // Throttle save requests so the application can call save() as fast as it likes
    this.requestSave.pipe(
      throttleTime(this.timeout, undefined, { trailing: true }),
    ).subscribe(_ => {
      this.doSave();
    });

    this.logger.log(`Created Settings (at: ${this.fullFilePath})`);
    this.loadSync();
  }

  /**
   * Load the saved settings values.
   * 
   * This is called on creation to load initial settings, and is synchronous to ensure
   * the latest settings are loaded at startup.
   * 
   * It is recommended that the application use `load()` to revert the current settings
   * to the stored values instead of using this method.
   */
  loadSync() {
    this.logger.debug(`Loading settings...`);

    if (existsSync(this.fullFilePath)) {
      try {
        const result = readFileSync(this.fullFilePath, { encoding: "utf-8" });
        this.values = this.parseLoadedSettings(JSON.parse(result));
        this.logger.log(`Loaded settings`);
      } catch (error) {
        this.logger.error(`Error loading settings: ${error}`);
      }
    } else {
      this.logger.log(`No settings file found, saving initial settings...`);
      this.save();
    }

  }

  /**
   * 
   */
  async load() {
    this.logger.debug(`Loading settings...`);

    try {
      const result = readFileSync(this.fullFilePath, { encoding: "utf-8" });
      this.values = this.parseLoadedSettings(JSON.parse(result));
      this.logger.log(`Loaded settings`);
    } catch (error) {
      this.logger.error(`Error loading settings:`, error);
    }

  }

  /**
   * Save the current settings.
   * 
   * If there is no timeout, the save is performed immediately. Otherwise, the save
   * may be delayed depending on when the last save occurred.
   */
  async save() {
    if (this.timeout === 0) {
      return this.doSave();
    } else {
      this.requestSave.next();
    }
  }

  /**
   * 
   */
  private async doSave() {
    this.logger.debug(`Saving settings...`);

    try {
      const dirStat = await stat(this.filePath);
    } catch (error) {
      this.logger.debug(`Stat error:`, error);
      this.logger.log(`Error accessing settings path; ensuring directory exists...`);
      await mkdir(this.filePath, { recursive: true });
    }

    try {
      await writeFile(this.fullFilePath, this.stringified(), { encoding: "utf-8" });
      this.logger.log(`Saved settings`);
    } catch (error) {
      this.logger.error(`Error saving settings:`, error);
    }

  }

  /**
   * Get the stringified version of the settings values
   * @returns 
   */
  private stringified(): string {
    return this.dense
      ? JSON.stringify(this.values)
      : JSON.stringify(this.values, null, 2);
  }

  private parseLoadedSettings(loadedObject: any): T {

    const settings: T = JSON.parse(JSON.stringify(this.values));
    const loadedSettings = loadedObject as Partial<T>;

    this.mergeDeep(settings, loadedSettings);

    return settings;
  }

  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
  private mergeDeep(target: any, ...sources: any[]): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.mergeDeep(target, ...sources);
  }

  /**
   * Simple object check.
   * @param item
   * @returns {boolean}
   */
  private isObject(item: any): boolean {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item));
  }

}
