// ==========================================
// SmartzProd - Calculator Module
// ==========================================

/**
 * Pure calculation functions for business logic
 * All functions are pure (no side effects, no DOM access)
 * Fully testable and reusable
 */

const Calculator = {
    /**
     * Productivity calculations
     */
    productivity: {
        /**
         * Calculate duration (HM Akhir - HM Awal)
         * @param {number} hmAkhir - Ending hour meter reading
         * @param {number} hmAwal - Starting hour meter reading
         * @returns {number} - Duration in hours
         */
        calculateDuration(hmAkhir, hmAwal) {
            return hmAkhir - hmAwal;
        },

        /**
         * Calculate productivity (Jumlah Ritase × Kapasitas) ÷ Durasi
         * @param {number} jumlahRitase - Number of trips
         * @param {number} kapasitas - Bucket capacity in BCM
         * @param {number} durasi - Duration in hours
         * @returns {number} - Productivity in BCM/hour (rounded to 2 decimals)
         */
        calculateProductivity(jumlahRitase, kapasitas, durasi) {
            if (durasi === 0) {
                throw new Error('Duration cannot be zero');
            }
            const result = (jumlahRitase * kapasitas) / durasi;
            return Utils.format.toDecimal(result);
        },

        /**
         * Create complete productivity data object
         * @param {Object} inputs - Input values
         * @returns {Object} - Complete productivity record
         */
        createProductivityRecord(inputs) {
            const {
                namaPengawas,
                nrp,
                waktu,
                noExcavator,
                jumlahRitase,
                hmAwal,
                hmAkhir,
                kapasitas,
            } = inputs;

            // Calculate derived values
            const durasi = this.calculateDuration(hmAkhir, hmAwal);
            const productivity = this.calculateProductivity(jumlahRitase, kapasitas, durasi);

            // Return complete record
            return {
                namaPengawas,
                nrp,
                waktu: waktu || new Date().toISOString().slice(0, 16),
                noExcavator,
                jumlahRitase: parseInt(jumlahRitase),
                hmAwal: Utils.format.toDecimal(hmAwal),
                hmAkhir: Utils.format.toDecimal(hmAkhir),
                durasi: Utils.format.toDecimal(durasi),
                kapasitas: Utils.format.toDecimal(kapasitas),
                productivity,
            };
        },

        /**
         * Validate productivity inputs
         * @param {Object} inputs - Input values to validate
         * @returns {Object} - Validation result with isValid and errors array
         */
        validateInputs(inputs) {
            const errors = [];
            const {
                namaPengawas,
                nrp,
                noExcavator,
                jumlahRitase,
                hmAwal,
                hmAkhir,
                kapasitas,
            } = inputs;

            // Validate required fields
            if (!namaPengawas || !nrp || !noExcavator) {
                errors.push(CONFIG.MESSAGES.ERROR.INCOMPLETE_DATA);
            }

            // Validate name format
            if (namaPengawas && !Utils.validation.isValidName(namaPengawas)) {
                errors.push('Nama Pengawas harus berisi huruf, spasi, tanda hubung, atau apostrof saja');
            }

            // Validate NRP format
            if (nrp && !Utils.validation.isValidNRP(nrp)) {
                errors.push('NRP harus berisi huruf dan angka saja');
            }

            // Validate excavator format
            if (noExcavator && !Utils.validation.isValidExcavator(noExcavator)) {
                errors.push('No Excavator harus berisi huruf dan angka saja (tanpa karakter khusus)');
            }

            // Validate positive numbers
            if (!jumlahRitase || jumlahRitase <= 0) {
                errors.push('Jumlah Ritase harus lebih dari 0');
            }

            if (!kapasitas || kapasitas <= 0) {
                errors.push('Kapasitas harus lebih dari 0');
            }

            // Validate HM range
            if (!Utils.validation.isValidHMRange(hmAkhir, hmAwal)) {
                errors.push(CONFIG.MESSAGES.ERROR.HM_INVALID);
            }

            return {
                isValid: errors.length === 0,
                errors,
            };
        },
    },

    /**
     * Match Factor calculations
     */
    matchFactor: {
        /**
         * Calculate match factor: (Jumlah HD × Cycle Time Loader) ÷ Cycle Time Hauler
         * @param {number} jumlahHD - Number of haulers
         * @param {number} cycleTimeLoader - Excavator cycle time in minutes
         * @param {number} cycleTimeHauler - Hauler cycle time in minutes
         * @returns {number} - Match factor (rounded to 2 decimals)
         */
        calculateMatchFactor(jumlahHD, cycleTimeLoader, cycleTimeHauler) {
            if (cycleTimeHauler === 0) {
                throw new Error('Cycle Time Hauler cannot be zero');
            }
            const result = (jumlahHD * cycleTimeLoader) / cycleTimeHauler;
            return Utils.format.toDecimal(result);
        },

        /**
         * Create complete match factor data object
         * @param {Object} inputs - Input values
         * @returns {Object} - Complete match factor record
         */
        createMatchFactorRecord(inputs) {
            const {
                namaPengawas,
                nrp,
                waktu,
                noExcavator,
                jumlahHD,
                cycleTimeHauler,
                cycleTimeLoader,
            } = inputs;

            // Calculate match factor
            const matchFactor = this.calculateMatchFactor(jumlahHD, cycleTimeLoader, cycleTimeHauler);

            // Return complete record
            return {
                namaPengawas,
                nrp,
                waktu: waktu || new Date().toISOString().slice(0, 16),
                noExcavator,
                jumlahHD: parseInt(jumlahHD),
                cycleTimeHauler: Utils.format.toDecimal(cycleTimeHauler),
                cycleTimeLoader: Utils.format.toDecimal(cycleTimeLoader),
                matchFactor,
            };
        },

        /**
         * Validate match factor inputs
         * @param {Object} inputs - Input values to validate
         * @returns {Object} - Validation result with isValid, errors array, and warnings
         */
        validateInputs(inputs) {
            const errors = [];
            const warnings = [];
            const {
                namaPengawas,
                nrp,
                noExcavator,
                jumlahHD,
                cycleTimeHauler,
                cycleTimeLoader,
            } = inputs;

            // Validate required fields
            if (!namaPengawas || !nrp || !noExcavator) {
                errors.push(CONFIG.MESSAGES.ERROR.INCOMPLETE_DATA);
            }

            // Validate name format
            if (namaPengawas && !Utils.validation.isValidName(namaPengawas)) {
                errors.push('Nama Pengawas harus berisi huruf, spasi, tanda hubung, atau apostrof saja');
            }

            // Validate NRP format
            if (nrp && !Utils.validation.isValidNRP(nrp)) {
                errors.push('NRP harus berisi huruf dan angka saja');
            }

            // Validate excavator format
            if (noExcavator && !Utils.validation.isValidExcavator(noExcavator)) {
                errors.push('No Excavator harus berisi huruf dan angka saja (tanpa karakter khusus)');
            }

            // Validate positive numbers
            if (!jumlahHD || jumlahHD <= 0) {
                errors.push('Jumlah HD harus lebih dari 0');
            }

            if (!cycleTimeHauler || cycleTimeHauler <= 0) {
                errors.push('Cycle Time Hauler harus lebih dari 0');
            }

            if (!cycleTimeLoader || cycleTimeLoader <= 0) {
                errors.push('Cycle Time Loader harus lebih dari 0');
            }

            // Check match factor range for warnings (only if all inputs valid)
            if (errors.length === 0) {
                const matchFactor = this.calculateMatchFactor(jumlahHD, cycleTimeLoader, cycleTimeHauler);

                if (!Utils.validation.isMatchFactorSafe(matchFactor)) {
                    warnings.push(`${CONFIG.MESSAGES.WARNING.MATCH_FACTOR_RANGE}: ${matchFactor}`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        },

        /**
         * Get match factor interpretation
         * @param {number} matchFactor - Match factor value
         * @returns {Object} - Interpretation with status, message, and recommendation
         */
        interpretMatchFactor(matchFactor) {
            const status = Utils.data.getMatchFactorStatus(matchFactor);

            let message = '';
            let recommendation = '';

            if (matchFactor < 0.5) {
                message = 'Terlalu banyak hauler (kelebihan kapasitas)';
                recommendation = 'Kurangi jumlah hauler atau alokasikan ulang ke excavator lain';
            } else if (matchFactor >= 0.5 && matchFactor <= 1.0) {
                message = 'Keseimbangan baik (optimal)';
                recommendation = 'Pertahankan konfigurasi saat ini';
            } else if (matchFactor > 1.0 && matchFactor <= 1.5) {
                message = 'Sedikit kekurangan hauler (masih acceptable)';
                recommendation = 'Monitor dan pertimbangkan menambah hauler jika produktivitas menurun';
            } else if (matchFactor > 1.5 && matchFactor <= 2.0) {
                message = 'Kekurangan hauler (excavator menunggu)';
                recommendation = 'Tambah hauler untuk meningkatkan efisiensi';
            } else {
                message = 'Kekurangan hauler parah (critical)';
                recommendation = 'Segera tambah hauler - excavator idle terlalu lama';
            }

            return {
                status: status.text,
                color: status.color,
                matchFactor: Utils.format.toDecimal(matchFactor),
                message,
                recommendation,
            };
        },
    },

    /**
     * Statistics calculations
     */
    stats: {
        /**
         * Calculate statistics for productivity data
         * @param {Array} data - Array of productivity records
         * @returns {Object} - Statistics object
         */
        getProductivityStats(data) {
            if (!data || data.length === 0) {
                return {
                    count: 0,
                    avgProductivity: 0,
                    maxProductivity: 0,
                    minProductivity: 0,
                    totalRitase: 0,
                    avgRitase: 0,
                };
            }

            const productivities = data.map(d => d.productivity);
            const ritases = data.map(d => d.jumlahRitase);

            return {
                count: data.length,
                avgProductivity: Utils.format.toDecimal(Utils.data.calculateAverage(productivities)),
                maxProductivity: Utils.format.toDecimal(Math.max(...productivities)),
                minProductivity: Utils.format.toDecimal(Math.min(...productivities)),
                totalRitase: ritases.reduce((sum, val) => sum + val, 0),
                avgRitase: Utils.format.toDecimal(Utils.data.calculateAverage(ritases)),
            };
        },

        /**
         * Calculate statistics for match factor data
         * @param {Array} data - Array of match factor records
         * @returns {Object} - Statistics object
         */
        getMatchFactorStats(data) {
            if (!data || data.length === 0) {
                return {
                    count: 0,
                    avgMatchFactor: 0,
                    maxMatchFactor: 0,
                    minMatchFactor: 0,
                    status: { text: 'N/A', color: 'text-gray-500' },
                };
            }

            const matchFactors = data.map(d => d.matchFactor);
            const avg = Utils.data.calculateAverage(matchFactors);

            return {
                count: data.length,
                avgMatchFactor: Utils.format.toDecimal(avg),
                maxMatchFactor: Utils.format.toDecimal(Math.max(...matchFactors)),
                minMatchFactor: Utils.format.toDecimal(Math.min(...matchFactors)),
                status: Utils.data.getMatchFactorStatus(avg),
            };
        },

        /**
         * Calculate statistics per excavator
         * @param {Array} productivityData - Productivity records
         * @param {Array} matchFactorData - Match factor records
         * @param {string} excavatorId - Excavator ID
         * @returns {Object} - Combined statistics
         */
        getExcavatorStats(productivityData, matchFactorData, excavatorId) {
            const prodData = Utils.data.filterByExcavator(productivityData, excavatorId);
            const mfData = Utils.data.filterByExcavator(matchFactorData, excavatorId);

            return {
                excavatorId,
                productivity: this.getProductivityStats(prodData),
                matchFactor: this.getMatchFactorStats(mfData),
                totalRecords: prodData.length + mfData.length,
            };
        },
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
}
