
# Settings

Simple library to save and load JSON settings to/from the user's home directory.

The file can of course contain anything, not just settings, and may be located anywhere on the filesystem, not just home.

The settings values are typed, based on the type of the initial values. A type parameter may be passed to the constructor for more control.

# Installation

```
$ npm i @neonfish/settings
```

Typescript type definitions are included.

# Examples

## Simple example

This example shows the basic setup, and demonstrates that nested objects and arrays are supported.

```typescript
// Example settings object, with nested object and array
const INITIAL_SETTINGS = {
  maxConnections: 10,
  userName: "User",
  ui: {
    collapsed: false,
    accent: "#123abc",
  },
  friends: ["Alice", "Bob", "Charlie"],
};

// If any settings are saved in the target file, they are loaded synchronously
const settings = new Settings({
  initial: INITIAL_SETTINGS,
  path: "my-application", // for file path: `~/my-application/settings.json`
});

// The current values are available at:
settings.values

// Values can be read and written directly:
console.log(settings.values.userName);
settings.values.userName = "Brian";

// Updated values can be saved using:
await settings.save();
// Note: if saving is throttled, this promise will resolve immediately. The actual save
// will be performed later, up to `timeout` milliseconds (default 100ms)

// Settings can be loaded from file using:
await settings.load();

// `save()` is throttled by default, so the application can save as often as it likes:
for (let i = 0; i < 1000; i++) {
  settings.values.ui.collapsed = !settings.values.ui.collapsed;
  settings.save();
}
```

## Current Working Directory

This example shows loading configuration settings from a file named `config.json` in the current working directory, instead of `settings.json` from the user's home.

```typescript
const DEFAULT_CONFIG = {
  hostname: "Host",
  port: 3000,
  connectionTimeoutMs: 10_000,
};

const config = new Settings({
  initial: DEFAULT_CONFIG,
  pathIsAbsolute: true,
  path: process.cwd(),
  fileName: "config.json",
});

console.log("Loaded config:");
console.log(config.values);
```

# Options

```typescript
// Initial values are loaded from an existing file synchronously, if one is found.
// If no file is found, the initial values are saved to create the file,
// with the directory structure being created recursively.
const settings = new Settings<T>({
  /**
   * Initial settings values. This object is dereferenced, so the settings cannot be
   * accidentally modified by editing this object later.
   */
  initial: T,
  /**
   * The path to the settings file within the user's home.
   * For example: `.neonfish` results in the path: `~/.neonfish/`
   */
  path: string,
  /**
   * The name of the settings file at the specified path
   * @default "settings.json"
   */
  fileName?: string,
  /**
   * The `path` setting is an absolute path, and the user's home will not be prepended
   * @default: false,
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
   * Optionally provide a custom logger.
   * 
   * `interface SettingsLogger {
   *   debug: (...msgs: any[]) => any,
   *   log: (...msgs: any[]) => any,
   *   warn: (...msgs: any[]) => any,
   *   error: (...msgs: any[]) => any,
   * }`
   */
  logger?: SettingsLogger,
  /**
   * Settings are indented when stringified by default (using `JSON.stringify(s, null, 2)` ).
   * 
   * Set `dense` to true to disable this indentation (i.e. stringify using `JSON.stringify(s)` ).
   */
  dense?: boolean,
});
```
