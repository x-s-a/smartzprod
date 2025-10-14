// ==========================================
// SmartzProd - DOM Manipulation Module
// ==========================================

/**
 * DOM manipulation utilities with element caching
 * Handles all DOM queries, updates, and table rendering
 */

const DOM = {
    /**
     * Element cache to avoid repeated DOM queries
     * @private
     */
    _cache: new Map(),

    /**
     * Get element from cache or DOM, then cache it
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} - The element or null
     */
    getElement(id) {
        if (!this._cache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this._cache.set(id, element);
            }
            return element;
        }
        return this._cache.get(id);
    },

    /**
     * Clear element cache (useful after dynamic content changes)
     */
    clearCache() {
        this._cache.clear();
        console.log(CONFIG.CONSOLE.DOM.CACHE_CLEARED);
    },

    /**
     * Get multiple elements by IDs
     * @param {string[]} ids - Array of element IDs
     * @returns {Object} - Object with id as key, element as value
     */
    getElements(ids) {
        const elements = {};
        ids.forEach(id => {
            elements[id] = this.getElement(id);
        });
        return elements;
    },

    /**
     * Input field operations
     */
    input: {
        /**
         * Get input value with trimming
         * @param {string} id - Input element ID
         * @returns {string} - Trimmed value
         */
        getValue(id) {
            const element = DOM.getElement(id);
            return element ? element.value.trim() : '';
        },

        /**
         * Set input value
         * @param {string} id - Input element ID
         * @param {*} value - Value to set
         */
        setValue(id, value) {
            const element = DOM.getElement(id);
            if (element) {
                element.value = value;
            }
        },

        /**
         * Clear input value
         * @param {string} id - Input element ID
         */
        clear(id) {
            this.setValue(id, '');
        },

        /**
         * Clear multiple inputs
         * @param {string[]} ids - Array of input IDs
         */
        clearAll(ids) {
            ids.forEach(id => this.clear(id));
        },

        /**
         * Focus on input field
         * @param {string} id - Input element ID
         */
        focus(id) {
            const element = DOM.getElement(id);
            if (element) {
                element.focus();
            }
        },

        /**
         * Disable input field
         * @param {string} id - Input element ID
         */
        disable(id) {
            const element = DOM.getElement(id);
            if (element) {
                element.disabled = true;
            }
        },

        /**
         * Enable input field
         * @param {string} id - Input element ID
         */
        enable(id) {
            const element = DOM.getElement(id);
            if (element) {
                element.disabled = false;
            }
        }
    },

    /**
     * Text content operations
     */
    text: {
        /**
         * Set text content (safe from XSS)
         * @param {string} id - Element ID
         * @param {string} text - Text to set
         */
        set(id, text) {
            const element = DOM.getElement(id);
            if (element) {
                element.textContent = text;
            }
        },

        /**
         * Get text content
         * @param {string} id - Element ID
         * @returns {string} - Text content
         */
        get(id) {
            const element = DOM.getElement(id);
            return element ? element.textContent : '';
        }
    },

    /**
     * HTML operations (use with caution - sanitize first!)
     */
    html: {
        /**
         * Set innerHTML (SANITIZE first!)
         * @param {string} id - Element ID
         * @param {string} html - HTML string (should be sanitized)
         */
        set(id, html) {
            const element = DOM.getElement(id);
            if (element) {
                element.innerHTML = html;
            }
        },

        /**
         * Append HTML (SANITIZE first!)
         * @param {string} id - Element ID
         * @param {string} html - HTML string (should be sanitized)
         */
        append(id, html) {
            const element = DOM.getElement(id);
            if (element) {
                element.innerHTML += html;
            }
        },

        /**
         * Clear innerHTML
         * @param {string} id - Element ID
         */
        clear(id) {
            this.set(id, '');
        }
    },

    /**
     * Visibility operations
     */
    visibility: {
        /**
         * Show element (remove 'hidden' class)
         * @param {string} id - Element ID
         */
        show(id) {
            const element = DOM.getElement(id);
            if (element) {
                element.classList.remove('hidden');
            }
        },

        /**
         * Hide element (add 'hidden' class)
         * @param {string} id - Element ID
         */
        hide(id) {
            const element = DOM.getElement(id);
            if (element) {
                element.classList.add('hidden');
            }
        },

        /**
         * Toggle visibility
         * @param {string} id - Element ID
         * @param {boolean} [show] - Optional: true to show, false to hide
         */
        toggle(id, show) {
            if (show === undefined) {
                const element = DOM.getElement(id);
                if (element) {
                    element.classList.toggle('hidden');
                }
            } else {
                show ? this.show(id) : this.hide(id);
            }
        },

        /**
         * Check if element is visible
         * @param {string} id - Element ID
         * @returns {boolean} - True if visible
         */
        isVisible(id) {
            const element = DOM.getElement(id);
            return element ? !element.classList.contains('hidden') : false;
        }
    },

    /**
     * Class operations
     */
    css: {
        /**
         * Add CSS class
         * @param {string} id - Element ID
         * @param {string} className - Class name to add
         */
        addClass(id, className) {
            const element = DOM.getElement(id);
            if (element) {
                element.classList.add(className);
            }
        },

        /**
         * Remove CSS class
         * @param {string} id - Element ID
         * @param {string} className - Class name to remove
         */
        removeClass(id, className) {
            const element = DOM.getElement(id);
            if (element) {
                element.classList.remove(className);
            }
        },

        /**
         * Toggle CSS class
         * @param {string} id - Element ID
         * @param {string} className - Class name to toggle
         */
        toggleClass(id, className) {
            const element = DOM.getElement(id);
            if (element) {
                element.classList.toggle(className);
            }
        },

        /**
         * Check if element has class
         * @param {string} id - Element ID
         * @param {string} className - Class name to check
         * @returns {boolean} - True if has class
         */
        hasClass(id, className) {
            const element = DOM.getElement(id);
            return element ? element.classList.contains(className) : false;
        }
    },

    /**
     * Table rendering utilities
     */
    table: {
        /**
         * Render productivity table
         * @param {Array} data - Productivity data array
         * @param {HTMLElement} tbody - Table body element
         */
        renderProductivityTable(data, tbody) {
            if (!tbody) return;

            // Clear existing rows
            tbody.innerHTML = '';

            // Show empty state if no data
            if (!data || data.length === 0) {
                tbody.innerHTML = `
          <tr>
            <td colspan="11" class="px-6 py-12 text-center text-gray-500">
              <div class="flex flex-col items-center gap-3">
                <i class="fas fa-inbox text-4xl text-gray-300"></i>
                <p class="text-lg font-medium">Belum ada data produktivitas</p>
                <p class="text-sm text-gray-400">Tambahkan data pertama Anda menggunakan form di atas</p>
              </div>
            </td>
          </tr>
        `;
                return;
            }

            // Render rows
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Utils.string.sanitize(item.namaPengawas)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.string.sanitize(item.nrp)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toIndonesianDateTime(item.waktu)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${Utils.string.sanitize(item.noExcavator)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.jumlahRitase, 0)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.hmAwal)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.hmAkhir)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.kapasitas)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">${Utils.format.toDecimal(item.productivity)} BCM/hr</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div class="flex items-center gap-2">
              <button onclick="editData(${index}, 'productivity')" 
                      class="text-blue-600 hover:text-blue-800 transition-colors" 
                      title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="deleteData(${index}, 'productivity')" 
                      class="text-red-600 hover:text-red-800 transition-colors" 
                      title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        `;
                tbody.appendChild(row);
            });
        },

        /**
         * Render match factor table
         * @param {Array} data - Match factor data array
         * @param {HTMLElement} tbody - Table body element
         */
        renderMatchFactorTable(data, tbody) {
            if (!tbody) return;

            // Clear existing rows
            tbody.innerHTML = '';

            // Show empty state if no data
            if (!data || data.length === 0) {
                tbody.innerHTML = `
          <tr>
            <td colspan="9" class="px-6 py-12 text-center text-gray-500">
              <div class="flex flex-col items-center gap-3">
                <i class="fas fa-inbox text-4xl text-gray-300"></i>
                <p class="text-lg font-medium">Belum ada data match factor</p>
                <p class="text-sm text-gray-400">Tambahkan data pertama Anda menggunakan form di atas</p>
              </div>
            </td>
          </tr>
        `;
                return;
            }

            // Render rows
            data.forEach((item, index) => {
                const interpretation = Calculator.matchFactor.interpretMatchFactor(item.matchFactor);
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Utils.string.sanitize(item.namaPengawas)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.string.sanitize(item.nrp)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toIndonesianDateTime(item.waktu)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${Utils.string.sanitize(item.noExcavator)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.jumlahHD, 0)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.ctLoader)} min</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.format.toDecimal(item.ctHauler)} min</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold ${interpretation.color}">${Utils.format.toDecimal(item.matchFactor)}</span>
              <span class="text-xs ${interpretation.color}">${interpretation.text}</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div class="flex items-center gap-2">
              <button onclick="editData(${index}, 'matchFactor')" 
                      class="text-blue-600 hover:text-blue-800 transition-colors" 
                      title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="deleteData(${index}, 'matchFactor')" 
                      class="text-red-600 hover:text-red-800 transition-colors" 
                      title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        `;
                tbody.appendChild(row);
            });
        }
    },

    /**
     * Event binding utilities
     */
    events: {
        /**
         * Add event listener to element
         * @param {string} id - Element ID
         * @param {string} event - Event name (e.g., 'click', 'input')
         * @param {Function} handler - Event handler function
         */
        on(id, event, handler) {
            const element = DOM.getElement(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        },

        /**
         * Remove event listener from element
         * @param {string} id - Element ID
         * @param {string} event - Event name
         * @param {Function} handler - Event handler function
         */
        off(id, event, handler) {
            const element = DOM.getElement(id);
            if (element) {
                element.removeEventListener(event, handler);
            }
        },

        /**
         * Add event listener with debouncing
         * @param {string} id - Element ID
         * @param {string} event - Event name
         * @param {Function} handler - Event handler function
         * @param {number} delay - Debounce delay in ms
         */
        onDebounced(id, event, handler, delay = 300) {
            const debouncedHandler = Utils.debounce(handler, delay);
            this.on(id, event, debouncedHandler);
        },

        /**
         * Add event listener with throttling
         * @param {string} id - Element ID
         * @param {string} event - Event name
         * @param {Function} handler - Event handler function
         * @param {number} limit - Throttle limit in ms
         */
        onThrottled(id, event, handler, limit = 300) {
            const throttledHandler = Utils.throttle(handler, limit);
            this.on(id, event, throttledHandler);
        }
    },

    /**
     * Batch DOM operations (more efficient)
     */
    batch: {
        /**
         * Update multiple text elements at once
         * @param {Object} updates - Object with id as key, text as value
         */
        setText(updates) {
            Object.entries(updates).forEach(([id, text]) => {
                DOM.text.set(id, text);
            });
        },

        /**
         * Update multiple input values at once
         * @param {Object} updates - Object with id as key, value as value
         */
        setValues(updates) {
            Object.entries(updates).forEach(([id, value]) => {
                DOM.input.setValue(id, value);
            });
        },

        /**
         * Show multiple elements at once
         * @param {string[]} ids - Array of element IDs
         */
        show(ids) {
            ids.forEach(id => DOM.visibility.show(id));
        },

        /**
         * Hide multiple elements at once
         * @param {string[]} ids - Array of element IDs
         */
        hide(ids) {
            ids.forEach(id => DOM.visibility.hide(id));
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOM;
}
