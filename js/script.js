// ==========================================
// SmartzProd - Main Application Logic
// ==========================================

// Global state management
const AppState = {
  productivityData: [],
  matchFactorData: [],
  currentEditIndex: null,
  currentEditType: null,
  productivityChart: null,
  matchFactorChart: null
};

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  setupEventListeners();
  loadFromLocalStorage();
  updateFilterOptions();
  setupSidebarToggle();
  setupInputValidation(); // Real-time validation
});

function initializeApp() {
  // Auto-fill timestamp with real-time local timezone
  const waktuInput = document.getElementById('waktu');

  // Function to get current local datetime in HTML datetime-local format
  function getCurrentLocalDateTime() {
    const now = new Date();
    // Get local datetime in YYYY-MM-DDTHH:MM format
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Set initial value
  if (waktuInput) {
    waktuInput.value = getCurrentLocalDateTime();

    // Update every minute (60000ms) if user hasn't manually changed it
    let userModified = false;

    // Track if user manually changes the time
    waktuInput.addEventListener('input', () => {
      userModified = true;
    });

    // Update time every minute if not manually modified
    setInterval(() => {
      if (!userModified && document.activeElement !== waktuInput) {
        waktuInput.value = getCurrentLocalDateTime();
      }
    }, 60000); // Update every 1 minute

    // Reset userModified flag when form is submitted or reset
    const productivityForm = waktuInput.closest('form') || document.querySelector('#calculateProductivityBtn')?.closest('.bg-white');
    if (productivityForm) {
      // Reset flag when Calculate button is clicked
      const calculateBtn = document.getElementById('calculateProductivityBtn');
      const calculateMFBtn = document.getElementById('calculateMatchFactorBtn');

      if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
          // Reset after submission
          setTimeout(() => {
            userModified = false;
            waktuInput.value = getCurrentLocalDateTime();
          }, 100);
        });
      }

      if (calculateMFBtn) {
        calculateMFBtn.addEventListener('click', () => {
          // Reset after submission
          setTimeout(() => {
            userModified = false;
            waktuInput.value = getCurrentLocalDateTime();
          }, 100);
        });
      }
    }
  }

  // Load saved user data (Nama & NRP)
  const savedNama = localStorage.getItem('userNama');
  const savedNRP = localStorage.getItem('userNRP');

  if (savedNama) document.getElementById('namaPengawas').value = savedNama;
  if (savedNRP) document.getElementById('nrp').value = savedNRP;
}

// ==========================================
// Sidebar Toggle Setup
// ==========================================
function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarToggleDesktop = document.getElementById('sidebar-toggle-desktop');
  const mainContent = document.querySelector('main');
  const filtersToggle = document.getElementById('filters-toggle');
  const filtersContent = document.getElementById('filters-content');
  const filtersChevron = document.getElementById('filters-chevron');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  // Restore sidebar state from localStorage
  const savedSidebarState = localStorage.getItem('sidebarCollapsed');
  if (savedSidebarState === 'true' && sidebar && mainContent) {
    applySidebarState(sidebar, mainContent, true);
  }

  // Mobile menu toggle
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Desktop sidebar collapse/expand - Hide content, keep container with icons
  if (sidebarToggleDesktop && sidebar && mainContent) {
    sidebarToggleDesktop.addEventListener('click', () => {
      // Toggle sidebar content visibility
      const isCurrentlyExpanded = !sidebar.classList.contains('collapsed');
      const newCollapsedState = isCurrentlyExpanded;

      // Apply the new state
      applySidebarState(sidebar, mainContent, newCollapsedState);

      // Save state to localStorage
      localStorage.setItem('sidebarCollapsed', newCollapsedState.toString());
    });
  }

  // Filters collapsible
  if (filtersToggle) {
    filtersToggle.addEventListener('click', () => {
      filtersContent.classList.toggle('hidden');
      filtersChevron.classList.toggle('fa-chevron-down');
      filtersChevron.classList.toggle('fa-chevron-up');
    });
  }

  // Clear filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      document.getElementById('filterNama').value = '';
      document.getElementById('filterExcavator').value = '';
      applyFilters();
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.add('-translate-x-full');
      }
    }
  });
}

// Helper function to apply sidebar state
function applySidebarState(sidebar, mainContent, isCollapsed) {
  const sidebarToggleDesktop = document.getElementById('sidebar-toggle-desktop');

  if (isCollapsed) {
    // Collapse: hide content, make sidebar narrow, show icons
    sidebar.classList.add('collapsed');
    sidebar.classList.remove('w-80');
    sidebar.classList.add('w-20');
    mainContent.classList.remove('lg:ml-80');
    mainContent.classList.add('lg:ml-20');

    // Hide all sidebar content
    const sidebarContent = sidebar.querySelectorAll('.sidebar-content');
    sidebarContent.forEach(content => content.classList.add('hidden'));

    // Show collapsed icons
    const collapsedIcons = sidebar.querySelector('.collapsed-icons');
    if (collapsedIcons) {
      collapsedIcons.classList.remove('hidden');
      // Bind click handlers to collapsed icons
      bindCollapsedIconEvents();
    }

    // Update toggle icon
    const toggleIcon = sidebarToggleDesktop?.querySelector('i');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-chevron-left');
      toggleIcon.classList.add('fa-chevron-right');
    }
  } else {
    // Expand: show content, make sidebar wide, hide icons
    sidebar.classList.remove('collapsed');
    sidebar.classList.remove('w-20');
    sidebar.classList.add('w-80');
    mainContent.classList.remove('lg:ml-20');
    mainContent.classList.add('lg:ml-80');

    // Show all sidebar content
    const sidebarContent = sidebar.querySelectorAll('.sidebar-content');
    sidebarContent.forEach(content => content.classList.remove('hidden'));

    // Hide collapsed icons
    const collapsedIcons = sidebar.querySelector('.collapsed-icons');
    if (collapsedIcons) {
      collapsedIcons.classList.add('hidden');
    }

    // Update toggle icon
    const toggleIcon = sidebarToggleDesktop?.querySelector('i');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-chevron-right');
      toggleIcon.classList.add('fa-chevron-left');
    }
  }
}

// ==========================================
// Bind Collapsed Icon Events
// ==========================================
function bindCollapsedIconEvents() {
  const collapsedProductivityExcel = document.getElementById('collapsed-productivity-excel');
  const collapsedMatchFactorExcel = document.getElementById('collapsed-matchfactor-excel');
  const collapsedPdfProductivity = document.getElementById('collapsed-pdf-productivity');
  const collapsedPdfMatchFactor = document.getElementById('collapsed-pdf-matchfactor');

  // Export Productivity Excel
  if (collapsedProductivityExcel) {
    collapsedProductivityExcel.addEventListener('click', (e) => {
      e.stopPropagation();
      exportToExcel('productivity');
    });
  }

  // Export Match Factor Excel
  if (collapsedMatchFactorExcel) {
    collapsedMatchFactorExcel.addEventListener('click', (e) => {
      e.stopPropagation();
      exportToExcel('matchFactor');
    });
  }

  // PDF Productivity Export
  if (collapsedPdfProductivity) {
    collapsedPdfProductivity.addEventListener('click', (e) => {
      e.stopPropagation();
      exportToPDF('productivity');
    });
  }

  // PDF Match Factor Export
  if (collapsedPdfMatchFactor) {
    collapsedPdfMatchFactor.addEventListener('click', (e) => {
      e.stopPropagation();
      exportToPDF('matchFactor');
    });
  }
}

function updateLastUpdate() {
  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl) {
    const now = new Date();
    const timestamp = now.toLocaleString('id-ID');
    lastUpdateEl.textContent = timestamp;


    // Save timestamp to localStorage
    localStorage.setItem('lastUpdateTimestamp', now.toISOString());
  }
}

function updateTotalRecords() {
  const totalRecordsEl = document.getElementById('totalRecords');
  if (totalRecordsEl) {
    const total = AppState.productivityData.length + AppState.matchFactorData.length;
    totalRecordsEl.textContent = total;
  }
}

