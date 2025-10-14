// ==========================================
// SmartzProd - Configuration & Constants
// ==========================================

/**
 * Application Configuration
 * Centralized configuration for all app settings, constants, and magic values
 */
const CONFIG = {
    // Application metadata
    APP: {
        NAME: 'SmartzProd',
        VERSION: '2.0.12',
        LOCALE: 'id-ID', // Indonesian locale
    },

    // LocalStorage keys
    STORAGE_KEYS: {
        PRODUCTIVITY_DATA: 'productivity_data',
        MATCH_FACTOR_DATA: 'matchFactor_data',
        USER_NAME: 'userNama',
        USER_NRP: 'userNRP',
        SIDEBAR_COLLAPSED: 'sidebarCollapsed',
        EXPANDED_EXCAVATORS: 'expandedExcavators',
    },

    // DOM Element IDs
    DOM_IDS: {
        // Productivity Calculator
        NAMA_PENGAWAS: 'namaPengawas',
        NRP: 'nrp',
        WAKTU: 'waktu',
        NO_EXCAVATOR: 'noExcavator',
        JUMLAH_RITASE: 'jumlahRitase',
        HM_AWAL: 'hmAwal',
        HM_AKHIR: 'hmAkhir',
        KAPASITAS: 'kapasitas',

        // Match Factor Calculator
        JUMLAH_HD: 'jumlahHD',
        CYCLE_TIME_HAULER: 'cycleTimeHauler',
        CYCLE_TIME_LOADER: 'cycleTimeLoader',

        // Buttons
        BTN_CALC_PRODUCTIVITY: 'calculateProductivityBtn',
        BTN_CALC_MATCH_FACTOR: 'calculateMatchFactorBtn',
        BTN_BACKUP: 'backupBtn',
        BTN_RESTORE: 'restoreBtn',
        BTN_CLEAR_FILTERS: 'clearFiltersBtn',

        // Tables
        TABLE_PRODUCTIVITY_BODY: 'productivityTableBody',
        TABLE_MATCH_FACTOR_BODY: 'matchFactorTableBody',
        PRODUCTIVITY_COUNT: 'productivityCount',
        MATCH_FACTOR_COUNT: 'matchFactorCount',

        // Charts
        INDIVIDUAL_CHARTS_CONTAINER: 'individualChartsContainer',

        // Filters
        FILTER_EXCAVATOR: 'filterExcavator',
        FILTER_PENGAWAS: 'filterPengawas',
        FILTER_DATE_FROM: 'filterDateFrom',
        FILTER_DATE_TO: 'filterDateTo',
        FILTERS_CONTENT: 'filters-content',
        FILTERS_CHEVRON: 'filters-chevron',
        FILTERS_TOGGLE: 'filters-toggle',

        // Sidebar
        SIDEBAR: 'sidebar',
        MENU_TOGGLE: 'menu-toggle',
        SIDEBAR_TOGGLE_DESKTOP: 'sidebar-toggle-desktop',

        // Modals
        EDIT_MODAL: 'editModal',
        CONFIRM_MODAL: 'confirmModal',

        // Stats
        LAST_UPDATE: 'lastUpdate',
        TOTAL_RECORDS: 'totalRecords',
    },

    // Validation Rules
    VALIDATION: {
        // Text patterns
        PATTERNS: {
            NAME: /^[A-Za-z\s'-]+$/, // Letters, spaces, hyphens, apostrophes only
            EXCAVATOR: /^[A-Za-z0-9]+$/, // Alphanumeric only (no special characters)
            NRP: /^[A-Za-z0-9]+$/, // Alphanumeric only
        },

        // Number ranges
        RANGES: {
            POSITIVE_INT: { min: 1, max: 9999 },
            POSITIVE_DECIMAL: { min: 0.1, max: Infinity },
            MATCH_FACTOR_WARN: { min: 0.1, max: 2.0 }, // Warning range
            MATCH_FACTOR_OPTIMAL: { min: 0.5, max: 1.5 }, // Optimal range
        },

        // String lengths
        LENGTHS: {
            NAME: { min: 1, max: 100 },
            NRP: { min: 1, max: 50 },
            EXCAVATOR: { min: 1, max: 50 },
        },

        // Decimal precision
        DECIMAL_PLACES: 2,
    },

    // UI Configuration
    UI: {
        // Animation timings (milliseconds)
        ANIMATION: {
            FAST: 150,
            NORMAL: 200,
            SMOOTH: 300,
            SLOW: 500,
        },

        // Toast notifications
        TOAST: {
            DURATION: 3000, // 3 seconds
            MAX_VISIBLE: 5,
            POSITION: 'bottom-right',
            TYPES: {
                success: {
                    bg: 'bg-gradient-to-r from-green-500 to-green-600',
                    icon: 'fa-check-circle',
                    border: 'border-l-4 border-green-700',
                },
                error: {
                    bg: 'bg-gradient-to-r from-red-500 to-red-600',
                    icon: 'fa-exclamation-circle',
                    border: 'border-l-4 border-red-700',
                },
                warning: {
                    bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
                    icon: 'fa-exclamation-triangle',
                    border: 'border-l-4 border-yellow-700',
                },
                info: {
                    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
                    icon: 'fa-info-circle',
                    border: 'border-l-4 border-blue-700',
                },
            },
        },

        // Modal button colors
        MODAL_COLORS: {
            blue: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
            red: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
            green: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
            orange: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
            purple: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
            teal: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
        },

        // Chart colors (per excavator)
        CHART_COLORS: [
            {
                gradient: 'from-blue-500 to-blue-600',
                icon: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                rgb: 'rgba(59, 130, 246, 0.8)',
            },
            {
                gradient: 'from-purple-500 to-purple-600',
                icon: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-200',
                rgb: 'rgba(168, 85, 247, 0.8)',
            },
            {
                gradient: 'from-green-500 to-green-600',
                icon: 'text-green-600',
                bg: 'bg-green-50',
                border: 'border-green-200',
                rgb: 'rgba(34, 197, 94, 0.8)',
            },
            {
                gradient: 'from-orange-500 to-orange-600',
                icon: 'text-orange-600',
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                rgb: 'rgba(249, 115, 22, 0.8)',
            },
            {
                gradient: 'from-pink-500 to-pink-600',
                icon: 'text-pink-600',
                bg: 'bg-pink-50',
                border: 'border-pink-200',
                rgb: 'rgba(236, 72, 153, 0.8)',
            },
            {
                gradient: 'from-teal-500 to-teal-600',
                icon: 'text-teal-600',
                bg: 'bg-teal-50',
                border: 'border-teal-200',
                rgb: 'rgba(20, 184, 166, 0.8)',
            },
        ],
    },

    // Timer intervals
    TIMERS: {
        TIMESTAMP_UPDATE: 60000, // Update timestamp every 1 minute (60000ms)
        TOAST_DISPLAY: 3000, // Toast display duration (3000ms)
        FORM_RESET_DELAY: 100, // Delay before resetting form (100ms)
    },

    // Export Configuration
    EXPORT: {
        // Excel column widths
        EXCEL_COLUMNS: {
            PRODUCTIVITY: [
                { header: 'Nama Pengawas', key: 'namaPengawas', width: 20 },
                { header: 'NRP', key: 'nrp', width: 15 },
                { header: 'Waktu', key: 'waktu', width: 20 },
                { header: 'No Excavator', key: 'noExcavator', width: 15 },
                { header: 'Jumlah Ritase', key: 'jumlahRitase', width: 15 },
                { header: 'HM Awal', key: 'hmAwal', width: 10 },
                { header: 'HM Akhir', key: 'hmAkhir', width: 10 },
                { header: 'Kapasitas (BCM)', key: 'kapasitas', width: 15 },
                { header: 'Productivity', key: 'productivity', width: 15 },
            ],
            MATCH_FACTOR: [
                { header: 'Nama Pengawas', key: 'namaPengawas', width: 20 },
                { header: 'NRP', key: 'nrp', width: 15 },
                { header: 'Waktu', key: 'waktu', width: 20 },
                { header: 'No Excavator', key: 'noExcavator', width: 15 },
                { header: 'Jumlah HD', key: 'jumlahHD', width: 12 },
                { header: 'Cycle Time Hauler', key: 'cycleTimeHauler', width: 18 },
                { header: 'Cycle Time Loader', key: 'cycleTimeLoader', width: 18 },
                { header: 'Match Factor', key: 'matchFactor', width: 15 },
            ],
        },

        // Backup file format
        BACKUP: {
            FILE_PREFIX: 'SmartzProd-Backup',
            FILE_EXTENSION: '.json',
            MIME_TYPE: 'application/json',
        },
    },

    // Chart Configuration
    CHARTS: {
        // Chart.js default options
        DEFAULT_OPTIONS: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false, // No legend for individual charts
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                    },
                },
                x: {
                    grid: {
                        display: false,
                    },
                },
            },
        },

        // Chart type (all charts use bar)
        TYPE: 'bar',

        // Chart container height
        HEIGHT: '300px',
    },

    // Messages (Indonesian UI text)
    MESSAGES: {
        SUCCESS: {
            PRODUCTIVITY_ADDED: 'Data Productivity berhasil ditambahkan!',
            MATCH_FACTOR_ADDED: 'Data Match Factor berhasil ditambahkan!',
            DATA_UPDATED: 'Data berhasil diperbarui!',
            DATA_DELETED: 'Data berhasil dihapus!',
            BACKUP_SUCCESS: 'Backup berhasil! File telah diunduh.',
            RESTORE_SUCCESS: 'Data berhasil dipulihkan!',
        },
        ERROR: {
            INCOMPLETE_DATA: 'Mohon lengkapi Data Umum (Nama Pengawas, NRP, dan No Excavator)',
            INVALID_VALUES: 'Semua field harus diisi dengan nilai lebih dari 0',
            HM_INVALID: 'HM Akhir harus lebih besar dari HM Awal',
            INVALID_FILE: 'File backup tidak valid!',
            RESTORE_FAILED: 'Gagal memulihkan data. Silakan coba lagi.',
        },
        WARNING: {
            MATCH_FACTOR_RANGE: 'Match Factor di luar range valid (0.1 - 2.0)',
        },
        CONFIRM: {
            DELETE_TITLE: 'Hapus Data',
            DELETE_MESSAGE: 'Yakin ingin menghapus data ini? Data yang dihapus tidak dapat dikembalikan.',
            RESTORE_TITLE: 'Restore Data dari Backup',
        },
    },

    // Console log messages (English for developers)
    CONSOLE: {
        INIT: 'SmartzProd initialized',
        DATA_LOADED: 'Data loaded from localStorage',
        DATA_SAVED: 'Data saved to localStorage',
        ERROR_LOAD: 'Error loading data from localStorage',
        ERROR_SAVE: 'Error saving data to localStorage',
        VALIDATION_FAILED: 'Validation failed',
        CHART_CREATED: 'Chart created',
        CHART_UPDATED: 'Chart updated',
    },
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.APP);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.DOM_IDS);
Object.freeze(CONFIG.VALIDATION);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.TIMERS);
Object.freeze(CONFIG.EXPORT);
Object.freeze(CONFIG.CHARTS);
Object.freeze(CONFIG.MESSAGES);
Object.freeze(CONFIG.CONSOLE);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
