import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BackupManager from './src/backup-manager.js';
import XscParser from './src/xsc-parser.js';
import Patcher from './src/patcher.js';
export { BackupManager, XscParser, Patcher };
const BACKUP_EXTENSION = '.bak'; // File extension for backups
function readPackageVersion() {
    try {
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const pkgPath = path.join(currentDir, '..', 'package.json');
        const content = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(content);
        return pkg.version || 'N/A';
    }
    catch {
        return 'N/A';
    }
}
/**
 * Displays usage instructions for the command-line tool.
 */
function showUsage() {
    // Attempt to find package.json version relative to the compiled script
    const version = readPackageVersion();
    const scriptName = path.basename(process.argv[1]);
    console.log(`\nxsc-patcher v${version} - Applies XVI32 .xsc patch scripts.`);
    console.log('----------------------------------------------');
    console.log(`Usage: node ${scriptName} <path_to_xsc_script.xsc> <path_to_target_executable.exe>`);
    console.log('\nExample:');
    console.log(`  node ${scriptName} ./myPatch.xsc "./game/bin/game.exe"`);
    console.log('\nDescription:');
    console.log('  Reads patch instructions (REPLACEALL ... BY ...) from the .xsc file');
    console.log('  and applies them to the target executable.');
    console.log(`  A backup of the target file with extension '${BACKUP_EXTENSION}' will be created before patching.`);
}
// --- Main Execution Function ---
function main() {
    // 1. Parse Command Line Arguments
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        showUsage();
        process.exit(1);
    }
    const xscFilePath = args[0];
    const targetFilePath = args[1];
    // Attempt to get version for the header log
    const version = readPackageVersion();
    console.log(`\n-------------------- xsc-patcher v${version} --------------------`);
    // Instantiate the classes
    const backupManager = new BackupManager();
    const xscParser = new XscParser();
    const patcher = new Patcher();
    // 2. Create Backup
    // File existence/type checks are handled inside the class methods
    const backupFile = backupManager.createBackup(targetFilePath, BACKUP_EXTENSION);
    if (!backupFile) {
        console.error('\nPatching aborted due to backup failure.');
        process.exit(1);
    }
    // 3. Parse XSC File
    const replacements = xscParser.parse(xscFilePath);
    if (replacements === null) {
        // parse returns null on fatal read error
        console.error('\nPatching aborted due to XSC parsing error.');
        process.exit(1);
    }
    // 4. Apply Patch
    const success = patcher.applyToFile(targetFilePath, replacements);
    // 5. Final Status Message
    if (success) {
        console.log('\n-------------------- Patching process completed --------------------');
    }
    else {
        console.error('\n-------------------- Patching process failed --------------------');
        process.exit(1);
    }
}
// Run the main function only if this script is executed directly
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const currentFilePath = fileURLToPath(import.meta.url);
if (entryPath && path.resolve(currentFilePath) === entryPath) {
    main();
}
//# sourceMappingURL=index.js.map