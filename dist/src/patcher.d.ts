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
    applyToBuffer(targetBuffer: Buffer, replacements: ReplacementRule[]): Buffer | null;
    /**
     * Reads a file, applies the parsed replacements, and writes the modified content back.
     * This method now uses applyToBuffer internally.
     * @param targetFilePath - Path to the file being patched.
     * @param replacements - Array of replacement rules.
     * @returns True if the patch was applied successfully or no changes were needed, false otherwise.
     */
    applyToFile(targetFilePath: string, replacements: ReplacementRule[]): boolean;
}
//# sourceMappingURL=patcher.d.ts.map