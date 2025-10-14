// ==========================================
// SmartzProd - Main Application Orchestrator
// ==========================================

/**
 * Main application module
 * Orchestrates all other modules and manages application state
 * 
 * Usage:
 * 1. Include all module scripts BEFORE this file
 * 2. This file initializes the app automatically on DOMContentLoaded
 * 3. Exposes global functions for HTML onclick handlers
 */

// Global application state
const AppState = {
    productivityData: [],
    matchFactorData: [],
    currentEditIndex: null,
    currentEditType: null,
    productivityChart: null,
    matchFactorChart: null
};

// Main App module
const App = {
    /**
     * Initialize application
     */
    init() {
        console.log(`${CONFIG.CONSOLE.APP.INITIALIZED}: ${CONFIG.APP.NAME} v${CONFIG.APP.VERSION}`);

        // Load data from localStorage
        this.loadData();

        // Setup UI
        this.setupUI();

        // Bind events
        this.bindEvents();

        // Setup timers
        this.setupTimers();

        // Initial render
        this.render();

        console.log(CONFIG.CONSOLE.APP.READY);
    },

    /**
     * Load data from localStorage
     */
    loadData() {
        const { productivityData, matchFactorData } = Storage.app.loadAllData();
        AppState.productivityData = productivityData;
        AppState.matchFactorData = matchFactorData;

        // Load user settings
        const userSettings = Storage.app.loadUserSettings();
        if (userSettings.nama) {
            DOM.input.setValue(CONFIG.DOM_IDS.NAMA_PENGAWAS, userSettings.nama);
        }
        if (userSettings.nrp) {
            DOM.input.setValue(CONFIG.DOM_IDS.NRP, userSettings.nrp);
        }

        console.log(`${CONFIG.CONSOLE.STORAGE.LOADED}: ${AppState.productivityData.length} productivity, ${AppState.matchFactorData.length} match factor`);
    },

    /**
     * Setup UI components
     */
    setupUI() {
        // Setup sidebar toggle
        this.setupSidebarToggle();

        // Setup hamburger menu (mobile)
        this.setupHamburgerMenu();

        // Set initial timestamp
        this.updateTimestamp();

        // Update last update time
        this.updateLastUpdate();

        // Update total records
        this.updateTotalRecords();
    },

    /**
     * Setup sidebar toggle functionality
     */
    setupSidebarToggle() {
        const sidebar = DOM.getElement('sidebar');
        const mainContent = DOM.getElement('main-content');
        const toggleBtn = DOM.getElement('sidebar-toggle');

        if (!sidebar || !mainContent || !toggleBtn) return;

        // Load sidebar state
        const uiPrefs = Storage.app.loadUIPreferences();
        const isCollapsed = uiPrefs.sidebarCollapsed || false;

        // Apply initial state
        this.applySidebarState(sidebar, mainContent, isCollapsed);

        // Bind toggle button
        toggleBtn.onclick = () => {
            const currentlyCollapsed = sidebar.classList.contains('collapsed');
            this.applySidebarState(sidebar, mainContent, !currentlyCollapsed);

            // Save state
            Storage.app.saveUIPreferences(!currentlyCollapsed, uiPrefs.expandedExcavators);
        };

        // Bind collapsed icon events
        this.bindCollapsedIconEvents(sidebar);
    },

    /**
     * Apply sidebar state
     */
    applySidebarState(sidebar, mainContent, isCollapsed) {
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    },

    /**
     * Bind collapsed icon events
     */
    bindCollapsedIconEvents(sidebar) {
        const icons = sidebar.querySelectorAll('.sidebar-icon-collapsed');
        icons.forEach(icon => {
            icon.onclick = (e) => {
                e.stopPropagation();
                const targetSection = icon.dataset.target;
                if (targetSection) {
                    // Expand sidebar
                    const mainContent = DOM.getElement('main-content');
                    this.applySidebarState(sidebar, mainContent, false);

                    // Navigate to section
                    setTimeout(() => {
                        const section = DOM.getElement(targetSection);
                        if (section) {
                            section.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 300);
                }
            };
        });
    },

    /**
     * Setup hamburger menu for mobile
     */
    setupHamburgerMenu() {
        const menuToggle = DOM.getElement('menu-toggle');
        const sidebar = DOM.getElement('sidebar');

        if (menuToggle && sidebar) {
            menuToggle.onclick = () => {
                sidebar.classList.toggle('translate-x-0');
                sidebar.classList.toggle('-translate-x-full');
            };
        }
    },

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Productivity form
        this.bindProductivityForm();

        // Match Factor form
        this.bindMatchFactorForm();

        // Real-time validation
        this.bindValidation();

        // Export buttons
        this.bindExportButtons();

        // Backup/Restore buttons
        this.bindBackupButtons();

        // Edit modal
        this.bindEditModal();
    },

    /**
     * Bind productivity form
     */
    bindProductivityForm() {
        DOM.events.on(CONFIG.DOM_IDS.PRODUCTIVITY_FORM, 'submit', (e) => {
            e.preventDefault();
            this.submitProductivity();
        });
    },

    /**
     * Bind match factor form
     */
    bindMatchFactorForm() {
        DOM.events.on(CONFIG.DOM_IDS.MATCH_FACTOR_FORM, 'submit', (e) => {
            e.preventDefault();
            this.submitMatchFactor();
        });
    },

    /**
     * Bind real-time validation
     */
    bindValidation() {
        // Productivity fields
        const prodFields = [
            CONFIG.DOM_IDS.NAMA_PENGAWAS,
            CONFIG.DOM_IDS.NRP,
            CONFIG.DOM_IDS.NO_EXCAVATOR,
            CONFIG.DOM_IDS.JUMLAH_RITASE,
            CONFIG.DOM_IDS.HM_AWAL,
            CONFIG.DOM_IDS.HM_AKHIR,
            CONFIG.DOM_IDS.KAPASITAS
        ];

        prodFields.forEach(fieldId => {
            DOM.events.onDebounced(fieldId, 'input', () => {
                this.validateField(fieldId);
            });
        });

        // Match Factor fields
        const mfFields = [
            CONFIG.DOM_IDS.NAMA_PENGAWAS_MF,
            CONFIG.DOM_IDS.NRP_MF,
            CONFIG.DOM_IDS.NO_EXCAVATOR_MF,
            CONFIG.DOM_IDS.JUMLAH_HD,
            CONFIG.DOM_IDS.CT_LOADER,
            CONFIG.DOM_IDS.CT_HAULER
        ];

        mfFields.forEach(fieldId => {
            DOM.events.onDebounced(fieldId, 'input', () => {
                this.validateField(fieldId);
            });
        });
    },

    /**
     * Bind export buttons
     */
    bindExportButtons() {
        // Productivity exports
        DOM.events.on('exportProductivityExcel', 'click', () => {
            Export.excel.exportProductivity(AppState.productivityData);
        });

        DOM.events.on('exportProductivityPDF', 'click', () => {
            Export.pdf.exportProductivity(AppState.productivityData);
        });

        // Match Factor exports
        DOM.events.on('exportMatchFactorExcel', 'click', () => {
            Export.excel.exportMatchFactor(AppState.matchFactorData);
        });

        DOM.events.on('exportMatchFactorPDF', 'click', () => {
            Export.pdf.exportMatchFactor(AppState.matchFactorData);
        });
    },

    /**
     * Bind backup/restore buttons
     */
    bindBackupButtons() {
        DOM.events.on('backupDataBtn', 'click', () => {
            Export.backup.create();
        });

        DOM.events.on('restoreDataBtn', 'click', () => {
            Export.backup.restore();
        });
    },

    /**
     * Bind edit modal
     */
    bindEditModal() {
        DOM.events.on('cancelEditBtn', 'click', () => {
            UI.editModal.hide();
        });

        DOM.events.on('saveEditBtn', 'click', () => {
            this.saveEdit();
        });

        // Close on backdrop click
        const modal = DOM.getElement(CONFIG.DOM_IDS.EDIT_MODAL);
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    UI.editModal.hide();
                }
            };
        }
    },

    /**
     * Setup timers
     */
    setupTimers() {
        // Update timestamp every minute
        setInterval(() => {
            this.updateTimestamp();
        }, CONFIG.TIMERS.TIMESTAMP_UPDATE);

        // Update last update time
        setInterval(() => {
            this.updateLastUpdate();
        }, CONFIG.TIMERS.LAST_UPDATE_CHECK);
    },

    /**
     * Update timestamp field
     */
    updateTimestamp() {
        const waktuField = DOM.getElement(CONFIG.DOM_IDS.WAKTU);
        const waktuFieldMF = DOM.getElement(CONFIG.DOM_IDS.WAKTU_MF);

        // Only update if not focused and not manually modified
        if (waktuField && !waktuField.matches(':focus')) {
            const currentTime = Utils.format.getCurrentLocalDateTime();
            if (waktuField.value === '' || !waktuField.dataset.manuallyModified) {
                waktuField.value = currentTime;
            }
        }

        if (waktuFieldMF && !waktuFieldMF.matches(':focus')) {
            const currentTime = Utils.format.getCurrentLocalDateTime();
            if (waktuFieldMF.value === '' || !waktuFieldMF.dataset.manuallyModified) {
                waktuFieldMF.value = currentTime;
            }
        }
    },

    /**
     * Update last update time
     */
    updateLastUpdate() {
        const element = DOM.getElement('lastUpdate');
        if (!element) return;

        const lastUpdateTime = Storage.load(CONFIG.STORAGE_KEYS.LAST_UPDATE);
        if (lastUpdateTime) {
            element.textContent = Utils.format.toIndonesianDateTime(lastUpdateTime);
        }
    },

    /**
     * Update total records display
     */
    updateTotalRecords() {
        const element = DOM.getElement('totalRecords');
        if (element) {
            const total = AppState.productivityData.length + AppState.matchFactorData.length;
            element.textContent = total;
        }
    },

    /**
     * Validate field
     */
    validateField(fieldId) {
        const value = DOM.input.getValue(fieldId);
        const validIconId = `${fieldId}Valid`;
        const invalidIconId = `${fieldId}Invalid`;

        let isValid = false;

        // Determine validation type
        if (fieldId.includes('nama') || fieldId.includes('Nama')) {
            isValid = Utils.validation.isValidName(value);
        } else if (fieldId.includes('nrp') || fieldId.includes('Nrp')) {
            isValid = Utils.validation.isValidNRP(value);
        } else if (fieldId.includes('excavator') || fieldId.includes('Excavator')) {
            isValid = Utils.validation.isValidExcavator(value);
        } else if (fieldId.includes('ritase') || fieldId.includes('Ritase') || fieldId.includes('HD') || fieldId.includes('hd')) {
            isValid = Utils.validation.isValidPositiveInt(value);
        } else if (fieldId.includes('hm') || fieldId.includes('HM') || fieldId.includes('ct') || fieldId.includes('CT') || fieldId.includes('kapasitas') || fieldId.includes('Kapasitas')) {
            isValid = Utils.validation.isValidPositiveNumber(value);
        }

        // Update icons
        if (value === '') {
            UI.validation.hideAll(validIconId, invalidIconId);
        } else if (isValid) {
            UI.validation.showValid(validIconId);
            UI.validation.hide(invalidIconId);
        } else {
            UI.validation.hide(validIconId);
            UI.validation.showValid(invalidIconId);
        }
    },

    /**
     * Submit productivity data
     */
    submitProductivity() {
        // Get form values
        const data = {
            namaPengawas: DOM.input.getValue(CONFIG.DOM_IDS.NAMA_PENGAWAS),
            nrp: DOM.input.getValue(CONFIG.DOM_IDS.NRP),
            waktu: DOM.input.getValue(CONFIG.DOM_IDS.WAKTU),
            noExcavator: DOM.input.getValue(CONFIG.DOM_IDS.NO_EXCAVATOR),
            jumlahRitase: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.JUMLAH_RITASE)),
            hmAwal: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.HM_AWAL)),
            hmAkhir: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.HM_AKHIR)),
            kapasitas: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.KAPASITAS))
        };

        // Validate
        const validation = Calculator.productivity.validateInputs(data);
        if (!validation.isValid) {
            validation.errors.forEach(error => UI.alert.show(error, 'error'));
            return;
        }

        // Create record
        const record = Calculator.productivity.createProductivityRecord(data);

        // Add to state
        AppState.productivityData.push(record);

        // Save to storage
        Storage.app.saveAllData(AppState.productivityData, AppState.matchFactorData);

        // Save user settings
        Storage.app.saveUserSettings(data.namaPengawas, data.nrp);

        // Clear form
        this.clearProductivityForm();

        // Re-render
        this.render();

        // Show success message
        UI.toast.show(CONFIG.MESSAGES.SUCCESS.PRODUCTIVITY_ADDED, 'success');

        console.log(`${CONFIG.CONSOLE.DATA.PRODUCTIVITY_ADDED}: ${record.noExcavator}`);
    },

    /**
     * Submit match factor data
     */
    submitMatchFactor() {
        // Get form values
        const data = {
            namaPengawas: DOM.input.getValue(CONFIG.DOM_IDS.NAMA_PENGAWAS_MF),
            nrp: DOM.input.getValue(CONFIG.DOM_IDS.NRP_MF),
            waktu: DOM.input.getValue(CONFIG.DOM_IDS.WAKTU_MF),
            noExcavator: DOM.input.getValue(CONFIG.DOM_IDS.NO_EXCAVATOR_MF),
            jumlahHD: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.JUMLAH_HD)),
            ctLoader: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.CT_LOADER)),
            ctHauler: parseFloat(DOM.input.getValue(CONFIG.DOM_IDS.CT_HAULER))
        };

        // Validate
        const validation = Calculator.matchFactor.validateInputs(data);
        if (!validation.isValid) {
            validation.errors.forEach(error => UI.alert.show(error, 'error'));
            return;
        }

        // Create record
        const record = Calculator.matchFactor.createMatchFactorRecord(data);

        // Add to state
        AppState.matchFactorData.push(record);

        // Save to storage
        Storage.app.saveAllData(AppState.productivityData, AppState.matchFactorData);

        // Save user settings
        Storage.app.saveUserSettings(data.namaPengawas, data.nrp);

        // Clear form
        this.clearMatchFactorForm();

        // Re-render
        this.render();

        // Show success message
        UI.toast.show(CONFIG.MESSAGES.SUCCESS.MATCH_FACTOR_ADDED, 'success');

        console.log(`${CONFIG.CONSOLE.DATA.MATCH_FACTOR_ADDED}: ${record.noExcavator}`);
    },

    /**
     * Clear productivity form
     */
    clearProductivityForm() {
        const fields = [
            CONFIG.DOM_IDS.NO_EXCAVATOR,
            CONFIG.DOM_IDS.JUMLAH_RITASE,
            CONFIG.DOM_IDS.HM_AWAL,
            CONFIG.DOM_IDS.HM_AKHIR,
            CONFIG.DOM_IDS.KAPASITAS
        ];

        DOM.input.clearAll(fields);
        this.updateTimestamp();

        // Clear validation icons
        fields.forEach(fieldId => {
            UI.validation.hideAll(`${fieldId}Valid`, `${fieldId}Invalid`);
        });
    },

    /**
     * Clear match factor form
     */
    clearMatchFactorForm() {
        const fields = [
            CONFIG.DOM_IDS.NO_EXCAVATOR_MF,
            CONFIG.DOM_IDS.JUMLAH_HD,
            CONFIG.DOM_IDS.CT_LOADER,
            CONFIG.DOM_IDS.CT_HAULER
        ];

        DOM.input.clearAll(fields);
        this.updateTimestamp();

        // Clear validation icons
        fields.forEach(fieldId => {
            UI.validation.hideAll(`${fieldId}Valid`, `${fieldId}Invalid`);
        });
    },

    /**
     * Render all UI components
     */
    render() {
        // Update tables
        this.renderTables();

        // Update charts
        this.renderCharts();

        // Update stats
        this.updateLastUpdate();
        this.updateTotalRecords();

        // Update last update timestamp
        Storage.save(CONFIG.STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
    },

    /**
     * Render tables
     */
    renderTables() {
        const prodTbody = DOM.getElement('productivityTableBody');
        const mfTbody = DOM.getElement('matchFactorTableBody');

        if (prodTbody) {
            DOM.table.renderProductivityTable(AppState.productivityData, prodTbody);
        }

        if (mfTbody) {
            DOM.table.renderMatchFactorTable(AppState.matchFactorData, mfTbody);
        }
    },

    /**
     * Render charts
     */
    renderCharts() {
        Charts.updateProductivityChart(AppState.productivityData);
        Charts.updateMatchFactorChart(AppState.matchFactorData);
        Charts.updateIndividualCharts(AppState.productivityData, AppState.matchFactorData);
    },

    /**
     * Edit data
     * @param {number} index - Data index
     * @param {string} type - Data type ('productivity' or 'matchFactor')
     */
    editData(index, type) {
        const data = type === 'productivity'
            ? AppState.productivityData[index]
            : AppState.matchFactorData[index];

        if (!data) {
            UI.alert.show(CONFIG.MESSAGES.ERROR.DATA_NOT_FOUND, 'error');
            return;
        }

        AppState.currentEditIndex = index;
        AppState.currentEditType = type;

        UI.editModal.show(data, index, type, () => this.saveEdit());
    },

    /**
     * Save edit
     */
    saveEdit() {
        const type = AppState.currentEditType;
        const index = AppState.currentEditIndex;

        if (type === 'productivity') {
            // Get form values
            const data = {
                namaPengawas: DOM.input.getValue('editNamaPengawas'),
                nrp: DOM.input.getValue('editNrp'),
                waktu: DOM.input.getValue('editWaktu'),
                noExcavator: DOM.input.getValue('editNoExcavator'),
                jumlahRitase: parseFloat(DOM.input.getValue('editJumlahRitase')),
                hmAwal: parseFloat(DOM.input.getValue('editHmAwal')),
                hmAkhir: parseFloat(DOM.input.getValue('editHmAkhir')),
                kapasitas: parseFloat(DOM.input.getValue('editKapasitas'))
            };

            // Validate
            const validation = Calculator.productivity.validateInputs(data);
            if (!validation.isValid) {
                validation.errors.forEach(error => UI.alert.show(error, 'error'));
                return;
            }

            // Create updated record
            const record = Calculator.productivity.createProductivityRecord(data);

            // Update state
            AppState.productivityData[index] = record;

        } else {
            // Get form values
            const data = {
                namaPengawas: DOM.input.getValue('editNamaPengawasMF'),
                nrp: DOM.input.getValue('editNrpMF'),
                waktu: DOM.input.getValue('editWaktuMF'),
                noExcavator: DOM.input.getValue('editNoExcavatorMF'),
                jumlahHD: parseFloat(DOM.input.getValue('editJumlahHD')),
                ctLoader: parseFloat(DOM.input.getValue('editCtLoader')),
                ctHauler: parseFloat(DOM.input.getValue('editCtHauler'))
            };

            // Validate
            const validation = Calculator.matchFactor.validateInputs(data);
            if (!validation.isValid) {
                validation.errors.forEach(error => UI.alert.show(error, 'error'));
                return;
            }

            // Create updated record
            const record = Calculator.matchFactor.createMatchFactorRecord(data);

            // Update state
            AppState.matchFactorData[index] = record;
        }

        // Save to storage
        Storage.app.saveAllData(AppState.productivityData, AppState.matchFactorData);

        // Hide modal
        UI.editModal.hide();

        // Re-render
        this.render();

        // Show success message
        UI.toast.show(CONFIG.MESSAGES.SUCCESS.DATA_UPDATED, 'success');

        console.log(`${CONFIG.CONSOLE.DATA.UPDATED}: ${type} [${index}]`);
    },

    /**
     * Delete data
     * @param {number} index - Data index
     * @param {string} type - Data type ('productivity' or 'matchFactor')
     */
    deleteData(index, type) {
        const data = type === 'productivity'
            ? AppState.productivityData[index]
            : AppState.matchFactorData[index];

        if (!data) {
            UI.alert.show(CONFIG.MESSAGES.ERROR.DATA_NOT_FOUND, 'error');
            return;
        }

        // Show confirmation
        UI.confirm.show({
            title: CONFIG.MESSAGES.CONFIRM.DELETE_TITLE,
            message: `${CONFIG.MESSAGES.CONFIRM.DELETE_MESSAGE}<br><br><strong>${data.noExcavator}</strong> - ${Utils.format.toIndonesianDateTime(data.waktu)}`,
            type: 'danger',
            confirmText: 'Hapus',
            cancelText: 'Batal',
            onConfirm: () => {
                // Delete from state
                if (type === 'productivity') {
                    AppState.productivityData.splice(index, 1);
                } else {
                    AppState.matchFactorData.splice(index, 1);
                }

                // Save to storage
                Storage.app.saveAllData(AppState.productivityData, AppState.matchFactorData);

                // Re-render
                this.render();

                // Show success message
                UI.toast.show(CONFIG.MESSAGES.SUCCESS.DATA_DELETED, 'success');

                console.log(`${CONFIG.CONSOLE.DATA.DELETED}: ${type} [${index}]`);
            }
        });
    }
};

// ==========================================
// Global Functions (for HTML onclick handlers)
// ==========================================

/**
 * Edit data (called from HTML)
 */
function editData(index, type) {
    App.editData(index, type);
}

/**
 * Delete data (called from HTML)
 */
function deleteData(index, type) {
    App.deleteData(index, type);
}

// ==========================================
// Initialize App on DOM Ready
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