// ==========================================
// Event Listeners Setup
// ==========================================
function setupEventListeners() {
  // Save user data on change
  document.getElementById('namaPengawas').addEventListener('change', (e) => {
    localStorage.setItem('userNama', e.target.value);
  });

  document.getElementById('nrp').addEventListener('change', (e) => {
    localStorage.setItem('userNRP', e.target.value);
  });

  // Productivity Calculator
  document.getElementById('btnHitungProductivity').addEventListener('click', calculateProductivity);

  // Match Factor Calculator
  document.getElementById('btnHitungMatchFactor').addEventListener('click', calculateMatchFactor);

  // Filters
  document.getElementById('filterNama').addEventListener('change', applyFilters);
  document.getElementById('filterNRP').addEventListener('change', applyFilters);
  document.getElementById('filterExcavator').addEventListener('change', applyFilters);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterNama').value = '';
    document.getElementById('filterNRP').value = '';
    document.getElementById('filterExcavator').value = '';
    applyFilters();
  });

  // Export buttons
  document.getElementById('btnExportProductivityExcel').addEventListener('click', () => exportToExcel('productivity'));
  document.getElementById('btnExportMatchFactorExcel').addEventListener('click', () => exportToExcel('matchFactor'));
  document.getElementById('btnExportProductivityPDF').addEventListener('click', () => exportToPDF('productivity'));
  document.getElementById('btnExportMatchFactorPDF').addEventListener('click', () => exportToPDF('matchFactor'));

  // Backup/Restore buttons
  document.getElementById('btnBackupData').addEventListener('click', backupData);
  document.getElementById('btnRestoreData').addEventListener('click', () => {
    document.getElementById('restoreFileInput').click();
  });
  document.getElementById('restoreFileInput').addEventListener('change', handleRestoreFile);

  // Edit Modal buttons
  document.getElementById('btnSaveEdit').addEventListener('click', saveEdit);
  document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
}

// ==========================================
// Real-Time Input Validation System
// ==========================================
function setupInputValidation() {
  // Validation helper function
  function validateInput(inputId, validationFn, errorMessage = '') {
    const input = document.getElementById(inputId);
    if (!input) return;

    const validIcon = document.getElementById(inputId + '-valid');
    const invalidIcon = document.getElementById(inputId + '-invalid');

    // Validate on input
    input.addEventListener('input', function () {
      validateField(this, validIcon, invalidIcon, validationFn, errorMessage);
    });

    // Validate on blur (when user leaves the field)
    input.addEventListener('blur', function () {
      if (this.value !== '') {
        validateField(this, validIcon, invalidIcon, validationFn, errorMessage);
      }
    });
  }

  function validateField(input, validIcon, invalidIcon, validationFn, errorMessage) {
    // Remove both icons first
    if (validIcon) {
      validIcon.classList.remove('show');
      validIcon.classList.add('hidden');
    }
    if (invalidIcon) {
      invalidIcon.classList.remove('show');
      invalidIcon.classList.add('hidden');
    }

    // Remove error state
    input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-200');

    // If empty, don't show anything (unless required on blur)
    if (input.value === '') {
      return;
    }

    // Validate
    const isValid = validationFn(input.value);

    if (isValid) {
      // Valid - show green checkmark
      if (validIcon) {
        validIcon.classList.remove('hidden');
        validIcon.classList.add('show');
        console.log('✅ Valid:', input.id, input.value);
      }
      input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-200');
    } else {
      // Invalid - show red exclamation and red border
      if (invalidIcon) {
        invalidIcon.classList.remove('hidden');
        invalidIcon.classList.add('show');
        console.log('❌ Invalid:', input.id, input.value);
      }
      input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-200');
    }
  }

  // Data Umum Form Validations
  validateInput('namaPengawas', (val) => val.trim().length > 0);
  validateInput('nrp', (val) => val.trim().length > 0);
  validateInput('noExcavator', (val) => /^EX[0-9]{4}$/.test(val));

  // Productivity Calculator Validations
  validateInput('jumlahRitase', (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  });

  validateInput('hmAwal', (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  });

  validateInput('hmAkhir', (val) => {
    const num = parseFloat(val);
    const hmAwal = parseFloat(document.getElementById('hmAwal').value);
    return !isNaN(num) && num >= 0 && (isNaN(hmAwal) || num > hmAwal);
  });

  validateInput('kapasitasVessel', (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  });

  // Match Factor Calculator Validations
  validateInput('jumlahHD', (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  });

  validateInput('cycleTimeHauler', (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  });

  validateInput('cycleTimeLoader', (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  });

  // Special validation for HM Akhir to check against HM Awal
  document.getElementById('hmAwal').addEventListener('input', function () {
    const hmAkhirInput = document.getElementById('hmAkhir');
    if (hmAkhirInput.value !== '') {
      hmAkhirInput.dispatchEvent(new Event('input'));
    }
  });
}

// ==========================================
// Productivity Calculator
// ==========================================
function calculateProductivity() {
  const namaPengawas = document.getElementById('namaPengawas').value.trim();
  const nrp = document.getElementById('nrp').value.trim();
  const waktu = document.getElementById('waktu').value;
  const noExcavator = document.getElementById('noExcavator').value.trim();
  const jumlahRitase = parseFloat(document.getElementById('jumlahRitase').value) || 0;
  const hmAwal = parseFloat(document.getElementById('hmAwal').value) || 0;
  const hmAkhir = parseFloat(document.getElementById('hmAkhir').value) || 0;
  const kapasitas = parseFloat(document.getElementById('kapasitas').value) || 0;

  // Validation
  if (!namaPengawas || !nrp || !noExcavator) {
    showAlert('Mohon lengkapi Data Umum (Nama Pengawas, NRP, dan No Excavator)', 'error');
    return;
  }

  if (jumlahRitase <= 0 || kapasitas <= 0) {
    showAlert('Jumlah Ritase dan Kapasitas harus lebih dari 0', 'error');
    return;
  }

  if (hmAkhir <= hmAwal) {
    showAlert('HM Akhir harus lebih besar dari HM Awal', 'error');
    return;
  }

  // Calculate
  const durasi = hmAkhir - hmAwal;
  const productivity = (jumlahRitase * kapasitas) / durasi;

  const data = {
    namaPengawas,
    nrp,
    waktu: waktu || new Date().toISOString().slice(0, 16),
    noExcavator,
    jumlahRitase,
    hmAwal,
    hmAkhir,
    durasi: parseFloat(durasi.toFixed(2)),
    kapasitas,
    productivity: parseFloat(productivity.toFixed(2))
  };

  // Save to state and localStorage
  AppState.productivityData.push(data);
  saveToLocalStorage();

  // Update UI
  renderProductivityTable();
  updateProductivityChart();
  updateFilterOptions();
  updateTotalRecords();
  updateLastUpdate();

  // Clear inputs (except Data Umum)
  document.getElementById('jumlahRitase').value = '';
  document.getElementById('hmAwal').value = '';
  document.getElementById('hmAkhir').value = '';
  document.getElementById('kapasitas').value = '';

  showAlert('Data Productivity berhasil ditambahkan!', 'success');
}

// ==========================================
// Match Factor Calculator
// ==========================================
function calculateMatchFactor() {
  const namaPengawas = document.getElementById('namaPengawas').value.trim();
  const nrp = document.getElementById('nrp').value.trim();
  const waktu = document.getElementById('waktu').value;
  const noExcavator = document.getElementById('noExcavator').value.trim();
  const jumlahHD = parseFloat(document.getElementById('jumlahHD').value) || 0;
  const cycleTimeHauler = parseFloat(document.getElementById('cycleTimeHauler').value) || 0;
  const cycleTimeLoader = parseFloat(document.getElementById('cycleTimeLoader').value) || 0;

  // Validation
  if (!namaPengawas || !nrp || !noExcavator) {
    showAlert('Mohon lengkapi Data Umum (Nama Pengawas, NRP, dan No Excavator)', 'error');
    return;
  }

  if (jumlahHD <= 0 || cycleTimeHauler <= 0 || cycleTimeLoader <= 0) {
    showAlert('Semua field harus diisi dengan nilai lebih dari 0', 'error');
    return;
  }

  // Calculate
  const matchFactor = (jumlahHD * cycleTimeLoader) / cycleTimeHauler;

  // Validate range
  if (matchFactor < 0.1 || matchFactor > 2) {
    showAlert(`Warning: Match Factor (${matchFactor.toFixed(2)}) di luar range valid (0.1 - 2)`, 'warning');
  }

  const data = {
    namaPengawas,
    nrp,
    waktu: waktu || new Date().toISOString().slice(0, 16),
    noExcavator,
    jumlahHD,
    cycleTimeHauler,
    cycleTimeLoader,
    matchFactor: parseFloat(matchFactor.toFixed(2))
  };

  // Save to state and localStorage
  AppState.matchFactorData.push(data);
  saveToLocalStorage();

  // Update UI
  renderMatchFactorTable();
  updateMatchFactorChart();
  updateFilterOptions();
  updateTotalRecords();
  updateLastUpdate();

  // Clear inputs (except Data Umum)
  document.getElementById('jumlahHD').value = '';
  document.getElementById('cycleTimeHauler').value = '';
  document.getElementById('cycleTimeLoader').value = '';

  showAlert('Data Match Factor berhasil ditambahkan!', 'success');
}

