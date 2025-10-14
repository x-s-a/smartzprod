// ==========================================
// SmartzProd - LocalStorage Management
// ==========================================

/**
 * Storage module for managing localStorage operations
 * Handles data persistence, retrieval, and migration
 */

const Storage = {
    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key from CONFIG.STORAGE_KEYS
     * @param {*} value - Value to store (will be JSON stringified)
     * @returns {boolean} - True if successful
     */
    save(key, value) {
        try {
            const jsonValue = JSON.stringify(value);
            localStorage.setItem(key, jsonValue);
            console.log(`${CONFIG.CONSOLE.DATA_SAVED}: ${key}`);
            return true;
        } catch (error) {
            console.error(`${CONFIG.CONSOLE.ERROR_SAVE}: ${key}`, error);
            return false;
        }
    },

    /**
     * Load data from localStorage with error handling
     * @param {string} key - Storage key from CONFIG.STORAGE_KEYS
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} - Parsed value or defaultValue
     */
    load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.error(`${CONFIG.CONSOLE.ERROR_LOAD}: ${key}`, error);
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key to remove
     * @returns {boolean} - True if successful
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`Storage: Removed ${key}`);
            return true;
        } catch (error) {
            console.error(`Storage: Error removing ${key}`, error);
            return false;
        }
    },

    /**
     * Clear all app data from localStorage
     * @returns {boolean} - True if successful
     */
    clearAll() {
        try {
            // Remove all app-specific keys
            Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log('Storage: All app data cleared');
            return true;
        } catch (error) {
            console.error('Storage: Error clearing data', error);
            return false;
        }
    },

    /**
     * Check if localStorage is available
     * @returns {boolean} - True if localStorage is available
     */
    isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('Storage: localStorage not available', error);
            return false;
        }
    },

    /**
     * Get storage usage information
     * @returns {Object} - Storage usage stats
     */
    getUsageInfo() {
        let totalSize = 0;
        const itemSizes = {};

        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const size = (localStorage[key].length + key.length) * 2; // UTF-16 = 2 bytes per char
                    itemSizes[key] = size;
                    totalSize += size;
                }
            }

            return {
                totalBytes: totalSize,
                totalKB: (totalSize / 1024).toFixed(2),
                totalMB: (totalSize / 1024 / 1024).toFixed(2),
                itemCount: Object.keys(itemSizes).length,
                items: itemSizes,
            };
        } catch (error) {
            console.error('Storage: Error getting usage info', error);
            return null;
        }
    },

    /**
     * App-specific data operations
     */
    app: {
        /**
         * Load all application data
         * @returns {Object} - Object with productivityData and matchFactorData arrays
         */
        loadAllData() {
            return {
                productivityData: Storage.load(CONFIG.STORAGE_KEYS.PRODUCTIVITY_DATA, []),
                matchFactorData: Storage.load(CONFIG.STORAGE_KEYS.MATCH_FACTOR_DATA, []),
            };
        },

        /**
         * Save all application data
         * @param {Array} productivityData - Productivity records
         * @param {Array} matchFactorData - Match factor records
         * @returns {boolean} - True if both saves successful
         */
        saveAllData(productivityData, matchFactorData) {
            const prodSaved = Storage.save(CONFIG.STORAGE_KEYS.PRODUCTIVITY_DATA, productivityData);
            const mfSaved = Storage.save(CONFIG.STORAGE_KEYS.MATCH_FACTOR_DATA, matchFactorData);
            return prodSaved && mfSaved;
        },

        /**
         * Load user settings
         * @returns {Object} - User settings object
         */
        loadUserSettings() {
            return {
                nama: Storage.load(CONFIG.STORAGE_KEYS.USER_NAME, ''),
                nrp: Storage.load(CONFIG.STORAGE_KEYS.USER_NRP, ''),
            };
        },

        /**
         * Save user settings
         * @param {string} nama - User name
         * @param {string} nrp - User NRP
         * @returns {boolean} - True if both saves successful
         */
        saveUserSettings(nama, nrp) {
            const namaSaved = Storage.save(CONFIG.STORAGE_KEYS.USER_NAME, nama);
            const nrpSaved = Storage.save(CONFIG.STORAGE_KEYS.USER_NRP, nrp);
            return namaSaved && nrpSaved;
        },

        /**
         * Load UI preferences
         * @returns {Object} - UI preferences object
         */
        loadUIPreferences() {
            return {
                sidebarCollapsed: Storage.load(CONFIG.STORAGE_KEYS.SIDEBAR_COLLAPSED, 'false') === 'true',
                expandedExcavators: Storage.load(CONFIG.STORAGE_KEYS.EXPANDED_EXCAVATORS, {}),
            };
        },

        /**
         * Save UI preferences
         * @param {boolean} sidebarCollapsed - Sidebar collapsed state
         * @param {Object} expandedExcavators - Expanded excavator cards
         * @returns {boolean} - True if both saves successful
         */
        saveUIPreferences(sidebarCollapsed, expandedExcavators) {
            const sidebarSaved = Storage.save(
                CONFIG.STORAGE_KEYS.SIDEBAR_COLLAPSED,
                sidebarCollapsed.toString()
            );
            const excavatorsSaved = Storage.save(
                CONFIG.STORAGE_KEYS.EXPANDED_EXCAVATORS,
                expandedExcavators
            );
            return sidebarSaved && excavatorsSaved;
        },

        /**
         * Create backup of all data
         * @returns {Object} - Backup object with metadata
         */
        createBackup() {
            const { productivityData, matchFactorData } = this.loadAllData();
            const userSettings = this.loadUserSettings();
            const uiPreferences = this.loadUIPreferences();

            return {
                version: CONFIG.APP.VERSION,
                exportDate: new Date().toISOString(),
                data: {
                    productivity: productivityData,
                    matchFactor: matchFactorData,
                    userSettings,
                    uiPreferences,
                },
                metadata: {
                    totalProductivityRecords: productivityData.length,
                    totalMatchFactorRecords: matchFactorData.length,
                    excavators: Utils.data.getUniqueExcavators(productivityData, matchFactorData),
                },
            };
        },

        /**
         * Restore data from backup
         * @param {Object} backupData - Backup object
         * @returns {boolean} - True if restore successful
         */
        restoreFromBackup(backupData) {
            try {
                // Validate backup structure
                if (!backupData || !backupData.data) {
                    console.error('Storage: Invalid backup structure');
                    return false;
                }

                const { productivity = [], matchFactor = [], userSettings = {}, uiPreferences = {} } = backupData.data;

                // Restore data
                const dataRestored = this.saveAllData(productivity, matchFactor);

                // Restore user settings if present
                if (userSettings.nama || userSettings.nrp) {
                    this.saveUserSettings(userSettings.nama || '', userSettings.nrp || '');
                }

                // Restore UI preferences if present
                if (uiPreferences.sidebarCollapsed !== undefined || uiPreferences.expandedExcavators) {
                    this.saveUIPreferences(
                        uiPreferences.sidebarCollapsed || false,
                        uiPreferences.expandedExcavators || {}
                    );
                }

                console.log('Storage: Data restored successfully');
                return dataRestored;
            } catch (error) {
                console.error('Storage: Error restoring backup', error);
                return false;
            }
        },

        /**
         * Validate backup file structure
         * @param {Object} backupData - Backup object to validate
         * @returns {Object} - Validation result with isValid and error message
         */
        validateBackup(backupData) {
            // Check if data exists
            if (!backupData || typeof backupData !== 'object') {
                return {
                    isValid: false,
                    error: 'Invalid backup file format',
                };
            }

            // Check for data property
            if (!backupData.data) {
                return {
                    isValid: false,
                    error: 'Backup file missing data property',
                };
            }

            // Check for at least one data array
            if (!backupData.data.productivity && !backupData.data.matchFactor) {
                return {
                    isValid: false,
                    error: 'Backup file contains no data',
                };
            }

            // Validate arrays
            if (backupData.data.productivity && !Array.isArray(backupData.data.productivity)) {
                return {
                    isValid: false,
                    error: 'Productivity data is not an array',
                };
            }

            if (backupData.data.matchFactor && !Array.isArray(backupData.data.matchFactor)) {
                return {
                    isValid: false,
                    error: 'Match Factor data is not an array',
                };
            }

            return {
                isValid: true,
                error: null,
            };
        },
    },

    /**
     * Data migration utilities (for future version upgrades)
     */
    migration: {
        /**
         * Get current data version
         * @returns {string} - Version string
         */
        getCurrentVersion() {
            return Storage.load('app_version', CONFIG.APP.VERSION);
        },

        /**
         * Set current data version
         * @param {string} version - Version string
         */
        setCurrentVersion(version) {
            Storage.save('app_version', version);
        },

        /**
         * Check if migration is needed
         * @returns {boolean} - True if migration needed
         */
        needsMigration() {
            const currentVersion = this.getCurrentVersion();
            return currentVersion !== CONFIG.APP.VERSION;
        },

        /**
         * Perform data migration (placeholder for future versions)
         * @param {string} fromVersion - Source version
         * @param {string} toVersion - Target version
         * @returns {boolean} - True if migration successful
         */
        migrate(fromVersion, toVersion) {
            console.log(`Storage: Migrating from ${fromVersion} to ${toVersion}`);

            // Migration logic goes here for future versions
            // Example: if (fromVersion === '2.0.0' && toVersion === '3.0.0') { ... }

            this.setCurrentVersion(toVersion);
            return true;
        },
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
