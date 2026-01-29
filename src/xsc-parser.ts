import fs from 'fs';
import type { ReplacementRule } from './types.js';

/**
 * Parses .xsc file content or buffer to extract patch instructions.
 */
export default class XscParser {
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

        // Reuse the parsing logic for string content
        return this.#parseString(fileContent);
    }

    /**
     * Parses a buffer containing .xsc script content to extract patch instructions.
     * @param buffer - Buffer containing the .xsc script content.
     * @returns An array of {find, replace, lineNumber} objects.
     *          Returns an empty array if no valid rules are found or on parsing issues.
     */
    parseBuffer(buffer: Buffer): ReplacementRule[] {
        if (!Buffer.isBuffer(buffer)) {
            console.error('ERROR: Input is not a valid buffer.');
            return [];
        }
        const fileContent = buffer.toString('utf8'); // Assume UTF-8 encoding for the script content
        return this.#parseString(fileContent);
    }

    /**
     * Internal helper to parse string content.
     * @param content - String content of the XSC script.
     * @returns An array of {find, replace, lineNumber} objects.
     */
    #parseString(content: string): ReplacementRule[] {
        const replacements: ReplacementRule[] = [];
        const lines = content.split(/\r?\n/);

        for (const [index, line] of lines.entries()) {
            const trimmedLine = line.trim();
            const lineNumber = index + 1;

            if (!trimmedLine.startsWith('REPLACEALL ')) {
                continue;
            }

            const instruction = trimmedLine.substring('REPLACEALL '.length);
            const parts = instruction.split(' BY ');

            if (parts.length !== 2) {
                console.warn(
                    `[Parser - Line ${lineNumber}] Skipping invalid format: Expected 'REPLACEALL ... BY ...'. Found: "${trimmedLine}"`
                );
                continue;
            }

            const findHex = parts[0].replace(/ /g, '');
            const replaceHex = parts[1].replace(/ /g, '');

            if (!findHex || !replaceHex) {
                console.warn(
                    `[Parser - Line ${lineNumber}] Skipping invalid format: Empty hex string found in "${trimmedLine}"`
                );
                continue;
            }

            try {
                const findBuffer = Buffer.from(findHex, 'hex');
                const replaceBuffer = Buffer.from(replaceHex, 'hex');

                if (findBuffer.length !== replaceBuffer.length) {
                    console.warn(
                        `[Parser - Line ${lineNumber}] Skipping rule due to length mismatch: FIND (${findBuffer.length} bytes) vs REPLACE (${replaceBuffer.length} bytes) in "${trimmedLine}"`
                    );
                    continue;
                }

                replacements.push({ find: findBuffer, replace: replaceBuffer, lineNumber });
            } catch (error) {
                const err = error as Error;
                console.warn(
                    `[Parser - Line ${lineNumber}] Skipping invalid hex sequence in "${trimmedLine}". Error: ${err.message}`
                );
            }
        }

        if (replacements.length === 0) {
            console.warn("Warning: No valid 'REPLACEALL' instructions with matching lengths were parsed.");
        } else {
            console.log(`Successfully parsed ${replacements.length} valid replacement rule(s).`);
        }

        return replacements;
    }
}