// ==========================================
// Table Rendering
// ==========================================
function renderProductivityTable(filteredData = null) {
  const data = filteredData || AppState.productivityData;
  const tbody = document.getElementById('productivityTableBody');
  tbody.innerHTML = '';

  // Update record count
  const countEl = document.getElementById('productivityCount');
  if (countEl) {
    countEl.textContent = `${data.length} data`;
  }

  // Show empty state if no data
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="11" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="fas fa-inbox text-gray-400 text-2xl"></i>
            </div>
            <p class="text-gray-500 font-medium mb-1">Belum ada data</p>
            <p class="text-gray-400 text-sm">Mulai dengan menghitung productivity</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((item, index) => {
    const row = document.createElement('tr');
    // Add zebra striping and hover effects
    row.className = 'hover:bg-blue-50 transition-colors duration-150 even:bg-gray-50 group fade-in';
    row.innerHTML = `
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">${item.namaPengawas}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">${item.nrp}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">
                <div class="flex items-center gap-1.5">
                    <i class="fas fa-clock text-gray-400 text-xs"></i>
                    <span>${formatDateTime(item.waktu)}</span>
                </div>
            </td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${item.noExcavator}
                </span>
            </td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${item.jumlahRitase}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.hmAwal).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.hmAkhir).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.kapasitas).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">${parseFloat(item.productivity).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center gap-1.5 sm:gap-2">
                    <!-- Edit Button -->
                    <button 
                        type="button"
                        onclick="editData('productivity', ${AppState.productivityData.indexOf(item)})"
                        class="
                            inline-flex items-center justify-center
                            w-8 h-8 sm:w-9 sm:h-9
                            rounded-lg
                            bg-yellow-50 hover:bg-yellow-100
                            text-yellow-600 hover:text-yellow-700
                            border border-yellow-200 hover:border-yellow-300
                            transition-all duration-200
                            hover:shadow-md hover:scale-105
                            focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2
                        " 
                        title="Edit data"
                        aria-label="Edit productivity data">
                        <i class="fas fa-pencil-alt text-xs sm:text-sm"></i>
                    </button>
                    
                    <!-- Delete Button -->
                    <button 
                        type="button"
                        onclick="deleteData('productivity', ${AppState.productivityData.indexOf(item)})"
                        class="
                            inline-flex items-center justify-center
                            w-8 h-8 sm:w-9 sm:h-9
                            rounded-lg
                            bg-red-50 hover:bg-red-100
                            text-red-600 hover:text-red-700
                            border border-red-200 hover:border-red-300
                            transition-all duration-200
                            hover:shadow-md hover:scale-105
                            focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2
                        " 
                        title="Hapus data"
                        aria-label="Delete productivity data">
                        <i class="fas fa-trash text-xs sm:text-sm"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function renderMatchFactorTable(filteredData = null) {
  const data = filteredData || AppState.matchFactorData;
  const tbody = document.getElementById('matchFactorTableBody');
  tbody.innerHTML = '';

  // Update record count
  const countEl = document.getElementById('matchFactorCount');
  if (countEl) {
    countEl.textContent = `${data.length} data`;
  }

  // Show empty state if no data
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="10" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="fas fa-inbox text-gray-400 text-2xl"></i>
            </div>
            <p class="text-gray-500 font-medium mb-1">Belum ada data</p>
            <p class="text-gray-400 text-sm">Mulai dengan menghitung match factor</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((item, index) => {
    const row = document.createElement('tr');
    // Add zebra striping and hover effects
    row.className = 'hover:bg-purple-50 transition-colors duration-150 even:bg-gray-50 group fade-in';

    // Color code match factor
    // Below 0.95: Red, 0.95-1: Green, More than 1: Orange
    let mfColor = 'text-green-600';
    let mfBadgeColor = 'bg-green-100 text-green-800';
    if (item.matchFactor < 0.95) {
      mfColor = 'text-red-600';
      mfBadgeColor = 'bg-red-100 text-red-800';
    } else if (item.matchFactor > 1) {
      mfColor = 'text-orange-600';
      mfBadgeColor = 'bg-orange-100 text-orange-800';
    }

    row.innerHTML = `
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">${item.namaPengawas}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">${item.nrp}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">
                <div class="flex items-center gap-1.5">
                    <i class="fas fa-clock text-gray-400 text-xs"></i>
                    <span>${formatDateTime(item.waktu)}</span>
                </div>
            </td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    ${item.noExcavator}
                </span>
            </td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${item.jumlahHD}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.cycleTimeHauler).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.cycleTimeLoader).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${mfBadgeColor}">
                    ${parseFloat(item.matchFactor).toFixed(2)}
                </span>
            </td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center gap-1.5 sm:gap-2">
                    <!-- Edit Button -->
                    <button 
                        type="button"
                        onclick="editData('matchFactor', ${AppState.matchFactorData.indexOf(item)})"
                        class="
                            inline-flex items-center justify-center
                            w-8 h-8 sm:w-9 sm:h-9
                            rounded-lg
                            bg-yellow-50 hover:bg-yellow-100
                            text-yellow-600 hover:text-yellow-700
                            border border-yellow-200 hover:border-yellow-300
                            transition-all duration-200
                            hover:shadow-md hover:scale-105
                            focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2
                        " 
                        title="Edit data"
                        aria-label="Edit match factor data">
                        <i class="fas fa-pencil-alt text-xs sm:text-sm"></i>
                    </button>
                    
                    <!-- Delete Button -->
                    <button 
                        type="button"
                        onclick="deleteData('matchFactor', ${AppState.matchFactorData.indexOf(item)})"
                        class="
                            inline-flex items-center justify-center
                            w-8 h-8 sm:w-9 sm:h-9
                            rounded-lg
                            bg-red-50 hover:bg-red-100
                            text-red-600 hover:text-red-700
                            border border-red-200 hover:border-red-300
                            transition-all duration-200
                            hover:shadow-md hover:scale-105
                            focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2
                        " 
                        title="Hapus data"
                        aria-label="Delete match factor data">
                        <i class="fas fa-trash text-xs sm:text-sm"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// ==========================================
// Chart Rendering - Individual Charts Per Excavator
// ==========================================

// Store individual charts by excavator
AppState.excavatorCharts = {};

// Flag to prevent duplicate renders
let isRendering = false;

function renderIndividualCharts() {
  // Prevent duplicate renders
  if (isRendering) {
    console.log('Already rendering, skipping duplicate call');
    return;
  }

  isRendering = true;

  const container = document.getElementById('individualChartsContainer');
  if (!container) {
    isRendering = false;
    return;
  }

  // Group data by excavator
  const excavators = getUniqueExcavators();

  // Clear existing charts
  Object.values(AppState.excavatorCharts).forEach(charts => {
    if (charts.productivity) {
      charts.productivity.destroy();
      charts.productivity = null;
    }
    if (charts.matchFactor) {
      charts.matchFactor.destroy();
      charts.matchFactor = null;
    }
  });
  AppState.excavatorCharts = {};

  // Clear container
  container.innerHTML = '';

  if (excavators.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-chart-line text-gray-300 text-6xl mb-4"></i>
        <p class="text-gray-500 text-lg">Belum ada data untuk ditampilkan</p>
        <p class="text-gray-400 text-sm mt-2">Silakan input data productivity dan match factor</p>
      </div>
    `;
    return;
  }

  // Create card for each excavator
  excavators.forEach((excavatorId, index) => {
    const card = createExcavatorCard(excavatorId, index);
    container.appendChild(card);
  });

  // Create all charts after DOM insertion
  setTimeout(() => {
    excavators.forEach((excavatorId, index) => {
      createExcavatorCharts(excavatorId, index);
    });
    // Reset rendering flag after all charts created
    isRendering = false;
  }, 100);
}

function getUniqueExcavators() {
  const excavators = new Set();

  AppState.productivityData.forEach(d => excavators.add(d.noExcavator));
  AppState.matchFactorData.forEach(d => excavators.add(d.noExcavator));

  const result = Array.from(excavators).sort();

  // Debug logging
  console.log('🔍 Unique Excavators Analysis:');
  console.log('  Productivity excavators:', AppState.productivityData.map(d => d.noExcavator));
  console.log('  Match Factor excavators:', AppState.matchFactorData.map(d => d.noExcavator));
  console.log('  Combined unique:', result);

  return result;
}

function createExcavatorCard(excavatorId, index) {
  const card = document.createElement('div');
  card.className = 'excavator-card';
  card.dataset.excavator = excavatorId;

  // Color scheme rotation - Minimalist elegant design
  const colors = [
    { gradient: 'from-blue-500 to-blue-600', icon: 'text-blue-600', bg: 'bg-blue-50', border: 'blue-200' },
    { gradient: 'from-purple-500 to-purple-600', icon: 'text-purple-600', bg: 'bg-purple-50', border: 'purple-200' },
    { gradient: 'from-green-500 to-green-600', icon: 'text-green-600', bg: 'bg-green-50', border: 'green-200' },
    { gradient: 'from-orange-500 to-orange-600', icon: 'text-orange-600', bg: 'bg-orange-50', border: 'orange-200' },
    { gradient: 'from-pink-500 to-pink-600', icon: 'text-pink-600', bg: 'bg-pink-50', border: 'pink-200' },
    { gradient: 'from-teal-500 to-teal-600', icon: 'text-teal-600', bg: 'bg-teal-50', border: 'teal-200' }
  ];
  const color = colors[index % colors.length];

  // Get data counts
  const prodCount = AppState.productivityData.filter(d => d.noExcavator === excavatorId).length;
  const mfCount = AppState.matchFactorData.filter(d => d.noExcavator === excavatorId).length;
  const totalRecords = prodCount + mfCount;

  // Debug logging (can be removed after testing)
  console.log(`[Card ${excavatorId}] Prod: ${prodCount}, MF: ${mfCount}, Total: ${totalRecords}`);

  // Debug: Show what MF excavator IDs exist
  const mfExcavatorIds = AppState.matchFactorData.map(d => d.noExcavator);
  console.log(`  → Looking for: "${excavatorId}", MF has:`, mfExcavatorIds);

  // Check if expanded (from localStorage)
  const expandedCards = JSON.parse(localStorage.getItem('expandedCards') || '{}');
  const isExpanded = expandedCards[excavatorId] !== false; // Default expanded

  card.innerHTML = `
    <div class="card-header bg-gradient-to-r ${color.gradient} text-white p-4 cursor-pointer" onclick="toggleExcavatorCard('${excavatorId}')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="${color.bg} rounded-lg p-2 hidden sm:flex items-center justify-center shadow-sm border border-${color.border}">
            <i class="fas fa-layer-group ${color.icon} text-lg"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base sm:text-lg font-bold truncate flex items-center gap-2">
              <i class="fas fa-layer-group sm:hidden text-white/90 text-sm"></i>
              <span>Excavator ${excavatorId}</span>
            </h3>
            <div class="flex flex-wrap gap-1 sm:gap-2 mt-1">
              <span class="text-xs bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                ${prodCount} Prod
              </span>
              <span class="text-xs bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                ${mfCount} MF
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span class="hidden md:inline-block text-xs sm:text-sm font-semibold bg-white/20 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
            ${totalRecords} Records
          </span>
          <span class="md:hidden text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            ${totalRecords}
          </span>
          <i class="fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}" id="chevron-${excavatorId}"></i>
        </div>
      </div>
    </div>
    
    <div class="charts-grid ${isExpanded ? '' : 'collapsed'}" id="charts-${excavatorId}">
      <div class="chart-wrapper">
        <h4 class="chart-title">
          <i class="fas fa-chart-bar text-blue-500"></i>
          <span class="hidden sm:inline">Productivity Trend</span>
          <span class="sm:hidden">Productivity</span>
        </h4>
        <div class="chart-canvas-wrapper">
          <canvas id="productivity-${excavatorId}"></canvas>
        </div>
        <div class="chart-stats" id="prod-stats-${excavatorId}">
          <span><i class="fas fa-arrows-up-down text-gray-400 mr-1"></i>Loading...</span>
        </div>
      </div>
      
      <div class="chart-wrapper">
        <h4 class="chart-title">
          <i class="fas fa-chart-line text-purple-500"></i>
          <span class="hidden sm:inline">Match Factor Analysis</span>
          <span class="sm:hidden">Match Factor</span>
        </h4>
        <div class="chart-canvas-wrapper">
          <canvas id="matchfactor-${excavatorId}"></canvas>
        </div>
        <div class="chart-stats" id="mf-stats-${excavatorId}">
          <span><i class="fas fa-arrows-up-down text-gray-400 mr-1"></i>Loading...</span>
        </div>
      </div>
    </div>
  `;

  return card;
}

function toggleExcavatorCard(excavatorId) {
  const chartsGrid = document.getElementById(`charts-${excavatorId}`);
  const chevron = document.getElementById(`chevron-${excavatorId}`);

  if (!chartsGrid || !chevron) return;

  // Toggle collapsed state
  const isCollapsed = chartsGrid.classList.toggle('collapsed');
  chevron.classList.toggle('rotate-180');

  // Save state to localStorage
  const expandedCards = JSON.parse(localStorage.getItem('expandedCards') || '{}');
  expandedCards[excavatorId] = !isCollapsed;
  localStorage.setItem('expandedCards', JSON.stringify(expandedCards));
}

function createExcavatorCharts(excavatorId, index) {
  const productivityData = AppState.productivityData.filter(
    d => d.noExcavator === excavatorId
  );

  const matchFactorData = AppState.matchFactorData.filter(
    d => d.noExcavator === excavatorId
  );

  // Responsive font sizes
  const isMobile = window.innerWidth < 768;
  const fontSize = {
    title: isMobile ? 10 : 12,
    axis: isMobile ? 8 : 10,
    tooltip: isMobile ? 10 : 12
  };

  // Color schemes
  const chartColors = [
    { prod: 'rgb(59, 130, 246)', prodBg: 'rgba(59, 130, 246, 0.1)', mf: 'rgb(147, 51, 234)', mfBg: 'rgba(147, 51, 234, 0.7)' },
    { prod: 'rgb(139, 92, 246)', prodBg: 'rgba(139, 92, 246, 0.1)', mf: 'rgb(236, 72, 153)', mfBg: 'rgba(236, 72, 153, 0.7)' },
    { prod: 'rgb(16, 185, 129)', prodBg: 'rgba(16, 185, 129, 0.1)', mf: 'rgb(59, 130, 246)', mfBg: 'rgba(59, 130, 246, 0.7)' },
    { prod: 'rgb(245, 158, 11)', prodBg: 'rgba(245, 158, 11, 0.1)', mf: 'rgb(16, 185, 129)', mfBg: 'rgba(16, 185, 129, 0.7)' },
    { prod: 'rgb(236, 72, 153)', prodBg: 'rgba(236, 72, 153, 0.1)', mf: 'rgb(245, 158, 11)', mfBg: 'rgba(245, 158, 11, 0.7)' },
    { prod: 'rgb(20, 184, 166)', prodBg: 'rgba(20, 184, 166, 0.1)', mf: 'rgb(139, 92, 246)', mfBg: 'rgba(139, 92, 246, 0.7)' }
  ];
  const colors = chartColors[index % chartColors.length];

  // Initialize chart storage
  if (!AppState.excavatorCharts[excavatorId]) {
    AppState.excavatorCharts[excavatorId] = {};
  }

  // ===== PRODUCTIVITY CHART =====
  if (productivityData.length > 0) {
    const prodCanvas = document.getElementById(`productivity-${excavatorId}`);
    if (!prodCanvas) {
      console.warn(`Productivity canvas not found for ${excavatorId}`);
      return;
    }

    // Destroy existing chart if any
    if (AppState.excavatorCharts[excavatorId].productivity) {
      AppState.excavatorCharts[excavatorId].productivity.destroy();
      AppState.excavatorCharts[excavatorId].productivity = null;
    }

    const prodCtx = prodCanvas.getContext('2d');
    if (prodCtx) {
      AppState.excavatorCharts[excavatorId].productivity = new Chart(prodCtx, {
        type: 'bar',
        data: {
          labels: productivityData.map(d => formatDateTime(d.waktu)),
          datasets: [{
            label: 'Productivity (BCM/Jam)',
            data: productivityData.map(d => d.productivity),
            backgroundColor: colors.prod,
            borderColor: colors.prod,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: { size: fontSize.tooltip },
              bodyFont: { size: fontSize.tooltip },
              padding: 12,
              callbacks: {
                label: function (context) {
                  return ` ${context.parsed.y.toLocaleString('id-ID')} BCM/Jam`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                font: { size: fontSize.axis },
                maxRotation: 45,
                minRotation: 45
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              suggestedMax: 2000,
              ticks: {
                font: { size: fontSize.axis },
                callback: function (value) {
                  return value.toLocaleString('id-ID');
                }
              },
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            }
          },
          animation: { duration: isMobile ? 500 : 750 }
        }
      });

      // Calculate stats
      const values = productivityData.map(d => d.productivity);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(0);
      const max = Math.max(...values).toFixed(0);
      const min = Math.min(...values).toFixed(0);

      document.getElementById(`prod-stats-${excavatorId}`).innerHTML = `
        <span><i class="fas fa-chart-simple text-gray-400 mr-1"></i>Avg: ${parseInt(avg).toLocaleString('id-ID')}</span>
        <span><i class="fas fa-arrow-up text-green-500 mr-1"></i>Max: ${parseInt(max).toLocaleString('id-ID')}</span>
        <span><i class="fas fa-arrow-down text-red-500 mr-1"></i>Min: ${parseInt(min).toLocaleString('id-ID')}</span>
      `;
    }
  } else {
    document.getElementById(`productivity-${excavatorId}`).parentElement.innerHTML = `
      <div class="flex items-center justify-center h-48 text-gray-400">
        <div class="text-center">
          <i class="fas fa-chart-bar text-4xl mb-2"></i>
          <p class="text-sm">No productivity data</p>
        </div>
      </div>
    `;
  }

  // ===== MATCH FACTOR CHART =====
  if (matchFactorData.length > 0) {
    const mfCanvas = document.getElementById(`matchfactor-${excavatorId}`);
    if (!mfCanvas) {
      console.warn(`Match Factor canvas not found for ${excavatorId}`);
      return;
    }

    // Destroy existing chart if any
    if (AppState.excavatorCharts[excavatorId].matchFactor) {
      AppState.excavatorCharts[excavatorId].matchFactor.destroy();
      AppState.excavatorCharts[excavatorId].matchFactor = null;
    }

    const mfCtx = mfCanvas.getContext('2d');
    if (mfCtx) {
      AppState.excavatorCharts[excavatorId].matchFactor = new Chart(mfCtx, {
        type: 'bar',
        data: {
          labels: matchFactorData.map(d => formatDateTime(d.waktu)),
          datasets: [{
            label: 'Match Factor',
            data: matchFactorData.map(d => d.matchFactor),
            backgroundColor: colors.mfBg,
            borderColor: colors.mf,
            borderWidth: 2,
            borderRadius: isMobile ? 4 : 6,
            barThickness: isMobile ? 20 : 30
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: { size: fontSize.tooltip },
              bodyFont: { size: fontSize.tooltip },
              padding: 12,
              callbacks: {
                label: function (context) {
                  return ` ${context.parsed.y.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                font: { size: fontSize.axis },
                maxRotation: 45,
                minRotation: 45
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              suggestedMax: 2.0,
              ticks: {
                font: { size: fontSize.axis },
                callback: function (value) {
                  return value.toFixed(1);
                }
              },
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            }
          },
          animation: { duration: isMobile ? 500 : 750 }
        }
      });

      // Calculate stats
      const values = matchFactorData.map(d => d.matchFactor);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
      const max = Math.max(...values).toFixed(2);
      const min = Math.min(...values).toFixed(2);

      // Status color based on average
      const avgNum = parseFloat(avg);
      let statusColor = 'text-green-500';
      let statusText = 'Optimal';
      if (avgNum < 0.5 || avgNum > 1.5) {
        statusColor = 'text-yellow-500';
        statusText = 'Warning';
      }
      if (avgNum < 0.1 || avgNum > 2.0) {
        statusColor = 'text-red-500';
        statusText = 'Critical';
      }

      document.getElementById(`mf-stats-${excavatorId}`).innerHTML = `
        <span><i class="fas fa-chart-simple text-gray-400 mr-1"></i>Avg: ${avg}</span>
        <span><i class="fas fa-arrow-up text-green-500 mr-1"></i>Max: ${max}</span>
        <span><i class="fas fa-arrow-down text-red-500 mr-1"></i>Min: ${min}</span>
        <span><i class="fas fa-circle-check ${statusColor} mr-1"></i>${statusText}</span>
      `;
    }
  } else {
    document.getElementById(`matchfactor-${excavatorId}`).parentElement.innerHTML = `
      <div class="flex items-center justify-center h-48 text-gray-400">
        <div class="text-center">
          <i class="fas fa-chart-line text-4xl mb-2"></i>
          <p class="text-sm">No match factor data</p>
        </div>
      </div>
    `;
  }
}

