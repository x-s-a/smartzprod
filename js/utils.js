// ==========================================
// SmartzProd - Utility Functions
// ==========================================

/**
 * Utility functions for validation, formatting, and common operations
 * All functions are pure (no side effects) when possible
 */

const Utils = {
    /**
     * Validation utilities
     */
    validation: {
        /**
         * Validate name (letters, spaces, hyphens, apostrophes only)
         * @param {string} value - The value to validate
         * @returns {boolean} - True if valid
         */
        isValidName(value) {
            if (!value || typeof value !== 'string') return false;
            return CONFIG.VALIDATION.PATTERNS.NAME.test(value.trim());
        },

        /**
         * Validate excavator number (alphanumeric only)
         * @param {string} value - The value to validate
         * @returns {boolean} - True if valid
         */
        isValidExcavator(value) {
            if (!value || typeof value !== 'string') return false;
            return CONFIG.VALIDATION.PATTERNS.EXCAVATOR.test(value.trim());
        },

        /**
         * Validate NRP (alphanumeric only)
         * @param {string} value - The value to validate
         * @returns {boolean} - True if valid
         */
        isValidNRP(value) {
            if (!value || typeof value !== 'string') return false;
            return CONFIG.VALIDATION.PATTERNS.NRP.test(value.trim());
        },

        /**
         * Validate positive integer (1 to 9999)
         * @param {string|number} value - The value to validate
         * @returns {boolean} - True if valid
         */
        isValidPositiveInt(value) {
            const num = parseFloat(value);
            if (isNaN(num)) return false;
            const { min, max } = CONFIG.VALIDATION.RANGES.POSITIVE_INT;
            return num >= min && num <= max && Number.isInteger(num);
        },

        /**
         * Validate positive decimal (greater than 0)
         * @param {string|number} value - The value to validate
         * @returns {boolean} - True if valid
         */
        isValidPositiveDecimal(value) {
            const num = parseFloat(value);
            if (isNaN(num)) return false;
            const { min } = CONFIG.VALIDATION.RANGES.POSITIVE_DECIMAL;
            return num >= min;
        },

        /**
         * Validate HM Akhir is greater than HM Awal
         * @param {string|number} hmAkhir - HM Akhir value
         * @param {string|number} hmAwal - HM Awal value
         * @returns {boolean} - True if valid
         */
        isValidHMRange(hmAkhir, hmAwal) {
            const akhir = parseFloat(hmAkhir);
            const awal = parseFloat(hmAwal);
            if (isNaN(akhir) || isNaN(awal)) return false;
            return akhir > awal;
        },

        /**
         * Check if match factor is within warning range
         * @param {number} matchFactor - The match factor value
         * @returns {boolean} - True if within safe range
         */
        isMatchFactorSafe(matchFactor) {
            const { min, max } = CONFIG.VALIDATION.RANGES.MATCH_FACTOR_WARN;
            return matchFactor >= min && matchFactor <= max;
        },

        /**
         * Check if match factor is optimal
         * @param {number} matchFactor - The match factor value
         * @returns {boolean} - True if optimal
         */
        isMatchFactorOptimal(matchFactor) {
            const { min, max } = CONFIG.VALIDATION.RANGES.MATCH_FACTOR_OPTIMAL;
            return matchFactor >= min && matchFactor <= max;
        },
    },

    /**
     * Formatting utilities
     */
    format: {
        /**
         * Format number to specified decimal places
         * @param {number} value - The number to format
         * @param {number} decimals - Number of decimal places (default: 2)
         * @returns {number} - Formatted number
         */
        toDecimal(value, decimals = CONFIG.VALIDATION.DECIMAL_PLACES) {
            return parseFloat(parseFloat(value).toFixed(decimals));
        },

        /**
         * Format datetime to Indonesian locale string
         * @param {string|Date} datetime - The datetime to format
         * @returns {string} - Formatted datetime string
         */
        toIndonesianDateTime(datetime) {
            if (!datetime) return '';
            try {
                const date = typeof datetime === 'string' ? new Date(datetime) : datetime;
                return date.toLocaleString(CONFIG.APP.LOCALE, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } catch (error) {
                console.error(CONFIG.CONSOLE.ERROR_LOAD, error);
                return '';
            }
        },

        /**
         * Format datetime for display (short format)
         * @param {string|Date} datetime - The datetime to format
         * @returns {string} - Formatted datetime string
         */
        toShortDateTime(datetime) {
            if (!datetime) return '';
            try {
                const date = typeof datetime === 'string' ? new Date(datetime) : datetime;
                return date.toLocaleString(CONFIG.APP.LOCALE);
            } catch (error) {
                console.error(CONFIG.CONSOLE.ERROR_LOAD, error);
                return '';
            }
        },

        /**
         * Get current local datetime in HTML datetime-local format (YYYY-MM-DDTHH:MM)
         * @returns {string} - Formatted datetime string
         */
        getCurrentLocalDateTime() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        },

        /**
         * Format datetime for backup filename (YYYY-MM-DDTHH-mm-ss)
         * @param {Date} date - The date object (default: now)
         * @returns {string} - Formatted datetime string
         */
        toBackupTimestamp(date = new Date()) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
        },
    },

    /**
     * Data utilities
     */
    data: {
        /**
         * Get unique excavators from both datasets
         * @param {Array} productivityData - Productivity data array
         * @param {Array} matchFactorData - Match factor data array
         * @returns {Array} - Array of unique excavator IDs
         */
        getUniqueExcavators(productivityData, matchFactorData) {
            const excavators = new Set();
            productivityData.forEach(item => excavators.add(item.noExcavator));
            matchFactorData.forEach(item => excavators.add(item.noExcavator));
            return Array.from(excavators).sort();
        },

        /**
         * Get unique supervisors (pengawas) from both datasets
         * @param {Array} productivityData - Productivity data array
         * @param {Array} matchFactorData - Match factor data array
         * @returns {Array} - Array of unique supervisor names
         */
        getUniqueSupervisors(productivityData, matchFactorData) {
            const supervisors = new Set();
            productivityData.forEach(item => supervisors.add(item.namaPengawas));
            matchFactorData.forEach(item => supervisors.add(item.namaPengawas));
            return Array.from(supervisors).sort();
        },

        /**
         * Filter data by excavator
         * @param {Array} data - Data array to filter
         * @param {string} excavatorId - Excavator ID to filter by
         * @returns {Array} - Filtered data array
         */
        filterByExcavator(data, excavatorId) {
            return data.filter(item => item.noExcavator === excavatorId);
        },

        /**
         * Filter data by supervisor
         * @param {Array} data - Data array to filter
         * @param {string} supervisor - Supervisor name to filter by
         * @returns {Array} - Filtered data array
         */
        filterBySupervisor(data, supervisor) {
            return data.filter(item => item.namaPengawas === supervisor);
        },

        /**
         * Filter data by date range
         * @param {Array} data - Data array to filter
         * @param {string} dateFrom - Start date (YYYY-MM-DD)
         * @param {string} dateTo - End date (YYYY-MM-DD)
         * @returns {Array} - Filtered data array
         */
        filterByDateRange(data, dateFrom, dateTo) {
            if (!dateFrom && !dateTo) return data;

            return data.filter(item => {
                const itemDate = new Date(item.waktu);
                const from = dateFrom ? new Date(dateFrom) : new Date(0);
                const to = dateTo ? new Date(dateTo) : new Date();

                // Set time to end of day for 'to' date
                to.setHours(23, 59, 59, 999);

                return itemDate >= from && itemDate <= to;
            });
        },

        /**
         * Calculate average of array of numbers
         * @param {Array<number>} values - Array of numbers
         * @returns {number} - Average value
         */
        calculateAverage(values) {
            if (!values || values.length === 0) return 0;
            const sum = values.reduce((acc, val) => acc + val, 0);
            return sum / values.length;
        },

        /**
         * Get match factor status based on average
         * @param {number} average - Average match factor value
         * @returns {Object} - Status object with text and color
         */
        getMatchFactorStatus(average) {
            const { MATCH_FACTOR_OPTIMAL, MATCH_FACTOR_WARN } = CONFIG.VALIDATION.RANGES;

            // Critical range
            if (average < MATCH_FACTOR_WARN.min || average > MATCH_FACTOR_WARN.max) {
                return {
                    text: 'Critical',
                    color: 'text-red-500',
                };
            }

            // Warning range
            if (average < MATCH_FACTOR_OPTIMAL.min || average > MATCH_FACTOR_OPTIMAL.max) {
                return {
                    text: 'Warning',
                    color: 'text-yellow-500',
                };
            }

            // Optimal range
            return {
                text: 'Optimal',
                color: 'text-green-500',
            };
        },
    },

    /**
     * DOM utilities
     */
    dom: {
        /**
         * Get element by ID with error handling
         * @param {string} id - Element ID
         * @returns {HTMLElement|null} - Element or null if not found
         */
        getElement(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with ID "${id}" not found`);
            }
            return element;
        },

        /**
         * Get input value safely
         * @param {string} id - Input element ID
         * @returns {string} - Trimmed input value
         */
        getInputValue(id) {
            const element = this.getElement(id);
            return element ? element.value.trim() : '';
        },

        /**
         * Set input value safely
         * @param {string} id - Input element ID
         * @param {string} value - Value to set
         */
        setInputValue(id, value) {
            const element = this.getElement(id);
            if (element) {
                element.value = value;
            }
        },

        /**
         * Clear input value safely
         * @param {string} id - Input element ID
         */
        clearInput(id) {
            this.setInputValue(id, '');
        },

        /**
         * Toggle element visibility
         * @param {string} id - Element ID
         * @param {boolean} show - True to show, false to hide
         */
        toggleVisibility(id, show) {
            const element = this.getElement(id);
            if (element) {
                if (show) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        },

        /**
         * Add CSS classes to element
         * @param {string} id - Element ID
         * @param {...string} classes - Classes to add
         */
        addClass(id, ...classes) {
            const element = this.getElement(id);
            if (element) {
                element.classList.add(...classes);
            }
        },

        /**
         * Remove CSS classes from element
         * @param {string} id - Element ID
         * @param {...string} classes - Classes to remove
         */
        removeClass(id, ...classes) {
            const element = this.getElement(id);
            if (element) {
                element.classList.remove(...classes);
            }
        },
    },

    /**
     * String utilities
     */
    string: {
        /**
         * Sanitize string for safe HTML output
         * @param {string} str - String to sanitize
         * @returns {string} - Sanitized string
         */
        sanitize(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Truncate string to max length
         * @param {string} str - String to truncate
         * @param {number} maxLength - Maximum length
         * @returns {string} - Truncated string
         */
        truncate(str, maxLength = 50) {
            if (!str || str.length <= maxLength) return str;
            return str.substring(0, maxLength) + '...';
        },
    },

    /**
     * Array utilities
     */
    array: {
        /**
         * Check if array is empty
         * @param {Array} arr - Array to check
         * @returns {boolean} - True if empty
         */
        isEmpty(arr) {
            return !arr || !Array.isArray(arr) || arr.length === 0;
        },

        /**
         * Get last element of array
         * @param {Array} arr - Array
         * @returns {*} - Last element or undefined
         */
        last(arr) {
            return arr && arr.length > 0 ? arr[arr.length - 1] : undefined;
        },
    },

    /**
     * Object utilities
     */
    object: {
        /**
         * Deep clone object
         * @param {Object} obj - Object to clone
         * @returns {Object} - Cloned object
         */
        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Check if object is empty
         * @param {Object} obj - Object to check
         * @returns {boolean} - True if empty
         */
        isEmpty(obj) {
            return !obj || Object.keys(obj).length === 0;
        },
    },

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait = CONFIG.UI.ANIMATION.NORMAL) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function to limit function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit time in milliseconds
     * @returns {Function} - Throttled function
     */
    throttle(func, limit = CONFIG.UI.ANIMATION.NORMAL) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
