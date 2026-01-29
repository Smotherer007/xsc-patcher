# xsc-patcher

A simple command-line utility to apply binary patches defined in XVI32-compatible `.xsc` script files. It searches for specific hexadecimal byte sequences in a target file and replaces them according to the script's instructions.

## Features

* Parses `.xsc` files containing `REPLACEALL ... BY ...` commands.
* Applies hexadecimal search-and-replace operations to any target binary file.
* **Automatically creates a backup** (`.bak`) of the target file before applying any patches.
* Simple and straightforward command-line interface.
* Requires only Node.js for runtime (TypeScript is used for development).
* Includes basic error handling for file access and patching integrity.

## Prerequisites

* **Node.js**: Version 22.14.0 or higher (as specified in `package.json`). You can download it from [nodejs.org](https://nodejs.org/).

## Installation (Optional)

You can run the script directly using Node.js or optionally install/link it for easier access:

1.  **Clone or Download:** Get the project files (`index.ts`, `package.json`) into a directory on your system.
2.  **Navigate:** Open your terminal or command prompt and navigate into the project directory (`cd path/to/xsc-patcher`).
3.  **Build:** Compile the TypeScript once before running:
    ```bash
    npm run build
    ```
4.  **Options:**
    * **Direct Execution (Recommended for simplicity):**
        ```bash
        node dist/index.js <path_to_xsc_script.xsc> <path_to_target_file>
        ```
    * **Using npx:**
        ```bash
        npx . <path_to_xsc_script.xsc> <path_to_target_file>
        ```
    * **Linking (for development):** Makes the `xsc-patcher` command available system-wide by linking to your project directory.
        ```bash
        npm link 
        # Now you can use: xsc-patcher <xsc_file> <target_file>
        ```
        *(May require administrator/sudo privileges)*
    * **Global Installation (Use with caution):** Installs the command system-wide.
        ```bash
        npm install -g .
        # Now you can use: xsc-patcher <xsc_file> <target_file>
        ```
        *(May require administrator/sudo privileges)*

## Usage

Run the patcher from your terminal, providing the path to the `.xsc` script and the path to the target file you want to patch.

**Command Syntax:**

```bash
# If installed globally or linked:
xsc-patcher <path_to_xsc_script.xsc> <path_to_target_file>

# If running directly with Node.js:
node dist/index.js <path_to_xsc_script.xsc> <path_to_target_file>
```

**Arguments:**

* `<path_to_xsc_script.xsc>`: The full or relative path to the `.xsc` file containing the patch instructions.
* `<path_to_target_file>`: The full or relative path to the binary file (e.g., an executable, library, or data file) that needs to be patched.

**Example:**

```bash
# Using direct execution:
node dist/index.js ./patches/my_modification.xsc "/home/user/app/application.bin"

# Using linked/installed command:
xsc-patcher C:\Mods\patch.xsc "C:\Program Files\MySoftware\program.exe" 
```

## Library Usage (TypeScript/ESM - Node)

You can also import the patcher classes from another Node project. The Node entry includes file I/O helpers.

```ts
import { BackupManager, Patcher, XscParser } from "xsc-patcher";

const backupManager = new BackupManager();
const parser = new XscParser();
const patcher = new Patcher();
```

## Browser Usage

For browser builds, import the browser entry. It is file-system free and works with byte arrays only.
You are responsible for loading the `.xsc` content and the target bytes (e.g. via `fetch` or file input).

```ts
import { Patcher, XscParser } from "xsc-patcher/browser";

const parser = new XscParser();
const patcher = new Patcher();
```

Example (browser):

```ts
import { Patcher, XscParser } from "xsc-patcher/browser";

const parser = new XscParser();
const patcher = new Patcher();

const xscText = await (await fetch("/patches/my_patch.xsc")).text();
const rules = parser.parseString(xscText);

const targetBytes = new Uint8Array(await (await fetch("/files/target.bin")).arrayBuffer());
const patched = patcher.applyToBuffer(targetBytes, rules);
```

## `.xsc` File Format

This tool expects a simple text file format based on common XVI32 script usage for patching:

* It primarily reads lines starting with `REPLACEALL`.
* The expected format for patching lines is:
    `REPLACEALL <HEX_BYTES_TO_FIND> BY <HEX_BYTES_TO_REPLACE>`
* `<HEX_BYTES_TO_FIND>`: The sequence of hexadecimal bytes to search for in the target file.
* `<HEX_BYTES_TO_REPLACE>`: The sequence of hexadecimal bytes that will replace the found sequence.
* Hexadecimal bytes can be separated by spaces (e.g., `41 42 43`) or written consecutively (e.g., `414243`). Spaces will be automatically removed during parsing.
* **Important Constraint:** For `xsc-patcher` to work correctly, the number of bytes specified in `<HEX_BYTES_TO_FIND>` **must exactly match** the number of bytes in `<HEX_BYTES_TO_REPLACE>`. Rules with differing lengths will be skipped with a warning.
* Lines not starting with `REPLACEALL ` (e.g., `ADR 0`, empty lines, comments) are currently ignored by this tool.

## Backup Functionality

Before attempting any modifications, `xsc-patcher` will automatically create a backup of your original target file.

* **Filename:** The backup will be saved in the **same directory** as the target file, with the extension `.bak` appended (e.g., if you patch `program.exe`, the backup will be `program.exe.bak`).
* **Safety:** If the backup creation fails (e.g., due to permissions), the patching process will be aborted before modifying the original file.
* **Recommendation:** Keep this backup file safe until you have thoroughly tested the patched file and confirmed it works as expected. You can manually restore the original file by deleting the patched file and removing the `.bak` extension from the backup.

## Error Handling

The tool includes basic checks for:

* Correct number of command-line arguments.
* Existence and readability of the input `.xsc` file.
* Existence and read/write permissions for the target file.
* Validity of hex sequences in the `.xsc` file.
* Consistency of file size after patching (as an integrity check).

If critical errors occur, the script will output an error message and exit, attempting to leave the original file untouched (or restored from backup if writing already started, though this specific script aborts *before* writing if length mismatches).

## License

This project is licensed under the Apache License 2.0. See the `LICENSE` file for details.

## Disclaimer

**Use this tool at your own risk.** Modifying binary files, especially executable files, can lead to unexpected behavior, crashes, or data corruption if the patch instructions are incorrect or applied to the wrong file version. Always ensure you understand what a patch does before applying it. The author assumes no responsibility for any damage caused by the use of this software. Always keep backups or ensure you have a reliable way to restore the original file (like the automatically created `.bak` file or a software distribution platform's repair function).