// Legacy functions - now redirect to individual charts
function updateProductivityChart() {
  renderIndividualCharts();
}

function updateMatchFactorChart() {
  renderIndividualCharts();
}

// Make toggleExcavatorCard global
window.toggleExcavatorCard = toggleExcavatorCard;

// Expand/Collapse All Functions
window.expandAllExcavators = function () {
  const excavatorCards = document.querySelectorAll('.excavator-card');
  const expandedCards = {};

  excavatorCards.forEach(card => {
    const excavatorId = card.dataset.excavator;
    const chartsGrid = card.querySelector('.charts-grid');
    const chevron = card.querySelector('.fa-chevron-down');

    if (chartsGrid && chevron) {
      chartsGrid.classList.remove('collapsed');
      chevron.classList.add('rotate-180');
      expandedCards[excavatorId] = true;
    }
  });

  localStorage.setItem('expandedCards', JSON.stringify(expandedCards));
  showToast('All excavator cards expanded', 'success');
};

window.collapseAllExcavators = function () {
  const excavatorCards = document.querySelectorAll('.excavator-card');
  const expandedCards = {};

  excavatorCards.forEach(card => {
    const excavatorId = card.dataset.excavator;
    const chartsGrid = card.querySelector('.charts-grid');
    const chevron = card.querySelector('.fa-chevron-down');

    if (chartsGrid && chevron) {
      chartsGrid.classList.add('collapsed');
      chevron.classList.remove('rotate-180');
      expandedCards[excavatorId] = false;
    }
  });

  localStorage.setItem('expandedCards', JSON.stringify(expandedCards));
  showToast('All excavator cards collapsed', 'info');
};

