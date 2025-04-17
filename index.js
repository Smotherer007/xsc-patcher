const fs = require('fs');
const path = require('path');

const BACKUP_EXTENSION = '.bak'; // File extension for backups

/**
 * Creates a backup of the target file.
 * @param {string} targetFilePath - Absolute or relative path to the file to back up.
 * @param {string} backupExtension - The extension to use for the backup file (e.g., '.bak').
 * @returns {string|null} The path to the created backup file, or null if backup failed.
 */
function createBackup(targetFilePath, backupExtension) {
  const backupFilePath = targetFilePath + backupExtension;
  console.log(`Attempting to create backup: ${backupFilePath}`);
  try {
    fs.copyFileSync(targetFilePath, backupFilePath);
    console.log(`Successfully created backup: ${backupFilePath}`);
    return backupFilePath;
  } catch (error) {
    console.error(`ERROR: Failed to create backup for ${targetFilePath}.`);
    console.error(`Reason: ${error.message}`);
    if (error.code === 'EACCES') {
         console.error("Check if you have write permissions in the target directory.");
    }
    return null; // Indicate failure
  }
}

/**
 * Parses an .xsc file to extract patch instructions.
 * @param {string} xscFilePath - Path to the .xsc script file.
 * @returns {Array|null} An array of {find: Buffer, replace: Buffer} objects, or null on error.
 */
function parseXscFile(xscFilePath) {
  console.log(`\nReading patch instructions from: ${xscFilePath}`);
  const replacements = [];
  let fileContent;

  try {
    fileContent = fs.readFileSync(xscFilePath, 'utf8');
  } catch (error) {
    console.error(`ERROR: Failed to read XSC file: ${xscFilePath}`);
    console.error(`Reason: ${error.message}`);
     if (error.code === 'ENOENT') {
          console.error("Please ensure the XSC file path is correct.");
     } else if (error.code === 'EACCES') {
          console.error("Check read permissions for the XSC file.");
     }
    return null;
  }

  const lines = fileContent.split(/\r?\n/); // Handle Windows/Unix line endings

  for (const [index, line] of lines.entries()) {
    const trimmedLine = line.trim();
    const lineNumber = index + 1;

    if (trimmedLine.length === 0 || !trimmedLine.startsWith('REPLACEALL ')) {
      continue; // Ignore irrelevant lines silently
    }

    const instruction = trimmedLine.substring('REPLACEALL '.length);
    const parts = instruction.split(' BY ');

    if (parts.length !== 2) {
      console.warn(`[Parser - Line ${lineNumber}] Skipping invalid format: Expected 'REPLACEALL ... BY ...'. Found: "${trimmedLine}"`);
      continue;
    }

    const findHex = parts[0].replace(/ /g, ''); // Remove spaces from hex string
    const replaceHex = parts[1].replace(/ /g, '');

    if (!findHex || !replaceHex) {
      console.warn(`[Parser - Line ${lineNumber}] Skipping invalid format: Empty hex string found in "${trimmedLine}"`);
      continue;
    }

    try {
      const findBuffer = Buffer.from(findHex, 'hex');
      const replaceBuffer = Buffer.from(replaceHex, 'hex');

      if (findBuffer.length !== replaceBuffer.length) {
        console.warn(`[Parser - Line ${lineNumber}] Skipping rule due to length mismatch: FIND (${findBuffer.length} bytes) vs REPLACE (${replaceBuffer.length} bytes) in "${trimmedLine}"`);
        continue;
      }

      // Store the original line number along with the rule for better logging later
      replacements.push({ find: findBuffer, replace: replaceBuffer, lineNumber: lineNumber });

    } catch (error) {
      console.warn(`[Parser - Line ${lineNumber}] Skipping invalid hex sequence in "${trimmedLine}". Error: ${error.message}`);
    }
  }

  if (replacements.length === 0) {
    console.warn("Warning: No valid 'REPLACEALL' instructions with matching lengths were parsed from the XSC file.");
  } else {
    console.log(`Successfully parsed ${replacements.length} valid replacement rule(s).`);
  }
  return replacements;
}

/**
 * Applies the parsed replacements to the target file content.
 * @param {string} targetFilePath - Path to the file being patched.
 * @param {Array} replacements - Array of {find: Buffer, replace: Buffer, lineNumber: number} objects.
 * @returns {boolean} True if the patch was applied successfully, false otherwise.
 */
