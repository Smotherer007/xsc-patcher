import type { ReplacementRule } from './types.js';

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

function findSubarray(haystack: Uint8Array, needle: Uint8Array, fromIndex: number): number {
    if (needle.length === 0) {
        return -1;
    }
    const maxStart = haystack.length - needle.length;
    for (let i = fromIndex; i <= maxStart; i++) {
        let matched = true;
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) {
                matched = false;
                break;
            }
        }
        if (matched) {
            return i;
        }
    }
    return -1;
}

/**
 * Applies parsed replacement instructions to a target buffer.
 */
export default class PatcherCore {
    /**
     * Applies the parsed replacements to a Uint8Array.
     * Performs find-and-replace on byte sequences.
     * Modifies the input buffer directly.
     * @param targetBuffer - The buffer to patch.
     * @param replacements - Array of replacement rules.
     * @returns The modified buffer if patching was attempted (even if no matches found), or null on a critical error.
     */
    applyToBuffer(targetBuffer: Uint8Array, replacements: ReplacementRule[]): Uint8Array | null {
        if (!replacements || replacements.length === 0) {
            console.log('No valid patch instructions to apply to buffer.');
            return targetBuffer;
        }

        const originalLength = targetBuffer.length;
        let totalReplacedCount = 0;
        let modificationMade = false;

        replacements.forEach(({ find, replace, lineNumber }, index) => {
            console.log(`\n[Rule ${index + 1}/${replacements.length} - From XSC Line ${lineNumber}] Processing instruction:`);
            console.log(`  FIND:    ${bytesToHex(find)}`);
            console.log(`  REPLACE: ${bytesToHex(replace)}`);

            let currentReplacedInPair = 0;
            let startIndex = 0;
            let foundIndex: number;

            while ((foundIndex = findSubarray(targetBuffer, find, startIndex)) !== -1) {
                targetBuffer.set(replace, foundIndex);
                currentReplacedInPair++;
                startIndex = foundIndex + replace.length;
            }

            if (currentReplacedInPair > 0) {
                console.log(`  => Replaced ${currentReplacedInPair} occurrence(s) for this rule.`);
                totalReplacedCount += currentReplacedInPair;
                modificationMade = true;
            } else {
                console.log('  => No occurrences found for this rule.');
            }
        });

        if (targetBuffer.length !== originalLength) {
            console.error('\nFATAL ERROR: Buffer length changed unexpectedly during patching!');
            console.error('Potential corruption detected.');
            return null;
        }

        if (modificationMade) {
            console.log(`Successfully applied a total of ${totalReplacedCount} replacements across all rules to the buffer.`);
        } else {
            console.log('No matching byte sequences found for any rule in the buffer. Buffer remains unchanged.');
        }

        return targetBuffer;
    }
}