// ==========================================
// Edit & Delete Functions
// ==========================================
function editData(type, index) {
  AppState.currentEditType = type;
  AppState.currentEditIndex = index;

  const data = type === 'productivity' ? AppState.productivityData[index] : AppState.matchFactorData[index];

  let modalContent = '';

  if (type === 'productivity') {
    modalContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-hashtag text-blue-500 mr-2"></i>Jumlah Ritase
                    </label>
                    <input type="number" id="editJumlahRitase" value="${data.jumlahRitase}" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-gauge text-blue-500 mr-2"></i>HM Awal
                    </label>
                    <input type="number" id="editHmAwal" value="${data.hmAwal}" step="0.01" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-gauge-high text-blue-500 mr-2"></i>HM Akhir
                    </label>
                    <input type="number" id="editHmAkhir" value="${data.hmAkhir}" step="0.01" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-box text-blue-500 mr-2"></i>Kapasitas (BCM)
                    </label>
                    <input type="number" id="editKapasitas" value="${data.kapasitas}" step="0.01" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                </div>
            </div>
        `;
  } else {
    modalContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-truck text-purple-500 mr-2"></i>Jumlah HD
                    </label>
                    <input type="number" id="editJumlahHD" value="${data.jumlahHD}" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-clock text-purple-500 mr-2"></i>Cycle Time Hauler (menit)
                    </label>
                    <input type="number" id="editCycleTimeHauler" value="${data.cycleTimeHauler}" step="0.01" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-hourglass-half text-purple-500 mr-2"></i>Cycle Time Loader (menit)
                    </label>
                    <input type="number" id="editCycleTimeLoader" value="${data.cycleTimeLoader}" step="0.01" 
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                </div>
            </div>
        `;
  }

  document.getElementById('editModalContent').innerHTML = modalContent;

  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');

  // Prevent body scroll when modal is open
  document.body.classList.add('modal-open');

  // Add ESC key listener for edit modal
  const handleEscapeEdit = (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      document.removeEventListener('keydown', handleEscapeEdit);
    }
  };

  document.addEventListener('keydown', handleEscapeEdit);

  // Store the handler so we can remove it later
  modal.dataset.escHandler = 'attached';
}

