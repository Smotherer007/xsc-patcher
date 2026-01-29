import fs from 'fs';
import type { ReplacementRule } from './types.js';

/**
 * Applies parsed replacement instructions to a target file or buffer.
 */
export default class Patcher {
    /**
     * Applies the parsed replacements to a Buffer.
     * Performs find-and-replace on byte sequences.
     * Modifies the input buffer directly.
     * @param targetBuffer - The buffer to patch.
     * @param replacements - Array of replacement rules.
     * @returns The modified buffer if patching was attempted (even if no matches found), or null on a critical error (like unexpected size change).
     */
    applyToBuffer(targetBuffer: Buffer, replacements: ReplacementRule[]): Buffer | null {
        if (!replacements || replacements.length === 0) {
            console.log('No valid patch instructions to apply to buffer.');
            return targetBuffer; // Nothing to do, return original buffer
        }

        const originalLength = targetBuffer.length;
        let totalReplacedCount = 0;
        let modificationMade = false;

        // Apply each replacement rule
        replacements.forEach(({ find, replace, lineNumber }, index) => {
            // Logging is slightly adjusted as we don't have a file path context here
            console.log(`\n[Rule ${index + 1}/${replacements.length} - From XSC Line ${lineNumber}] Processing instruction:`);
            console.log(`  FIND:    ${find.toString('hex').toUpperCase()}`);
            console.log(`  REPLACE: ${replace.toString('hex').toUpperCase()}`);

            let currentReplacedInPair = 0;
            let startIndex = 0;
            let foundIndex: number;

            // Iteratively find and replace all occurrences for the current rule
            while ((foundIndex = targetBuffer.indexOf(find, startIndex)) !== -1) {
                replace.copy(targetBuffer, foundIndex); // Overwrite bytes
                currentReplacedInPair++;
                startIndex = foundIndex + replace.length; // Continue search after the replaced section
            }

            if (currentReplacedInPair > 0) {
                console.log(`  => Replaced ${currentReplacedInPair} occurrence(s) for this rule.`);
                totalReplacedCount += currentReplacedInPair;
                modificationMade = true;
            } else {
                console.log('  => No occurrences found for this rule.');
            }
        }); // End of replacements.forEach

        // Critical check: Ensure buffer size didn't change (shouldn't happen with equal length find/replace)
        if (targetBuffer.length !== originalLength) {
            console.error('\nFATAL ERROR: Buffer length changed unexpectedly during patching!');
            console.error('Potential corruption detected.');
            return null; // Indicate critical failure
        }

        if (modificationMade) {
            console.log(`Successfully applied a total of ${totalReplacedCount} replacements across all rules to the buffer.`);
        } else {
            console.log('No matching byte sequences found for any rule in the buffer. Buffer remains unchanged.');
        }

        return targetBuffer; // Return the modified (or unmodified) buffer
    }

    /**
     * Reads a file, applies the parsed replacements, and writes the modified content back.
     * This method now uses applyToBuffer internally.
     * @param targetFilePath - Path to the file being patched.
     * @param replacements - Array of replacement rules.
     * @returns True if the patch was applied successfully or no changes were needed, false otherwise.
     */
    applyToFile(targetFilePath: string, replacements: ReplacementRule[]): boolean {
        console.log(`\nApplying patch to file: ${targetFilePath}`);
        if (!replacements || replacements.length === 0) {
            console.log('No valid patch instructions to apply.');
            return true; // Nothing to do
        }

        let contentBuffer: Buffer;
        try {
            // Check if the target file exists and is a file
            if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
                console.error(`ERROR: Target file not found or is not a file: ${targetFilePath}`);
                return false;
            }
            contentBuffer = fs.readFileSync(targetFilePath);
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            console.error(`ERROR: Failed to read target file: ${targetFilePath}`);
            console.error(`Reason: ${err.message}`);
            if (err.code === 'EACCES') {
                console.error('Check read permissions for the target file.');
            }
            return false;
        }

        // Apply patch logic using the new applyToBuffer method
        const patchedBuffer = this.applyToBuffer(contentBuffer, replacements);

        if (patchedBuffer === null) {
            console.error('Patching aborted due to internal buffer error.');
            // The applyToBuffer method already logged the specific reason (e.g., size change)
            console.error('Please restore the file from the backup manually.');
            return false; // Indicate failure
        }

        // If applyToBuffer returned a buffer (success or no changes)
        try {
            fs.writeFileSync(targetFilePath, patchedBuffer); // Write the result back
            console.log(`File saved: ${targetFilePath}`); // Detailed counts were logged by applyToBuffer
            return true;
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            console.error(`\nERROR: Failed to write changes to target file: ${targetFilePath}`);
            console.error(`Reason: ${err.message}`);
            if (err.code === 'EACCES') {
                console.error('Check write permissions for the target file.');
            }
            console.error('Please restore the file from the backup manually.');
            return false;
        }
    }
}
