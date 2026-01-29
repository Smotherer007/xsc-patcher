import type { ReplacementRule } from './types.js';
/**
 * Parses .xsc file content or buffer to extract patch instructions.
 */
export default class XscParser {
    #private;
    /**
     * Parses an .xsc file to extract patch instructions.
     * @param xscFilePath - Path to the .xsc script file.
     * @returns An array of {find, replace, lineNumber} objects, or null on error.
     */
    parse(xscFilePath: string): ReplacementRule[] | null;
    /**
     * Parses a buffer containing .xsc script content to extract patch instructions.
     * @param buffer - Buffer containing the .xsc script content.
     * @returns An array of {find, replace, lineNumber} objects.
     *          Returns an empty array if no valid rules are found or on parsing issues.
     */
    parseBuffer(buffer: Buffer): ReplacementRule[];
}
//# sourceMappingURL=xsc-parser.d.ts.map