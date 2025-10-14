// ==========================================
// SmartzProd - UI Components Module
// ==========================================

/**
 * UI components: modals, toasts, alerts, confirmations
 * Handles all user interface interactions
 */

const UI = {
    /**
     * Toast notification system
     */
    toast: {
        /**
         * Show toast notification
         * @param {string} message - Message to display
         * @param {string} type - Type: 'success', 'error', 'warning', 'info'
         * @param {number} duration - Duration in ms (default: 3000)
         */
        show(message, type = 'info', duration = CONFIG.UI.TOAST.DURATION) {
            // Remove existing toast if any
            this.remove();

            // Get icon and colors based on type
            const config = this._getConfig(type);

            // Create toast element
            const toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = `fixed top-4 right-4 ${config.bgGradient} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slide-in min-w-[300px] max-w-md`;
            toast.innerHTML = `
        <div class="flex-shrink-0">
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <i class="${config.icon} text-xl"></i>
          </div>
        </div>
        <div class="flex-1">
          <p class="font-medium leading-tight">${Utils.string.sanitize(message)}</p>
        </div>
        <button onclick="UI.toast.remove()" class="flex-shrink-0 hover:bg-white/20 rounded-lg p-2 transition-colors">
          <i class="fas fa-times text-sm"></i>
        </button>
      `;

            // Add to body
            document.body.appendChild(toast);

            // Auto remove after duration
            setTimeout(() => this.remove(), duration);

            console.log(`${CONFIG.CONSOLE.UI.TOAST_SHOWN}: ${message}`);
        },

        /**
         * Remove toast
         */
        remove() {
            const toast = document.getElementById('toast');
            if (toast) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        },

        /**
         * Get toast configuration by type
         * @private
         */
        _getConfig(type) {
            const configs = {
                success: {
                    bgGradient: 'bg-gradient-to-r from-green-500 to-green-600',
                    icon: 'fas fa-check-circle'
                },
                error: {
                    bgGradient: 'bg-gradient-to-r from-red-500 to-red-600',
                    icon: 'fas fa-exclamation-circle'
                },
                warning: {
                    bgGradient: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
                    icon: 'fas fa-exclamation-triangle'
                },
                info: {
                    bgGradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
                    icon: 'fas fa-info-circle'
                }
            };
            return configs[type] || configs.info;
        }
    },

    /**
     * Alert modal system
     */
    alert: {
        /**
         * Show alert modal
         * @param {string} message - Alert message
         * @param {string} type - Type: 'success', 'error', 'warning', 'info'
         */
        show(message, type = 'info') {
            const config = this._getConfig(type);

            UI.modal.show({
                title: config.title,
                message: message,
                icon: config.icon,
                iconColor: config.iconColor,
                topBarColor: config.topBarColor,
                showCancel: false,
                confirmText: 'OK',
                confirmColor: config.confirmColor,
                onConfirm: () => UI.modal.hide()
            });

            console.log(`${CONFIG.CONSOLE.UI.ALERT_SHOWN}: ${message}`);
        },

        /**
         * Get alert configuration by type
         * @private
         */
        _getConfig(type) {
            const configs = {
                success: {
                    title: 'Berhasil',
                    icon: 'fas fa-check-circle',
                    iconColor: 'text-green-500',
                    topBarColor: 'bg-gradient-to-r from-green-500 to-green-600',
                    confirmColor: 'from-green-500 to-green-600'
                },
                error: {
                    title: 'Error',
                    icon: 'fas fa-exclamation-circle',
                    iconColor: 'text-red-500',
                    topBarColor: 'bg-gradient-to-r from-red-500 to-red-600',
                    confirmColor: 'from-red-500 to-red-600'
                },
                warning: {
                    title: 'Peringatan',
                    icon: 'fas fa-exclamation-triangle',
                    iconColor: 'text-yellow-500',
                    topBarColor: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
                    confirmColor: 'from-yellow-500 to-yellow-600'
                },
                info: {
                    title: 'Informasi',
                    icon: 'fas fa-info-circle',
                    iconColor: 'text-blue-500',
                    topBarColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
                    confirmColor: 'from-blue-500 to-blue-600'
                }
            };
            return configs[type] || configs.info;
        }
    },

    /**
     * Confirmation dialog system
     */
    confirm: {
        /**
         * Show confirmation dialog
         * @param {Object} options - Configuration options
         * @param {string} options.title - Dialog title
         * @param {string} options.message - Dialog message
         * @param {Function} options.onConfirm - Callback on confirm
         * @param {Function} options.onCancel - Callback on cancel (optional)
         * @param {string} options.confirmText - Confirm button text (default: 'OK')
         * @param {string} options.cancelText - Cancel button text (default: 'Batal')
         * @param {string} options.type - Type: 'danger', 'warning', 'info' (default: 'info')
         */
        show(options) {
            const {
                title,
                message,
                onConfirm,
                onCancel,
                confirmText = 'OK',
                cancelText = 'Batal',
                type = 'info',
                data = null
            } = options;

            const config = this._getConfig(type);

            UI.modal.show({
                title: title,
                message: message,
                icon: config.icon,
                iconColor: config.iconColor,
                topBarColor: config.topBarColor,
                showCancel: true,
                confirmText: confirmText,
                cancelText: cancelText,
                confirmColor: config.confirmColor,
                data: data,
                onConfirm: () => {
                    if (onConfirm) onConfirm();
                    UI.modal.hide();
                },
                onCancel: () => {
                    if (onCancel) onCancel();
                    UI.modal.hide();
                }
            });

            console.log(`${CONFIG.CONSOLE.UI.CONFIRM_SHOWN}: ${title}`);
        },

        /**
         * Get confirmation configuration by type
         * @private
         */
        _getConfig(type) {
            const configs = {
                danger: {
                    icon: 'fas fa-exclamation-triangle',
                    iconColor: 'text-red-500',
                    topBarColor: 'bg-gradient-to-r from-red-500 to-red-600',
                    confirmColor: 'from-red-500 to-red-600'
                },
                warning: {
                    icon: 'fas fa-exclamation-triangle',
                    iconColor: 'text-orange-500',
                    topBarColor: 'bg-gradient-to-r from-orange-500 to-orange-600',
                    confirmColor: 'from-orange-500 to-orange-600'
                },
                info: {
                    icon: 'fas fa-info-circle',
                    iconColor: 'text-blue-500',
                    topBarColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
                    confirmColor: 'from-blue-500 to-blue-600'
                }
            };
            return configs[type] || configs.info;
        }
    },

    /**
     * Generic modal system (used by alert and confirm)
     */
    modal: {
        /**
         * Currently active modal callback
         * @private
         */
        _activeCallback: null,

        /**
         * ESC key handler
         * @private
         */
        _escHandler: null,

        /**
         * Show modal
         * @param {Object} config - Modal configuration
         */
        show(config) {
            const {
                title,
                message,
                icon,
                iconColor,
                topBarColor,
                showCancel,
                confirmText,
                cancelText,
                confirmColor,
                data,
                onConfirm,
                onCancel
            } = config;

            // Create modal HTML
            const modalHTML = `
        <div id="confirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-bounce-in">
            <!-- Decorative Top Bar -->
            <div class="${topBarColor} h-2 rounded-t-2xl"></div>
            
            <!-- Modal Content -->
            <div class="p-4 sm:p-6 md:p-8">
              <!-- Icon -->
              <div class="flex justify-center mb-4 sm:mb-6">
                <div class="relative">
                  <div class="absolute inset-0 ${iconColor} opacity-20 rounded-full animate-pulse"></div>
                  <div class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${iconColor.replace('text-', 'from-')}/10 ${iconColor.replace('text-', 'to-')}/20 flex items-center justify-center">
                    <i class="${icon} text-3xl sm:text-4xl ${iconColor}"></i>
                  </div>
                </div>
              </div>

              <!-- Title -->
              <h3 class="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-3 sm:mb-4">
                ${Utils.string.sanitize(title)}
              </h3>

              <!-- Message -->
              <div class="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8 space-y-3">
                ${message}
              </div>

              <!-- Buttons -->
              <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
                ${showCancel ? `
                  <button id="modalCancelBtn" class="group w-full sm:w-auto px-8 py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:border-gray-400 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2.5">
                    <i class="fas fa-times text-gray-500 group-hover:text-gray-700 transition-colors duration-300"></i>
                    <span>${Utils.string.sanitize(cancelText)}</span>
                  </button>
                ` : ''}
                
                <button id="modalConfirmBtn" class="relative overflow-hidden group w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r ${confirmColor} text-white rounded-xl font-medium shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-0.5 flex items-center justify-center gap-2.5">
                  <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <i class="fas fa-check relative z-10 group-hover:scale-110 transition-transform duration-300"></i>
                  <span class="relative z-10">${Utils.string.sanitize(confirmText)}</span>
                </button>
              </div>

              <!-- Keyboard Hint -->
              ${showCancel ? `
                <p class="text-xs text-gray-400 text-center mt-4">
                  Tekan <kbd class="px-2 py-1 bg-gray-100 rounded text-gray-600 font-mono">ESC</kbd> untuk batal
                </p>
              ` : ''}
            </div>
          </div>
        </div>
      `;

            // Remove existing modal if any
            this.hide();

            // Add to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Bind events
            const confirmBtn = document.getElementById('modalConfirmBtn');
            const cancelBtn = document.getElementById('modalCancelBtn');
            const modal = document.getElementById('confirmModal');

            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    if (onConfirm) onConfirm(data);
                };
            }

            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    if (onCancel) onCancel();
                };
            }

            // Close on backdrop click
            if (modal) {
                modal.onclick = (e) => {
                    if (e.target === modal && showCancel) {
                        if (onCancel) onCancel();
                    }
                };
            }

            // ESC key handler
            if (showCancel) {
                this._escHandler = (e) => {
                    if (e.key === 'Escape') {
                        if (onCancel) onCancel();
                    }
                };
                document.addEventListener('keydown', this._escHandler);
            }
        },

        /**
         * Hide modal
         */
        hide() {
            const modal = document.getElementById('confirmModal');
            if (modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }

            // Remove ESC handler
            if (this._escHandler) {
                document.removeEventListener('keydown', this._escHandler);
                this._escHandler = null;
            }
        }
    },

    /**
     * Edit modal for productivity and match factor data
     */
    editModal: {
        /**
         * Show edit modal
         * @param {Object} data - Data to edit
         * @param {number} index - Data index
         * @param {string} type - Data type: 'productivity' or 'matchFactor'
         * @param {Function} onSave - Callback on save
         */
        show(data, index, type, onSave) {
            // Get modal element
            const modal = DOM.getElement(CONFIG.DOM_IDS.EDIT_MODAL);
            if (!modal) {
                console.error(CONFIG.CONSOLE.ERROR.ELEMENT_NOT_FOUND.replace('{id}', CONFIG.DOM_IDS.EDIT_MODAL));
                return;
            }

            // Set modal title
            DOM.text.set('editModalTitle', type === 'productivity' ? 'Edit Data Produktivitas' : 'Edit Data Match Factor');

            // Show/hide relevant sections
            if (type === 'productivity') {
                DOM.visibility.show('editProductivityFields');
                DOM.visibility.hide('editMatchFactorFields');

                // Fill form with data
                DOM.input.setValue('editNamaPengawas', data.namaPengawas);
                DOM.input.setValue('editNrp', data.nrp);
                DOM.input.setValue('editWaktu', data.waktu);
                DOM.input.setValue('editNoExcavator', data.noExcavator);
                DOM.input.setValue('editJumlahRitase', data.jumlahRitase);
                DOM.input.setValue('editHmAwal', data.hmAwal);
                DOM.input.setValue('editHmAkhir', data.hmAkhir);
                DOM.input.setValue('editKapasitas', data.kapasitas);
            } else {
                DOM.visibility.hide('editProductivityFields');
                DOM.visibility.show('editMatchFactorFields');

                // Fill form with data
                DOM.input.setValue('editNamaPengawasMF', data.namaPengawas);
                DOM.input.setValue('editNrpMF', data.nrp);
                DOM.input.setValue('editWaktuMF', data.waktu);
                DOM.input.setValue('editNoExcavatorMF', data.noExcavator);
                DOM.input.setValue('editJumlahHD', data.jumlahHD);
                DOM.input.setValue('editCtLoader', data.ctLoader);
                DOM.input.setValue('editCtHauler', data.ctHauler);
            }

            // Store data for save
            modal.dataset.editIndex = index;
            modal.dataset.editType = type;
            modal.dataset.onSave = onSave;

            // Show modal
            DOM.visibility.show(CONFIG.DOM_IDS.EDIT_MODAL);

            console.log(`${CONFIG.CONSOLE.UI.EDIT_MODAL_SHOWN}: ${type} [${index}]`);
        },

        /**
         * Hide edit modal
         */
        hide() {
            DOM.visibility.hide(CONFIG.DOM_IDS.EDIT_MODAL);
            console.log(CONFIG.CONSOLE.UI.EDIT_MODAL_HIDDEN);
        }
    },

    /**
     * Loading indicator
     */
    loading: {
        /**
         * Show loading indicator
         * @param {string} message - Loading message (optional)
         */
        show(message = 'Loading...') {
            // Create loading overlay
            const loadingHTML = `
        <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-700 font-medium">${Utils.string.sanitize(message)}</p>
          </div>
        </div>
      `;

            // Remove existing loading if any
            this.hide();

            // Add to body
            document.body.insertAdjacentHTML('beforeend', loadingHTML);
        },

        /**
         * Hide loading indicator
         */
        hide() {
            const loading = document.getElementById('loadingOverlay');
            if (loading) {
                loading.remove();
            }
        }
    },

    /**
     * Validation icon helpers
     */
    validation: {
        /**
         * Show valid icon
         * @param {string} iconId - Icon element ID
         */
        showValid(iconId) {
            const icon = DOM.getElement(iconId);
            if (icon) {
                icon.classList.remove('hidden');
                icon.classList.add('show');
            }
        },

        /**
         * Hide icon
         * @param {string} iconId - Icon element ID
         */
        hide(iconId) {
            const icon = DOM.getElement(iconId);
            if (icon) {
                icon.classList.add('hidden');
                icon.classList.remove('show');
            }
        },

        /**
         * Hide all validation icons for a field
         * @param {string} validIconId - Valid icon ID
         * @param {string} invalidIconId - Invalid icon ID
         */
        hideAll(validIconId, invalidIconId) {
            this.hide(validIconId);
            this.hide(invalidIconId);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
