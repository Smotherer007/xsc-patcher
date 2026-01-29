import fs from 'fs';
import type { ReplacementRule } from './types.js';
import XscParserCore from './xsc-parser-core.js';

/**
 * Parses .xsc file content or buffer to extract patch instructions.
 */
export default class XscParser extends XscParserCore {
    /**
     * Parses an .xsc file to extract patch instructions.
     * @param xscFilePath - Path to the .xsc script file.
     * @returns An array of {find, replace, lineNumber} objects, or null on error.
     */
    parse(xscFilePath: string): ReplacementRule[] | null {
        console.log(`\nReading patch instructions from: ${xscFilePath}`);
        let fileContent: string;

        try {
            if (!fs.existsSync(xscFilePath) || !fs.statSync(xscFilePath).isFile()) {
                console.error(`ERROR: XSC script file not found or is not a file: ${xscFilePath}`);
                return null;
            }
            fileContent = fs.readFileSync(xscFilePath, 'utf8');
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            console.error(`ERROR: Failed to read XSC file: ${xscFilePath}`);
            console.error(`Reason: ${err.message}`);
            return null;
        }

        return this.parseString(fileContent);
    }
}
