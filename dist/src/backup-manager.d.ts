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
    createBackup(targetFilePath: string, backupExtension: string): string | null;
}
//# sourceMappingURL=backup-manager.d.ts.map