function applyPatch(targetFilePath, replacements) {
  console.log(`\nApplying patch to: ${targetFilePath}`);
  if (!replacements || replacements.length === 0) {
    console.log("No valid patch instructions to apply.");
    return true; // Nothing to do
  }

  let contentBuffer;
  try {
    contentBuffer = fs.readFileSync(targetFilePath);
  } catch (error) {
    console.error(`ERROR: Failed to read target file: ${targetFilePath}`);
    console.error(`Reason: ${error.message}`);
     if (error.code === 'EACCES') {
          console.error("Check read permissions for the target file.");
     }
    return false;
  }

  const originalLength = contentBuffer.length;
  let totalReplacedCount = 0;
  let modificationMade = false;

  // Apply each replacement rule
  // Using forEach to easily get the index for logging
  replacements.forEach(({ find, replace, lineNumber }, index) => {
    // --- NEUES LOGGING HIER ---
    console.log(`\n[Rule ${index + 1}/${replacements.length} - From XSC Line ${lineNumber}] Processing instruction:`);
    console.log(`  FIND:    ${find.toString('hex').toUpperCase()}`);
    console.log(`  REPLACE: ${replace.toString('hex').toUpperCase()}`);
    // --- ENDE NEUES LOGGING ---

    let currentReplacedInPair = 0;
    let startIndex = 0;
    let foundIndex; // Renamed 'index' from inner scope to avoid clash with forEach index

    // Iteratively find and replace all occurrences for *this rule*
    while ((foundIndex = contentBuffer.indexOf(find, startIndex)) !== -1) {
      replace.copy(contentBuffer, foundIndex); // Overwrite bytes
      currentReplacedInPair++;
      startIndex = foundIndex + replace.length; // Continue search after the replaced section
    }

    if (currentReplacedInPair > 0) {
      // Log how many replacements were made *for this specific rule*
      console.log(`  => Replaced ${currentReplacedInPair} occurrence(s) for this rule.`);
      totalReplacedCount += currentReplacedInPair;
      modificationMade = true;
    } else {
      // Log if no occurrences were found for this rule
      console.log(`  => No occurrences found for this rule.`);
    }
  }); // End of replacements.forEach

  // Write back only if modifications were made
  if (modificationMade) {
    if (contentBuffer.length !== originalLength) {
      console.error("\nFATAL ERROR: File length changed unexpectedly during patching!");
      console.error("Aborting write operation to prevent potential corruption.");
      console.error("Please restore the file from the backup manually.");
      return false;
    }

    try {
      fs.writeFileSync(targetFilePath, contentBuffer);
      console.log(`\nSuccessfully applied a total of ${totalReplacedCount} replacements across all rules. File saved.`);
      return true;
    } catch (error) {
      console.error(`\nERROR: Failed to write changes to target file: ${targetFilePath}`);
      console.error(`Reason: ${error.message}`);
       if (error.code === 'EACCES') {
            console.error("Check write permissions for the target file.");
       }
      console.error("Please restore the file from the backup manually.");
      return false;
    }
  } else {
    console.log("\nNo matching byte sequences found for any rule. Target file remains unchanged.");
    return true;
  }
}

/**
 * Displays usage instructions.
 */
function showUsage() {
    // Find the package.json relative to the current script file
    let version = 'N/A';
    try {
        const pkg = require(path.join(__dirname, 'package.json'));
        version = pkg.version || 'N/A';
    } catch (e) { /* ignore error if package.json is not found */ }

    const scriptName = path.basename(process.argv[1]);
    console.log(`\nxsc-patcher v${version} - Applies XVI32 .xsc patch scripts.`);
    console.log("----------------------------------------------");
    console.log(`Usage: node ${scriptName} <path_to_xsc_script.xsc> <path_to_target_executable.exe>`);
    console.log("\nExample:");
    console.log(`  node ${scriptName} ./myPatch.xsc "./game/bin/game.exe"`);
    console.log("\nDescription:");
    console.log("  Reads patch instructions (REPLACEALL ... BY ...) from the .xsc file");
    console.log("  and applies them to the target executable.");
    console.log(`  A backup of the target file with extension '${BACKUP_EXTENSION}' will be created before patching.`);
}


// --- Main Execution ---
function main() {
  // 1. Parse Command Line Arguments
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    showUsage();
    process.exit(1);
  }

  const xscFilePath = args[0];
  const targetFilePath = args[1];

    // Try to get version for the header log
    let version = 'N/A';
    try {
        const pkg = require(path.join(__dirname, 'package.json'));
        version = pkg.version || 'N/A';
    } catch (e) { /* ignore */ }
  console.log(`\n-------------------- xsc-patcher v${version} --------------------`);


  // 2. Validate Input Files Exist
   if (!fs.existsSync(xscFilePath) || !fs.statSync(xscFilePath).isFile()) {
       console.error(`\nERROR: XSC script file not found or is not a file: ${xscFilePath}`);
       process.exit(1);
   }
   if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
       console.error(`\nERROR: Target executable file not found or is not a file: ${targetFilePath}`);
       process.exit(1);
   }

  // 3. Create Backup
  const backupFile = createBackup(targetFilePath, BACKUP_EXTENSION);
  if (!backupFile) {
    console.error("\nPatching aborted due to backup failure.");
    process.exit(1);
  }

  // 4. Parse XSC File
  // Pass original line numbers along with parsed rules
  const replacements = parseXscFile(xscFilePath); 
  if (replacements === null) {
    console.error("\nPatching aborted due to XSC parsing error.");
    process.exit(1);
  }

  // 5. Apply Patch (function now includes detailed logging per rule)
  const success = applyPatch(targetFilePath, replacements);

  // 6. Final Status Message
  if (success) {
    console.log("\n-------------------- Patching process completed --------------------");
  } else {
    console.error("\n-------------------- Patching process failed --------------------");
    process.exit(1);
  }
}

// Run the main function
main();