function saveEdit() {
  const type = AppState.currentEditType;
  const index = AppState.currentEditIndex;

  if (type === 'productivity') {
    const jumlahRitase = parseFloat(document.getElementById('editJumlahRitase').value);
    const hmAwal = parseFloat(document.getElementById('editHmAwal').value);
    const hmAkhir = parseFloat(document.getElementById('editHmAkhir').value);
    const kapasitas = parseFloat(document.getElementById('editKapasitas').value);

    const durasi = hmAkhir - hmAwal;
    const productivity = (jumlahRitase * kapasitas) / durasi;

    AppState.productivityData[index] = {
      ...AppState.productivityData[index],
      jumlahRitase,
      hmAwal,
      hmAkhir,
      durasi: parseFloat(durasi.toFixed(2)),
      kapasitas,
      productivity: parseFloat(productivity.toFixed(2))
    };

    renderProductivityTable();
    updateProductivityChart();
  } else {
    const jumlahHD = parseFloat(document.getElementById('editJumlahHD').value);
    const cycleTimeHauler = parseFloat(document.getElementById('editCycleTimeHauler').value);
    const cycleTimeLoader = parseFloat(document.getElementById('editCycleTimeLoader').value);

    const matchFactor = (jumlahHD * cycleTimeLoader) / cycleTimeHauler;

    AppState.matchFactorData[index] = {
      ...AppState.matchFactorData[index],
      jumlahHD,
      cycleTimeHauler,
      cycleTimeLoader,
      matchFactor: parseFloat(matchFactor.toFixed(2))
    };

    renderMatchFactorTable();
    updateMatchFactorChart();
  }

  saveToLocalStorage();
  closeEditModal();
  showToast('Data berhasil diupdate!', 'success');
}

