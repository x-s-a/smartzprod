// ==========================================
// SmartzProd - Export Module
// ==========================================

/**
 * Export functionality: Excel, PDF, Backup, Restore
 * Handles all data export and import operations
 */

const Export = {
    /**
     * Excel export operations
     */
    excel: {
        /**
         * Export productivity data to Excel
         * @param {Array} data - Productivity data
         */
        async exportProductivity(data) {
            if (!data || data.length === 0) {
                UI.alert.show(CONFIG.MESSAGES.ERROR.NO_DATA_TO_EXPORT, 'warning');
                return;
            }

            try {
                UI.loading.show('Membuat file Excel...');

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Productivity Data');

                // Define columns
                worksheet.columns = [
                    { header: 'No', key: 'no', width: 5 },
                    { header: 'Nama Pengawas', key: 'namaPengawas', width: 20 },
                    { header: 'NRP', key: 'nrp', width: 12 },
                    { header: 'Waktu', key: 'waktu', width: 20 },
                    { header: 'No Excavator', key: 'noExcavator', width: 15 },
                    { header: 'Jumlah Ritase', key: 'jumlahRitase', width: 15 },
                    { header: 'HM Awal', key: 'hmAwal', width: 10 },
                    { header: 'HM Akhir', key: 'hmAkhir', width: 10 },
                    { header: 'Kapasitas (BCM)', key: 'kapasitas', width: 15 },
                    { header: 'Productivity (BCM/hr)', key: 'productivity', width: 20 }
                ];

                // Style header row
                worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' }
                };
                worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

                // Add data rows
                data.forEach((item, index) => {
                    worksheet.addRow({
                        no: index + 1,
                        namaPengawas: item.namaPengawas,
                        nrp: item.nrp,
                        waktu: Utils.format.toIndonesianDateTime(item.waktu),
                        noExcavator: item.noExcavator,
                        jumlahRitase: item.jumlahRitase,
                        hmAwal: parseFloat(item.hmAwal),
                        hmAkhir: parseFloat(item.hmAkhir),
                        kapasitas: parseFloat(item.kapasitas),
                        productivity: parseFloat(item.productivity)
                    });
                });

                // Add borders to all cells
                worksheet.eachRow((row, rowNumber) => {
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });

                // Generate file
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SmartzProd-Productivity-${Utils.format.getCurrentLocalDateTime().replace(/:/g, '-')}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);

                UI.loading.hide();
                UI.toast.show(CONFIG.MESSAGES.SUCCESS.EXPORT_SUCCESS, 'success');
                console.log(`${CONFIG.CONSOLE.EXPORT.SUCCESS}: Productivity Excel`);
            } catch (error) {
                UI.loading.hide();
                UI.alert.show(CONFIG.MESSAGES.ERROR.EXPORT_FAILED, 'error');
                console.error(`${CONFIG.CONSOLE.ERROR.EXPORT_FAILED}:`, error);
            }
        },

        /**
         * Export match factor data to Excel
         * @param {Array} data - Match factor data
         */
        async exportMatchFactor(data) {
            if (!data || data.length === 0) {
                UI.alert.show(CONFIG.MESSAGES.ERROR.NO_DATA_TO_EXPORT, 'warning');
                return;
            }

            try {
                UI.loading.show('Membuat file Excel...');

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Match Factor Data');

                // Define columns
                worksheet.columns = [
                    { header: 'No', key: 'no', width: 5 },
                    { header: 'Nama Pengawas', key: 'namaPengawas', width: 20 },
                    { header: 'NRP', key: 'nrp', width: 12 },
                    { header: 'Waktu', key: 'waktu', width: 20 },
                    { header: 'No Excavator', key: 'noExcavator', width: 15 },
                    { header: 'Jumlah HD', key: 'jumlahHD', width: 12 },
                    { header: 'CT Loader (min)', key: 'ctLoader', width: 15 },
                    { header: 'CT Hauler (min)', key: 'ctHauler', width: 15 },
                    { header: 'Match Factor', key: 'matchFactor', width: 15 }
                ];

                // Style header row
                worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF9B59B6' }
                };
                worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

                // Add data rows
                data.forEach((item, index) => {
                    worksheet.addRow({
                        no: index + 1,
                        namaPengawas: item.namaPengawas,
                        nrp: item.nrp,
                        waktu: Utils.format.toIndonesianDateTime(item.waktu),
                        noExcavator: item.noExcavator,
                        jumlahHD: item.jumlahHD,
                        ctLoader: parseFloat(item.ctLoader),
                        ctHauler: parseFloat(item.ctHauler),
                        matchFactor: parseFloat(item.matchFactor)
                    });
                });

                // Add borders to all cells
                worksheet.eachRow((row, rowNumber) => {
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });

                // Generate file
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SmartzProd-MatchFactor-${Utils.format.getCurrentLocalDateTime().replace(/:/g, '-')}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);

                UI.loading.hide();
                UI.toast.show(CONFIG.MESSAGES.SUCCESS.EXPORT_SUCCESS, 'success');
                console.log(`${CONFIG.CONSOLE.EXPORT.SUCCESS}: Match Factor Excel`);
            } catch (error) {
                UI.loading.hide();
                UI.alert.show(CONFIG.MESSAGES.ERROR.EXPORT_FAILED, 'error');
                console.error(`${CONFIG.CONSOLE.ERROR.EXPORT_FAILED}:`, error);
            }
        }
    },

    /**
     * PDF export operations
     */
    pdf: {
        /**
         * Export productivity data to PDF
         * @param {Array} data - Productivity data
         */
        exportProductivity(data) {
            if (!data || data.length === 0) {
                UI.alert.show(CONFIG.MESSAGES.ERROR.NO_DATA_TO_EXPORT, 'warning');
                return;
            }

            try {
                UI.loading.show('Membuat file PDF...');

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('landscape');

                // Add title
                doc.setFontSize(16);
                doc.text('SmartzProd - Productivity Report', 14, 15);

                // Add date
                doc.setFontSize(10);
                doc.text(`Generated: ${Utils.format.toIndonesianDateTime(new Date().toISOString())}`, 14, 22);

                // Prepare table data
                const tableData = data.map((item, index) => [
                    index + 1,
                    item.namaPengawas,
                    item.nrp,
                    Utils.format.toShortDateTime(item.waktu),
                    item.noExcavator,
                    item.jumlahRitase,
                    parseFloat(item.hmAwal).toFixed(2),
                    parseFloat(item.hmAkhir).toFixed(2),
                    parseFloat(item.kapasitas).toFixed(2),
                    parseFloat(item.productivity).toFixed(2)
                ]);

                // Add table
                doc.autoTable({
                    head: [['No', 'Pengawas', 'NRP', 'Waktu', 'Excavator', 'Ritase', 'HM Awal', 'HM Akhir', 'Kapasitas', 'Productivity']],
                    body: tableData,
                    startY: 28,
                    theme: 'grid',
                    headStyles: { fillColor: [68, 114, 196] },
                    styles: { fontSize: 8, cellPadding: 2 }
                });

                // Save PDF
                doc.save(`SmartzProd-Productivity-${Utils.format.getCurrentLocalDateTime().replace(/:/g, '-')}.pdf`);

                UI.loading.hide();
                UI.toast.show(CONFIG.MESSAGES.SUCCESS.EXPORT_SUCCESS, 'success');
                console.log(`${CONFIG.CONSOLE.EXPORT.SUCCESS}: Productivity PDF`);
            } catch (error) {
                UI.loading.hide();
                UI.alert.show(CONFIG.MESSAGES.ERROR.EXPORT_FAILED, 'error');
                console.error(`${CONFIG.CONSOLE.ERROR.EXPORT_FAILED}:`, error);
            }
        },

        /**
         * Export match factor data to PDF
         * @param {Array} data - Match factor data
         */
        exportMatchFactor(data) {
            if (!data || data.length === 0) {
                UI.alert.show(CONFIG.MESSAGES.ERROR.NO_DATA_TO_EXPORT, 'warning');
                return;
            }

            try {
                UI.loading.show('Membuat file PDF...');

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('landscape');

                // Add title
                doc.setFontSize(16);
                doc.text('SmartzProd - Match Factor Report', 14, 15);

                // Add date
                doc.setFontSize(10);
                doc.text(`Generated: ${Utils.format.toIndonesianDateTime(new Date().toISOString())}`, 14, 22);

                // Prepare table data
                const tableData = data.map((item, index) => [
                    index + 1,
                    item.namaPengawas,
                    item.nrp,
                    Utils.format.toShortDateTime(item.waktu),
                    item.noExcavator,
                    item.jumlahHD,
                    parseFloat(item.ctLoader).toFixed(2),
                    parseFloat(item.ctHauler).toFixed(2),
                    parseFloat(item.matchFactor).toFixed(2)
                ]);

                // Add table
                doc.autoTable({
                    head: [['No', 'Pengawas', 'NRP', 'Waktu', 'Excavator', 'HD', 'CT Loader', 'CT Hauler', 'Match Factor']],
                    body: tableData,
                    startY: 28,
                    theme: 'grid',
                    headStyles: { fillColor: [155, 89, 182] },
                    styles: { fontSize: 8, cellPadding: 2 }
                });

                // Save PDF
                doc.save(`SmartzProd-MatchFactor-${Utils.format.getCurrentLocalDateTime().replace(/:/g, '-')}.pdf`);

                UI.loading.hide();
                UI.toast.show(CONFIG.MESSAGES.SUCCESS.EXPORT_SUCCESS, 'success');
                console.log(`${CONFIG.CONSOLE.EXPORT.SUCCESS}: Match Factor PDF`);
            } catch (error) {
                UI.loading.hide();
                UI.alert.show(CONFIG.MESSAGES.ERROR.EXPORT_FAILED, 'error');
                console.error(`${CONFIG.CONSOLE.ERROR.EXPORT_FAILED}:`, error);
            }
        }
    },

    /**
     * Backup operations
     */
    backup: {
        /**
         * Create and download backup file
         */
        create() {
            try {
                const backup = Storage.app.createBackup();
                const json = JSON.stringify(backup, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SmartzProd-Backup-${Utils.format.getCurrentLocalDateTime().replace(/:/g, '-')}.json`;
                a.click();
                window.URL.revokeObjectURL(url);

                const totalRecords = backup.productivityData.length + backup.matchFactorData.length;
                UI.toast.show(`${CONFIG.MESSAGES.SUCCESS.BACKUP_SUCCESS} ${totalRecords} records`, 'success');
                console.log(`${CONFIG.CONSOLE.BACKUP.SUCCESS}: ${totalRecords} records`);
            } catch (error) {
                UI.alert.show(CONFIG.MESSAGES.ERROR.BACKUP_FAILED, 'error');
                console.error(`${CONFIG.CONSOLE.ERROR.BACKUP_FAILED}:`, error);
            }
        },

        /**
         * Restore from backup file
         */
        restore() {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const backupData = JSON.parse(text);

                    // Validate backup
                    const validation = Storage.app.validateBackup(backupData);
                    if (!validation.isValid) {
                        UI.alert.show(`${CONFIG.MESSAGES.ERROR.INVALID_BACKUP}: ${validation.error}`, 'error');
                        return;
                    }

                    // Get current data count
                    const currentData = Storage.app.loadAllData();
                    const currentTotal = currentData.productivityData.length + currentData.matchFactorData.length;
                    const backupTotal = backupData.productivityData.length + backupData.matchFactorData.length;

                    // Show confirmation with data preview
                    const message = `
            <div class="space-y-4 text-left">
              <!-- Warning -->
              <div class="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <div class="flex items-start gap-3">
                  <i class="fas fa-exclamation-triangle text-orange-500 text-xl mt-1"></i>
                  <div>
                    <p class="font-semibold text-gray-900 mb-1">Peringatan!</p>
                    <p class="text-sm text-gray-700">Semua data saat ini akan diganti dengan data backup.</p>
                  </div>
                </div>
              </div>

              <!-- Backup Info -->
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <i class="fas fa-file-archive text-white"></i>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">File Backup</p>
                    <p class="text-xs text-gray-600 truncate max-w-xs">${file.name}</p>
                  </div>
                </div>
                <p class="text-sm text-gray-700">
                  <i class="fas fa-calendar-alt text-blue-500 mr-2"></i>
                  ${Utils.format.toIndonesianDateTime(backupData.exportDate)}
                </p>
              </div>

              <!-- Statistics -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white border-2 border-blue-200 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-chart-bar text-blue-500"></i>
                    <p class="text-xs font-medium text-gray-600">Productivity</p>
                  </div>
                  <p class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    ${backupData.productivityData.length}
                  </p>
                  <p class="text-xs text-gray-500">records</p>
                </div>
                <div class="bg-white border-2 border-purple-200 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-chart-line text-purple-500"></i>
                    <p class="text-xs font-medium text-gray-600">Match Factor</p>
                  </div>
                  <p class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    ${backupData.matchFactorData.length}
                  </p>
                  <p class="text-xs text-gray-500">records</p>
                </div>
              </div>

              <!-- Current Data -->
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p class="text-xs font-medium text-gray-600 mb-2">
                  <i class="fas fa-database text-gray-400 mr-1"></i>
                  Data Saat Ini (akan dihapus):
                </p>
                <p class="text-sm text-gray-700">${currentTotal} records</p>
              </div>
            </div>
          `;

                    UI.confirm.show({
                        title: 'Restore Data',
                        message: message,
                        type: 'warning',
                        confirmText: 'Restore',
                        cancelText: 'Batal',
                        onConfirm: () => {
                            Storage.app.restoreFromBackup(backupData);
                            UI.toast.show(`${CONFIG.MESSAGES.SUCCESS.RESTORE_SUCCESS} ${backupTotal} records`, 'success');

                            // Reload page to reflect changes
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);

                            console.log(`${CONFIG.CONSOLE.RESTORE.SUCCESS}: ${backupTotal} records`);
                        }
                    });

                } catch (error) {
                    UI.alert.show(CONFIG.MESSAGES.ERROR.INVALID_BACKUP, 'error');
                    console.error(`${CONFIG.CONSOLE.ERROR.RESTORE_FAILED}:`, error);
                }
            };

            input.click();
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Export;
}
