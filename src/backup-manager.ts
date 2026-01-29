import fs from 'fs';

/**
 * Manages the creation of file backups.
 */
export default class BackupManager {
    /**
     * Creates a backup of the target file.
     * @param targetFilePath - Absolute or relative path to the file to back up.
     * @param backupExtension - The extension to use for the backup file (e.g., '.bak').
     * @returns The path to the created backup file, or null if backup failed.
     */
    createBackup(targetFilePath: string, backupExtension: string): string | null {
        const backupFilePath = targetFilePath + backupExtension;
        console.log(`Attempting to create backup: ${backupFilePath}`);
        try {
            // Check if the target exists and is a file
            if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
                console.error(`ERROR: Target file not found or is not a file: ${targetFilePath}`);
                return null;
            }

            // Warn if backup file already exists (will overwrite)
            if (fs.existsSync(backupFilePath)) {
                console.warn(`Warning: Backup file already exists. Overwriting: ${backupFilePath}`);
            }

            fs.copyFileSync(targetFilePath, backupFilePath);
            console.log(`Successfully created backup: ${backupFilePath}`);
            return backupFilePath;
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            console.error(`ERROR: Failed to create backup for ${targetFilePath}.`);
            console.error(`Reason: ${err.message}`);
            if (err.code === 'EACCES') {
                console.error('Check if you have write permissions in the target directory.');
            }
            return null; // Indicate failure
        }
    }
}
