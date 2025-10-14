// ==========================================
// SmartzProd - Charts Module
// ==========================================

/**
 * Chart.js management and rendering
 * All chart creation, updates, and data formatting
 */

const Charts = {
    /**
     * Chart instances storage
     * @private
     */
    _instances: {
        productivity: null,
        matchFactor: null,
        individualExcavators: {}
    },

    /**
     * Create or update productivity chart
     * @param {Array} data - Productivity data
     */
    updateProductivityChart(data) {
        const canvas = DOM.getElement(CONFIG.DOM_IDS.PRODUCTIVITY_CHART);
        if (!canvas) {
            console.error(CONFIG.CONSOLE.ERROR.ELEMENT_NOT_FOUND.replace('{id}', CONFIG.DOM_IDS.PRODUCTIVITY_CHART));
            return;
        }

        const ctx = canvas.getContext('2d');
        const chartData = this._prepareProductivityData(data);

        // Update existing chart or create new one
        if (this._instances.productivity) {
            this._instances.productivity.data.labels = chartData.labels;
            this._instances.productivity.data.datasets[0].data = chartData.values;
            this._instances.productivity.update();
            console.log(CONFIG.CONSOLE.CHART.UPDATED.replace('{type}', 'Productivity'));
        } else {
            this._instances.productivity = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Productivity (BCM/hr)',
                        data: chartData.values,
                        backgroundColor: CONFIG.CHARTS.COLORS.PRODUCTIVITY.BACKGROUND,
                        borderColor: CONFIG.CHARTS.COLORS.PRODUCTIVITY.BORDER,
                        borderWidth: CONFIG.CHARTS.BAR.BORDER_WIDTH,
                        borderRadius: CONFIG.CHARTS.BAR.BORDER_RADIUS,
                        barThickness: CONFIG.CHARTS.BAR.THICKNESS
                    }]
                },
                options: this._getChartOptions('Productivity (BCM/hr)', 'BCM/hr')
            });
            console.log(CONFIG.CONSOLE.CHART.CREATED.replace('{type}', 'Productivity'));
        }
    },

    /**
     * Create or update match factor chart
     * @param {Array} data - Match factor data
     */
    updateMatchFactorChart(data) {
        const canvas = DOM.getElement(CONFIG.DOM_IDS.MATCH_FACTOR_CHART);
        if (!canvas) {
            console.error(CONFIG.CONSOLE.ERROR.ELEMENT_NOT_FOUND.replace('{id}', CONFIG.DOM_IDS.MATCH_FACTOR_CHART));
            return;
        }

        const ctx = canvas.getContext('2d');
        const chartData = this._prepareMatchFactorData(data);

        // Update existing chart or create new one
        if (this._instances.matchFactor) {
            this._instances.matchFactor.data.labels = chartData.labels;
            this._instances.matchFactor.data.datasets[0].data = chartData.values;
            this._instances.matchFactor.update();
            console.log(CONFIG.CONSOLE.CHART.UPDATED.replace('{type}', 'Match Factor'));
        } else {
            this._instances.matchFactor = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Match Factor',
                        data: chartData.values,
                        backgroundColor: CONFIG.CHARTS.COLORS.MATCH_FACTOR.BACKGROUND,
                        borderColor: CONFIG.CHARTS.COLORS.MATCH_FACTOR.BORDER,
                        borderWidth: CONFIG.CHARTS.BAR.BORDER_WIDTH,
                        borderRadius: CONFIG.CHARTS.BAR.BORDER_RADIUS,
                        barThickness: CONFIG.CHARTS.BAR.THICKNESS
                    }]
                },
                options: this._getChartOptions('Match Factor', '')
            });
            console.log(CONFIG.CONSOLE.CHART.CREATED.replace('{type}', 'Match Factor'));
        }
    },

    /**
     * Create or update individual excavator charts
     * @param {Array} productivityData - Productivity data
     * @param {Array} matchFactorData - Match factor data
     */
    updateIndividualCharts(productivityData, matchFactorData) {
        const container = DOM.getElement('individualChartsContainer');
        if (!container) {
            console.error(CONFIG.CONSOLE.ERROR.ELEMENT_NOT_FOUND.replace('{id}', 'individualChartsContainer'));
            return;
        }

        // Get unique excavators
        const excavators = Utils.data.getUniqueExcavators(productivityData, matchFactorData);

        // Load expanded state
        const expandedExcavators = Storage.load(CONFIG.STORAGE_KEYS.EXPANDED_EXCAVATORS, {});

        // Clear container
        container.innerHTML = '';

        if (excavators.length === 0) {
            container.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
          <i class="fas fa-chart-bar text-4xl text-gray-300 mb-4"></i>
          <p class="text-lg font-medium">Belum ada data excavator</p>
          <p class="text-sm text-gray-400">Tambahkan data untuk melihat grafik individual</p>
        </div>
      `;
            return;
        }

        // Render each excavator card
        excavators.forEach((excavatorId, index) => {
            const isExpanded = expandedExcavators[excavatorId] !== false;
            const colorScheme = CONFIG.UI.CHART_COLORS[index % CONFIG.UI.CHART_COLORS.length];

            this._renderExcavatorCard(
                container,
                excavatorId,
                index,
                isExpanded,
                colorScheme,
                productivityData,
                matchFactorData
            );
        });

        console.log(`${CONFIG.CONSOLE.CHART.INDIVIDUAL_CREATED}: ${excavators.length} excavators`);
    },

    /**
     * Render individual excavator card
     * @private
     */
    _renderExcavatorCard(container, excavatorId, index, isExpanded, colorScheme, productivityData, matchFactorData) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 transition-all duration-300';
        card.dataset.excavator = excavatorId;

        // Filter data for this excavator
        const prodData = Utils.data.filterByExcavator(productivityData, excavatorId);
        const mfData = Utils.data.filterByExcavator(matchFactorData, excavatorId);

        // Get statistics
        const stats = Calculator.stats.getExcavatorStats(productivityData, matchFactorData, excavatorId);

        // Render card HTML
        card.innerHTML = `
      <!-- Header -->
      <div class="bg-gradient-to-r ${colorScheme.gradient} p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity" 
           onclick="Charts.toggleExcavator('${excavatorId}')">
        <div class="flex items-center gap-3 sm:gap-4">
          <!-- Icon -->
          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${colorScheme.bg} border-2 ${colorScheme.border} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-sm">
            <i class="fas fa-layer-group text-lg sm:text-xl ${colorScheme.icon}"></i>
          </div>
          
          <!-- Title -->
          <div>
            <h3 class="text-white font-bold text-base sm:text-lg">Excavator ${Utils.string.sanitize(excavatorId)}</h3>
            <p class="text-white/80 text-xs sm:text-sm">${prodData.length + mfData.length} total records</p>
          </div>
        </div>

        <!-- Toggle Icon -->
        <div class="flex-shrink-0">
          <i class="fas fa-chevron-down text-white text-xl transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}" 
             id="chevron-${excavatorId}"></i>
        </div>
      </div>

      <!-- Content (Charts) -->
      <div class="excavator-content ${isExpanded ? '' : 'hidden'}" id="content-${excavatorId}">
        <div class="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <!-- Productivity Chart -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <i class="fas fa-chart-bar ${colorScheme.icon}"></i>
                Productivity
              </h4>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">${prodData.length} records</span>
            </div>
            ${this._renderStatsCard(stats.productivity, 'productivity', colorScheme)}
            <div class="bg-gray-50 p-3 sm:p-4 rounded-xl">
              <canvas id="chart-productivity-${excavatorId}" class="w-full h-48 sm:h-56"></canvas>
            </div>
          </div>

          <!-- Match Factor Chart -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <i class="fas fa-chart-line ${colorScheme.icon}"></i>
                Match Factor
              </h4>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">${mfData.length} records</span>
            </div>
            ${this._renderStatsCard(stats.matchFactor, 'matchFactor', colorScheme)}
            <div class="bg-gray-50 p-3 sm:p-4 rounded-xl">
              <canvas id="chart-matchfactor-${excavatorId}" class="w-full h-48 sm:h-56"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

        container.appendChild(card);

        // Render charts if expanded
        if (isExpanded) {
            setTimeout(() => {
                this._renderExcavatorCharts(excavatorId, prodData, mfData, colorScheme);
            }, 100);
        }
    },

    /**
     * Render stats card for excavator
     * @private
     */
    _renderStatsCard(stats, type, colorScheme) {
        if (!stats || stats.count === 0) {
            return `
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-gray-500 text-sm">
          <i class="fas fa-inbox text-gray-300 text-2xl mb-2"></i>
          <p>Belum ada data</p>
        </div>
      `;
        }

        const statusConfig = type === 'matchFactor' ? Utils.data.getMatchFactorStatus(stats.average) : null;

        return `
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 border ${colorScheme.border} rounded-lg p-3 sm:p-4">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="text-xs text-gray-600 mb-1">Avg</p>
            <p class="font-bold ${colorScheme.icon} text-sm sm:text-base">${Utils.format.toDecimal(stats.average)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-600 mb-1">Max</p>
            <p class="font-semibold text-gray-700 text-sm sm:text-base">${Utils.format.toDecimal(stats.max)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-600 mb-1">Min</p>
            <p class="font-semibold text-gray-700 text-sm sm:text-base">${Utils.format.toDecimal(stats.min)}</p>
          </div>
        </div>
        ${statusConfig ? `
          <div class="mt-3 pt-3 border-t border-gray-300">
            <p class="text-xs text-center ${statusConfig.color} font-medium">
              <i class="${statusConfig.icon}"></i> ${statusConfig.text}
            </p>
          </div>
        ` : ''}
      </div>
    `;
    },

    /**
     * Render charts for specific excavator
     * @private
     */
    _renderExcavatorCharts(excavatorId, prodData, mfData, colorScheme) {
        // Render productivity chart
        if (prodData.length > 0) {
            const prodCanvas = document.getElementById(`chart-productivity-${excavatorId}`);
            if (prodCanvas) {
                const prodCtx = prodCanvas.getContext('2d');
                const prodChartData = this._prepareProductivityData(prodData);

                new Chart(prodCtx, {
                    type: 'bar',
                    data: {
                        labels: prodChartData.labels,
                        datasets: [{
                            label: 'Productivity (BCM/hr)',
                            data: prodChartData.values,
                            backgroundColor: colorScheme.rgb.replace('rgb', 'rgba').replace(')', ', 0.8)'),
                            borderColor: colorScheme.rgb,
                            borderWidth: 2,
                            borderRadius: 8,
                            barThickness: 30
                        }]
                    },
                    options: this._getChartOptions('Productivity (BCM/hr)', 'BCM/hr', true)
                });
            }
        }

        // Render match factor chart
        if (mfData.length > 0) {
            const mfCanvas = document.getElementById(`chart-matchfactor-${excavatorId}`);
            if (mfCanvas) {
                const mfCtx = mfCanvas.getContext('2d');
                const mfChartData = this._prepareMatchFactorData(mfData);

                new Chart(mfCtx, {
                    type: 'bar',
                    data: {
                        labels: mfChartData.labels,
                        datasets: [{
                            label: 'Match Factor',
                            data: mfChartData.values,
                            backgroundColor: colorScheme.rgb.replace('rgb', 'rgba').replace(')', ', 0.8)'),
                            borderColor: colorScheme.rgb,
                            borderWidth: 2,
                            borderRadius: 8,
                            barThickness: 30
                        }]
                    },
                    options: this._getChartOptions('Match Factor', '', true)
                });
            }
        }
    },

    /**
     * Toggle excavator card expansion
     * @param {string} excavatorId - Excavator ID
     */
    toggleExcavator(excavatorId) {
        const content = document.getElementById(`content-${excavatorId}`);
        const chevron = document.getElementById(`chevron-${excavatorId}`);

        if (!content || !chevron) return;

        const isExpanded = !content.classList.contains('hidden');

        if (isExpanded) {
            // Collapse
            content.classList.add('hidden');
            chevron.classList.remove('rotate-180');
        } else {
            // Expand
            content.classList.remove('hidden');
            chevron.classList.add('rotate-180');

            // Render charts if not already rendered
            const card = document.querySelector(`[data-excavator="${excavatorId}"]`);
            if (card) {
                const prodCanvas = document.getElementById(`chart-productivity-${excavatorId}`);
                const mfCanvas = document.getElementById(`chart-matchfactor-${excavatorId}`);

                // Check if charts need to be rendered
                if (prodCanvas && !prodCanvas.chart) {
                    // Get data and render
                    const prodData = Utils.data.filterByExcavator(
                        Storage.app.loadAllData().productivityData,
                        excavatorId
                    );
                    const mfData = Utils.data.filterByExcavator(
                        Storage.app.loadAllData().matchFactorData,
                        excavatorId
                    );
                    const colorScheme = this._getColorScheme(excavatorId);

                    setTimeout(() => {
                        this._renderExcavatorCharts(excavatorId, prodData, mfData, colorScheme);
                    }, 100);
                }
            }
        }

        // Save state
        const expandedExcavators = Storage.load(CONFIG.STORAGE_KEYS.EXPANDED_EXCAVATORS, {});
        expandedExcavators[excavatorId] = !isExpanded;
        Storage.save(CONFIG.STORAGE_KEYS.EXPANDED_EXCAVATORS, expandedExcavators);

        console.log(`${CONFIG.CONSOLE.CHART.EXCAVATOR_TOGGLED}: ${excavatorId} (${!isExpanded ? 'expanded' : 'collapsed'})`);
    },

    /**
     * Get color scheme for excavator
     * @private
     */
    _getColorScheme(excavatorId) {
        const allData = Storage.app.loadAllData();
        const excavators = Utils.data.getUniqueExcavators(allData.productivityData, allData.matchFactorData);
        const index = excavators.indexOf(excavatorId);
        return CONFIG.UI.CHART_COLORS[index % CONFIG.UI.CHART_COLORS.length];
    },

    /**
     * Prepare productivity data for chart
     * @private
     */
    _prepareProductivityData(data) {
        const labels = data.map(d => Utils.format.toShortDateTime(d.waktu));
        const values = data.map(d => d.productivity);
        return { labels, values };
    },

    /**
     * Prepare match factor data for chart
     * @private
     */
    _prepareMatchFactorData(data) {
        const labels = data.map(d => Utils.format.toShortDateTime(d.waktu));
        const values = data.map(d => d.matchFactor);
        return { labels, values };
    },

    /**
     * Get common chart options
     * @private
     */
    _getChartOptions(label, yAxisLabel, compact = false) {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: !compact,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ${yAxisLabel}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: !compact,
                        text: yAxisLabel
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: compact ? 45 : 0,
                        minRotation: compact ? 45 : 0,
                        font: {
                            size: compact ? 10 : 11
                        }
                    }
                }
            }
        };
    },

    /**
     * Destroy all chart instances
     */
    destroyAll() {
        if (this._instances.productivity) {
            this._instances.productivity.destroy();
            this._instances.productivity = null;
        }
        if (this._instances.matchFactor) {
            this._instances.matchFactor.destroy();
            this._instances.matchFactor = null;
        }
        Object.values(this._instances.individualExcavators).forEach(chart => {
            if (chart) chart.destroy();
        });
        this._instances.individualExcavators = {};
        console.log(CONFIG.CONSOLE.CHART.DESTROYED);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Charts;
}
