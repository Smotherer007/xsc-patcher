const fs = require('fs');

/**
 * Parses .xsc file content or buffer to extract patch instructions.
 */
class XscParser {
    /**
     * Parses an .xsc file to extract patch instructions.
     * @param {string} xscFilePath - Path to the .xsc script file.
     * @returns {Array|null} An array of {find: Buffer, replace: Buffer, lineNumber: number} objects, or null on error.
     */
    parse(xscFilePath) {
        console.log(`\nReading patch instructions from: ${xscFilePath}`);
        let fileContent;

        try {
            if (!fs.existsSync(xscFilePath) || !fs.statSync(xscFilePath).isFile()) {
                console.error(`ERROR: XSC script file not found or is not a file: ${xscFilePath}`);
                 return null;
            }
            fileContent = fs.readFileSync(xscFilePath, 'utf8');
        } catch (error) {
            console.error(`ERROR: Failed to read XSC file: ${xscFilePath}`);
            console.error(`Reason: ${error.message}`);
            return null;
        }

        // Reuse the parsing logic for string content
        return this._parseString(fileContent);
    }

    /**
     * Parses a buffer containing .xsc script content to extract patch instructions.
     * @param {Buffer} buffer - Buffer containing the .xsc script content.
     * @returns {Array} An array of {find: Buffer, replace: Buffer, lineNumber: number} objects. Returns an empty array if no valid rules are found or on parsing issues.
     */
    parseBuffer(buffer) {
         if (!Buffer.isBuffer(buffer)) {
             console.error("ERROR: Input is not a valid buffer.");
             return [];
         }
         const fileContent = buffer.toString('utf8'); // Assume UTF-8 encoding for the script content
         return this._parseString(fileContent);
    }

    /**
     * Internal helper to parse string content.
     * @param {string} content - String content of the XSC script.
     * @returns {Array} An array of {find: Buffer, replace: Buffer, lineNumber: number} objects.
     * @private
     */
    _parseString(content) {
        const replacements = [];
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
                console.warn(`[Parser - Line ${lineNumber}] Skipping invalid format: Expected 'REPLACEALL ... BY ...'. Found: "${trimmedLine}"`);
                continue;
            }

            const findHex = parts[0].replace(/ /g, '');
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

                replacements.push({ find: findBuffer, replace: replaceBuffer, lineNumber: lineNumber });

            } catch (error) {
                console.warn(`[Parser - Line ${lineNumber}] Skipping invalid hex sequence in "${trimmedLine}". Error: ${error.message}`);
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

module.exports = XscParser;