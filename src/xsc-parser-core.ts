import type { ReplacementRule } from './types.js';

function hexToBytes(hex: string): Uint8Array {
    const normalized = hex.replace(/ /g, '');
    if (normalized.length % 2 !== 0) {
        throw new Error('Hex string has an odd length.');
    }
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        const byte = normalized.slice(i * 2, i * 2 + 2);
        bytes[i] = Number.parseInt(byte, 16);
    }
    return bytes;
}

/**
 * Parses .xsc script content to extract patch instructions.
 */
export default class XscParserCore {
    /**
     * Parses a string containing .xsc script content to extract patch instructions.
     * @param content - String content of the XSC script.
     * @returns An array of {find, replace, lineNumber} objects.
     */
    parseString(content: string): ReplacementRule[] {
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
                const findBytes = hexToBytes(findHex);
                const replaceBytes = hexToBytes(replaceHex);

                if (findBytes.length !== replaceBytes.length) {
                    console.warn(
                        `[Parser - Line ${lineNumber}] Skipping rule due to length mismatch: FIND (${findBytes.length} bytes) vs REPLACE (${replaceBytes.length} bytes) in "${trimmedLine}"`
                    );
                    continue;
                }

                replacements.push({ find: findBytes, replace: replaceBytes, lineNumber });
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

    /**
     * Parses a byte array containing .xsc script content to extract patch instructions.
     * @param bytes - Byte array containing the .xsc script content.
     * @returns An array of {find, replace, lineNumber} objects.
     */
    parseBytes(bytes: Uint8Array): ReplacementRule[] {
        if (!(bytes instanceof Uint8Array)) {
            console.error('ERROR: Input is not a valid byte array.');
            return [];
        }
        const decoder = new TextDecoder('utf-8');
        return this.parseString(decoder.decode(bytes));
    }
}
