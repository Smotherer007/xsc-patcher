import fs from 'fs';
import type { ReplacementRule } from './types.js';
import PatcherCore from './patcher-core.js';

/**
 * Applies parsed replacement instructions to a target file or buffer.
 */
export default class Patcher extends PatcherCore {

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

        let contentBuffer: Uint8Array;
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