function deleteData(type, index) {
  const data = type === 'productivity' ? AppState.productivityData[index] : AppState.matchFactorData[index];

  // Build data preview
  let previewHTML = '';
  if (type === 'productivity') {
    previewHTML = `
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Excavator:</span>
          <span class="font-semibold text-gray-900">${data.noExcavator}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Waktu:</span>
          <span class="font-semibold text-gray-900">${new Date(data.waktu).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Ritase:</span>
          <span class="font-semibold text-blue-600">${data.jumlahRitase}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Productivity:</span>
          <span class="font-semibold text-green-600">${data.productivity.toFixed(2)} BCM/jam</span>
        </div>
      </div>
    `;
  } else {
    previewHTML = `
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Excavator:</span>
          <span class="font-semibold text-gray-900">${data.noExcavator}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Waktu:</span>
          <span class="font-semibold text-gray-900">${new Date(data.waktu).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Jumlah HD:</span>
          <span class="font-semibold text-purple-600">${data.jumlahHD}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Match Factor:</span>
          <span class="font-semibold text-green-600">${data.matchFactor.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  // Show enhanced delete modal
  showConfirm(
    'Hapus Data',
    `Apakah Anda yakin ingin menghapus data ${type === 'productivity' ? 'produktivitas' : 'match factor'} ini? Data yang dihapus tidak dapat dikembalikan.`,
    'trash',
    'red',
    () => {
      if (type === 'productivity') {
        AppState.productivityData.splice(index, 1);
        renderProductivityTable();
        updateProductivityChart();
      } else {
        AppState.matchFactorData.splice(index, 1);
        renderMatchFactorTable();
        updateMatchFactorChart();
      }

      saveToLocalStorage();
      updateFilterOptions();
      updateTotalRecords();
      updateLastUpdate();
      showToast('Data berhasil dihapus!', 'success');
    },
    null,
    previewHTML
  );
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.add('hidden');
  AppState.currentEditIndex = null;
  AppState.currentEditType = null;

  // Re-enable body scroll
  document.body.classList.remove('modal-open');

  // Clean up ESC key listener
  if (modal.dataset.escHandler) {
    delete modal.dataset.escHandler;
  }
}

// ==========================================
// Filter Functions
// ==========================================
function updateFilterOptions() {
  const filterNama = document.getElementById('filterNama');
  const filterNRP = document.getElementById('filterNRP');
  const filterExcavator = document.getElementById('filterExcavator');

  // Get unique names
  const allNames = [...new Set([
    ...AppState.productivityData.map(d => d.namaPengawas),
    ...AppState.matchFactorData.map(d => d.namaPengawas)
  ])];

  // Get unique NRPs
  const allNRPs = [...new Set([
    ...AppState.productivityData.map(d => d.nrp),
    ...AppState.matchFactorData.map(d => d.nrp)
  ])];

  // Get unique excavators
  const allExcavators = [...new Set([
    ...AppState.productivityData.map(d => d.noExcavator),
    ...AppState.matchFactorData.map(d => d.noExcavator)
  ])];

  // Update nama filter
  filterNama.innerHTML = '<option value="">Semua Pengawas</option>';
  allNames.forEach(name => {
    filterNama.innerHTML += `<option value="${name}">${name}</option>`;
  });

  // Update NRP filter
  if (filterNRP) {
    filterNRP.innerHTML = '<option value="">Semua NRP</option>';
    allNRPs.sort().forEach(nrp => {
      filterNRP.innerHTML += `<option value="${nrp}">${nrp}</option>`;
    });
  }

  // Update excavator filter
  filterExcavator.innerHTML = '<option value="">Semua Excavator</option>';
  allExcavators.forEach(exc => {
    filterExcavator.innerHTML += `<option value="${exc}">${exc}</option>`;
  });
}

function applyFilters() {
  const filterNamaValue = document.getElementById('filterNama').value;
  const filterNRPValue = document.getElementById('filterNRP').value;
  const filterExcavatorValue = document.getElementById('filterExcavator').value;

  let filteredProductivity = AppState.productivityData;
  let filteredMatchFactor = AppState.matchFactorData;

  if (filterNamaValue) {
    filteredProductivity = filteredProductivity.filter(d => d.namaPengawas === filterNamaValue);
    filteredMatchFactor = filteredMatchFactor.filter(d => d.namaPengawas === filterNamaValue);
  }

  if (filterNRPValue) {
    filteredProductivity = filteredProductivity.filter(d => d.nrp === filterNRPValue);
    filteredMatchFactor = filteredMatchFactor.filter(d => d.nrp === filterNRPValue);
  }

  if (filterExcavatorValue) {
    filteredProductivity = filteredProductivity.filter(d => d.noExcavator === filterExcavatorValue);
    filteredMatchFactor = filteredMatchFactor.filter(d => d.noExcavator === filterExcavatorValue);
  }

  renderProductivityTable(filteredProductivity);
  renderMatchFactorTable(filteredMatchFactor);
}

// ==========================================
// Export Functions
// ==========================================
async function exportToExcel(type) {
  const data = type === 'productivity' ? AppState.productivityData : AppState.matchFactorData;

  if (data.length === 0) {
    showAlert('Tidak ada data untuk diexport', 'error');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type === 'productivity' ? 'Productivity' : 'Match Factor');

  if (type === 'productivity') {
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Pengawas', key: 'namaPengawas', width: 20 },
      { header: 'NRP', key: 'nrp', width: 15 },
      { header: 'Waktu', key: 'waktu', width: 20 },
      { header: 'No Excavator', key: 'noExcavator', width: 15 },
      { header: 'Ritase', key: 'jumlahRitase', width: 10 },
      { header: 'HM Awal', key: 'hmAwal', width: 10 },
      { header: 'HM Akhir', key: 'hmAkhir', width: 10 },
      { header: 'Kapasitas (BCM)', key: 'kapasitas', width: 15 },
      { header: 'Productivity (BCM/Jam)', key: 'productivity', width: 20 }
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        ...item,
        waktu: formatDateTime(item.waktu)
      });
    });
  } else {
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Pengawas', key: 'namaPengawas', width: 20 },
      { header: 'NRP', key: 'nrp', width: 15 },
      { header: 'Waktu', key: 'waktu', width: 20 },
      { header: 'No Excavator', key: 'noExcavator', width: 15 },
      { header: 'Jumlah HD', key: 'jumlahHD', width: 12 },
      { header: 'CT Hauler (min)', key: 'cycleTimeHauler', width: 15 },
      { header: 'CT Loader (min)', key: 'cycleTimeLoader', width: 15 },
      { header: 'Match Factor', key: 'matchFactor', width: 15 }
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        ...item,
        waktu: formatDateTime(item.waktu)
      });
    });
  }

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SmartzProd_${type}_${new Date().getTime()}.xlsx`;
  a.click();

  showAlert('Export ke Excel berhasil!', 'success');
}

function exportToPDF(type) {
  const data = type === 'productivity' ? AppState.productivityData : AppState.matchFactorData;

  if (data.length === 0) {
    showAlert('Tidak ada data untuk diexport', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4');

  const title = type === 'productivity' ? 'Laporan Productivity' : 'Laporan Match Factor';
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  let tableData = [];
  let headers = [];

  if (type === 'productivity') {
    headers = [['No', 'Pengawas', 'NRP', 'Waktu', 'No Exc', 'Ritase', 'HM Awal', 'HM Akhir', 'Durasi', 'Kapasitas', 'Productivity']];
    tableData = data.map((item, index) => [
      index + 1,
      item.namaPengawas,
      item.nrp,
      formatDateTime(item.waktu),
      item.noExcavator,
      item.jumlahRitase,
      item.hmAwal,
      item.hmAkhir,
      item.durasi,
      item.kapasitas,
      item.productivity
    ]);
  } else {
    headers = [['No', 'Pengawas', 'NRP', 'Waktu', 'No Exc', 'Jml HD', 'CT Hauler', 'CT Loader', 'Match Factor']];
    tableData = data.map((item, index) => [
      index + 1,
      item.namaPengawas,
      item.nrp,
      formatDateTime(item.waktu),
      item.noExcavator,
      item.jumlahHD,
      item.cycleTimeHauler,
      item.cycleTimeLoader,
      item.matchFactor
    ]);
  }

  doc.autoTable({
    head: headers,
    body: tableData,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [68, 114, 196] }
  });

  doc.save(`SmartzProd_${type}_${new Date().getTime()}.pdf`);

  showAlert('Export ke PDF berhasil!', 'success');
}

// ==========================================
// LocalStorage Functions
// ==========================================
function saveToLocalStorage() {
  localStorage.setItem('productivityData', JSON.stringify(AppState.productivityData));
  localStorage.setItem('matchFactorData', JSON.stringify(AppState.matchFactorData));
}

function loadFromLocalStorage() {
  const productivity = localStorage.getItem('productivityData');
  const matchFactor = localStorage.getItem('matchFactorData');

  console.log('🔄 loadFromLocalStorage called:');
  console.log('  productivity exists:', !!productivity, 'length:', productivity?.length);
  console.log('  matchFactor exists:', !!matchFactor, 'length:', matchFactor?.length);

  // Load both datasets first (without rendering)
  if (productivity) {
    AppState.productivityData = JSON.parse(productivity);
    console.log('  ✅ Loaded productivity:', AppState.productivityData.length, 'records');
  }

  if (matchFactor) {
    AppState.matchFactorData = JSON.parse(matchFactor);
    console.log('  ✅ Loaded matchFactor:', AppState.matchFactorData.length, 'records');
    console.log('  Sample MF record:', AppState.matchFactorData[0]);
  } else {
    console.log('  ❌ No matchFactor in localStorage!');
  }

  // Now render everything together (after both datasets loaded)
  if (productivity) {
    renderProductivityTable();
    updateProductivityChart();
  }

  if (matchFactor) {
    renderMatchFactorTable();
    updateMatchFactorChart();
  }

  updateTotalRecords();

  // Load and display last update timestamp
  const lastUpdateTimestamp = localStorage.getItem('lastUpdateTimestamp');
  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl && lastUpdateTimestamp) {
    const savedDate = new Date(lastUpdateTimestamp);
    lastUpdateEl.textContent = savedDate.toLocaleString('id-ID');
  }
}

// ==========================================
// Utility Functions
// ==========================================
function formatDateTime(datetime) {
  if (!datetime) return '-';
  const dt = new Date(datetime);
  return dt.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Toast Notification System
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600',
    error: 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-600',
    info: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600'
  };

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `${colors[type]} px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-[500px] border-l-4 transform transition-all duration-500 ease-out translate-x-full opacity-0 backdrop-blur-sm`;
  toast.innerHTML = `
    <div class="flex-shrink-0">
      <i class="fas ${icons[type]} text-2xl"></i>
    </div>
    <span class="flex-1 font-medium text-sm leading-relaxed">${message}</span>
    <button onclick="this.parentElement.remove()" class="flex-shrink-0 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200">
      <i class="fas fa-times text-sm"></i>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');
  }, 10);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

// Legacy support - redirect to toast
function showAlert(message, type = 'info') {
  showToast(message, type);
}

// Confirmation Modal System
function showConfirm(title, message, iconType = 'question', color = 'blue', onConfirm, onCancel, dataPreview = null) {
  const modal = document.getElementById('confirmModal');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmIcon = document.getElementById('confirmIcon');
  const confirmTopBar = document.getElementById('confirmTopBar');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmDataPreview = document.getElementById('confirmDataPreview');

  const iconConfig = {
    question: { icon: 'fa-question-circle', bg: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', topBar: 'from-blue-500 to-blue-600' },
    trash: { icon: 'fa-trash-alt', bg: 'bg-red-500', gradient: 'from-red-500 to-red-600', topBar: 'from-red-500 to-red-600' },
    warning: { icon: 'fa-exclamation-triangle', bg: 'bg-yellow-500', gradient: 'from-yellow-500 to-yellow-600', topBar: 'from-yellow-500 to-yellow-600' },
    'exclamation-triangle': { icon: 'fa-exclamation-triangle', bg: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600', topBar: 'from-orange-500 to-orange-600' },
    info: { icon: 'fa-info-circle', bg: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', topBar: 'from-blue-500 to-blue-600' },
    upload: { icon: 'fa-upload', bg: 'bg-teal-500', gradient: 'from-teal-500 to-teal-600', topBar: 'from-teal-500 to-teal-600' }
  };

  const colorConfig = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
    red: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
    green: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white',
    orange: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white',
    teal: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white'
  };

  const config = iconConfig[iconType] || iconConfig.question;

  // Update top bar gradient
  confirmTopBar.className = `h-2 bg-gradient-to-r ${config.topBar} rounded-t-2xl`;

  // Update icon with animation
  confirmIcon.className = `relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${config.gradient} shadow-xl mb-4 animate-bounce-in`;
  confirmIcon.innerHTML = `
    <div class="absolute inset-0 rounded-full bg-${iconType === 'trash' ? 'red' : 'blue'}-400 opacity-25 animate-pulse"></div>
    <i class="fas ${config.icon} text-3xl text-white relative z-10"></i>
  `;

  confirmTitle.textContent = title;

  // Support HTML content in message
  if (message.includes('<')) {
    confirmMessage.innerHTML = message;
  } else {
    confirmMessage.textContent = message;
  }

  // Show/hide data preview
  if (dataPreview && confirmDataPreview) {
    confirmDataPreview.innerHTML = dataPreview;
    confirmDataPreview.classList.remove('hidden');
  } else if (confirmDataPreview) {
    confirmDataPreview.classList.add('hidden');
  }

  // Update button styles with shimmer effect
  confirmOkBtn.className = `group relative overflow-hidden px-8 py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 ${colorConfig[color] || colorConfig.blue}`;
  confirmOkBtn.innerHTML = `
    <span class="absolute inset-0 shimmer opacity-0 group-hover:opacity-100"></span>
    <i class="fas fa-check relative z-10"></i>
    <span class="relative z-10">${iconType === 'trash' ? 'Delete' : 'OK'}</span>
  `;

  confirmCancelBtn.className = `group relative overflow-hidden px-8 py-3.5 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2.5`;

  // Show modal with animation
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('opacity-100'), 10);

  // Prevent body scroll when modal is open
  document.body.classList.add('modal-open');

  // Handle OK button
  const handleOk = () => {
    modal.classList.remove('opacity-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (onConfirm) onConfirm();
    }, 200);
    cleanup();
  };

  // Handle Cancel button
  const handleCancel = () => {
    modal.classList.remove('opacity-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (onCancel) onCancel();
    }, 200);
    cleanup();
  };

  // Handle ESC key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Cleanup event listeners
  const cleanup = () => {
    confirmOkBtn.removeEventListener('click', handleOk);
    confirmCancelBtn.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleBackdropClick);
    document.removeEventListener('keydown', handleEscape);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === modal) handleCancel();
  };

  confirmOkBtn.addEventListener('click', handleOk);
  confirmCancelBtn.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleEscape);
}

// ==========================================
// Backup & Restore Functions
// ==========================================
function backupData() {
  try {
    // Collect all data from localStorage
    const backupData = {
      version: '2.0.5',
      exportDate: new Date().toISOString(),
      productivityData: AppState.productivityData,
      matchFactorData: AppState.matchFactorData,
      userSettings: {
        nama: localStorage.getItem('userNama') || '',
        nrp: localStorage.getItem('userNRP') || '',
        lastUpdate: localStorage.getItem('lastUpdateTimestamp') || '',
        expandedCards: localStorage.getItem('expandedCards') || '{}',
        sidebarCollapsed: localStorage.getItem('sidebarCollapsed') || 'false'
      },
      metadata: {
        totalProductivity: AppState.productivityData.length,
        totalMatchFactor: AppState.matchFactorData.length,
        totalRecords: AppState.productivityData.length + AppState.matchFactorData.length
      }
    };

    // Convert to JSON
    const jsonString = JSON.stringify(backupData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.href = url;
    link.download = `SmartzProd-Backup-${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Backup berhasil! ${backupData.metadata.totalRecords} records`, 'success');
  } catch (error) {
    console.error('Backup error:', error);
    showToast('Gagal membuat backup: ' + error.message, 'error');
  }
}

function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.name.endsWith('.json')) {
    showToast('File harus berformat JSON', 'error');
    event.target.value = ''; // Reset input
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const backupData = JSON.parse(e.target.result);

      // Validate backup data structure
      if (!backupData.productivityData || !backupData.matchFactorData) {
        throw new Error('Format backup tidak valid');
      }

      // Show enhanced confirmation dialog with beautiful stats preview
      const backupDate = new Date(backupData.exportDate).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const currentTotal = AppState.productivityData.length + AppState.matchFactorData.length;

      const statsHTML = `
        <div class="space-y-3 sm:space-y-4">
          <!-- Backup File Header (Mobile Responsive) -->
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg mb-2 sm:mb-3">
              <i class="fas fa-cloud-upload-alt text-white text-lg sm:text-2xl"></i>
            </div>
            <h4 class="text-xs sm:text-sm font-semibold text-gray-600 mb-1">File Backup</h4>
            <p class="text-[10px] sm:text-xs text-gray-500 break-all px-2 sm:px-4 leading-tight">${file.name}</p>
            <p class="text-[10px] sm:text-xs text-gray-400 mt-1">
              <i class="fas fa-calendar-alt mr-1"></i>${backupDate}
            </p>
          </div>

          <!-- Data Comparison Table (Mobile Adaptive) -->
          <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 overflow-x-auto">
            <table class="w-full text-sm min-w-[280px]">
              <thead>
                <tr class="border-b border-gray-300">
                  <th class="text-left py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-gray-600">Jenis Data</th>
                  <th class="text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-gray-600">Backup</th>
                  ${currentTotal > 0 ? '<th class="text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-gray-600">Saat Ini</th>' : ''}
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-gray-200">
                  <td class="py-2 sm:py-3">
                    <div class="flex items-center gap-1.5 sm:gap-2">
                      <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span class="text-[10px] sm:text-xs font-medium text-gray-700">Productivity</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-bold">
                      ${backupData.metadata.totalProductivity}
                    </span>
                  </td>
                  ${currentTotal > 0 ? `
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-200 text-gray-600 rounded-full text-[10px] sm:text-xs font-medium">
                      ${AppState.productivityData.length}
                    </span>
                  </td>
                  ` : ''}
                </tr>
                <tr class="border-b border-gray-200">
                  <td class="py-2 sm:py-3">
                    <div class="flex items-center gap-1.5 sm:gap-2">
                      <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                      <span class="text-[10px] sm:text-xs font-medium text-gray-700">Match Factor</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-xs font-bold">
                      ${backupData.metadata.totalMatchFactor}
                    </span>
                  </td>
                  ${currentTotal > 0 ? `
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-200 text-gray-600 rounded-full text-[10px] sm:text-xs font-medium">
                      ${AppState.matchFactorData.length}
                    </span>
                  </td>
                  ` : ''}
                </tr>
                <tr>
                  <td class="py-2 sm:py-3">
                    <span class="text-[10px] sm:text-xs font-bold text-gray-800">Total Records</span>
                  </td>
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500 text-white rounded-full text-xs sm:text-sm font-bold">
                      ${backupData.metadata.totalRecords}
                    </span>
                  </td>
                  ${currentTotal > 0 ? `
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-400 text-white rounded-full text-xs sm:text-sm font-bold">
                      ${currentTotal}
                    </span>
                  </td>
                  ` : ''}
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Action Arrow (Mobile Responsive) -->
          ${currentTotal > 0 ? `
          <div class="flex items-center justify-center gap-2 sm:gap-3 py-1.5 sm:py-2">
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
            <div class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-50 border-2 border-red-200 rounded-full">
              <i class="fas fa-exchange-alt text-red-600 text-xs sm:text-sm"></i>
              <span class="text-[10px] sm:text-xs font-bold text-red-700 whitespace-nowrap">Data akan diganti</span>
            </div>
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
          </div>
          ` : `
          <div class="flex items-center justify-center gap-2 sm:gap-3 py-1.5 sm:py-2">
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent"></div>
            <div class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-green-50 border-2 border-green-200 rounded-full">
              <i class="fas fa-check-circle text-green-600 text-xs sm:text-sm"></i>
              <span class="text-[10px] sm:text-xs font-bold text-green-700 whitespace-nowrap">Database kosong</span>
            </div>
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent"></div>
          </div>
          `}

          <!-- Warning Message (Mobile Responsive) -->
          ${currentTotal > 0 ? `
          <div class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-2.5 sm:p-3">
            <div class="flex items-start gap-1.5 sm:gap-2">
              <i class="fas fa-exclamation-circle text-red-500 text-xs sm:text-sm mt-0.5 flex-shrink-0"></i>
              <p class="text-[10px] sm:text-xs text-red-800 leading-relaxed">
                <strong>${currentTotal} records</strong> yang ada saat ini akan <strong>dihapus permanen</strong> dan diganti dengan <strong>${backupData.metadata.totalRecords} records</strong> dari backup.
              </p>
            </div>
          </div>
          ` : ''}
        </div>
      `;

      showConfirm(
        'Restore Data dari Backup',
        statsHTML,
        'exclamation-triangle',
        'orange',
        () => {
          // User confirmed, proceed with restore
          restoreData(backupData);
        },
        () => {
          // User cancelled
          showToast('Restore dibatalkan', 'info');
        }
      );

    } catch (error) {
      console.error('Restore error:', error);
      showToast('Gagal membaca backup: ' + error.message, 'error');
    }

    // Reset file input
    event.target.value = '';
  };

  reader.onerror = function () {
    showToast('Gagal membaca file', 'error');
    event.target.value = '';
  };

  reader.readAsText(file);
}

function restoreData(backupData) {
  try {
    // Restore data to AppState
    AppState.productivityData = backupData.productivityData || [];
    AppState.matchFactorData = backupData.matchFactorData || [];

    // Restore user settings
    if (backupData.userSettings) {
      if (backupData.userSettings.nama) {
        localStorage.setItem('userNama', backupData.userSettings.nama);
        document.getElementById('namaPengawas').value = backupData.userSettings.nama;
      }
      if (backupData.userSettings.nrp) {
        localStorage.setItem('userNRP', backupData.userSettings.nrp);
        document.getElementById('nrp').value = backupData.userSettings.nrp;
      }
      if (backupData.userSettings.lastUpdate) {
        localStorage.setItem('lastUpdateTimestamp', backupData.userSettings.lastUpdate);
      }
      if (backupData.userSettings.expandedCards) {
        localStorage.setItem('expandedCards', backupData.userSettings.expandedCards);
      }
      if (backupData.userSettings.sidebarCollapsed) {
        localStorage.setItem('sidebarCollapsed', backupData.userSettings.sidebarCollapsed);
      }
    }

    // Save to localStorage
    saveToLocalStorage();

    // Refresh UI
    renderProductivityTable();
    renderMatchFactorTable();
    updateProductivityChart();
    updateMatchFactorChart();
    updateFilterOptions();
    updateTotalRecords();
    updateLastUpdate();

    showToast(
      `Restore berhasil! ${backupData.metadata.totalRecords} records dipulihkan`,
      'success'
    );

    // Optional: Scroll to top to show the results
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {
    console.error('Restore data error:', error);
    showToast('Gagal restore data: ' + error.message, 'error');
  }
}

// Expose functions to global scope for onclick handlers
window.editData = editData;
window.deleteData = deleteData;

// ==========================================
// Window Resize Handler for Chart Responsiveness
// ==========================================
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Re-render charts with new responsive settings
    if (AppState.productivityChart && AppState.productivityData.length > 0) {
      updateProductivityChart();
    }
    if (AppState.matchFactorChart && AppState.matchFactorData.length > 0) {
      updateMatchFactorChart();
    }
  }, 250); // Debounce for 250ms to avoid excessive re-renders
});

// ==========================================
// Info Modal Handler
// ==========================================
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const closeInfoBtn = document.getElementById('closeInfoBtn');

// Open info modal
infoBtn.addEventListener('click', () => {
  infoModal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  // Trigger animation
  setTimeout(() => {
    const modalContent = infoModal.querySelector('.modal-content');
    modalContent.style.transform = 'scale(1)';
    modalContent.style.opacity = '1';
  }, 10);
});

// Close info modal function
function closeInfoModal() {
  const modalContent = infoModal.querySelector('.modal-content');
  modalContent.style.transform = 'scale(0.95)';
  modalContent.style.opacity = '0';

  setTimeout(() => {
    infoModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }, 200);
}

// Close button click
closeInfoBtn.addEventListener('click', closeInfoModal);

// Backdrop click to close
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    closeInfoModal();
  }
});

// ESC key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !infoModal.classList.contains('hidden')) {
    closeInfoModal();
  }
});
