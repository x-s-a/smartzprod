// ==========================================
// SmartzProd - Main Application Logic
// ==========================================

// Global state management
const AppState = {
  productivityData: [],
  matchFactorData: [],
  issuesData: [], // New: Store delay & productivity issues with photos
  currentEditIndex: null,
  currentEditType: null,
  productivityChart: null,
  matchFactorChart: null
};

// ==========================================
// IndexedDB Image Storage Utility
// ==========================================

/**
 * ImageStorage - Manages image blobs in IndexedDB
 * Stores images efficiently as blobs instead of base64 in localStorage
 */
class ImageStorage {
  constructor() {
    this.dbName = 'SmartzProdDB';
    this.dbVersion = 1;
    this.storeName = 'images';
    this.db = null;
  }

  /**
   * Initialize IndexedDB connection
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          objectStore.createIndex('issueId', 'issueId', { unique: false });
          console.log('✅ IndexedDB object store created');
        }
      };
    });
  }

  /**
   * Store an image blob in IndexedDB
   * @param {Blob} blob - Image blob
   * @param {string} issueId - Associated issue ID
   * @returns {Promise<string>} Image ID
   */
  async storeImage(blob, issueId = null) {
    await this.init();

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData = {
      id: imageId,
      blob: blob,
      mimeType: blob.type,
      size: blob.size,
      issueId: issueId,
      uploadedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.add(imageData);

      request.onsuccess = () => {
        console.log(`✅ Image stored: ${imageId} (${(blob.size / 1024).toFixed(2)}KB)`);
        resolve(imageId);
      };

      request.onerror = () => {
        console.error('❌ Failed to store image:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve an image blob from IndexedDB
   * @param {string} imageId - Image ID
   * @returns {Promise<Object>} Image data with blob
   */
  async getImage(imageId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(imageId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error(`Image not found: ${imageId}`));
        }
      };

      request.onerror = () => {
        console.error('❌ Failed to get image:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get multiple images by IDs
   * @param {string[]} imageIds - Array of image IDs
   * @returns {Promise<Object[]>} Array of image data
   */
  async getImages(imageIds) {
    const promises = imageIds.map(id => this.getImage(id).catch(err => {
      console.warn(`⚠️ Failed to load image ${id}:`, err);
      return null;
    }));
    const results = await Promise.all(promises);
    return results.filter(img => img !== null);
  }

  /**
   * Delete an image from IndexedDB
   * @param {string} imageId - Image ID
   * @returns {Promise<void>}
   */
  async deleteImage(imageId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(imageId);

      request.onsuccess = () => {
        console.log(`✅ Image deleted: ${imageId}`);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to delete image:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete multiple images
   * @param {string[]} imageIds - Array of image IDs
   * @returns {Promise<void>}
   */
  async deleteImages(imageIds) {
    const promises = imageIds.map(id => this.deleteImage(id).catch(err => {
      console.warn(`⚠️ Failed to delete image ${id}:`, err);
    }));
    await Promise.all(promises);
  }

  /**
   * Get all images for a specific issue
   * @param {string} issueId - Issue ID
   * @returns {Promise<Object[]>} Array of image data
   */
  async getImagesByIssueId(issueId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('issueId');
      const request = index.getAll(issueId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('❌ Failed to get images by issue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all image IDs
   * @returns {Promise<string[]>} Array of all image IDs
   */
  async getAllImageIds() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('❌ Failed to get all image IDs:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage usage info
   * @returns {Promise<Object>} Usage statistics
   */
  async getStorageInfo() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const images = request.result || [];
        const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);

        resolve({
          count: images.length,
          totalBytes: totalSize,
          totalKB: (totalSize / 1024).toFixed(2),
          totalMB: (totalSize / (1024 * 1024)).toFixed(2)
        });
      };

      request.onerror = () => {
        console.error('❌ Failed to get storage info:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Export all images as a JSON-serializable array (for backup)
   * Converts blobs to base64 for export
   * @returns {Promise<Object[]>} Array of image data with base64
   */
  async exportImages() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onsuccess = async () => {
        const images = request.result || [];

        // Convert blobs to base64 for serialization
        const exportData = await Promise.all(images.map(async (img) => {
          const base64 = await this.blobToBase64(img.blob);
          return {
            id: img.id,
            base64: base64,
            mimeType: img.mimeType,
            size: img.size,
            issueId: img.issueId,
            uploadedAt: img.uploadedAt
          };
        }));

        resolve(exportData);
      };

      request.onerror = () => {
        console.error('❌ Failed to export images:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Import images from backup data
   * @param {Object[]} imagesData - Array of image data with base64
   * @returns {Promise<void>}
   */
  async importImages(imagesData) {
    await this.init();

    const promises = imagesData.map(async (imgData) => {
      try {
        // Convert base64 back to blob
        const blob = await this.base64ToBlob(imgData.base64, imgData.mimeType);

        const imageData = {
          id: imgData.id,
          blob: blob,
          mimeType: imgData.mimeType,
          size: imgData.size,
          issueId: imgData.issueId,
          uploadedAt: imgData.uploadedAt
        };

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([this.storeName], 'readwrite');
          const objectStore = transaction.objectStore(this.storeName);
          const request = objectStore.put(imageData);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error(`⚠️ Failed to import image ${imgData.id}:`, error);
      }
    });

    await Promise.all(promises);
    console.log(`✅ Imported ${imagesData.length} images to IndexedDB`);
  }

  /**
   * Clear all images from storage
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('✅ All images cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to clear images:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Convert Blob to Base64 string
   * @param {Blob} blob - Blob to convert
   * @returns {Promise<string>} Base64 string
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert Base64 string to Blob
   * @param {string} base64 - Base64 string
   * @param {string} mimeType - MIME type
   * @returns {Promise<Blob>} Blob object
   */
  base64ToBlob(base64, mimeType) {
    return fetch(base64)
      .then(res => res.blob())
      .then(blob => new Blob([blob], { type: mimeType }));
  }
}

// Initialize global ImageStorage instance
const imageStorage = new ImageStorage();

// ==========================================
// Issue Options Data Structure
// ==========================================
const DELAY_OPTIONS = {
  'D0': { label: 'Tidak Ada', sub: [] },
  'D1': { label: 'P2H', sub: [] },
  'D2': {
    label: 'Fuel & Lube', sub: [
      { code: 'A03', label: 'Fuel truck B/D, Tunggu Fuel Truck Pengganti' },
      { code: 'A04', label: 'Fuel Truck Habis Stock' },
      { code: 'A05', label: 'Driver Fuel Truck Absen, Tunggu Driver Lain' },
      { code: 'A06', label: 'Fuelman Absen, Tunggu Fuelman Lain' },
      { code: 'A07', label: 'Problem Maintank' },
      { code: 'A11', label: 'Tunggu Waktu Pengisian Fuel (Refuelling)' },
      { code: 'A12', label: 'Tunggu Lube-Car' }
    ]
  },
  'D3': { label: 'Tyre Check', sub: [] },
  'D4': {
    label: 'Move Eq/Pindah', sub: [
      { code: 'B01', label: 'Material Habis, Pindah Front' },
      { code: 'B05', label: 'Front Lembek, Pindah Front' },
      { code: 'B20', label: 'Unit Stop Saat Travel Pasca Service' },
      { code: 'B21', label: 'Unit Travel dari Front ke Parkiran' },
      { code: 'B11', label: 'Setelah Unit Service (Ready), dibawa ke PIT' },
      { code: 'B16', label: 'Pindah ke PIT Lain' }
    ]
  },
  'D5': {
    label: 'Wait Eq.', sub: [
      { code: 'C59', label: 'Tunggu DT, Front Crowded Dengan Batubara' },
      { code: 'C60', label: 'Tunggu DT : DT cek fatique' },
      { code: 'C40', label: 'Tunggu Perbaikan Front' },
      { code: 'C39', label: 'Tunggu Ripping Dozing' },
      { code: 'C61', label: 'Tunggu Dozer (Dozer KPP Breakdown)' },
      { code: 'C62', label: 'Tunggu Dozer (Dozer Subcont Breakdown)' },
      { code: 'C08', label: 'Tunggu DT, DT Breakdown' },
      { code: 'C09', label: 'Tunggu DT, DT Kurang (No Operator)' },
      { code: 'C20', label: 'Tunggu DT (DT Refuelling)' },
      { code: 'C32', label: 'Tunggu DT (Disposal Crowded)' },
      { code: 'C22', label: 'Tunggu DT : jarak disposal jauh' },
      { code: 'C23', label: 'Tunggu DT : jarak berubah, ada perpindahan jalan/rute' },
      { code: 'C27', label: 'Tunggu DT : DT pindah prioritas ke fleet lain' },
      { code: 'C25', label: 'Tunggu DT : DT Amblas/BD' },
      { code: 'C42', label: 'Tunggu Perbaikan Disposal' },
      { code: 'C63', label: 'Tunggu Dozer Travel' },
      { code: 'C64', label: 'Tunggu DT : Problem Speed' },
      { code: 'C65', label: 'Tunggu DT : Problem Speed, Jalan Bergelombang' },
      { code: 'C66', label: 'Tunggu DT : Problem Speed, Jalan Sempit' },
      { code: 'C67', label: 'Tunggu Material Bagus (Front)' },
      { code: 'C68', label: 'Tunggu Material Bagus (Disposal)' },
      { code: 'C69', label: 'Tunggu DT : Problem Speed, Jalan Crowded dengan Front Coal' },
      { code: 'C21', label: 'Tunggu DT : DT masuk pit stop' },
      { code: 'C57', label: 'Tunggu Evakuasi Unit Lain' },
      { code: 'C16', label: 'Tunggu DT: Operator Fatigue' },
      { code: 'C37', label: 'Tunggu DT : Pembersihan vessel krn material lengket' }
    ]
  },
  'D6': { label: 'Wait Engineering', sub: [] },
  'D7': {
    label: 'Wait Blast', sub: [
      { code: 'E01', label: 'Proses evakuasi pra-blasting' },
      { code: 'E09', label: 'Proses blasting' },
      { code: 'E02', label: 'Proses evakuasi pasca blasting' }
    ]
  },
  'D8': { label: 'Clean Eq.', sub: [] },
  'D9': { label: 'Meal & Rest', sub: [] },
  'D10': {
    label: 'Safety Check', sub: [
      { code: 'F03', label: 'Stop karena Safety Check' },
      { code: 'F06', label: 'Stretching' }
    ]
  },
  'D11': { label: 'Request', sub: [] },
  'D12': {
    label: 'Wait Opt.', sub: [
      { code: 'H01', label: 'Tidak Ada Operator' },
      { code: 'H02', label: 'Tunggu Operator' }
    ]
  },
  'D13': { label: 'Shift Change', sub: [] },
  'D14': { label: 'Dusty', sub: [] },
  'D15': { label: 'Sholat', sub: [] },
  'D16': { label: 'Pit Stop', sub: [] },
  'D17': { label: 'Others', sub: [] }
};

const PRODUCTIVITY_OPTIONS = {
  '0': { label: 'Tidak Ada', sub: [] },
  '1': {
    label: 'Problem di Front', sub: [
      'Double Bench Loading',
      'Drop Cut',
      'Equipment Problem',
      'Front Menanjak',
      'Front Berdebu',
      'Front Crowded',
      'Front Lembek',
      'Front Licin/Berair',
      'Front Sempit',
      'Back Loading',
      'General Parit',
      'Lubang Blasting (Crater)',
      'General Slope',
      'Geser Front (jarak<50m)',
      'Single Side Loading',
      'Skill Operator',
      'Start Front',
      'Top Loading',
      'Tunggu Ripping',
      'Perbaikan Front',
      'Pindah Front (>50 m)'
    ]
  },
  '2': {
    label: 'Problem di Jalan', sub: [
      'Jalan Berdebu',
      'Jalan Bergelombang',
      'Jalan Berkabut',
      'Jalan Crowded',
      'Jalan Licin',
      'Jalan Rusak',
      'Jalan Sempit',
      'Perbaikan Jalan'
    ]
  },
  '3': {
    label: 'Problem Material', sub: [
      'Material Boulder',
      'Material Keras - Blast',
      'Material Keras - Blasting - Ripping',
      'Material Keras - Non Blasting - Non Ripping (Free Dig)',
      'Material Keras - Non Blasting - Ripping',
      'Material Lumpur',
      'Material Tipis',
      'Minimum Stock Material (Mencangkul)'
    ]
  },
  '4': { label: 'Other', sub: [] }
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
  setupIssueModal(); // New: Setup issue reporting modal
  renderIssuesTable(); // Render issues log table
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

  // Date filter cascading dropdowns
  const filterYear = document.getElementById('filterYear');
  const filterMonth = document.getElementById('filterMonth');
  const filterDay = document.getElementById('filterDay');

  filterYear.addEventListener('change', function () {
    populateFilterMonths();
    applyFilters();
  });

  filterMonth.addEventListener('change', function () {
    populateFilterDays();
    applyFilters();
  });

  filterDay.addEventListener('change', applyFilters);

  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterNama').value = '';
    document.getElementById('filterNRP').value = '';
    document.getElementById('filterExcavator').value = '';
    filterYear.value = '';
    filterMonth.value = '';
    filterMonth.disabled = true;
    filterDay.value = '';
    filterDay.disabled = true;
    applyFilters();
  });

  // Export buttons
  document.getElementById('btnExportProductivityExcel').addEventListener('click', () => exportToExcel('productivity'));
  document.getElementById('btnExportMatchFactorExcel').addEventListener('click', () => exportToExcel('matchFactor'));
  document.getElementById('btnExportProductivityPDF').addEventListener('click', () => exportToPDF('productivity'));
  document.getElementById('btnExportMatchFactorPDF').addEventListener('click', () => exportToPDF('matchFactor'));

  // WhatsApp Share buttons
  document.getElementById('btnShareProductivityWhatsApp').addEventListener('click', () => sharePDFToWhatsApp('productivity'));
  document.getElementById('btnShareMatchFactorWhatsApp').addEventListener('click', () => sharePDFToWhatsApp('matchFactor'));

  // Backup/Restore buttons
  document.getElementById('btnBackupData').addEventListener('click', backupData);
  document.getElementById('btnRestoreData').addEventListener('click', () => {
    document.getElementById('restoreFileInput').click();
  });
  document.getElementById('restoreFileInput').addEventListener('change', handleRestoreFile);
  document.getElementById('btnClearData').addEventListener('click', clearAllData);

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
  validateInput('namaOperator', (val) => val.trim().length > 0);
  validateInput('jenisMaterial', (val) => val.trim().length > 0);

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

  validateInput('kapasitas', (val) => {
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
// Issue Modal Setup & Handlers
// ==========================================
// ===== HELPER FUNCTIONS FOR FORMATTING MULTIPLE DELAYS/PRODUCTIVITIES =====
function getIssueDelays(issue) {
  // Return delays array with backward compatibility
  return issue.delays || (issue.delay ? [issue.delay] : []);
}

function getIssueProductivities(issue) {
  // Return productivities array with backward compatibility
  return issue.productivities || (issue.productivity ? [issue.productivity] : []);
}

function formatDelaysHTML(issue, separator = '<br>') {
  const delays = getIssueDelays(issue);
  if (delays.length === 0) return '<span class="text-gray-400">Tidak ada</span>';

  return delays.map(delay => {
    let html = `<div class="font-semibold text-red-700">${delay.mainCode}: ${delay.mainLabel}</div>`;
    if (delay.subCode && delay.subLabel) {
      html += `<div class="text-gray-600 mt-1">${delay.subCode} - ${delay.subLabel}</div>`;
    }
    if (delay.customText) {
      html += `<div class="text-gray-500 italic mt-1">${delay.customText}</div>`;
    }
    return html;
  }).join(separator);
}

function formatProductivitiesHTML(issue, separator = '<br>') {
  const productivities = getIssueProductivities(issue);
  if (productivities.length === 0) return '<span class="text-gray-400">Tidak ada</span>';

  return productivities.map(prod => {
    let html = `<div class="font-semibold text-orange-700">Kat. ${prod.mainCode}: ${prod.mainLabel}</div>`;
    if (prod.subOption) {
      html += `<div class="text-gray-600 mt-1">${prod.subOption}</div>`;
    }
    if (prod.customText) {
      html += `<div class="text-gray-500 italic mt-1">${prod.customText}</div>`;
    }
    return html;
  }).join(separator);
}

function formatDelaysText(issue, separator = '\n') {
  const delays = getIssueDelays(issue);
  if (delays.length === 0) return 'Tidak ada';

  return delays.map(delay => {
    let text = `${delay.mainCode} - ${delay.mainLabel}`;
    if (delay.subCode && delay.subLabel) {
      text += ` | ${delay.subCode} - ${delay.subLabel}`;
    }
    if (delay.customText) {
      text += ` | ${delay.customText}`;
    }
    return text;
  }).join(separator);
}

function formatProductivitiesText(issue, separator = '\n') {
  const productivities = getIssueProductivities(issue);
  if (productivities.length === 0) return 'Tidak ada';

  return productivities.map(prod => {
    let text = `Kat. ${prod.mainCode} - ${prod.mainLabel}`;
    if (prod.subOption) {
      text += ` | ${prod.subOption}`;
    }
    if (prod.customText) {
      text += ` | ${prod.customText}`;
    }
    return text;
  }).join(separator);
}

// ===== GLOBAL VARIABLES FOR DYNAMIC DELAY/PRODUCTIVITY ITEMS =====
let delayItems = [];
let productivityItems = [];
let delayItemsContainer;
let productivityItemsContainer;
let addDelayBtn;
let addProductivityBtn;

// ===== DYNAMIC DELAY ITEMS FUNCTIONS (GLOBAL) =====
function createDelayItem(index) {
  return {
    id: Date.now() + index,
    mainCode: '',
    subCode: '',
    customText: ''
  };
}

function renderDelayItems() {
  if (!delayItemsContainer) return;

  delayItemsContainer.innerHTML = '';
  delayItems.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'border-l-4 border-red-500 bg-red-50/50 rounded-lg p-3 sm:p-4 relative animate-fade-in';
    itemDiv.dataset.index = index;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center justify-between mb-3';

    const badge = document.createElement('span');
    badge.className = 'text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded';
    badge.textContent = `Delay #${index + 1}`;
    headerDiv.appendChild(badge);

    // Only show delete button if more than 1 item
    if (delayItems.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'text-red-500 hover:text-red-700 hover:bg-red-100 w-8 h-8 rounded-full transition-all';
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteBtn.onclick = () => removeDelayItem(index);
      headerDiv.appendChild(deleteBtn);
    }

    itemDiv.appendChild(headerDiv);

    // Main Category
    const mainDiv = document.createElement('div');
    mainDiv.className = 'mb-3';
    const mainLabel = document.createElement('label');
    mainLabel.className = 'block text-sm font-semibold text-gray-700 mb-2';
    mainLabel.textContent = 'Pilih Kategori Delay';
    const mainSelect = document.createElement('select');
    mainSelect.className = 'w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm bg-white';
    mainSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    Object.keys(DELAY_OPTIONS).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key === 'D0' ? 'Tidak Ada' : `${key} - ${DELAY_OPTIONS[key].label}`;
      if (item.mainCode === key) option.selected = true;
      mainSelect.appendChild(option);
    });
    mainSelect.onchange = (e) => handleDelayMainChange(index, e.target.value);
    mainDiv.appendChild(mainLabel);
    mainDiv.appendChild(mainSelect);
    itemDiv.appendChild(mainDiv);

    // Sub Category (shown if applicable)
    if (item.mainCode && DELAY_OPTIONS[item.mainCode]?.sub?.length > 0) {
      const subDiv = document.createElement('div');
      subDiv.className = 'mb-3';
      const subLabel = document.createElement('label');
      subLabel.className = 'block text-sm font-semibold text-gray-700 mb-2';
      subLabel.textContent = 'Pilih Sub-Kategori';
      const subSelect = document.createElement('select');
      subSelect.className = 'w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm bg-white';
      subSelect.innerHTML = '<option value="">-- Pilih Sub-Kategori --</option>';
      DELAY_OPTIONS[item.mainCode].sub.forEach(subOption => {
        const option = document.createElement('option');
        option.value = subOption.code;
        option.textContent = `${subOption.code} - ${subOption.label}`;
        if (item.subCode === subOption.code) option.selected = true;
        subSelect.appendChild(option);
      });
      subSelect.onchange = (e) => handleDelaySubChange(index, e.target.value);
      subDiv.appendChild(subLabel);
      subDiv.appendChild(subSelect);
      itemDiv.appendChild(subDiv);
    }

    // Custom Text (shown if "Others" selected)
    if (item.subCode && item.subCode.toLowerCase().includes('other')) {
      const customDiv = document.createElement('div');
      customDiv.className = 'mb-2';
      const customLabel = document.createElement('label');
      customLabel.className = 'block text-sm font-semibold text-gray-700 mb-2';
      customLabel.textContent = 'Keterangan Detail';
      const customTextarea = document.createElement('textarea');
      customTextarea.className = 'w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm resize-none';
      customTextarea.rows = 2;
      customTextarea.placeholder = 'Masukkan keterangan detail...';
      customTextarea.value = item.customText || '';
      customTextarea.oninput = (e) => {
        delayItems[index].customText = e.target.value;
      };
      customDiv.appendChild(customLabel);
      customDiv.appendChild(customTextarea);
      itemDiv.appendChild(customDiv);
    }

    delayItemsContainer.appendChild(itemDiv);
  });
}

function handleDelayMainChange(index, value) {
  delayItems[index].mainCode = value;
  delayItems[index].subCode = '';
  delayItems[index].customText = '';
  renderDelayItems();
}

function handleDelaySubChange(index, value) {
  delayItems[index].subCode = value;
  if (!value.toLowerCase().includes('other')) {
    delayItems[index].customText = '';
  }
  renderDelayItems();
}

function addDelayItem() {
  delayItems.push(createDelayItem(delayItems.length));
  renderDelayItems();
}

function removeDelayItem(index) {
  if (delayItems.length <= 1) {
    showAlert('Minimal harus ada 1 Delay Problem!', 'warning');
    return;
  }
  delayItems.splice(index, 1);
  renderDelayItems();
}

// ===== DYNAMIC PRODUCTIVITY ITEMS FUNCTIONS (GLOBAL) =====
function createProductivityItem(index) {
  return {
    id: Date.now() + index,
    mainCode: '',
    subOption: '',
    customText: ''
  };
}

function renderProductivityItems() {
  if (!productivityItemsContainer) return;

  productivityItemsContainer.innerHTML = '';
  productivityItems.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'border-l-4 border-orange-500 bg-orange-50/50 rounded-lg p-3 sm:p-4 relative animate-fade-in';
    itemDiv.dataset.index = index;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center justify-between mb-3';

    const badge = document.createElement('span');
    badge.className = 'text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded';
    badge.textContent = `Productivity #${index + 1}`;
    headerDiv.appendChild(badge);

    // Only show delete button if more than 1 item
    if (productivityItems.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'text-orange-600 hover:text-orange-700 hover:bg-orange-100 w-8 h-8 rounded-full transition-all';
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteBtn.onclick = () => removeProductivityItem(index);
      headerDiv.appendChild(deleteBtn);
    }

    itemDiv.appendChild(headerDiv);

    // Main Category
    const mainDiv = document.createElement('div');
    mainDiv.className = 'mb-3';
    const mainLabel = document.createElement('label');
    mainLabel.className = 'block text-sm font-semibold text-gray-700 mb-2';
    mainLabel.textContent = 'Pilih Kategori Productivity';
    const mainSelect = document.createElement('select');
    mainSelect.className = 'w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm bg-white';
    mainSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    Object.keys(PRODUCTIVITY_OPTIONS).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key === '0' ? 'Tidak Ada' : `Kategori ${key}: ${PRODUCTIVITY_OPTIONS[key].label}`;
      if (item.mainCode === key) option.selected = true;
      mainSelect.appendChild(option);
    });
    mainSelect.onchange = (e) => handleProductivityMainChange(index, e.target.value);
    mainDiv.appendChild(mainLabel);
    mainDiv.appendChild(mainSelect);
    itemDiv.appendChild(mainDiv);

    // Sub Category (shown if applicable)
    if (item.mainCode && PRODUCTIVITY_OPTIONS[item.mainCode]?.sub?.length > 0) {
      const subDiv = document.createElement('div');
      subDiv.className = 'mb-3';
      const subLabel = document.createElement('label');
      subLabel.className = 'block text-sm font-semibold text-gray-700 mb-2';
      subLabel.textContent = 'Pilih Sub-Kategori';
      const subSelect = document.createElement('select');
      subSelect.className = 'w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm bg-white';
      subSelect.innerHTML = '<option value="">-- Pilih Sub-Kategori --</option>';
      PRODUCTIVITY_OPTIONS[item.mainCode].sub.forEach(subOption => {
        const option = document.createElement('option');
        option.value = subOption;
        option.textContent = subOption;
        if (item.subOption === subOption) option.selected = true;
        subSelect.appendChild(option);
      });
      subSelect.onchange = (e) => handleProductivitySubChange(index, e.target.value);
      subDiv.appendChild(subLabel);
      subDiv.appendChild(subSelect);
      itemDiv.appendChild(subDiv);
    }

    // Custom Text (shown if "Other" selected)
    if (item.subOption && item.subOption.toLowerCase() === 'other') {
      const customDiv = document.createElement('div');
      customDiv.className = 'mb-2';
      const customLabel = document.createElement('label');
      customLabel.className = 'block text-sm font-semibold text-gray-700 mb-2';
      customLabel.textContent = 'Keterangan Detail';
      const customTextarea = document.createElement('textarea');
      customTextarea.className = 'w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm resize-none';
      customTextarea.rows = 2;
      customTextarea.placeholder = 'Masukkan keterangan detail...';
      customTextarea.value = item.customText || '';
      customTextarea.oninput = (e) => {
        productivityItems[index].customText = e.target.value;
      };
      customDiv.appendChild(customLabel);
      customDiv.appendChild(customTextarea);
      itemDiv.appendChild(customDiv);
    }

    productivityItemsContainer.appendChild(itemDiv);
  });
}

function handleProductivityMainChange(index, value) {
  productivityItems[index].mainCode = value;
  productivityItems[index].subOption = '';
  productivityItems[index].customText = '';
  renderProductivityItems();
}

function handleProductivitySubChange(index, value) {
  productivityItems[index].subOption = value;
  if (value.toLowerCase() !== 'other') {
    productivityItems[index].customText = '';
  }
  renderProductivityItems();
}

function addProductivityItem() {
  productivityItems.push(createProductivityItem(productivityItems.length));
  renderProductivityItems();
}

function removeProductivityItem(index) {
  if (productivityItems.length <= 1) {
    showAlert('Minimal harus ada 1 Productivity Problem!', 'warning');
    return;
  }
  productivityItems.splice(index, 1);
  renderProductivityItems();
}

function setupIssueModal() {
  const modal = document.getElementById('issueModal');
  const btnAddIssue = document.getElementById('btnAddIssue');
  const closeBtn = document.getElementById('closeIssueModalBtn');
  const cancelBtn = document.getElementById('cancelIssueBtn');
  const saveBtn = document.getElementById('saveIssueBtn');

  // Excavator select
  const excavatorSelect = document.getElementById('issueExcavatorSelect');
  const dateContainer = document.getElementById('issueDateContainer');
  const dateSelect = document.getElementById('issueDateSelect');

  // Set global container references
  delayItemsContainer = document.getElementById('delayItemsContainer');
  addDelayBtn = document.getElementById('addDelayBtn');
  productivityItemsContainer = document.getElementById('productivityItemsContainer');
  addProductivityBtn = document.getElementById('addProductivityBtn');

  // Photo elements
  const photoBtn = document.getElementById('issuePhotoBtn');
  const photoInput = document.getElementById('issuePhotoInput');
  const photoPreviewContainer = document.getElementById('issuePhotoPreviewContainer');
  const photoPreview = document.getElementById('issuePhotoPreview');
  const photoRemoveBtn = document.getElementById('issuePhotoRemoveBtn');

  // Follow-up photo elements
  const followUpPhotoBtn = document.getElementById('followUpPhotoBtn');
  const followUpPhotoInput = document.getElementById('followUpPhotoInput');
  const followUpPhotoPreviewContainer = document.getElementById('followUpPhotoPreviewContainer');

  // Additional notes
  const additionalNotes = document.getElementById('issueAdditionalNotes');

  let currentPhotoBase64 = null;

  // Note: Dynamic delay/productivity functions are now global (defined above setupIssueModal)

  // Event listeners for add buttons
  addDelayBtn.addEventListener('click', addDelayItem);
  addProductivityBtn.addEventListener('click', addProductivityItem);

  // Populate Excavator Options
  function populateExcavatorOptions() {
    excavatorSelect.innerHTML = '<option value="">-- Pilih Excavator --</option>';

    // Get unique excavators from both productivity and match factor data
    const excavators = new Set();
    AppState.productivityData.forEach(item => excavators.add(item.noExcavator));
    AppState.matchFactorData.forEach(item => excavators.add(item.noExcavator));

    const sortedExcavators = Array.from(excavators).sort();
    sortedExcavators.forEach(ex => {
      const option = document.createElement('option');
      option.value = ex;
      option.textContent = ex;
      excavatorSelect.appendChild(option);
    });
  }

  // Excavator Selection Change Handler
  excavatorSelect.addEventListener('change', function () {
    const selectedExcavator = this.value;
    populateDateOptions(selectedExcavator);
  });

  // Photo Upload Handler - Multiple Photos Support
  let currentPhotoBlobs = []; // Array of { blob: Blob, preview: string }
  let followUpPhotoBlobs = []; // Array of { blob: Blob, preview: string } for follow-up section

  photoBtn.addEventListener('click', function () {
    photoInput.click();
  });

  photoInput.addEventListener('change', async function (e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Process each file
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAlert(`File "${file.name}" bukan gambar, dilewati!`, 'warning');
        continue;
      }

      // Validate file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        showAlert(`File "${file.name}" terlalu besar (max 5MB), dilewati!`, 'warning');
        continue;
      }

      try {
        // Read and compress image
        const compressedBlob = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedBlob);

        // Add to current photos
        currentPhotoBlobs.push({
          blob: compressedBlob,
          preview: previewUrl,
          name: file.name
        });

        // Show compression info
        const originalSize = (file.size / 1024).toFixed(2);
        const compressedSize = (compressedBlob.size / 1024).toFixed(2);
        console.log(`📸 Image compressed: ${file.name} ${originalSize}KB → ${compressedSize}KB`);
      } catch (error) {
        console.error('Failed to compress image:', error);
        showAlert(`Gagal memproses gambar "${file.name}"`, 'error');
      }
    }

    // Update preview
    updatePhotoPreview();

    // Clear input to allow re-selecting the same files
    photoInput.value = '';
  });

  /**
   * Compress image file to JPEG blob
   * @param {File} file - Image file
   * @returns {Promise<Blob>} Compressed JPEG blob
   */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (event) {
        const img = new Image();

        img.onload = function () {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 1200px width/height)
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress (0.7 quality = ~70% compression)
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.7);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Update photo preview grid
   */
  function updatePhotoPreview() {
    const grid = document.getElementById('issuePhotoPreviewGrid');
    const badge = document.getElementById('photoCountBadge');

    if (currentPhotoBlobs.length === 0) {
      photoPreviewContainer.classList.add('hidden');
      badge.classList.add('hidden');
      grid.innerHTML = '';
      return;
    }

    photoPreviewContainer.classList.remove('hidden');
    badge.classList.remove('hidden');
    badge.textContent = currentPhotoBlobs.length;

    // Clear grid
    grid.innerHTML = '';

    // Add each photo preview
    currentPhotoBlobs.forEach((photo, index) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'relative bg-gray-50 rounded-lg overflow-hidden border-2 border-purple-200 group';
      previewItem.innerHTML = `
        <img src="${photo.preview}" alt="Preview ${index + 1}" class="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity" data-lightbox-index="${index}" />
        <button
          type="button"
          data-index="${index}"
          class="photo-remove-btn absolute top-2 right-2 w-8 h-8 min-w-[2rem] min-h-[2rem] bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 flex-shrink-0"
          style="aspect-ratio: 1/1;">
          <i class="fas fa-times text-xs"></i>
        </button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
          ${(photo.blob.size / 1024).toFixed(1)}KB
        </div>
      `;
      grid.appendChild(previewItem);
    });

    // Add remove button listeners
    grid.querySelectorAll('.photo-remove-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const index = parseInt(this.dataset.index);
        removePhoto(index);
      });
    });

    // Add lightbox click listeners to images
    grid.querySelectorAll('img[data-lightbox-index]').forEach(img => {
      img.addEventListener('click', function () {
        const index = parseInt(this.dataset.lightboxIndex);
        openPhotoLightbox(index, currentPhotoBlobs);
      });
    });
  }

  /**
   * Remove a photo from the list
   * @param {number} index - Photo index
   */
  function removePhoto(index) {
    if (index >= 0 && index < currentPhotoBlobs.length) {
      // Revoke object URL to free memory
      URL.revokeObjectURL(currentPhotoBlobs[index].preview);

      // Remove from array
      currentPhotoBlobs.splice(index, 1);

      // Update preview
      updatePhotoPreview();
    }
  }

  /**
   * Set current photo blobs (for editing)
   * @param {Array} photos - Array of photo objects
   */
  window.setCurrentPhotoBlobs = function (photos) {
    // Clear existing photos
    currentPhotoBlobs.forEach(photo => {
      URL.revokeObjectURL(photo.preview);
    });

    // Set new photos
    currentPhotoBlobs = photos;
    updatePhotoPreview();
  };

  /**
   * Open photo lightbox for preview
   * @param {number} index - Photo index
   * @param {Array} photos - Array of photo objects with {blob, preview, name}
   */
  function openPhotoLightbox(index, photos) {
    let currentIndex = index;
    const totalPhotos = photos.length;

    // Create lightbox modal
    const lightbox = document.createElement('div');
    lightbox.id = 'photoLightbox';
    lightbox.className = 'fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-0';

    lightbox.innerHTML = `
      <div class="relative w-full h-full flex flex-col">
        <!-- Header with Close Button -->
        <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/60 to-transparent">
          <div class="text-white">
            <p class="text-sm sm:text-base font-semibold" id="lightboxFileName">${photos[currentIndex].name}</p>
            <p class="text-xs sm:text-sm text-gray-300 mt-1">
              <span id="lightboxFileSize">${(photos[currentIndex].blob.size / 1024).toFixed(1)}KB</span>
              ${totalPhotos > 1 ? ` • <span id="lightboxCounter">${currentIndex + 1}</span> / ${totalPhotos}` : ''}
            </p>
          </div>
          <button
            id="closeLightbox"
            class="w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:rotate-90 flex-shrink-0 ml-4"
            style="aspect-ratio: 1/1;">
            <i class="fas fa-times text-white text-lg sm:text-xl"></i>
          </button>
        </div>

        <!-- Main Image Container -->
        <div class="flex-1 flex items-center justify-center px-4 sm:px-16 py-20 sm:py-24">
          ${totalPhotos > 1 ? `
          <!-- Previous Button -->
          <button
            id="lightboxPrev"
            class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10 flex-shrink-0 ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
            style="aspect-ratio: 1/1;">
            <i class="fas fa-chevron-left text-white text-lg sm:text-xl"></i>
          </button>
          ` : ''}

          <!-- Image -->
          <div class="max-w-full max-h-full flex items-center justify-center">
            <img 
              id="lightboxImage" 
              src="${photos[currentIndex].preview}" 
              alt="Photo ${currentIndex + 1}" 
              class="max-w-full max-h-[70vh] sm:max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl" />
          </div>

          ${totalPhotos > 1 ? `
          <!-- Next Button -->
          <button
            id="lightboxNext"
            class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10 flex-shrink-0 ${currentIndex === totalPhotos - 1 ? 'opacity-50 cursor-not-allowed' : ''}"
            style="aspect-ratio: 1/1;">
            <i class="fas fa-chevron-right text-white text-lg sm:text-xl"></i>
          </button>
          ` : ''}
        </div>

        <!-- Footer hint -->
        <div class="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <p class="text-center text-xs sm:text-sm text-gray-300">
            <kbd class="px-2 py-1 bg-white/10 rounded text-white font-mono text-xs">ESC</kbd> untuk keluar
            ${totalPhotos > 1 ? ` • <kbd class="px-2 py-1 bg-white/10 rounded text-white font-mono text-xs">← →</kbd> navigasi` : ''}
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(lightbox);

    // Update photo display
    function updateLightboxPhoto() {
      const img = lightbox.querySelector('#lightboxImage');
      const counter = lightbox.querySelector('#lightboxCounter');
      const fileName = lightbox.querySelector('#lightboxFileName');
      const fileSize = lightbox.querySelector('#lightboxFileSize');
      const prevBtn = lightbox.querySelector('#lightboxPrev');
      const nextBtn = lightbox.querySelector('#lightboxNext');

      img.src = photos[currentIndex].preview;
      img.alt = `Photo ${currentIndex + 1}`;
      if (counter) counter.textContent = currentIndex + 1;
      if (fileName) fileName.textContent = photos[currentIndex].name;
      if (fileSize) fileSize.textContent = `${(photos[currentIndex].blob.size / 1024).toFixed(1)}KB`;

      // Update button states
      if (prevBtn) {
        if (currentIndex === 0) {
          prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }

      if (nextBtn) {
        if (currentIndex === totalPhotos - 1) {
          nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    }

    // Close lightbox
    function closeLightbox() {
      lightbox.remove();
      document.removeEventListener('keydown', keyHandler);
    }

    // Keyboard navigation
    function keyHandler(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeLightbox();
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        currentIndex--;
        updateLightboxPhoto();
      }
      if (e.key === 'ArrowRight' && currentIndex < totalPhotos - 1) {
        e.preventDefault();
        currentIndex++;
        updateLightboxPhoto();
      }
    }

    // Event listeners
    lightbox.querySelector('#closeLightbox').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.id === 'lightboxImage') {
        // Click on backdrop or image to close
        closeLightbox();
      }
    });

    if (totalPhotos > 1) {
      const prevBtn = lightbox.querySelector('#lightboxPrev');
      const nextBtn = lightbox.querySelector('#lightboxNext');

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
          currentIndex--;
          updateLightboxPhoto();
        }
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex < totalPhotos - 1) {
          currentIndex++;
          updateLightboxPhoto();
        }
      });
    }

    document.addEventListener('keydown', keyHandler);
  }

  // Follow-up Photo Upload Handler - Multiple Photos Support
  followUpPhotoBtn.addEventListener('click', function () {
    followUpPhotoInput.click();
  });

  followUpPhotoInput.addEventListener('change', async function (e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Process each file
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAlert(`File "${file.name}" bukan gambar, dilewati!`, 'warning');
        continue;
      }

      // Validate file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        showAlert(`File "${file.name}" terlalu besar (max 5MB), dilewati!`, 'warning');
        continue;
      }

      try {
        // Read and compress image
        const compressedBlob = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedBlob);

        // Add to follow-up photos
        followUpPhotoBlobs.push({
          blob: compressedBlob,
          preview: previewUrl,
          name: file.name
        });

        // Show compression info
        const originalSize = (file.size / 1024).toFixed(2);
        const compressedSize = (compressedBlob.size / 1024).toFixed(2);
        console.log(`📸 Follow-up image compressed: ${file.name} ${originalSize}KB → ${compressedSize}KB`);
      } catch (error) {
        console.error('Failed to compress image:', error);
        showAlert(`Gagal memproses gambar "${file.name}"`, 'error');
      }
    }

    // Update preview
    updateFollowUpPhotoPreview();

    // Clear input to allow re-selecting the same files
    followUpPhotoInput.value = '';
  });

  /**
   * Update follow-up photo preview grid
   */
  function updateFollowUpPhotoPreview() {
    const grid = document.getElementById('followUpPhotoPreviewGrid');
    const badge = document.getElementById('followUpPhotoCountBadge');

    if (followUpPhotoBlobs.length === 0) {
      followUpPhotoPreviewContainer.classList.add('hidden');
      badge.classList.add('hidden');
      grid.innerHTML = '';
      return;
    }

    followUpPhotoPreviewContainer.classList.remove('hidden');
    badge.classList.remove('hidden');
    badge.textContent = followUpPhotoBlobs.length;

    // Clear grid
    grid.innerHTML = '';

    // Add each photo preview
    followUpPhotoBlobs.forEach((photo, index) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'relative bg-gray-50 rounded-lg overflow-hidden border-2 border-blue-200 group';
      previewItem.innerHTML = `
        <img src="${photo.preview}" alt="Preview ${index + 1}" class="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity" data-lightbox-index="${index}" />
        <button
          type="button"
          data-index="${index}"
          class="followup-photo-remove-btn absolute top-2 right-2 w-8 h-8 min-w-[2rem] min-h-[2rem] bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 flex-shrink-0"
          style="aspect-ratio: 1/1;">
          <i class="fas fa-times text-xs"></i>
        </button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
          ${(photo.blob.size / 1024).toFixed(1)}KB
        </div>
      `;
      grid.appendChild(previewItem);
    });

    // Add remove button listeners
    grid.querySelectorAll('.followup-photo-remove-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const index = parseInt(this.dataset.index);
        removeFollowUpPhoto(index);
      });
    });

    // Add lightbox click listeners to images
    grid.querySelectorAll('img[data-lightbox-index]').forEach(img => {
      img.addEventListener('click', function () {
        const index = parseInt(this.dataset.lightboxIndex);
        openPhotoLightbox(index, followUpPhotoBlobs);
      });
    });
  }

  /**
   * Remove a follow-up photo from the list
   * @param {number} index - Photo index
   */
  function removeFollowUpPhoto(index) {
    if (index >= 0 && index < followUpPhotoBlobs.length) {
      // Revoke object URL to free memory
      URL.revokeObjectURL(followUpPhotoBlobs[index].preview);

      // Remove from array
      followUpPhotoBlobs.splice(index, 1);

      // Update preview
      updateFollowUpPhotoPreview();
    }
  }

  /**
   * Set current follow-up photo blobs (for editing)
   * @param {Array} photos - Array of photo objects
   */
  window.setFollowUpPhotoBlobs = function (photos) {
    // Clear existing photos
    followUpPhotoBlobs.forEach(photo => {
      URL.revokeObjectURL(photo.preview);
    });

    // Set new photos
    followUpPhotoBlobs = photos;
    updateFollowUpPhotoPreview();
  };

  // Open Modal
  function openIssueModal(preSelectedExcavator = null) {
    populateExcavatorOptions();

    // Initialize with one empty delay and one empty productivity item
    if (delayItems.length === 0) {
      delayItems = [createDelayItem(0)];
      renderDelayItems();
    }
    if (productivityItems.length === 0) {
      productivityItems = [createProductivityItem(0)];
      renderProductivityItems();
    }

    // Pre-select excavator if provided
    if (preSelectedExcavator) {
      excavatorSelect.value = preSelectedExcavator;
      // Trigger date population immediately for pre-selected excavator
      populateDateOptions(preSelectedExcavator);
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
      modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  // Global function to open modal with pre-selected excavator
  window.openIssueModalForExcavator = function (excavatorId) {
    openIssueModal(excavatorId);
  };

  // Close Modal
  function closeIssueModal() {
    modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    modal.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      resetIssueForm();
    }, 200);
  }

  // Reset Form
  function resetIssueForm() {
    // Clear edit state
    delete window.currentEditIssueIndex;

    // Reset modal title back to "Add"
    const modalTitle = modal.querySelector('h2');
    const modalSubtitle = modal.querySelector('p');
    const saveBtn = document.getElementById('saveIssueBtn');
    const saveBtnText = saveBtn?.querySelector('span');

    if (modalTitle) modalTitle.textContent = 'Tambah Catatan Problem';
    if (modalSubtitle) modalSubtitle.textContent = 'Dokumentasi masalah Delay & Productivity';
    if (saveBtnText) saveBtnText.textContent = 'Simpan Catatan';

    excavatorSelect.value = '';

    // Clear and hide date selector
    dateSelect.value = '';
    dateContainer.classList.add('hidden');

    // Reset delay and productivity arrays
    delayItems = [createDelayItem(0)];
    productivityItems = [createProductivityItem(0)];
    renderDelayItems();
    renderProductivityItems();

    // Clear photos
    currentPhotoBlobs.forEach(photo => {
      URL.revokeObjectURL(photo.preview); // Free memory
    });
    currentPhotoBlobs = [];
    updatePhotoPreview();

    // Clear follow-up photos
    followUpPhotoBlobs.forEach(photo => {
      URL.revokeObjectURL(photo.preview); // Free memory
    });
    followUpPhotoBlobs = [];
    updateFollowUpPhotoPreview();

    additionalNotes.value = '';
    document.getElementById('followUpNotes').value = '';
  }

  // Save Issue
  async function saveIssue() {
    const excavator = excavatorSelect.value;
    const selectedDate = dateSelect.value;
    const notes = additionalNotes.value.trim();
    const followUpNotes = document.getElementById('followUpNotes').value.trim();

    // Check if we're editing an existing issue
    const isEditing = typeof window.currentEditIssueIndex !== 'undefined';
    const editIndex = window.currentEditIssueIndex;

    // Validation: Must select excavator
    if (!excavator) {
      showAlert('Pilih Excavator terlebih dahulu!', 'error');
      return;
    }

    // Validation: Must select date
    if (!selectedDate) {
      showAlert('Pilih Tanggal terlebih dahulu!', 'error');
      return;
    }

    // Validation: At least one valid delay with mainCode
    const validDelays = delayItems.filter(item => item.mainCode);
    if (validDelays.length === 0) {
      showAlert('Minimal harus ada 1 Delay Problem yang diisi!', 'error');
      return;
    }

    // Validation: At least one valid productivity with mainCode
    const validProductivities = productivityItems.filter(item => item.mainCode);
    if (validProductivities.length === 0) {
      showAlert('Minimal harus ada 1 Productivity Problem yang diisi!', 'error');
      return;
    }

    // Build or update issue object
    let issue;

    if (isEditing) {
      // Update existing issue
      issue = AppState.issuesData[editIndex];

      // Delete old photos from IndexedDB if they exist
      if (issue.imageIds && issue.imageIds.length > 0) {
        try {
          await imageStorage.deleteImages(issue.imageIds);
          console.log(`✅ Deleted old photos from IndexedDB for issue ${issue.id}`);
        } catch (error) {
          console.warn('Failed to delete old photos:', error);
        }
      }

      // Delete old follow-up photos from IndexedDB if they exist
      if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
        try {
          await imageStorage.deleteImages(issue.followUpImageIds);
          console.log(`✅ Deleted old follow-up photos from IndexedDB for issue ${issue.id}`);
        } catch (error) {
          console.warn('Failed to delete old follow-up photos:', error);
        }
      }

      // Keep the original ID, but update timestamp if datetime changed
      const selectedDateTime = new Date(selectedDate);
      issue.excavator = excavator;
      issue.timestamp = selectedDateTime.toISOString(); // Update timestamp with selected datetime
      issue.imageIds = [];
      issue.followUpImageIds = [];
      issue.notes = notes;
      issue.followUpNotes = followUpNotes;
    } else {
      // Create new issue
      const issueId = Date.now();

      // Use the selected datetime directly (it already includes hours and minutes)
      const selectedDateTime = new Date(selectedDate);

      issue = {
        id: issueId,
        timestamp: selectedDateTime.toISOString(),
        excavator: excavator,
        delay: null,
        productivity: null,
        imageIds: [], // Store image IDs instead of base64
        followUpImageIds: [], // Store follow-up image IDs
        notes: notes,
        followUpNotes: followUpNotes
      };
    }

    // Process Delay Problems (multiple)
    issue.delays = validDelays.map(item => {
      const delayLabel = DELAY_OPTIONS[item.mainCode]?.label || '';
      let delaySubLabel = '';

      if (item.subCode) {
        const subOption = DELAY_OPTIONS[item.mainCode]?.sub?.find(s => s.code === item.subCode);
        delaySubLabel = subOption ? subOption.label : '';
      }

      return {
        mainCode: item.mainCode,
        mainLabel: delayLabel,
        subCode: item.subCode || null,
        subLabel: delaySubLabel || null,
        customText: item.customText || null
      };
    });

    // Process Productivity Problems (multiple)
    issue.productivities = validProductivities.map(item => {
      const productivityLabel = PRODUCTIVITY_OPTIONS[item.mainCode]?.label || '';

      return {
        mainCode: item.mainCode,
        mainLabel: productivityLabel,
        subOption: item.subOption || null,
        customText: item.customText || null
      };
    });

    // Backward compatibility: Keep first items as single delay/productivity
    issue.delay = issue.delays[0] || null;
    issue.productivity = issue.productivities[0] || null;

    // Store photos in IndexedDB
    if (currentPhotoBlobs.length > 0) {
      try {
        showAlert(`Menyimpan ${currentPhotoBlobs.length} foto ke IndexedDB...`, 'info');

        for (const photoData of currentPhotoBlobs) {
          const imageId = await imageStorage.storeImage(photoData.blob, issue.id.toString());
          issue.imageIds.push(imageId);
        }

        console.log(`✅ Stored ${currentPhotoBlobs.length} photos in IndexedDB for issue ${issue.id}`);
      } catch (error) {
        console.error('Failed to store photos:', error);
        showAlert('Gagal menyimpan foto! Data issue tetap disimpan.', 'warning');
      }
    }

    // Store follow-up photos in IndexedDB
    if (followUpPhotoBlobs.length > 0) {
      try {
        showAlert(`Menyimpan ${followUpPhotoBlobs.length} foto follow-up ke IndexedDB...`, 'info');

        for (const photoData of followUpPhotoBlobs) {
          const imageId = await imageStorage.storeImage(photoData.blob, issue.id.toString() + '_followup');
          issue.followUpImageIds.push(imageId);
        }

        console.log(`✅ Stored ${followUpPhotoBlobs.length} follow-up photos in IndexedDB for issue ${issue.id}`);
      } catch (error) {
        console.error('Failed to store follow-up photos:', error);
        showAlert('Gagal menyimpan foto follow-up! Data issue tetap disimpan.', 'warning');
      }
    }

    // Save to AppState
    if (!isEditing) {
      AppState.issuesData.push(issue);
    }
    // If editing, the issue is already updated in the array by reference

    saveToLocalStorage();

    const totalPhotos = issue.imageIds.length + (issue.followUpImageIds?.length || 0);
    const photoMsg = totalPhotos > 0 ? ` dengan ${totalPhotos} foto` : '';
    const action = isEditing ? 'diperbarui' : 'disimpan';
    showAlert(`Catatan problem${photoMsg} berhasil ${action}!`, 'success');

    // Clear edit state
    delete window.currentEditIssueIndex;

    closeIssueModal();

    // Update UI to show issues
    renderIssuesTable();
  }

  // Event Listeners
  if (btnAddIssue) btnAddIssue.addEventListener('click', () => openIssueModal());
  if (closeBtn) closeBtn.addEventListener('click', closeIssueModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeIssueModal);
  if (saveBtn) saveBtn.addEventListener('click', saveIssue);

  // ESC key to close - but not if lightbox is open
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      // Check if lightbox is open - if so, don't close the modal
      const lightbox = document.getElementById('photoLightbox');
      if (lightbox) {
        // Lightbox is open, let its own handler deal with ESC
        return;
      }
      closeIssueModal();
    }
  });

  // Click outside to close
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      closeIssueModal();
    }
  });
}

// ==========================================
// Date Filter Functions (Global Scope)
// ==========================================
// Populate filter year dropdown with available years from data
function populateFilterYears() {
  const filterYear = document.getElementById('filterYear');
  if (!filterYear) return;

  const years = new Set();

  // Collect years from all data sources
  AppState.productivityData.forEach(item => {
    const date = new Date(item.waktu);
    years.add(date.getFullYear());
  });

  AppState.matchFactorData.forEach(item => {
    const date = new Date(item.waktu);
    years.add(date.getFullYear());
  });

  AppState.issuesData.forEach(item => {
    const date = new Date(item.timestamp);
    years.add(date.getFullYear());
  });

  // Sort years descending (newest first)
  const sortedYears = Array.from(years).sort((a, b) => b - a);

  filterYear.innerHTML = '<option value="">-- Pilih Tahun --</option>';
  sortedYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    filterYear.appendChild(option);
  });
}

// Populate filter month dropdown based on selected year
function populateFilterMonths() {
  const filterYear = document.getElementById('filterYear');
  const filterMonth = document.getElementById('filterMonth');
  const filterDay = document.getElementById('filterDay');

  if (!filterYear || !filterMonth || !filterDay) return;

  const selectedYear = filterYear.value;

  if (!selectedYear) {
    filterMonth.innerHTML = '<option value="">-- Pilih Bulan --</option>';
    filterMonth.disabled = true;
    filterDay.innerHTML = '<option value="">-- Pilih Tanggal --</option>';
    filterDay.disabled = true;
    return;
  }

  const months = new Set();
  const year = parseInt(selectedYear);

  // Collect months from all data sources for the selected year
  AppState.productivityData.forEach(item => {
    const date = new Date(item.waktu);
    if (date.getFullYear() === year) {
      months.add(date.getMonth());
    }
  });

  AppState.matchFactorData.forEach(item => {
    const date = new Date(item.waktu);
    if (date.getFullYear() === year) {
      months.add(date.getMonth());
    }
  });

  AppState.issuesData.forEach(item => {
    const date = new Date(item.timestamp);
    if (date.getFullYear() === year) {
      months.add(date.getMonth());
    }
  });

  // Sort months
  const sortedMonths = Array.from(months).sort((a, b) => a - b);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  filterMonth.innerHTML = '<option value="">-- Pilih Bulan --</option>';
  sortedMonths.forEach(monthIndex => {
    const option = document.createElement('option');
    option.value = monthIndex;
    option.textContent = monthNames[monthIndex];
    filterMonth.appendChild(option);
  });

  filterMonth.disabled = false;
  filterDay.innerHTML = '<option value="">-- Pilih Tanggal --</option>';
  filterDay.disabled = true;
}

// Populate filter day dropdown based on selected year and month
function populateFilterDays() {
  const filterYear = document.getElementById('filterYear');
  const filterMonth = document.getElementById('filterMonth');
  const filterDay = document.getElementById('filterDay');

  if (!filterYear || !filterMonth || !filterDay) return;

  const selectedYear = filterYear.value;
  const selectedMonth = filterMonth.value;

  if (!selectedYear || selectedMonth === '') {
    filterDay.innerHTML = '<option value="">-- Pilih Tanggal --</option>';
    filterDay.disabled = true;
    return;
  }

  const days = new Set();
  const year = parseInt(selectedYear);
  const month = parseInt(selectedMonth);

  // Collect days from all data sources for the selected year and month
  AppState.productivityData.forEach(item => {
    const date = new Date(item.waktu);
    if (date.getFullYear() === year && date.getMonth() === month) {
      days.add(date.getDate());
    }
  });

  AppState.matchFactorData.forEach(item => {
    const date = new Date(item.waktu);
    if (date.getFullYear() === year && date.getMonth() === month) {
      days.add(date.getDate());
    }
  });

  AppState.issuesData.forEach(item => {
    const date = new Date(item.timestamp);
    if (date.getFullYear() === year && date.getMonth() === month) {
      days.add(date.getDate());
    }
  });

  // Sort days
  const sortedDays = Array.from(days).sort((a, b) => a - b);

  filterDay.innerHTML = '<option value="">-- Pilih Tanggal --</option>';
  sortedDays.forEach(day => {
    const option = document.createElement('option');
    option.value = day;
    option.textContent = day;
    filterDay.appendChild(option);
  });

  filterDay.disabled = false;
}

// Populate Available DateTime Options for Selected Excavator (for Issue Modal)
function populateDateOptions(excavatorId) {
  const dateSelect = document.getElementById('issueDateSelect');
  const dateContainer = document.getElementById('issueDateContainer');

  if (!dateSelect || !dateContainer) return;

  dateSelect.innerHTML = '<option value="">-- Pilih Waktu --</option>';

  if (!excavatorId) {
    dateContainer.classList.add('hidden');
    return;
  }

  // Get unique datetimes from productivity and match factor data for this excavator
  const datetimes = new Set();

  AppState.productivityData
    .filter(item => item.noExcavator === excavatorId)
    .forEach(item => {
      const datetime = new Date(item.waktu).toISOString(); // Full ISO datetime
      datetimes.add(datetime);
    });

  AppState.matchFactorData
    .filter(item => item.noExcavator === excavatorId)
    .forEach(item => {
      const datetime = new Date(item.waktu).toISOString();
      datetimes.add(datetime);
    });

  if (datetimes.size === 0) {
    dateContainer.classList.add('hidden');
    showAlert(`Tidak ada data untuk excavator ${excavatorId}`, 'warning');
    return;
  }

  // Sort datetimes (newest first)
  const sortedDatetimes = Array.from(datetimes).sort((a, b) => new Date(b) - new Date(a));

  sortedDatetimes.forEach(datetimeStr => {
    const dt = new Date(datetimeStr);
    const option = document.createElement('option');
    option.value = datetimeStr;
    option.textContent = dt.toLocaleString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    dateSelect.appendChild(option);
  });

  dateContainer.classList.remove('hidden');
}

// ==========================================
// Productivity Calculator
// ==========================================
function calculateProductivity() {
  const namaPengawas = document.getElementById('namaPengawas').value.trim();
  const nrp = document.getElementById('nrp').value.trim();
  const waktu = document.getElementById('waktu').value;
  const noExcavator = document.getElementById('noExcavator').value.trim();
  const namaOperator = document.getElementById('namaOperator').value.trim();
  const jenisMaterial = document.getElementById('jenisMaterial').value;
  const jumlahRitase = parseFloat(document.getElementById('jumlahRitase').value) || 0;
  const hmAwal = parseFloat(document.getElementById('hmAwal').value) || 0;
  const hmAkhir = parseFloat(document.getElementById('hmAkhir').value) || 0;
  const kapasitas = parseFloat(document.getElementById('kapasitas').value) || 0;

  // Validation
  if (!namaPengawas || !nrp || !noExcavator || !namaOperator || !jenisMaterial) {
    showAlert('Mohon lengkapi Data Umum (Nama Pengawas, NRP, No Excavator, Nama Operator, dan Jenis Material)', 'error');
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
    namaOperator,
    jenisMaterial,
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
  const namaOperator = document.getElementById('namaOperator').value.trim();
  const jenisMaterial = document.getElementById('jenisMaterial').value;
  const jumlahHD = parseFloat(document.getElementById('jumlahHD').value) || 0;
  const cycleTimeHauler = parseFloat(document.getElementById('cycleTimeHauler').value) || 0;
  const cycleTimeLoader = parseFloat(document.getElementById('cycleTimeLoader').value) || 0;

  // Validation
  if (!namaPengawas || !nrp || !noExcavator || !namaOperator || !jenisMaterial) {
    showAlert('Mohon lengkapi Data Umum (Nama Pengawas, NRP, No Excavator, Nama Operator, dan Jenis Material)', 'error');
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
    namaOperator,
    jenisMaterial,
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
        <td colspan="14" class="px-6 py-12 text-center">
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

    // Calculate delay: (WH_Target - (HM_Akhir - HM_Awal)) × 60
    const selisihHM = parseFloat(item.hmAkhir) - parseFloat(item.hmAwal);
    const whTarget = Math.ceil(selisihHM);
    const delay = Math.max(0, (whTarget - selisihHM) * 60);

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
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">${item.namaOperator || '-'}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    ${item.jenisMaterial || '-'}
                </span>
            </td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${item.jumlahRitase}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.hmAwal).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.hmAkhir).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 text-right">${parseFloat(item.kapasitas).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">${parseFloat(item.productivity).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">${(selisihHM * 60).toFixed(2)}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-semibold text-orange-600 text-right">${delay.toFixed(2)}</td>
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
        <td colspan="12" class="px-6 py-12 text-center">
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
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">${item.namaOperator || '-'}</td>
            <td class="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    ${item.jenisMaterial || '-'}
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
// Issues Table Rendering
// ==========================================

// Check if an issue is orphaned (no matching productivity/match factor record)
function isOrphanedIssue(issue) {
  // If no timestamp, not orphaned (could be a general note)
  if (!issue.timestamp) return false;

  const issueTime = new Date(issue.timestamp);
  const issueExcavator = issue.excavator;

  // Check if there's a matching Productivity record
  const hasProductivityMatch = AppState.productivityData.some(record => {
    if (record.noExcavator !== issueExcavator) return false;

    if (record.waktu) {
      const recordTime = new Date(record.waktu);
      // Match if same hour on same date
      return issueTime.getHours() === recordTime.getHours() &&
        issueTime.getDate() === recordTime.getDate() &&
        issueTime.getMonth() === recordTime.getMonth() &&
        issueTime.getFullYear() === recordTime.getFullYear();
    }
    return false;
  });

  // Check if there's a matching Match Factor record
  const hasMatchFactorMatch = AppState.matchFactorData.some(record => {
    if (record.noExcavator !== issueExcavator) return false;

    if (record.waktu) {
      const recordTime = new Date(record.waktu);
      // Match if same hour on same date
      return issueTime.getHours() === recordTime.getHours() &&
        issueTime.getDate() === recordTime.getDate() &&
        issueTime.getMonth() === recordTime.getMonth() &&
        issueTime.getFullYear() === recordTime.getFullYear();
    }
    return false;
  });

  // Orphaned if no match in either table
  return !hasProductivityMatch && !hasMatchFactorMatch;
}

function renderIssuesTable(filteredData = null) {
  const tbody = document.getElementById('issuesTableBody');
  const issuesCount = document.getElementById('issuesCount');

  if (!tbody) return;

  const data = filteredData || AppState.issuesData;
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center">
          <div class="flex flex-col items-center justify-center text-gray-400">
            <i class="fas fa-clipboard-list text-4xl mb-3"></i>
            <p class="text-sm font-medium">Belum ada catatan issue</p>
            <p class="text-xs mt-1">Klik tombol "Tambah Catatan" untuk menambahkan</p>
          </div>
        </td>
      </tr>
    `;
    if (issuesCount) issuesCount.textContent = '0 Issues';
    return;
  }

  // Update count
  if (issuesCount) {
    issuesCount.textContent = `${data.length} Issue${data.length > 1 ? 's' : ''}`;
  }

  // Sort by timestamp (newest first)
  const sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  sortedData.forEach((issue, index) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 transition-colors duration-150';

    // Get original index in AppState.issuesData
    const originalIndex = AppState.issuesData.findIndex(i => i.id === issue.id);

    // Format timestamp
    const timestamp = new Date(issue.timestamp);
    const formattedTime = timestamp.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build Delay Problem with expandable count badge (supports multiple delays)
    const delays = getIssueDelays(issue);
    const delayId = `delay-${issue.id || index}`;
    let delayText = '';

    if (delays.length === 0) {
      delayText = '<div class="p-2 text-center"><span class="text-gray-400 text-xs">-</span></div>';
    } else if (delays.length === 1) {
      // Single delay - show directly without expand button
      const delay = delays[0];
      delayText = `
        <div class="text-xs p-2">
          <div class="font-semibold text-red-700">${delay.mainCode}: ${delay.mainLabel}</div>
          ${delay.subCode && delay.subLabel ? `<div class="text-gray-600 mt-1">${delay.subCode} - ${delay.subLabel}</div>` : ''}
          ${delay.customText ? `<div class="text-gray-500 italic mt-1">${delay.customText}</div>` : ''}
        </div>
      `;
    } else {
      // Multiple delays - use expandable count badge
      const delaysList = delays.map((delay, idx) => {
        let html = '';

        // Add divider before all items except the first
        if (idx > 0) {
          html += '<div class="border-t border-red-200 pt-2 mt-2"></div>';
        }

        html += `<div class="text-xs">
          <div class="font-semibold text-red-700">${delay.mainCode}: ${delay.mainLabel}</div>`;
        if (delay.subCode && delay.subLabel) {
          html += `<div class="text-gray-600 mt-1">${delay.subCode} - ${delay.subLabel}</div>`;
        }
        if (delay.customText) {
          html += `<div class="text-gray-500 italic mt-1">${delay.customText}</div>`;
        }
        html += '</div>';
        return html;
      }).join('');

      delayText = `
        <div class="relative">
          <button
            onclick="toggleIssueDetails('${delayId}')"
            class="flex items-center gap-2 hover:bg-red-50 px-2 py-1.5 rounded transition-all w-full text-left">
            <span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
            <span class="font-semibold text-sm text-red-700">${delays.length} Delays</span>
            <i class="fas fa-chevron-down text-xs transition-transform duration-200 ml-auto text-red-600" id="${delayId}-icon"></i>
          </button>
          <div id="${delayId}-content" class="hidden mt-2 pl-4 border-l-2 border-red-300 pb-2">
            ${delaysList}
          </div>
        </div>
      `;
    }

    // Build Productivity Problem with expandable count badge (supports multiple productivities)
    const productivities = getIssueProductivities(issue);
    const prodId = `prod-${issue.id || index}`;
    let productivityText = '';

    if (productivities.length === 0) {
      productivityText = '<div class="p-2 text-center"><span class="text-gray-400 text-xs">-</span></div>';
    } else if (productivities.length === 1) {
      // Single productivity - show directly without expand button
      const prod = productivities[0];
      productivityText = `
        <div class="text-xs p-2">
          <div class="font-semibold text-orange-700">Kat. ${prod.mainCode}: ${prod.mainLabel}</div>
          ${prod.subOption ? `<div class="text-gray-600 mt-1">${prod.subOption}</div>` : ''}
          ${prod.customText ? `<div class="text-gray-500 italic mt-1">${prod.customText}</div>` : ''}
        </div>
      `;
    } else {
      // Multiple productivities - use expandable count badge
      const prodList = productivities.map((prod, idx) => {
        let html = '';

        // Add divider before all items except the first
        if (idx > 0) {
          html += '<div class="border-t border-orange-200 pt-2 mt-2"></div>';
        }

        html += `<div class="text-xs">
          <div class="font-semibold text-orange-700">Kat. ${prod.mainCode}: ${prod.mainLabel}</div>`;
        if (prod.subOption) {
          html += `<div class="text-gray-600 mt-1">${prod.subOption}</div>`;
        }
        if (prod.customText) {
          html += `<div class="text-gray-500 italic mt-1">${prod.customText}</div>`;
        }
        html += '</div>';
        return html;
      }).join('');

      productivityText = `
        <div class="relative">
          <button
            onclick="toggleIssueDetails('${prodId}')"
            class="flex items-center gap-2 hover:bg-orange-50 px-2 py-1.5 rounded transition-all w-full text-left">
            <span class="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
            <span class="font-semibold text-sm text-orange-700">${productivities.length} Problems</span>
            <i class="fas fa-chevron-down text-xs transition-transform duration-200 ml-auto text-orange-600" id="${prodId}-icon"></i>
          </button>
          <div id="${prodId}-content" class="hidden mt-2 pl-4 border-l-2 border-orange-300 pb-2">
            ${prodList}
          </div>
        </div>
      `;
    }

    // Notes - Better UX with clear separation
    let notesHtml = '';
    const hasNotes = issue.notes && issue.notes.trim();
    const hasFollowUp = issue.followUpNotes && issue.followUpNotes.trim();

    if (hasNotes || hasFollowUp) {
      const noteId = `notes-${issue.id || index}`;
      const isMobile = window.innerWidth < 640;
      const maxPreviewLength = isMobile ? 50 : 100;

      // Build compact preview
      let previewParts = [];
      if (hasNotes) {
        const notesPreview = issue.notes.trim().substring(0, maxPreviewLength);
        previewParts.push(`<span class="text-purple-700">${notesPreview}${issue.notes.trim().length > maxPreviewLength ? '...' : ''}</span>`);
      }
      if (hasFollowUp) {
        const followUpPreview = issue.followUpNotes.trim().substring(0, maxPreviewLength);
        previewParts.push(`<span class="text-blue-600">${followUpPreview}${issue.followUpNotes.trim().length > maxPreviewLength ? '...' : ''}</span>`);
      }

      const hasMore = (hasNotes && issue.notes.trim().length > maxPreviewLength) ||
        (hasFollowUp && issue.followUpNotes.trim().length > maxPreviewLength) ||
        (hasNotes && hasFollowUp);

      // Build full content
      let fullContent = '<div class="space-y-3">';
      if (hasNotes) {
        fullContent += `
          <div class="bg-purple-50 p-2.5 rounded-lg border border-purple-200">
            <div class="text-[10px] font-semibold text-purple-600 mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-file-alt text-[9px]"></i>
              <span>Dokumentasi Masalah</span>
            </div>
            <div class="text-xs text-purple-700 leading-relaxed break-words">${issue.notes.trim()}</div>
          </div>
        `;
      }
      if (hasFollowUp) {
        fullContent += `
          <div class="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
            <div class="text-[10px] font-semibold text-blue-600 mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-tools text-[9px]"></i>
              <span>Follow Up Perbaikan</span>
            </div>
            <div class="text-xs text-blue-700 leading-relaxed break-words">${issue.followUpNotes.trim()}</div>
          </div>
        `;
      }
      fullContent += '</div>';

      notesHtml = `
        <div class="relative ${hasMore ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors' : 'p-2'}" ${hasMore ? `onclick="toggleNotesExpand('${noteId}')"` : ''}>
          <div id="${noteId}-preview" class="text-xs leading-relaxed space-y-1">
            ${previewParts.join('<span class="text-gray-400 mx-1">•</span>')}
          </div>
          
          <div id="${noteId}-full" class="hidden mt-2">
            ${fullContent}
          </div>
          
          ${hasMore ? `
            <div class="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600">
              <i class="fas fa-chevron-right transition-transform duration-200 text-[8px]" id="${noteId}-icon"></i>
              <span id="${noteId}-btn" class="underline">${isMobile ? 'Lihat Detail' : 'Lihat Selengkapnya'}</span>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      notesHtml = '<div class="p-2 text-center"><span class="text-gray-400 text-xs">-</span></div>';
    }

    // Photo indicator - Use original index from AppState
    // Count photos from both sections (Dokumentasi Masalah + Follow Up Perbaikan)
    const documentationPhotoCount = (issue.imageIds && issue.imageIds.length > 0) ? issue.imageIds.length :
      (issue.photo ? 1 : 0); // Support legacy base64 photos
    const followUpPhotoCount = (issue.followUpImageIds && issue.followUpImageIds.length > 0) ? issue.followUpImageIds.length : 0;
    const photoCount = documentationPhotoCount + followUpPhotoCount;

    const photoHtml = photoCount > 0
      ? `<button
          onclick="viewIssuePhotos(${originalIndex})"
          class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5">
          <i class="fas fa-images"></i>
          <span>Lihat (${photoCount})</span>
        </button>`
      : '<span class="text-gray-400 text-xs">-</span>';

    // Check if issue is orphaned (no matching productivity/match factor record)
    const isOrphaned = isOrphanedIssue(issue);
    const orphanedBadge = isOrphaned
      ? `<div class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold" title="Issue ini tidak memiliki record Productivity atau Match Factor yang sesuai">
          <i class="fas fa-exclamation-triangle text-amber-600"></i>
          <span>No Record</span>
        </div>`
      : '';

    row.innerHTML = `
      <td class="px-3 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 font-semibold">${index + 1}</td>
      <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600">
        <div>${formattedTime}</div>
        ${orphanedBadge}
      </td>
      <td class="px-3 sm:px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">${issue.excavator}</span>
      </td>
      <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">${delayText}</td>
      <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">${productivityText}</td>
      <td class="px-2 sm:px-3 py-3 text-center">${photoHtml}</td>
      <td class="px-2 sm:px-3 py-3 w-72 sm:w-96">
        <div class="rounded-lg border border-gray-200 bg-white">
          ${notesHtml}
        </div>
      </td>
      <td class="px-3 sm:px-4 py-3">
        <div class="flex items-center justify-center gap-2">
          <!-- Edit Button -->
          <button 
            onclick="editIssue(${originalIndex})" 
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
            title="Edit issue"
            aria-label="Edit issue">
            <i class="fas fa-pencil-alt text-xs sm:text-sm"></i>
          </button>
          
          <!-- Delete Button -->
          <button 
            onclick="deleteIssue(${originalIndex})" 
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
            title="Hapus issue"
            aria-label="Delete issue">
            <i class="fas fa-trash text-xs sm:text-sm"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// View Issue Photos in Modal (Supports Multiple Photos from IndexedDB)
window.viewIssuePhotos = async function (index) {
  const issue = AppState.issuesData[index];
  if (!issue) return;

  // Get photos from both sections - support both new imageIds and legacy base64 photo
  let photoUrls = [];
  let photoSections = []; // Track which section each photo belongs to

  // Section 1: Dokumentasi Masalah (Purple)
  if (issue.imageIds && issue.imageIds.length > 0) {
    // New: Load from IndexedDB
    try {
      const images = await imageStorage.getImages(issue.imageIds);
      const urls = images.map(img => URL.createObjectURL(img.blob));
      photoUrls.push(...urls);
      photoSections.push(...urls.map(() => ({ type: 'documentation', label: 'Dokumentasi Masalah', color: 'purple' })));
    } catch (error) {
      console.error('Failed to load images from IndexedDB:', error);
      showAlert('Gagal memuat foto dokumentasi dari penyimpanan', 'error');
    }
  } else if (issue.photo) {
    // Legacy: base64 photo
    photoUrls.push(issue.photo);
    photoSections.push({ type: 'documentation', label: 'Dokumentasi Masalah', color: 'purple' });
  }

  // Section 2: Follow Up Perbaikan (Blue)
  if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
    try {
      const images = await imageStorage.getImages(issue.followUpImageIds);
      const urls = images.map(img => URL.createObjectURL(img.blob));
      photoUrls.push(...urls);
      photoSections.push(...urls.map(() => ({ type: 'followup', label: 'Follow Up Perbaikan', color: 'blue' })));
    } catch (error) {
      console.error('Failed to load follow-up images from IndexedDB:', error);
      showAlert('Gagal memuat foto follow-up dari penyimpanan', 'error');
    }
  }

  if (photoUrls.length === 0) {
    showAlert('Tidak ada foto untuk issue ini', 'info');
    return;
  }

  // Create photo viewer modal - using same style as Tambah Catatan Problem lightbox
  const photoModal = document.createElement('div');
  photoModal.className = 'fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-0';

  let currentPhotoIndex = 0;

  function renderPhoto() {
    const totalPhotos = photoUrls.length;
    const currentSection = photoSections[currentPhotoIndex] || { type: 'documentation', label: 'Dokumentasi Masalah', color: 'purple' };

    // Section badge colors
    const badgeColor = currentSection.color === 'blue'
      ? 'bg-blue-500/90 text-white'
      : 'bg-purple-500/90 text-white';

    // Section icon
    const badgeIcon = currentSection.color === 'blue' ? 'tools' : 'file-alt';

    photoModal.innerHTML = `
      <div class="relative w-full h-full flex flex-col">
        <!-- Header with Close Button and Issue Info -->
        <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/60 to-transparent">
          <div class="text-white">
            <p class="text-sm sm:text-base font-semibold flex items-center gap-2">
              <i class="fas fa-hard-hat text-yellow-400"></i>
              ${issue.excavator}
            </p>
            <p class="text-xs sm:text-sm text-gray-300 mt-1">
              <i class="far fa-clock mr-1"></i>
              ${new Date(issue.timestamp).toLocaleString('id-ID')}
              ${totalPhotos > 1 ? ` • <span id="photoCounter">${currentPhotoIndex + 1}</span> / ${totalPhotos}` : ''}
            </p>
            <!-- Section Badge -->
            <div class="mt-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}">
                <i class="fas fa-${badgeIcon} text-[10px]"></i>
                ${currentSection.label}
              </span>
            </div>
          </div>
          <button
            id="closePhotoModal"
            class="w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:rotate-90 flex-shrink-0 ml-4"
            style="aspect-ratio: 1/1;">
            <i class="fas fa-times text-white text-lg sm:text-xl"></i>
          </button>
        </div>

        <!-- Main Image Container -->
        <div class="flex-1 flex items-center justify-center px-4 sm:px-16 py-20 sm:py-24">
          ${totalPhotos > 1 ? `
          <!-- Previous Button -->
          <button
            id="prevPhotoBtn"
            class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10 flex-shrink-0 ${currentPhotoIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
            style="aspect-ratio: 1/1;">
            <i class="fas fa-chevron-left text-white text-lg sm:text-xl"></i>
          </button>
          ` : ''}

          <!-- Image -->
          <div class="max-w-full max-h-full flex items-center justify-center">
            <img 
              id="photoImage" 
              src="${photoUrls[currentPhotoIndex]}" 
              alt="Issue Photo ${currentPhotoIndex + 1}" 
              class="max-w-full max-h-[70vh] sm:max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl" />
          </div>

          ${totalPhotos > 1 ? `
          <!-- Next Button -->
          <button
            id="nextPhotoBtn"
            class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10 flex-shrink-0 ${currentPhotoIndex === totalPhotos - 1 ? 'opacity-50 cursor-not-allowed' : ''}"
            style="aspect-ratio: 1/1;">
            <i class="fas fa-chevron-right text-white text-lg sm:text-xl"></i>
          </button>
          ` : ''}
        </div>

        <!-- Footer hint -->
        <div class="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <p class="text-center text-xs sm:text-sm text-gray-300">
            <kbd class="px-2 py-1 bg-white/10 rounded text-white font-mono text-xs">ESC</kbd> untuk keluar
            ${totalPhotos > 1 ? ` • <kbd class="px-2 py-1 bg-white/10 rounded text-white font-mono text-xs">← →</kbd> navigasi` : ''}
          </p>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = photoModal.querySelector('#closePhotoModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        photoModal.remove();
        // Clean up object URLs
        photoUrls.forEach(url => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        document.removeEventListener('keydown', keyHandler);
      });
    }

    if (totalPhotos > 1) {
      const prevBtn = photoModal.querySelector('#prevPhotoBtn');
      const nextBtn = photoModal.querySelector('#nextPhotoBtn');

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (currentPhotoIndex > 0) {
            currentPhotoIndex--;
            updatePhoto();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (currentPhotoIndex < totalPhotos - 1) {
            currentPhotoIndex++;
            updatePhoto();
          }
        });
      }
    }
  }

  // Update photo display
  function updatePhoto() {
    const img = photoModal.querySelector('#photoImage');
    const counter = photoModal.querySelector('#photoCounter');
    const prevBtn = photoModal.querySelector('#prevPhotoBtn');
    const nextBtn = photoModal.querySelector('#nextPhotoBtn');

    // Get current section and update badge
    const currentSection = photoSections[currentPhotoIndex] || { type: 'documentation', label: 'Dokumentasi Masalah', color: 'purple' };
    const badge = photoModal.querySelector('span.inline-flex.items-center');

    // Update badge color and content
    if (badge) {
      // Remove old color classes
      badge.classList.remove('bg-purple-500/90', 'bg-blue-500/90');
      // Add new color
      if (currentSection.color === 'blue') {
        badge.classList.add('bg-blue-500/90');
      } else {
        badge.classList.add('bg-purple-500/90');
      }

      // Update icon and text - use correct icon names without fa- prefix in template literal
      const iconClass = currentSection.color === 'blue' ? 'tools' : 'file-alt';
      badge.innerHTML = `<i class="fas fa-${iconClass} text-[10px]"></i> ${currentSection.label}`;
    }

    if (img) {
      img.src = photoUrls[currentPhotoIndex];
      img.alt = `Issue Photo ${currentPhotoIndex + 1}`;
    }

    if (counter) {
      counter.textContent = currentPhotoIndex + 1;
    }

    // Update button states
    if (prevBtn) {
      if (currentPhotoIndex === 0) {
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    if (nextBtn) {
      if (currentPhotoIndex === photoUrls.length - 1) {
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  renderPhoto();
  document.body.appendChild(photoModal);

  // Keyboard navigation
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      photoModal.querySelector('#closePhotoModal')?.click();
    } else if (e.key === 'ArrowLeft' && currentPhotoIndex > 0) {
      e.preventDefault();
      currentPhotoIndex--;
      updatePhoto();
    } else if (e.key === 'ArrowRight' && currentPhotoIndex < photoUrls.length - 1) {
      e.preventDefault();
      currentPhotoIndex++;
      updatePhoto();
    }
  };
  document.addEventListener('keydown', keyHandler);

  // Close on click outside
  photoModal.addEventListener('click', function (e) {
    if (e.target === photoModal || e.target.id === 'photoImage') {
      photoModal.querySelector('#closePhotoModal')?.click();
    }
  });
};

// Toggle Note Expand/Collapse with Enhanced UX
window.toggleNote = function (noteId) {
  const shortNote = document.getElementById(`${noteId}-short`);
  const fullNote = document.getElementById(`${noteId}-full`);
  const button = document.getElementById(`${noteId}-btn`);
  const icon = document.getElementById(`${noteId}-icon`);

  if (!shortNote || !fullNote || !button || !icon) return;

  if (fullNote.classList.contains('hidden')) {
    // Expand - Show full version
    shortNote.classList.add('hidden');
    fullNote.classList.remove('hidden');
    button.textContent = 'Sembunyikan';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');

    // Add smooth reveal animation
    fullNote.style.animation = 'fadeIn 0.3s ease-in-out';
  } else {
    // Collapse - Show short version
    fullNote.classList.add('hidden');
    shortNote.classList.remove('hidden');
    button.textContent = 'Selengkapnya';
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');

    // Add smooth reveal animation
    shortNote.style.animation = 'fadeIn 0.3s ease-in-out';
  }
};

// Toggle Notes Expand/Collapse (Option 2 - Expandable Rows)
window.toggleNotesExpand = function (noteId) {
  const preview = document.getElementById(`${noteId}-preview`);
  const fullContent = document.getElementById(`${noteId}-full`);
  const button = document.getElementById(`${noteId}-btn`);
  const icon = document.getElementById(`${noteId}-icon`);

  if (!preview || !fullContent || !button || !icon) return;

  const isMobile = window.innerWidth < 640;
  const expandText = isMobile ? 'Lihat' : 'Lihat Selengkapnya';
  const collapseText = 'Tutup';

  if (fullContent.classList.contains('hidden')) {
    // Expand - Show full content (chevron points down)
    preview.classList.add('hidden');
    fullContent.classList.remove('hidden');
    button.textContent = collapseText;
    icon.classList.remove('fa-chevron-right');
    icon.classList.add('fa-chevron-down');
    icon.style.transform = 'rotate(0deg)';

    // Smooth animation
    fullContent.style.animation = 'fadeIn 0.2s ease-in-out';
  } else {
    // Collapse - Show preview (chevron points right)
    fullContent.classList.add('hidden');
    preview.classList.remove('hidden');
    button.textContent = expandText;
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-right');
    icon.style.transform = 'rotate(0deg)';

    // Smooth animation
    preview.style.animation = 'fadeIn 0.2s ease-in-out';
  }
};

// Toggle expand/collapse for delay and productivity details in Issues table
window.toggleIssueDetails = function (detailId) {
  const content = document.getElementById(`${detailId}-content`);
  const icon = document.getElementById(`${detailId}-icon`);

  if (!content || !icon) return;

  if (content.classList.contains('hidden')) {
    // Expand
    content.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';

    // Smooth animation
    content.style.animation = 'slideDown 0.2s ease-out';
  } else {
    // Collapse
    content.classList.add('hidden');
    icon.style.transform = 'rotate(0deg)';
  }
};

// Edit Issue
window.editIssue = async function (index) {
  const issue = AppState.issuesData[index];
  if (!issue) return;

  // Store the index being edited
  window.currentEditIssueIndex = index;

  // Get modal elements
  const modal = document.getElementById('issueModal');
  const modalTitle = modal.querySelector('h2');
  const modalSubtitle = modal.querySelector('p');
  const saveBtn = document.getElementById('saveIssueBtn');
  const saveBtnText = saveBtn.querySelector('span');

  // Change modal title to "Edit Catatan Problem"
  if (modalTitle) modalTitle.textContent = 'Edit Catatan Problem';
  if (modalSubtitle) modalSubtitle.textContent = 'Perbarui catatan masalah Delay & Productivity';
  if (saveBtnText) saveBtnText.textContent = 'Update Catatan';

  // Populate form fields
  const excavatorSelect = document.getElementById('issueExcavatorSelect');
  const additionalNotes = document.getElementById('issueAdditionalNotes');
  const followUpNotes = document.getElementById('followUpNotes');

  // First, populate excavator dropdown
  // Populate Excavator Options
  excavatorSelect.innerHTML = '<option value="">-- Pilih Excavator --</option>';
  const excavators = new Set();
  AppState.productivityData.forEach(item => excavators.add(item.noExcavator));
  AppState.matchFactorData.forEach(item => excavators.add(item.noExcavator));
  const sortedExcavators = Array.from(excavators).sort();
  sortedExcavators.forEach(ex => {
    const option = document.createElement('option');
    option.value = ex;
    option.textContent = ex;
    excavatorSelect.appendChild(option);
  });

  // Set excavator
  excavatorSelect.value = issue.excavator;

  // Populate and set date selector
  populateDateOptions(issue.excavator);

  // Set the datetime from the issue timestamp
  if (issue.timestamp) {
    const dateSelect = document.getElementById('issueDateSelect');
    if (dateSelect) {
      const issueDate = new Date(issue.timestamp);
      const dateStr = issueDate.toISOString(); // Full ISO datetime
      dateSelect.value = dateStr;
    }
  }

  // Load delay problems (with backward compatibility)
  const delaysToLoad = issue.delays || (issue.delay ? [issue.delay] : []);
  if (delaysToLoad.length > 0) {
    delayItems = delaysToLoad.map(delay => ({
      id: Date.now() + Math.random(),
      mainCode: delay.mainCode || '',
      subCode: delay.subCode || '',
      customText: delay.customText || ''
    }));
    renderDelayItems();
  } else {
    delayItems = [createDelayItem(0)];
    renderDelayItems();
  }

  // Load productivity problems (with backward compatibility)
  const productivitiesToLoad = issue.productivities || (issue.productivity ? [issue.productivity] : []);
  if (productivitiesToLoad.length > 0) {
    productivityItems = productivitiesToLoad.map(productivity => ({
      id: Date.now() + Math.random(),
      mainCode: productivity.mainCode || '',
      subOption: productivity.subOption || '',
      customText: productivity.customText || ''
    }));
    renderProductivityItems();
  } else {
    productivityItems = [createProductivityItem(0)];
    renderProductivityItems();
  }

  // Set notes
  if (issue.notes) additionalNotes.value = issue.notes;
  if (issue.followUpNotes) followUpNotes.value = issue.followUpNotes;

  // Load existing photos from Dokumentasi Masalah (Section 3)
  if (issue.imageIds && issue.imageIds.length > 0) {
    try {
      const images = await imageStorage.getImages(issue.imageIds);

      // Convert to photo blobs format for preview
      const photoBlobs = images.map(img => ({
        blob: img.blob,
        preview: URL.createObjectURL(img.blob),
        name: `Doctn ${images.indexOf(img) + 1}.jpg`
      }));

      // Set current photo blobs (this should be in the modal setup scope)
      // We'll need to expose this or create a setter function
      if (window.setCurrentPhotoBlobs) {
        window.setCurrentPhotoBlobs(photoBlobs);
      }
    } catch (error) {
      console.error('Failed to load existing photos:', error);
    }
  }

  // Load existing photos from Follow Up Perbaikan (Section 4)
  if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
    try {
      const images = await imageStorage.getImages(issue.followUpImageIds);

      // Convert to photo blobs format for preview
      const photoBlobs = images.map(img => ({
        blob: img.blob,
        preview: URL.createObjectURL(img.blob),
        name: `Follow-up ${images.indexOf(img) + 1}.jpg`
      }));

      // Set follow-up photo blobs
      if (window.setFollowUpPhotoBlobs) {
        window.setFollowUpPhotoBlobs(photoBlobs);
      }
    } catch (error) {
      console.error('Failed to load existing follow-up photos:', error);
    }
  }

  // Open modal
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
    modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
  }, 10);
};

// Delete Issue
window.deleteIssue = function (index) {
  const issue = AppState.issuesData[index];
  if (!issue) return;

  const timestamp = new Date(issue.timestamp).toLocaleString('id-ID');
  const excavator = issue.excavator;

  const delays = getIssueDelays(issue);
  const productivities = getIssueProductivities(issue);

  let problemSummary = '';
  if (delays.length > 0) {
    delays.forEach((delay, i) => {
      problemSummary += `• Delay ${i + 1}: ${delay.mainCode} - ${delay.mainLabel}\n`;
    });
  }
  if (productivities.length > 0) {
    productivities.forEach((prod, i) => {
      problemSummary += `• Productivity ${i + 1}: Kat. ${prod.mainCode} - ${prod.mainLabel}\n`;
    });
  }

  const dataPreview = `
    <div class="text-left space-y-2 text-sm">
      <p><strong>Excavator:</strong> ${excavator}</p>
      <p><strong>Waktu:</strong> ${timestamp}</p>
      <div><strong>Problem:</strong><br/><pre class="text-xs mt-1 whitespace-pre-wrap">${problemSummary}</pre></div>
    </div>
  `;

  showConfirm(
    'Hapus Issue?',
    'Data issue ini akan dihapus secara permanen dan tidak dapat dikembalikan.',
    'warning',
    'red',
    async function () {
      // Delete photos from IndexedDB if they exist
      if (issue.imageIds && issue.imageIds.length > 0) {
        try {
          await imageStorage.deleteImages(issue.imageIds);
          console.log(`✅ Deleted ${issue.imageIds.length} photos from IndexedDB for issue ${issue.id}`);
        } catch (error) {
          console.warn('Failed to delete some photos from IndexedDB:', error);
        }
      }

      // Delete follow-up photos from IndexedDB if they exist
      if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
        try {
          await imageStorage.deleteImages(issue.followUpImageIds);
          console.log(`✅ Deleted ${issue.followUpImageIds.length} follow-up photos from IndexedDB for issue ${issue.id}`);
        } catch (error) {
          console.warn('Failed to delete some follow-up photos from IndexedDB:', error);
        }
      }

      AppState.issuesData.splice(index, 1);
      saveToLocalStorage();
      renderIssuesTable();
      showToast('Issue berhasil dihapus', 'success');
    },
    null,
    dataPreview
  );
};

// ==========================================
// View Issues Modal (Read-Only) - Triggered from Chart Click
// ==========================================

// View Issues for specific excavator and datetime
window.viewIssuesForExcavatorAndDate = function (excavator, dateStr) {
  // Filter issues by excavator and exact datetime
  const targetDatetime = new Date(dateStr).toISOString();
  const issues = AppState.issuesData.filter(issue => {
    const issueDatetime = new Date(issue.timestamp).toISOString();
    return issue.excavator === excavator && issueDatetime === targetDatetime;
  });

  if (issues.length === 0) {
    const displayTime = new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    showAlert(`Tidak ada catatan problem untuk ${excavator} pada ${displayTime}`, 'info');
    return;
  }

  // Show modal
  const modal = document.getElementById('viewIssuesModal');
  const title = document.getElementById('viewIssuesTitle');
  const subtitle = document.getElementById('viewIssuesSubtitle');
  const content = document.getElementById('viewIssuesContent');

  title.textContent = `Catatan Problem - ${excavator}`;
  subtitle.textContent = `Waktu: ${new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} | ${issues.length} Catatan`;

  // Build issues content
  let contentHTML = '<div class="space-y-4">';

  issues.forEach((issue, idx) => {
    const timestamp = new Date(issue.timestamp).toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build delay text (supports multiple)
    const delayHTML = `<div class="text-sm">${formatDelaysHTML(issue, '<div class="mt-3 pt-3 border-t border-red-200"></div>')}</div>`;

    // Build productivity text (supports multiple)
    const prodHTML = `<div class="text-sm">${formatProductivitiesHTML(issue, '<div class="mt-3 pt-3 border-t border-green-200"></div>')}</div>`;

    // Photo count (both Dokumentasi Masalah and Follow Up)
    const documentationPhotoCount = (issue.imageIds && issue.imageIds.length) || 0;
    const followUpPhotoCount = (issue.followUpImageIds && issue.followUpImageIds.length) || 0;
    const photoCount = documentationPhotoCount + followUpPhotoCount;

    contentHTML += `
      <div class="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span class="text-purple-600 font-bold text-sm">${idx + 1}</span>
            </div>
            <button 
              onclick="document.getElementById('viewIssuesModal').classList.add('hidden'); editIssue(${AppState.issuesData.indexOf(issue)})" 
              class="group text-gray-500 hover:text-purple-600 text-sm transition-colors cursor-pointer inline-flex items-center gap-1 hover:bg-purple-50 px-2 py-1 rounded"
              title="Klik untuk edit catatan ini">
              <i class="far fa-clock"></i>
              <span>${timestamp}</span>
              <i class="fas fa-edit text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </button>
          </div>
          ${photoCount > 0 ? `
            <button onclick="viewIssuePhotos(${AppState.issuesData.indexOf(issue)})" 
              class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5">
              <i class="fas fa-images"></i>
              <span>Foto (${photoCount})</span>
            </button>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <div class="text-xs font-semibold text-gray-500 mb-1">Delay Problem</div>
            ${delayHTML}
          </div>
          <div>
            <div class="text-xs font-semibold text-gray-500 mb-1">Productivity Problem</div>
            ${prodHTML}
          </div>
        </div>

        ${issue.notes || issue.followUpNotes ? `
          <div class="border-t border-gray-100 pt-3 mt-3 space-y-3">
            ${issue.notes ? `
              <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div class="text-xs font-semibold text-purple-600 mb-1.5 flex items-center gap-1.5">
                  <i class="fas fa-file-alt"></i>
                  <span>Dokumentasi Masalah</span>
                </div>
                <div class="text-sm text-purple-700 leading-relaxed">${issue.notes}</div>
              </div>
            ` : ''}
            ${issue.followUpNotes ? `
              <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div class="text-xs font-semibold text-blue-600 mb-1.5 flex items-center gap-1.5">
                  <i class="fas fa-tools"></i>
                  <span>Follow Up Perbaikan</span>
                </div>
                <div class="text-sm text-blue-700 leading-relaxed">${issue.followUpNotes}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  });

  contentHTML += '</div>';
  content.innerHTML = contentHTML;

  // Show modal
  modal.classList.remove('hidden');

  // Setup close handlers
  const closeBtn = document.getElementById('closeViewIssuesBtn');
  const closeFooterBtn = document.getElementById('closeViewIssuesFooterBtn');

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  closeBtn.onclick = closeModal;
  closeFooterBtn.onclick = closeModal;

  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
};

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
          <button
            onclick="event.stopPropagation(); openIssueModalForExcavator('${excavatorId}')"
            class="px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 gap-1 whitespace-nowrap"
            title="Tambah Catatan">
            <i class="fas fa-plus text-xs"></i>
            <span class="hidden sm:inline">Catatan</span>
          </button>
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
          onClick: (event, activeElements) => {
            if (activeElements && activeElements.length > 0) {
              const index = activeElements[0].index;
              const clickedData = productivityData[index];
              if (clickedData && clickedData.waktu) {
                viewIssuesForExcavatorAndDate(excavatorId, clickedData.waktu);
              }
            }
          },
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
                },
                afterLabel: function (context) {
                  return '💡 Klik untuk lihat catatan';
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
          onClick: (event, activeElements) => {
            if (activeElements && activeElements.length > 0) {
              const index = activeElements[0].index;
              const clickedData = matchFactorData[index];
              if (clickedData && clickedData.waktu) {
                viewIssuesForExcavatorAndDate(excavatorId, clickedData.waktu);
              }
            }
          },
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
                },
                afterLabel: function (context) {
                  return '💡 Klik untuk lihat catatan';
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
      let statusIcon = 'fa-circle-check'; // Green check for optimal

      if (avgNum < 1) {
        statusColor = 'text-yellow-500';
        statusText = 'Under';
        statusIcon = 'fa-triangle-exclamation'; // Yellow warning for under
      } else if (avgNum > 1) {
        statusColor = 'text-orange-500';
        statusText = 'Over';
        statusIcon = 'fa-circle-xmark'; // Orange X for over/excess
      }

      document.getElementById(`mf-stats-${excavatorId}`).innerHTML = `
        <span><i class="fas fa-chart-simple text-gray-400 mr-1"></i>Avg: ${avg}</span>
        <span><i class="fas fa-arrow-up text-green-500 mr-1"></i>Max: ${max}</span>
        <span><i class="fas fa-arrow-down text-red-500 mr-1"></i>Min: ${min}</span>
        <span><i class="fas ${statusIcon} ${statusColor} mr-1"></i>${statusText}</span>
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

  // Update button states
  const expandBtn = document.getElementById('btnExpandAll');
  const collapseBtn = document.getElementById('btnCollapseAll');

  if (expandBtn && collapseBtn) {
    expandBtn.classList.add('active');
    collapseBtn.classList.remove('active');

    expandBtn.classList.remove('bg-gray-50', 'text-gray-600', 'hover:bg-gray-100');
    expandBtn.classList.add('bg-blue-50', 'text-blue-600', 'hover:bg-blue-100');

    collapseBtn.classList.remove('bg-blue-50', 'text-blue-600', 'hover:bg-blue-100');
    collapseBtn.classList.add('bg-gray-50', 'text-gray-600', 'hover:bg-gray-100');
  }

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

  // Update button states
  const expandBtn = document.getElementById('btnExpandAll');
  const collapseBtn = document.getElementById('btnCollapseAll');

  if (expandBtn && collapseBtn) {
    collapseBtn.classList.add('active');
    expandBtn.classList.remove('active');

    collapseBtn.classList.remove('bg-gray-50', 'text-gray-600', 'hover:bg-gray-100');
    collapseBtn.classList.add('bg-blue-50', 'text-blue-600', 'hover:bg-blue-100');

    expandBtn.classList.remove('bg-blue-50', 'text-blue-600', 'hover:bg-blue-100');
    expandBtn.classList.add('bg-gray-50', 'text-gray-600', 'hover:bg-gray-100');
  }
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
                        <i class="fas fa-clock text-blue-500 mr-2"></i>Waktu
                    </label>
                    <input type="datetime-local" id="editWaktu" value="${data.waktu}"
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                </div>
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
                        <i class="fas fa-clock text-purple-500 mr-2"></i>Waktu
                    </label>
                    <input type="datetime-local" id="editWaktuMF" value="${data.waktu}"
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-truck text-purple-500 mr-2"></i>Jumlah HD
                    </label>
                    <input type="number" id="editJumlahHD" value="${data.jumlahHD}"
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-hourglass-start text-purple-500 mr-2"></i>Cycle Time Hauler (menit)
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
    const waktu = document.getElementById('editWaktu').value;
    const jumlahRitase = parseFloat(document.getElementById('editJumlahRitase').value);
    const hmAwal = parseFloat(document.getElementById('editHmAwal').value);
    const hmAkhir = parseFloat(document.getElementById('editHmAkhir').value);
    const kapasitas = parseFloat(document.getElementById('editKapasitas').value);

    const durasi = hmAkhir - hmAwal;
    const productivity = (jumlahRitase * kapasitas) / durasi;

    AppState.productivityData[index] = {
      ...AppState.productivityData[index],
      waktu,
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
    const waktu = document.getElementById('editWaktuMF').value;
    const jumlahHD = parseFloat(document.getElementById('editJumlahHD').value);
    const cycleTimeHauler = parseFloat(document.getElementById('editCycleTimeHauler').value);
    const cycleTimeLoader = parseFloat(document.getElementById('editCycleTimeLoader').value);

    const matchFactor = (jumlahHD * cycleTimeLoader) / cycleTimeHauler;

    AppState.matchFactorData[index] = {
      ...AppState.matchFactorData[index],
      waktu,
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

  // Update date filter years
  populateFilterYears();
}

function applyFilters() {
  const filterNamaValue = document.getElementById('filterNama').value;
  const filterNRPValue = document.getElementById('filterNRP').value;
  const filterExcavatorValue = document.getElementById('filterExcavator').value;

  // Get date filter values
  const filterYear = document.getElementById('filterYear').value;
  const filterMonth = document.getElementById('filterMonth').value;
  const filterDay = document.getElementById('filterDay').value;

  let filteredProductivity = AppState.productivityData;
  let filteredMatchFactor = AppState.matchFactorData;
  let filteredIssues = AppState.issuesData;

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
    filteredIssues = filteredIssues.filter(d => d.excavator === filterExcavatorValue);
  }

  // Apply date filters (cascading)
  if (filterYear) {
    const year = parseInt(filterYear);
    filteredProductivity = filteredProductivity.filter(d => {
      const date = new Date(d.waktu);
      return date.getFullYear() === year;
    });
    filteredMatchFactor = filteredMatchFactor.filter(d => {
      const date = new Date(d.waktu);
      return date.getFullYear() === year;
    });
    filteredIssues = filteredIssues.filter(d => {
      const date = new Date(d.timestamp);
      return date.getFullYear() === year;
    });
  }

  if (filterMonth !== '') {
    const month = parseInt(filterMonth);
    filteredProductivity = filteredProductivity.filter(d => {
      const date = new Date(d.waktu);
      return date.getMonth() === month;
    });
    filteredMatchFactor = filteredMatchFactor.filter(d => {
      const date = new Date(d.waktu);
      return date.getMonth() === month;
    });
    filteredIssues = filteredIssues.filter(d => {
      const date = new Date(d.timestamp);
      return date.getMonth() === month;
    });
  }

  if (filterDay) {
    const day = parseInt(filterDay);
    filteredProductivity = filteredProductivity.filter(d => {
      const date = new Date(d.waktu);
      return date.getDate() === day;
    });
    filteredMatchFactor = filteredMatchFactor.filter(d => {
      const date = new Date(d.waktu);
      return date.getDate() === day;
    });
    filteredIssues = filteredIssues.filter(d => {
      const date = new Date(d.timestamp);
      return date.getDate() === day;
    });
  }

  renderProductivityTable(filteredProductivity);
  renderMatchFactorTable(filteredMatchFactor);
  renderIssuesTable(filteredIssues);
}

// ==========================================
// Export Functions - Comprehensive Format
// ==========================================
async function exportToExcel(type) {
  const data = type === 'productivity' ? AppState.productivityData : AppState.matchFactorData;

  if (data.length === 0) {
    showAlert('Tidak ada data untuk diexport', 'error');
    return;
  }

  try {
    showAlert('Memproses export... mohon tunggu', 'info');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Main Data Table
    const dataSheet = workbook.addWorksheet(type === 'productivity' ? 'Productivity Data' : 'Match Factor Data');

    if (type === 'productivity') {
      dataSheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Pengawas', key: 'namaPengawas', width: 20 },
        { header: 'NRP', key: 'nrp', width: 15 },
        { header: 'Waktu', key: 'waktu', width: 20 },
        { header: 'No Excavator', key: 'noExcavator', width: 15 },
        { header: 'Operator', key: 'namaOperator', width: 20 },
        { header: 'Jenis Material', key: 'jenisMaterial', width: 15 },
        { header: 'Ritase', key: 'jumlahRitase', width: 10 },
        { header: 'HM Awal', key: 'hmAwal', width: 10 },
        { header: 'HM Akhir', key: 'hmAkhir', width: 10 },
        { header: 'Durasi (Jam)', key: 'durasi', width: 12 },
        { header: 'Kapasitas (BCM)', key: 'kapasitas', width: 15 },
        { header: 'Productivity (BCM/Jam)', key: 'productivity', width: 20 },
        { header: 'WH (Menit)', key: 'wh', width: 15 },
        { header: 'Delay (Menit)', key: 'delay', width: 15 }
      ];

      data.forEach((item, index) => {
        const selisihHM = parseFloat(item.hmAkhir) - parseFloat(item.hmAwal);
        const whTarget = Math.ceil(selisihHM);
        const delay = Math.max(0, (whTarget - selisihHM) * 60);
        const wh = selisihHM * 60;
        dataSheet.addRow({
          no: index + 1,
          ...item,
          waktu: formatDateTime(item.waktu),
          wh: wh.toFixed(2),
          delay: delay.toFixed(2)
        });
      });
    } else {
      dataSheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Pengawas', key: 'namaPengawas', width: 20 },
        { header: 'NRP', key: 'nrp', width: 15 },
        { header: 'Waktu', key: 'waktu', width: 20 },
        { header: 'No Excavator', key: 'noExcavator', width: 15 },
        { header: 'Operator', key: 'namaOperator', width: 20 },
        { header: 'Jenis Material', key: 'jenisMaterial', width: 15 },
        { header: 'Jumlah HD', key: 'jumlahHD', width: 12 },
        { header: 'CT Hauler (min)', key: 'cycleTimeHauler', width: 15 },
        { header: 'CT Loader (min)', key: 'cycleTimeLoader', width: 15 },
        { header: 'Match Factor', key: 'matchFactor', width: 15 }
      ];

      data.forEach((item, index) => {
        dataSheet.addRow({
          no: index + 1,
          ...item,
          waktu: formatDateTime(item.waktu)
        });
      });
    }

    // Style header
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: type === 'productivity' ? 'FF4472C4' : 'FF9333EA' }
    };

    // Set all cells in dataSheet to left align
    dataSheet.columns.forEach(col => {
      col.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Sheet 2: Chart Analysis Summary with Images
    const chartSheet = workbook.addWorksheet(type === 'productivity' ? 'Productivity Trend' : 'Match Factor Analysis');

    // Get unique excavators
    const uniqueExcavators = [...new Set(data.map(d => d.noExcavator))];

    chartSheet.columns = [
      { header: 'Excavator', key: 'excavator', width: 15 },
      { header: 'Total Records', key: 'totalRecords', width: 15 },
      { header: type === 'productivity' ? 'Avg Productivity' : 'Avg Match Factor', key: 'average', width: 20 },
      { header: type === 'productivity' ? 'Max Productivity' : 'Max Match Factor', key: 'max', width: 20 },
      { header: type === 'productivity' ? 'Min Productivity' : 'Min Match Factor', key: 'min', width: 20 }
    ];

    uniqueExcavators.forEach(excavatorId => {
      const excavatorData = data.filter(d => d.noExcavator === excavatorId);
      const values = excavatorData.map(d => parseFloat(type === 'productivity' ? d.productivity : d.matchFactor) || 0);

      chartSheet.addRow({
        excavator: excavatorId,
        totalRecords: excavatorData.length,
        average: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
        max: Math.max(...values).toFixed(2),
        min: Math.min(...values).toFixed(2)
      });
    });

    chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    chartSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: type === 'productivity' ? 'FF4472C4' : 'FF9333EA' }
    };

    // Set all cells in chartSheet to left align
    chartSheet.columns.forEach(col => {
      col.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Add chart images
    let currentRow = chartSheet.rowCount + 3;

    for (const excavatorId of uniqueExcavators) {
      const canvasId = type === 'productivity' ? `productivity-${excavatorId}` : `matchfactor-${excavatorId}`;
      const canvas = document.getElementById(canvasId);

      if (canvas) {
        try {
          // Ensure chart is fully rendered before capturing
          const chartImageBase64 = canvas.toDataURL('image/png', 1.0);
          const chartImageId = workbook.addImage({
            base64: chartImageBase64,
            extension: 'png',
          });

          // Add excavator label
          chartSheet.getCell(`A${currentRow}`).value = `Chart - Excavator ${excavatorId}`;
          chartSheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
          currentRow += 1;

          // Calculate proper dimensions maintaining aspect ratio
          const aspectRatio = canvas.width / canvas.height;
          const maxWidth = 500;
          const imageWidth = maxWidth;
          const imageHeight = maxWidth / aspectRatio;

          chartSheet.addImage(chartImageId, {
            tl: { col: 0, row: currentRow },
            ext: { width: imageWidth, height: imageHeight }
          });

          currentRow += Math.ceil(imageHeight / 20) + 2; // Move down based on actual height
        } catch (err) {
          console.warn(`Could not capture chart for ${excavatorId}:`, err);
        }
      }
    }

    // Sheet 3: Issue Log with Photos
    if (AppState.issuesData.length > 0) {
      const issueSheet = workbook.addWorksheet('Issue Log');

      issueSheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Waktu', key: 'waktu', width: 20 },
        { header: 'Excavator', key: 'excavator', width: 15 },
        { header: 'Delay Problem', key: 'delayProblem', width: 40 },
        { header: 'Productivity Problem', key: 'productivityProblem', width: 40 },
        { header: 'Dokumentasi Masalah', key: 'catatan', width: 45 },
        { header: 'Follow Up Perbaikan', key: 'catatanLanjutan', width: 45 },
        { header: 'Foto Dokumentasi', key: 'photos', width: 20 },
        { header: 'Foto Follow Up', key: 'followUpPhotos', width: 20 }
      ];

      // Set consistent width for all photo columns (I onwards) - wide enough to prevent overlap
      for (let col = 9; col <= 30; col++) { // Extended range for both photo types
        issueSheet.getColumn(col).width = 20;
      }

      // Sort issues by timestamp (newest first) - consistent with web dashboard
      const sortedIssues = [...AppState.issuesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      for (let index = 0; index < sortedIssues.length; index++) {
        const issue = sortedIssues[index];

        // Build Delay Problem text with full labels (supports multiple delays)
        const delays = getIssueDelays(issue);
        const delayText = delays.length > 0 ?
          delays.map(delay => {
            let text = `${delay.mainCode} - ${delay.mainLabel}`;
            if (delay.subCode && delay.subLabel) {
              text += ` | ${delay.subCode} - ${delay.subLabel}`;
            }
            if (delay.customText) {
              text += ` | ${delay.customText}`;
            }
            return text;
          }).join('\n') : '-';

        // Build Productivity Problem text with full labels (supports multiple productivities)
        const productivities = getIssueProductivities(issue);
        const prodText = productivities.length > 0 ?
          productivities.map(prod => {
            let text = `${prod.mainCode} - ${prod.mainLabel}`;
            if (prod.subOption) {
              text += ` | ${prod.subOption}`;
            }
            if (prod.customText) {
              text += ` | ${prod.customText}`;
            }
            return text;
          }).join('\n') : '-';

        const rowIndex = issueSheet.addRow({
          no: index + 1,
          waktu: formatDateTime(issue.timestamp),
          excavator: issue.excavator,
          delayProblem: delayText,
          productivityProblem: prodText,
          catatan: issue.notes || '-',
          catatanLanjutan: issue.followUpNotes || '-',
          photos: issue.imageIds && issue.imageIds.length > 0 ? `${issue.imageIds.length} foto` : 'Tidak ada foto',
          followUpPhotos: issue.followUpImageIds && issue.followUpImageIds.length > 0 ? `${issue.followUpImageIds.length} foto` : 'Tidak ada foto'
        }).number;

        // Add Dokumentasi Masalah photos in a horizontal line - one photo per column, starting from column J
        if (issue.imageIds && issue.imageIds.length > 0) {
          const photoHeight = 90;
          const startCol = 9; // Column J (next to "Foto Dokumentasi" column I) - 0-indexed
          const currentRow = rowIndex - 1;

          // Set row height to accommodate photos perfectly
          issueSheet.getRow(rowIndex).height = 70;

          // Place each photo in its own column
          for (let photoIndex = 0; photoIndex < issue.imageIds.length; photoIndex++) {
            try {
              const photoData = await imageStorage.getImage(issue.imageIds[photoIndex]);
              if (photoData && photoData.blob) {
                const base64 = await imageStorage.blobToBase64(photoData.blob);

                const img = new Image();
                img.src = base64;
                await new Promise(resolve => img.onload = resolve);

                // Calculate width maintaining EXACT aspect ratio
                const aspectRatio = img.width / img.height;
                const photoWidth = photoHeight * aspectRatio;

                const imageId = workbook.addImage({
                  base64: base64,
                  extension: 'png',
                });

                // One photo per column - neat and aligned
                // Use tl/br to fit within column boundaries perfectly
                issueSheet.addImage(imageId, {
                  tl: {
                    col: startCol + photoIndex, // Each photo gets its own column
                    row: currentRow,
                    colOff: 5, // Small offset from left edge
                    rowOff: 5  // Small offset from top edge
                  },
                  ext: {
                    width: photoWidth,
                    height: photoHeight
                  }
                });
              }
            } catch (err) {
              console.warn(`Could not load photo ${issue.imageIds[photoIndex]}:`, err);
            }
          }
        }

        // Add Follow Up Perbaikan photos - continue in columns after dokumentasi photos
        if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
          const photoHeight = 90;
          // Calculate start column: base column (9) + number of dokumentasi photos
          const dokPhotoCount = issue.imageIds ? issue.imageIds.length : 0;
          const startCol = 9 + dokPhotoCount; // Start after dokumentasi photos
          const currentRow = rowIndex - 1;

          // Ensure row height is sufficient
          if (issueSheet.getRow(rowIndex).height < 70) {
            issueSheet.getRow(rowIndex).height = 70;
          }

          for (let photoIndex = 0; photoIndex < issue.followUpImageIds.length; photoIndex++) {
            try {
              const photoData = await imageStorage.getImage(issue.followUpImageIds[photoIndex]);
              if (photoData && photoData.blob) {
                const base64 = await imageStorage.blobToBase64(photoData.blob);

                const img = new Image();
                img.src = base64;
                await new Promise(resolve => img.onload = resolve);

                const aspectRatio = img.width / img.height;
                let photoWidth = photoHeight * aspectRatio;

                // Prevent overly wide photos
                if (photoWidth > 120) {
                  photoWidth = 120;
                }

                const imageId = workbook.addImage({
                  base64: base64,
                  extension: 'jpeg',
                });

                issueSheet.addImage(imageId, {
                  tl: {
                    col: startCol + photoIndex,
                    row: currentRow,
                    colOff: 5,
                    rowOff: 5
                  },
                  ext: {
                    width: photoWidth,
                    height: photoHeight
                  }
                });
              }
            } catch (err) {
              console.warn(`Could not load follow-up photo ${issue.followUpImageIds[photoIndex]}:`, err);
            }
          }
        }
      }

      issueSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      issueSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF6B6B' }
      };

      // Set all cells in issueSheet to left align
      issueSheet.columns.forEach(col => {
        col.alignment = { horizontal: 'left', vertical: 'middle' };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartzProd_${type}_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

    showAlert('Export ke Excel berhasil!', 'success');
  } catch (error) {
    console.error('Export Excel error:', error);
    showAlert('Gagal export ke Excel: ' + error.message, 'error');
  }
}

async function exportToPDF(type) {
  const data = type === 'productivity' ? AppState.productivityData : AppState.matchFactorData;

  if (data.length === 0) {
    showAlert('Tidak ada data untuk diexport', 'error');
    return;
  }

  try {
    showAlert('Memproses export... mohon tunggu', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    let yPos = 15;

    // Title
    const title = type === 'productivity' ? 'Laporan Productivity' : 'Laporan Match Factor';
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, 14, yPos);
    yPos += 7;

    // Format date as "2 November 2025, 23.09"
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(':', '.');

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${formattedDate}`, 14, yPos);
    yPos += 10;

    // Section 1: Main Data Table
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`1. ${type === 'productivity' ? 'Productivity' : 'Match Factor'} Data`, 14, yPos);
    yPos += 5;

    let tableData = [];
    let headers = [];

    if (type === 'productivity') {
      headers = [['No', 'Pengawas', 'NRP', 'Waktu', 'No Excavator', 'Operator', 'Jenis Material', 'Ritase', 'HM Awal', 'HM Akhir', 'Durasi (Jam)', 'Kapasitas (BCM)', 'Productivity (BCM/Jam)', 'WH (Menit)', 'Delay (Menit)']];
      tableData = data.map((item, index) => {
        const selisihHM = parseFloat(item.hmAkhir) - parseFloat(item.hmAwal);
        const whTarget = Math.ceil(selisihHM);
        const delay = Math.max(0, (whTarget - selisihHM) * 60);
        const wh = selisihHM * 60;
        return [
          index + 1,
          item.namaPengawas,
          item.nrp,
          formatDateTime(item.waktu),
          item.noExcavator,
          item.namaOperator || '-',
          item.jenisMaterial || '-',
          item.jumlahRitase,
          item.hmAwal,
          item.hmAkhir,
          item.durasi,
          item.kapasitas,
          item.productivity,
          wh.toFixed(2),
          delay.toFixed(2)
        ];
      });
    } else {
      headers = [['No', 'Pengawas', 'NRP', 'Waktu', 'No Excavator', 'Operator', 'Jenis Material', 'Jml HD', 'CT Hauler (min)', 'CT Loader (min)', 'Match Factor']];
      tableData = data.map((item, index) => [
        index + 1,
        item.namaPengawas,
        item.nrp,
        formatDateTime(item.waktu),
        item.noExcavator,
        item.namaOperator || '-',
        item.jenisMaterial || '-',
        item.jumlahHD,
        item.cycleTimeHauler,
        item.cycleTimeLoader,
        item.matchFactor
      ]);
    }

    doc.autoTable({
      head: headers,
      body: tableData,
      startY: yPos,
      styles: { fontSize: 7 },
      headStyles: {
        fillColor: type === 'productivity' ? [68, 114, 196] : [147, 51, 234],
        halign: 'left'
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Section 2: Chart Analysis with Images
    if (yPos > 160) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`2. ${type === 'productivity' ? 'Productivity Trend' : 'Match Factor Analysis'} Summary`, 14, yPos);
    yPos += 5;

    // Get unique excavators
    const uniqueExcavators = [...new Set(data.map(d => d.noExcavator))];
    const chartHeaders = [['Excavator', 'Total Records', 'Average', 'Max', 'Min']];
    const chartData = uniqueExcavators.map(excavatorId => {
      const excavatorData = data.filter(d => d.noExcavator === excavatorId);
      const values = excavatorData.map(d => parseFloat(type === 'productivity' ? d.productivity : d.matchFactor) || 0);

      return [
        excavatorId,
        excavatorData.length,
        (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
        Math.max(...values).toFixed(2),
        Math.min(...values).toFixed(2)
      ];
    });

    doc.autoTable({
      head: chartHeaders,
      body: chartData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: {
        fillColor: type === 'productivity' ? [68, 114, 196] : [147, 51, 234],
        halign: 'left'
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Add chart images for each excavator - each on its own page
    for (let i = 0; i < uniqueExcavators.length; i++) {
      const excavatorId = uniqueExcavators[i];

      // Add new page for each chart (except the first one if there's space)
      if (i > 0 || yPos > 100) {
        doc.addPage();
        yPos = 20;
      }

      const canvasId = type === 'productivity' ? `productivity-${excavatorId}` : `matchfactor-${excavatorId}`;
      const canvas = document.getElementById(canvasId);

      if (canvas) {
        try {
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text(`Chart - Excavator ${excavatorId}`, 14, yPos);
          yPos += 10;

          // Calculate proper dimensions maintaining aspect ratio
          const aspectRatio = canvas.width / canvas.height;
          const maxWidth = 180; // Max width in mm
          const chartWidth = maxWidth;
          const chartHeight = maxWidth / aspectRatio;

          // Center the chart horizontally
          const pageWidth = doc.internal.pageSize.getWidth();
          const xPos = (pageWidth - chartWidth) / 2;

          // Add white background for the chart area
          doc.setFillColor(255, 255, 255);
          doc.rect(xPos, yPos, chartWidth, chartHeight, 'F');

          // Get chart image with maximum quality
          const chartImage = canvas.toDataURL('image/png', 1.0);

          // Add the chart image
          doc.addImage(chartImage, 'PNG', xPos, yPos, chartWidth, chartHeight);
        } catch (err) {
          console.warn(`Could not capture chart for ${excavatorId}:`, err);
        }
      }
    }

    // Section 3: Issue Log with Photos
    if (AppState.issuesData.length > 0) {
      doc.addPage();
      yPos = 15;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('3. Issue Log', 14, yPos);
      yPos += 5;

      // Sort issues by timestamp (newest first) - consistent with web dashboard
      const sortedIssues = [...AppState.issuesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const issueHeaders = [['No', 'Waktu', 'Excavator', 'Delay Problem', 'Productivity Problem', 'Dokumentasi Masalah', 'Follow Up Perbaikan']];
      const issueTableData = sortedIssues.map((issue, index) => {
        // Build Delay Problem text with full labels
        let delayText = '-';
        if (issue.delay) {
          const { mainCode, mainLabel, subCode, subLabel, customText } = issue.delay;
          delayText = `${mainCode} - ${mainLabel}`;
          if (subCode && subLabel) {
            delayText += ` | ${subCode} - ${subLabel}`;
          }
          if (customText) {
            delayText += ` | ${customText}`;
          }
        }

        // Build Productivity Problem text with full labels
        let prodText = '-';
        if (issue.productivity) {
          const { mainCode, mainLabel, subOption, customText } = issue.productivity;
          prodText = `Kat. ${mainCode}: ${mainLabel}`;
          if (subOption) {
            prodText += ` | ${subOption}`;
          }
          if (customText) {
            prodText += ` | ${customText}`;
          }
        }

        return [
          index + 1,
          formatDateTime(issue.timestamp),
          issue.excavator,
          delayText,
          prodText,
          issue.notes || '-',
          issue.followUpNotes || '-'
        ];
      });

      doc.autoTable({
        head: issueHeaders,
        body: issueTableData,
        startY: yPos,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [255, 107, 107],
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 10 }, // No
          1: { cellWidth: 25 }, // Waktu
          2: { cellWidth: 20 }, // Excavator
          3: { cellWidth: 35 }, // Delay Problem
          4: { cellWidth: 35 }, // Productivity Problem
          5: { cellWidth: 35 }, // Dokumentasi Masalah
          6: { cellWidth: 35 }  // Follow Up Perbaikan
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Add issue photos (both Dokumentasi and Follow-up)
      for (let index = 0; index < sortedIssues.length; index++) {
        const issue = sortedIssues[index];

        // Process Dokumentasi Masalah photos
        if (issue.imageIds && issue.imageIds.length > 0) {
          const maxPhotoSize = 45; // Max size in mm
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 14;
          const bottomMargin = 20;

          // Start issue header
          if (yPos > pageHeight - bottomMargin - 15) {
            doc.addPage();
            yPos = 15;
          }

          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`Issue #${index + 1} - ${issue.excavator} - Dokumentasi Masalah (${issue.imageIds.length} foto)`, margin, yPos);
          yPos += 8;

          let xPos = margin;
          let photosInCurrentRow = 0;
          const photosPerRow = 4;
          let maxHeightInCurrentRow = 0;

          for (let photoIndex = 0; photoIndex < issue.imageIds.length; photoIndex++) {
            try {
              const photoData = await imageStorage.getImage(issue.imageIds[photoIndex]);
              if (photoData && photoData.blob) {
                const base64 = await imageStorage.blobToBase64(photoData.blob);

                // Create temporary image to get dimensions
                const img = new Image();
                img.src = base64;
                await new Promise(resolve => img.onload = resolve);

                // Calculate dimensions maintaining aspect ratio
                const aspectRatio = img.width / img.height;
                let photoWidth, photoHeight;
                if (aspectRatio > 1) {
                  photoWidth = maxPhotoSize;
                  photoHeight = maxPhotoSize / aspectRatio;
                } else {
                  photoHeight = maxPhotoSize;
                  photoWidth = maxPhotoSize * aspectRatio;
                }

                // Track max height in this row
                maxHeightInCurrentRow = Math.max(maxHeightInCurrentRow, photoHeight);

                // Check if this photo would exceed page height
                if (yPos + photoHeight > pageHeight - bottomMargin) {
                  // Move to new page
                  doc.addPage();
                  yPos = 15;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;
                }

                // Check if we need to wrap to next row (exceeded page width)
                if (photosInCurrentRow > 0 && xPos + maxPhotoSize + 5 > pageWidth - margin) {
                  // Move to next row
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;

                  // Check again if new row fits on page
                  if (yPos + photoHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    yPos = 15;
                  }
                }

                // Add white background
                doc.setFillColor(255, 255, 255);
                doc.rect(xPos, yPos, photoWidth, photoHeight, 'F');

                // Add border
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.rect(xPos, yPos, photoWidth, photoHeight);

                // Add image with slight padding
                doc.addImage(base64, 'JPEG', xPos + 1, yPos + 1, photoWidth - 2, photoHeight - 2);

                // Move to next position
                xPos += maxPhotoSize + 5;
                photosInCurrentRow++;

                // Force new row after photosPerRow photos
                if (photosInCurrentRow >= photosPerRow && photoIndex < issue.imageIds.length - 1) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = 0;
                }
              }
            } catch (err) {
              console.warn(`Could not load photo ${issue.imageIds[photoIndex]}:`, err);
            }
          }

          // Move past the last row of photos
          if (photosInCurrentRow > 0) {
            yPos += maxHeightInCurrentRow + 10;
          } else {
            yPos += 5;
          }
        }

        // Process Follow Up Perbaikan photos
        if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
          const maxPhotoSize = 45;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 14;
          const bottomMargin = 20;

          // Start follow-up header
          if (yPos > pageHeight - bottomMargin - 15) {
            doc.addPage();
            yPos = 15;
          }

          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`Issue #${index + 1} - ${issue.excavator} - Follow Up Perbaikan (${issue.followUpImageIds.length} foto)`, margin, yPos);
          yPos += 8;

          let xPos = margin;
          let photosInCurrentRow = 0;
          const photosPerRow = 4;
          let maxHeightInCurrentRow = 0;

          for (let photoIndex = 0; photoIndex < issue.followUpImageIds.length; photoIndex++) {
            try {
              const photoData = await imageStorage.getImage(issue.followUpImageIds[photoIndex]);
              if (photoData && photoData.blob) {
                const base64 = await imageStorage.blobToBase64(photoData.blob);

                const img = new Image();
                img.src = base64;
                await new Promise(resolve => img.onload = resolve);

                const aspectRatio = img.width / img.height;
                let photoWidth, photoHeight;
                if (aspectRatio > 1) {
                  photoWidth = maxPhotoSize;
                  photoHeight = maxPhotoSize / aspectRatio;
                } else {
                  photoHeight = maxPhotoSize;
                  photoWidth = maxPhotoSize * aspectRatio;
                }

                maxHeightInCurrentRow = Math.max(maxHeightInCurrentRow, photoHeight);

                if (yPos + photoHeight > pageHeight - bottomMargin) {
                  doc.addPage();
                  yPos = 15;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;
                }

                if (photosInCurrentRow > 0 && xPos + maxPhotoSize + 5 > pageWidth - margin) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;

                  if (yPos + photoHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    yPos = 15;
                  }
                }

                doc.setFillColor(255, 255, 255);
                doc.rect(xPos, yPos, photoWidth, photoHeight, 'F');

                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.rect(xPos, yPos, photoWidth, photoHeight);

                doc.addImage(base64, 'JPEG', xPos + 1, yPos + 1, photoWidth - 2, photoHeight - 2);

                xPos += maxPhotoSize + 5;
                photosInCurrentRow++;

                if (photosInCurrentRow >= photosPerRow && photoIndex < issue.followUpImageIds.length - 1) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = 0;
                }
              }
            } catch (err) {
              console.warn(`Could not load follow-up photo ${issue.followUpImageIds[photoIndex]}:`, err);
            }
          }

          if (photosInCurrentRow > 0) {
            yPos += maxHeightInCurrentRow + 10;
          } else {
            yPos += 5;
          }
        }
      }
    }

    doc.save(`SmartzProd_${type}_${new Date().getTime()}.pdf`);
    showAlert('Export ke PDF berhasil!', 'success');
  } catch (error) {
    console.error('Export PDF error:', error);
    showAlert('Gagal export ke PDF: ' + error.message, 'error');
  }
}

// ==========================================
// Share PDF via Web Share API (Same as Export PDF)
// ==========================================
async function sharePDFToWhatsApp(type) {
  const data = type === 'productivity' ? AppState.productivityData : AppState.matchFactorData;

  if (data.length === 0) {
    showAlert('Tidak ada data untuk dibagikan', 'error');
    return;
  }

  // Check if Web Share API is supported
  // Note: We check support but don't block - fallback to download if sharing unavailable
  const webShareSupported = typeof navigator.share === 'function';
  const canShareFiles = (file) => {
    try {
      return navigator.canShare && navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  try {
    showAlert('Memproses PDF... mohon tunggu', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    let yPos = 15;

    // Title
    const title = type === 'productivity' ? 'Laporan Productivity' : 'Laporan Match Factor';
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, 14, yPos);
    yPos += 7;

    // Format date as "2 November 2025, 23.09"
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(':', '.');

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${formattedDate}`, 14, yPos);
    yPos += 10;

    // Section 1: Main Data Table
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`1. ${type === 'productivity' ? 'Productivity' : 'Match Factor'} Data`, 14, yPos);
    yPos += 5;

    let tableData = [];
    let headers = [];

    if (type === 'productivity') {
      headers = [['No', 'Pengawas', 'NRP', 'Waktu', 'No Excavator', 'Operator', 'Jenis Material', 'Ritase', 'HM Awal', 'HM Akhir', 'Durasi (Jam)', 'Kapasitas (BCM)', 'Productivity (BCM/Jam)', 'WH (Menit)', 'Delay (Menit)']];
      tableData = data.map((item, index) => {
        const selisihHM = parseFloat(item.hmAkhir) - parseFloat(item.hmAwal);
        const whTarget = Math.ceil(selisihHM);
        const delay = Math.max(0, (whTarget - selisihHM) * 60);
        const wh = selisihHM * 60;
        return [
          index + 1,
          item.namaPengawas,
          item.nrp,
          formatDateTime(item.waktu),
          item.noExcavator,
          item.namaOperator || '-',
          item.jenisMaterial || '-',
          item.jumlahRitase,
          item.hmAwal,
          item.hmAkhir,
          item.durasi,
          item.kapasitas,
          item.productivity,
          wh.toFixed(2),
          delay.toFixed(2)
        ];
      });
    } else {
      headers = [['No', 'Pengawas', 'NRP', 'Waktu', 'No Excavator', 'Operator', 'Jenis Material', 'Jml HD', 'CT Hauler (min)', 'CT Loader (min)', 'Match Factor']];
      tableData = data.map((item, index) => [
        index + 1,
        item.namaPengawas,
        item.nrp,
        formatDateTime(item.waktu),
        item.noExcavator,
        item.namaOperator || '-',
        item.jenisMaterial || '-',
        item.jumlahHD,
        item.cycleTimeHauler,
        item.cycleTimeLoader,
        item.matchFactor
      ]);
    }

    doc.autoTable({
      head: headers,
      body: tableData,
      startY: yPos,
      styles: { fontSize: 7 },
      headStyles: {
        fillColor: type === 'productivity' ? [68, 114, 196] : [147, 51, 234],
        halign: 'left'
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Section 2: Chart Analysis with Images
    if (yPos > 160) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`2. ${type === 'productivity' ? 'Productivity Trend' : 'Match Factor Analysis'} Summary`, 14, yPos);
    yPos += 5;

    // Get unique excavators
    const uniqueExcavators = [...new Set(data.map(d => d.noExcavator))];
    const chartHeaders = [['Excavator', 'Total Records', 'Average', 'Max', 'Min']];
    const chartData = uniqueExcavators.map(excavatorId => {
      const excavatorData = data.filter(d => d.noExcavator === excavatorId);
      const values = excavatorData.map(d => parseFloat(type === 'productivity' ? d.productivity : d.matchFactor) || 0);

      return [
        excavatorId,
        excavatorData.length,
        (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
        Math.max(...values).toFixed(2),
        Math.min(...values).toFixed(2)
      ];
    });

    doc.autoTable({
      head: chartHeaders,
      body: chartData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: {
        fillColor: type === 'productivity' ? [68, 114, 196] : [147, 51, 234],
        halign: 'left'
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Add chart images for each excavator - each on its own page
    for (let i = 0; i < uniqueExcavators.length; i++) {
      const excavatorId = uniqueExcavators[i];

      // Add new page for each chart (except the first one if there's space)
      if (i > 0 || yPos > 100) {
        doc.addPage();
        yPos = 20;
      }

      const canvasId = type === 'productivity' ? `productivity-${excavatorId}` : `matchfactor-${excavatorId}`;
      const canvas = document.getElementById(canvasId);

      if (canvas) {
        try {
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text(`Chart - Excavator ${excavatorId}`, 14, yPos);
          yPos += 10;

          // Calculate proper dimensions maintaining aspect ratio
          const aspectRatio = canvas.width / canvas.height;
          const maxWidth = 180;
          const chartWidth = maxWidth;
          const chartHeight = maxWidth / aspectRatio;

          // Center the chart horizontally
          const pageWidth = doc.internal.pageSize.getWidth();
          const xPos = (pageWidth - chartWidth) / 2;

          // Add white background
          doc.setFillColor(255, 255, 255);
          doc.rect(xPos, yPos, chartWidth, chartHeight, 'F');

          // Get chart image
          const chartImage = canvas.toDataURL('image/png', 1.0);

          // Add the chart image
          doc.addImage(chartImage, 'PNG', xPos, yPos, chartWidth, chartHeight);
        } catch (err) {
          console.warn(`Could not capture chart for ${excavatorId}:`, err);
        }
      }
    }

    // Section 3: Issue Log with Photos
    if (AppState.issuesData.length > 0) {
      doc.addPage();
      yPos = 15;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('3. Issue Log', 14, yPos);
      yPos += 5;

      // Sort issues by timestamp (newest first) - consistent with web dashboard
      const sortedIssues = [...AppState.issuesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const issueHeaders = [['No', 'Waktu', 'Excavator', 'Delay Problem', 'Productivity Problem', 'Dokumentasi Masalah', 'Follow Up Perbaikan']];
      const issueTableData = sortedIssues.map((issue, index) => {
        let delayText = '-';
        if (issue.delay) {
          const { mainCode, mainLabel, subCode, subLabel, customText } = issue.delay;
          delayText = `${mainCode} - ${mainLabel}`;
          if (subCode && subLabel) {
            delayText += ` | ${subCode} - ${subLabel}`;
          }
          if (customText) {
            delayText += ` | ${customText}`;
          }
        }

        let prodText = '-';
        if (issue.productivity) {
          const { mainCode, mainLabel, subOption, customText } = issue.productivity;
          prodText = `Kat. ${mainCode}: ${mainLabel}`;
          if (subOption) {
            prodText += ` | ${subOption}`;
          }
          if (customText) {
            prodText += ` | ${customText}`;
          }
        }

        return [
          index + 1,
          formatDateTime(issue.timestamp),
          issue.excavator,
          delayText,
          prodText,
          issue.notes || '-',
          issue.followUpNotes || '-'
        ];
      });

      doc.autoTable({
        head: issueHeaders,
        body: issueTableData,
        startY: yPos,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [255, 107, 107],
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 },
          6: { cellWidth: 35 }
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Add issue photos (both Dokumentasi and Follow-up)
      for (let index = 0; index < sortedIssues.length; index++) {
        const issue = sortedIssues[index];

        // Process Dokumentasi Masalah photos
        if (issue.imageIds && issue.imageIds.length > 0) {
          const maxPhotoSize = 45;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 14;
          const bottomMargin = 20;

          if (yPos > pageHeight - bottomMargin - 15) {
            doc.addPage();
            yPos = 15;
          }

          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`Issue #${index + 1} - ${issue.excavator} - Dokumentasi Masalah (${issue.imageIds.length} foto)`, margin, yPos);
          yPos += 8;

          let xPos = margin;
          let photosInCurrentRow = 0;
          const photosPerRow = 4;
          let maxHeightInCurrentRow = 0;

          for (let photoIndex = 0; photoIndex < issue.imageIds.length; photoIndex++) {
            try {
              const photoData = await imageStorage.getImage(issue.imageIds[photoIndex]);
              if (photoData && photoData.blob) {
                const base64 = await imageStorage.blobToBase64(photoData.blob);

                const img = new Image();
                img.src = base64;
                await new Promise(resolve => img.onload = resolve);

                const aspectRatio = img.width / img.height;
                let photoWidth, photoHeight;
                if (aspectRatio > 1) {
                  photoWidth = maxPhotoSize;
                  photoHeight = maxPhotoSize / aspectRatio;
                } else {
                  photoHeight = maxPhotoSize;
                  photoWidth = maxPhotoSize * aspectRatio;
                }

                maxHeightInCurrentRow = Math.max(maxHeightInCurrentRow, photoHeight);

                if (yPos + photoHeight > pageHeight - bottomMargin) {
                  doc.addPage();
                  yPos = 15;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;
                }

                if (photosInCurrentRow > 0 && xPos + maxPhotoSize + 5 > pageWidth - margin) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;

                  if (yPos + photoHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    yPos = 15;
                  }
                }

                doc.setFillColor(255, 255, 255);
                doc.rect(xPos, yPos, photoWidth, photoHeight, 'F');

                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.rect(xPos, yPos, photoWidth, photoHeight);

                doc.addImage(base64, 'JPEG', xPos + 1, yPos + 1, photoWidth - 2, photoHeight - 2);

                xPos += maxPhotoSize + 5;
                photosInCurrentRow++;

                if (photosInCurrentRow >= photosPerRow && photoIndex < issue.imageIds.length - 1) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = 0;
                }
              }
            } catch (err) {
              console.warn(`Could not load photo ${issue.imageIds[photoIndex]}:`, err);
            }
          }

          if (photosInCurrentRow > 0) {
            yPos += maxHeightInCurrentRow + 10;
          } else {
            yPos += 5;
          }
        }

        // Process Follow Up Perbaikan photos
        if (issue.followUpImageIds && issue.followUpImageIds.length > 0) {
          const maxPhotoSize = 45;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 14;
          const bottomMargin = 20;

          if (yPos > pageHeight - bottomMargin - 15) {
            doc.addPage();
            yPos = 15;
          }

          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`Issue #${index + 1} - ${issue.excavator} - Follow Up Perbaikan (${issue.followUpImageIds.length} foto)`, margin, yPos);
          yPos += 8;

          let xPos = margin;
          let photosInCurrentRow = 0;
          const photosPerRow = 4;
          let maxHeightInCurrentRow = 0;

          for (let photoIndex = 0; photoIndex < issue.followUpImageIds.length; photoIndex++) {
            try {
              const photoData = await imageStorage.getImage(issue.followUpImageIds[photoIndex]);
              if (photoData && photoData.blob) {
                const base64 = await imageStorage.blobToBase64(photoData.blob);

                const img = new Image();
                img.src = base64;
                await new Promise(resolve => img.onload = resolve);

                const aspectRatio = img.width / img.height;
                let photoWidth, photoHeight;
                if (aspectRatio > 1) {
                  photoWidth = maxPhotoSize;
                  photoHeight = maxPhotoSize / aspectRatio;
                } else {
                  photoHeight = maxPhotoSize;
                  photoWidth = maxPhotoSize * aspectRatio;
                }

                maxHeightInCurrentRow = Math.max(maxHeightInCurrentRow, photoHeight);

                if (yPos + photoHeight > pageHeight - bottomMargin) {
                  doc.addPage();
                  yPos = 15;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;
                }

                if (photosInCurrentRow > 0 && xPos + maxPhotoSize + 5 > pageWidth - margin) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = photoHeight;

                  if (yPos + photoHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    yPos = 15;
                  }
                }

                doc.setFillColor(255, 255, 255);
                doc.rect(xPos, yPos, photoWidth, photoHeight, 'F');

                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.rect(xPos, yPos, photoWidth, photoHeight);

                doc.addImage(base64, 'JPEG', xPos + 1, yPos + 1, photoWidth - 2, photoHeight - 2);

                xPos += maxPhotoSize + 5;
                photosInCurrentRow++;

                if (photosInCurrentRow >= photosPerRow && photoIndex < issue.followUpImageIds.length - 1) {
                  yPos += maxHeightInCurrentRow + 5;
                  xPos = margin;
                  photosInCurrentRow = 0;
                  maxHeightInCurrentRow = 0;
                }
              }
            } catch (err) {
              console.warn(`Could not load follow-up photo ${issue.followUpImageIds[photoIndex]}:`, err);
            }
          }

          if (photosInCurrentRow > 0) {
            yPos += maxHeightInCurrentRow + 10;
          } else {
            yPos += 5;
          }
        }
      }
    }

    // Get PDF as blob
    const pdfBlob = doc.output('blob');
    const fileName = `SmartzProd_${type}_${new Date().getTime()}.pdf`;

    // Create File object from blob
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Generate summary text for sharing (do this BEFORE sharing attempt so clipboard is ready)
    const excavatorList = [...new Set(data.map(d => d.noExcavator))];
    const pengawasList = [...new Set(data.map(d => d.namaPengawas))];

    let summaryText = `📊 *${title}*\n`;
    summaryText += `📅 ${formattedDate}\n`;
    summaryText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Pengawas Information
    summaryText += `👤 *Pengawas:*\n`;
    const uniquePengawas = [...new Set(data.map(d => `${d.namaPengawas} (NRP: ${d.nrp})`))];
    uniquePengawas.forEach(pengawas => {
      summaryText += `• ${pengawas}\n`;
    });
    summaryText += `\n`;

    if (type === 'productivity') {
      // Calculate productivity statistics
      const totalRecords = data.length;
      const productivityValues = data.map(d => d.productivity);
      const avgProductivity = (productivityValues.reduce((a, b) => a + b, 0) / totalRecords).toFixed(2);
      const maxProductivity = Math.max(...productivityValues).toFixed(2);
      const minProductivity = Math.min(...productivityValues).toFixed(2);
      const totalRitase = data.reduce((sum, d) => sum + d.jumlahRitase, 0);

      summaryText += `📈 *Ringkasan Data:*\n`;
      summaryText += `• Total Records: ${totalRecords}\n`;
      summaryText += `• Jumlah Excavator: ${excavatorList.length}\n`;
      summaryText += `• Pengawas: ${pengawasList.length}\n\n`;

      summaryText += `⚙️ *Productivity:*\n`;
      summaryText += `• Rata-rata: ${avgProductivity} BCM/Jam\n`;
      summaryText += `• Tertinggi: ${maxProductivity} BCM/Jam\n`;
      summaryText += `• Terendah: ${minProductivity} BCM/Jam\n`;
      summaryText += `• Total Ritase: ${totalRitase}\n\n`;

      // Detailed Excavator breakdown with problems
      summaryText += `🚜 *Detail Per Excavator:*\n\n`;
      excavatorList.forEach(exc => {
        const excData = data.filter(d => d.noExcavator === exc).sort((a, b) => {
          return new Date(a.waktu) - new Date(b.waktu);
        });
        const excAvg = (excData.reduce((sum, d) => sum + d.productivity, 0) / excData.length).toFixed(2);

        // Get pengawas name for this excavator (use first record's pengawas)
        const pengawasName = excData[0]?.namaPengawas || '';

        summaryText += `*${exc}* | (Pengawas: ${pengawasName})\n`;
        summaryText += `Rata-rata: ${excAvg} BCM/Jam\n\n`;

        excData.forEach((record, idx) => {
          const time = new Date(record.waktu);
          const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
          const selisihHM = parseFloat(record.hmAkhir) - parseFloat(record.hmAwal);
          const whTarget = Math.ceil(selisihHM);
          const delay = Math.max(0, (whTarget - selisihHM) * 60);
          const wh = selisihHM * 60;

          summaryText += `${String.fromCharCode(65 + idx)}. Jam ${timeStr} (${record.productivity} BCM/Jam)\n`;
          summaryText += `   • Operator: ${record.namaOperator || '-'}\n`;
          summaryText += `   • Jenis Material: ${record.jenisMaterial || '-'}\n`;
          summaryText += `   • Ritase: ${record.jumlahRitase}\n`;
          summaryText += `   • HM Awal: ${record.hmAwal}\n`;
          summaryText += `   • HM Akhir: ${record.hmAkhir}\n`;
          summaryText += `   • WH (Menit): ${wh.toFixed(2)}\n`;
          summaryText += `   • Delay (Menit): ${delay.toFixed(2)}\n`;

          // Find related issues for this excavator
          const relatedIssues = AppState.issuesData.filter(issue => {
            // Must match excavator (issue uses 'excavator' not 'noExcavator')
            if (issue.excavator !== exc) return false;

            // Check if issue has a time and matches (issue uses 'timestamp' not 'waktu')
            if (issue.timestamp) {
              const issueTime = new Date(issue.timestamp);
              const recordTime = new Date(record.waktu);

              // Match only if same hour on the same date
              const sameHour = issueTime.getHours() === recordTime.getHours() &&
                issueTime.getDate() === recordTime.getDate() &&
                issueTime.getMonth() === recordTime.getMonth();

              return sameHour;
            }

            // If no time on issue, still include if same excavator
            return true;
          });

          if (relatedIssues.length > 0) {
            // Collect all delay problems (supports multiple delays per issue)
            const delayProblems = [];
            const prodProblems = [];

            relatedIssues.forEach(issue => {
              // Get all delays from this issue (with backward compatibility)
              const delays = getIssueDelays(issue);
              delays.forEach(delay => {
                let delayText = `${delay.mainCode} ‧ ${delay.mainLabel}`;
                if (delay.subLabel) delayText += ` - ${delay.subLabel}`;
                if (delay.customText) delayText += ` (${delay.customText})`;
                delayProblems.push(delayText);
              });

              // Get all productivities from this issue (with backward compatibility)
              const productivities = getIssueProductivities(issue);
              productivities.forEach(prod => {
                let prodText = `Kat. ${prod.mainCode} ‧ ${prod.mainLabel}`;
                if (prod.subOption) prodText += ` - ${prod.subOption}`;
                if (prod.customText) prodText += ` (${prod.customText})`;
                prodProblems.push(prodText);
              });
            });

            // Remove duplicates
            const uniqueDelayProblems = [...new Set(delayProblems)];
            const uniqueProdProblems = [...new Set(prodProblems)];

            // Format Delay Problems
            if (uniqueDelayProblems.length > 0) {
              summaryText += `   • Problem Delay:\n`;
              uniqueDelayProblems.forEach(problem => {
                summaryText += `     ~ ${problem}\n`;
              });
            }

            // Format Productivity Problems
            if (uniqueProdProblems.length > 0) {
              summaryText += `   • Problem Productivity:\n`;
              uniqueProdProblems.forEach(problem => {
                summaryText += `     ~ ${problem}\n`;
              });
            }
          }
          summaryText += `\n`;
        });
      });
    } else {
      // Match Factor statistics
      const totalRecords = data.length;
      const mfValues = data.map(d => d.matchFactor);
      const avgMF = (mfValues.reduce((a, b) => a + b, 0) / totalRecords).toFixed(2);
      const maxMF = Math.max(...mfValues).toFixed(2);
      const minMF = Math.min(...mfValues).toFixed(2);

      summaryText += `📈 *Ringkasan Data:*\n`;
      summaryText += `• Total Records: ${totalRecords}\n`;
      summaryText += `• Jumlah Excavator: ${excavatorList.length}\n`;
      summaryText += `• Pengawas: ${pengawasList.length}\n\n`;

      summaryText += `⚖️ *Match Factor:*\n`;
      summaryText += `• Rata-rata: ${avgMF}\n`;
      summaryText += `• Tertinggi: ${maxMF}\n`;
      summaryText += `• Terendah: ${minMF}\n`;

      // Status indication
      const avgNum = parseFloat(avgMF);
      if (avgNum >= 0.9 && avgNum <= 1.1) {
        summaryText += `• Status: ✅ Optimal (0.9-1.1)\n\n`;
      } else if (avgNum < 0.9) {
        summaryText += `• Status: ⚠️ Under Match (<0.9)\n\n`;
      } else {
        summaryText += `• Status: ⚠️ Over Match (>1.1)\n\n`;
      }

      // Detailed Excavator breakdown with problems
      summaryText += `🚜 *Detail Per Excavator:*\n\n`;
      excavatorList.forEach(exc => {
        const excData = data.filter(d => d.noExcavator === exc).sort((a, b) => {
          return new Date(a.waktu) - new Date(b.waktu);
        });
        const excAvg = (excData.reduce((sum, d) => sum + d.matchFactor, 0) / excData.length).toFixed(2);

        // Get pengawas name for this excavator (use first record's pengawas)
        const pengawasName = excData[0]?.namaPengawas || '';

        summaryText += `*${exc}* | (Pengawas: ${pengawasName})\n`;
        summaryText += `Rata-rata: ${excAvg}\n\n`;

        excData.forEach((record, idx) => {
          const time = new Date(record.waktu);
          const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

          summaryText += `${String.fromCharCode(65 + idx)}. Jam ${timeStr} (MF: ${record.matchFactor})\n`;
          summaryText += `   • Operator: ${record.namaOperator || '-'}\n`;
          summaryText += `   • Jenis Material: ${record.jenisMaterial || '-'}\n`;
          summaryText += `   • Jumlah HD: ${record.jumlahHD}\n`;
          summaryText += `   • CT Hauler: ${record.cycleTimeHauler} min\n`;
          summaryText += `   • CT Loader: ${record.cycleTimeLoader} min\n`;

          // Find related issues for this excavator
          const relatedIssues = AppState.issuesData.filter(issue => {
            // Must match excavator (issue uses 'excavator' not 'noExcavator')
            if (issue.excavator !== exc) return false;

            // Check if issue has a time and matches (issue uses 'timestamp' not 'waktu')
            if (issue.timestamp) {
              const issueTime = new Date(issue.timestamp);
              const recordTime = new Date(record.waktu);

              // Match only if same hour on the same date
              const sameHour = issueTime.getHours() === recordTime.getHours() &&
                issueTime.getDate() === recordTime.getDate() &&
                issueTime.getMonth() === recordTime.getMonth();

              return sameHour;
            }

            // If no time on issue, still include if same excavator
            return true;
          });

          if (relatedIssues.length > 0) {
            // Collect all delay problems (supports multiple delays per issue)
            const delayProblems = [];
            const prodProblems = [];

            relatedIssues.forEach(issue => {
              // Get all delays from this issue (with backward compatibility)
              const delays = getIssueDelays(issue);
              delays.forEach(delay => {
                let delayText = `${delay.mainCode} ‧ ${delay.mainLabel}`;
                if (delay.subLabel) delayText += ` - ${delay.subLabel}`;
                if (delay.customText) delayText += ` (${delay.customText})`;
                delayProblems.push(delayText);
              });

              // Get all productivities from this issue (with backward compatibility)
              const productivities = getIssueProductivities(issue);
              productivities.forEach(prod => {
                let prodText = `Kat. ${prod.mainCode} ‧ ${prod.mainLabel}`;
                if (prod.subOption) prodText += ` - ${prod.subOption}`;
                if (prod.customText) prodText += ` (${prod.customText})`;
                prodProblems.push(prodText);
              });
            });

            // Remove duplicates
            const uniqueDelayProblems = [...new Set(delayProblems)];
            const uniqueProdProblems = [...new Set(prodProblems)];

            // Format Delay Problems
            if (uniqueDelayProblems.length > 0) {
              summaryText += `   • Problem Delay:\n`;
              uniqueDelayProblems.forEach(problem => {
                summaryText += `     ~ ${problem}\n`;
              });
            }

            // Format Productivity Problems
            if (uniqueProdProblems.length > 0) {
              summaryText += `   • Problem Productivity:\n`;
              uniqueProdProblems.forEach(problem => {
                summaryText += `     ~ ${problem}\n`;
              });
            }
          }
          summaryText += `\n`;
        });
      });
    }

    // Add issue log summary if available
    if (AppState.issuesData.length > 0) {
      summaryText += `\n⚠️ *Issue Log:*\n`;
      summaryText += `• Total Issues: ${AppState.issuesData.length}\n`;
      const issuesWithPhotos = AppState.issuesData.filter(i => i.imageIds && i.imageIds.length > 0).length;
      if (issuesWithPhotos > 0) {
        summaryText += `• Issues dengan foto: ${issuesWithPhotos}\n`;
      }
    }

    summaryText += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    summaryText += `📱 SmartzProd - Mining Productivity Tracker`;

    // Copy summary text to clipboard FIRST (before any share attempt)
    // This ensures caption is available regardless of share outcome
    let clipboardSuccess = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
        clipboardSuccess = true;
      }
    } catch (clipboardError) {
      console.warn('Could not copy to clipboard:', clipboardError);
    }

    // Attempt to share using Web Share API with graceful fallback
    if (webShareSupported && canShareFiles(pdfFile)) {
      // Browser supports file sharing - use Web Share API
      try {
        await navigator.share({
          files: [pdfFile]
        });

        if (clipboardSuccess) {
          showAlert('PDF berhasil dibagikan! Caption sudah disalin ke clipboard.', 'success');
        } else {
          showAlert('PDF berhasil dibagikan!', 'success');
        }
      } catch (shareError) {
        if (shareError.name === 'AbortError') {
          showAlert('Pembagian dibatalkan', 'info');
        } else {
          // Share failed - fallback to download
          console.warn('Share failed, falling back to download:', shareError);
          doc.save(fileName);
          if (clipboardSuccess) {
            showAlert('Caption disalin ke clipboard! PDF diunduh karena sharing gagal.', 'success');
          } else {
            showAlert('PDF berhasil diunduh.', 'success');
          }
        }
      }
    } else {
      // Browser doesn't support file sharing - fallback to download
      doc.save(fileName);
      if (clipboardSuccess) {
        showAlert('Caption disalin ke clipboard! PDF diunduh (browser tidak mendukung share file).', 'success');
      } else {
        showAlert('PDF berhasil diunduh.', 'success');
      }
    }
  } catch (error) {
    console.error('Share PDF error:', error);
    showAlert('Gagal memproses PDF: ' + error.message, 'error');
  }
}

// ==========================================
// Export Individual Excavator Data (Productivity)
// ==========================================
window.exportProductivityData = async function (excavatorId, format) {
  try {
    // Filter data for this excavator
    const productivityData = AppState.productivityData.filter(d => d.noExcavator === excavatorId);
    const issuesData = AppState.issuesData.filter(d => d.excavator === excavatorId);

    if (productivityData.length === 0) {
      showAlert('Tidak ada data productivity untuk excavator ini', 'error');
      return;
    }

    if (format === 'excel') {
      await exportProductivityToExcel(excavatorId, productivityData, issuesData);
    } else if (format === 'pdf') {
      await exportProductivityToPDF(excavatorId, productivityData, issuesData);
    }
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Gagal export data: ' + error.message, 'error');
  }
};

async function exportProductivityToExcel(excavatorId, productivityData, issuesData) {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Productivity Table
  const prodSheet = workbook.addWorksheet('Productivity Data');

  prodSheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Pengawas', key: 'namaPengawas', width: 20 },
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Shift', key: 'shift', width: 10 },
    { header: 'Produktivitas (BCM/Jam)', key: 'produktivitas', width: 20 }
  ];

  productivityData.forEach((row, index) => {
    prodSheet.addRow({
      no: index + 1,
      namaPengawas: row.namaPengawas,
      tanggal: row.tanggal,
      shift: row.shift,
      produktivitas: row.produktivitas
    });
  });

  prodSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  prodSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Sheet 2: Chart Analysis Summary
  const chartSheet = workbook.addWorksheet('Chart Analysis');
  chartSheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const values = productivityData.map(d => parseFloat(d.produktivitas));
  const avgProd = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2);
  const maxProd = Math.max(...values).toFixed(2);
  const minProd = Math.min(...values).toFixed(2);

  chartSheet.addRow({ metric: 'Excavator', value: excavatorId });
  chartSheet.addRow({ metric: 'Total Records', value: productivityData.length });
  chartSheet.addRow({ metric: 'Average Productivity (BCM/Jam)', value: avgProd });
  chartSheet.addRow({ metric: 'Max Productivity (BCM/Jam)', value: maxProd });
  chartSheet.addRow({ metric: 'Min Productivity (BCM/Jam)', value: minProd });

  chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  chartSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Sheet 3: Issue Log
  if (issuesData.length > 0) {
    const issueSheet = workbook.addWorksheet('Issue Log');

    issueSheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Waktu', key: 'waktu', width: 20 },
      { header: 'Excavator', key: 'excavator', width: 15 },
      { header: 'Delay Problem', key: 'delayProblem', width: 30 },
      { header: 'Productivity Problem', key: 'productivityProblem', width: 30 },
      { header: 'Catatan', key: 'catatan', width: 40 },
      { header: 'Catatan Lanjutan', key: 'catatanLanjutan', width: 40 },
      { header: 'Jumlah Foto', key: 'photoCount', width: 12 }
    ];

    for (let index = 0; index < issuesData.length; index++) {
      const issue = issuesData[index];

      const delayText = issue.delay ?
        `${issue.delay.mainCode} - ${issue.delay.subCode || ''}${issue.delay.customText ? ': ' + issue.delay.customText : ''}` : '-';

      const prodText = issue.productivity ?
        `${issue.productivity.mainCode} - ${issue.productivity.subOption || ''}${issue.productivity.customText ? ': ' + issue.productivity.customText : ''}` : '-';

      issueSheet.addRow({
        no: index + 1,
        waktu: formatDateTime(issue.timestamp),
        excavator: issue.excavator,
        delayProblem: delayText,
        productivityProblem: prodText,
        catatan: issue.notes || '-',
        catatanLanjutan: issue.followUpNotes || '-',
        photoCount: issue.imageIds ? issue.imageIds.length : 0
      });
    }

    issueSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    issueSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' }
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Productivity_EX${excavatorId}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);

  showAlert(`✅ Excel file for Excavator ${excavatorId} has been downloaded successfully!`, 'success');
}

async function exportProductivityToPDF(excavatorId, productivityData, issuesData) {

  prodSheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Pengawas', key: 'namaPengawas', width: 20 },
    { header: 'NRP', key: 'nrp', width: 15 },
    { header: 'Waktu', key: 'waktu', width: 20 },
    { header: 'No Excavator', key: 'noExcavator', width: 15 },
    { header: 'Ritase', key: 'jumlahRitase', width: 10 },
    { header: 'HM Awal', key: 'hmAwal', width: 10 },
    { header: 'HM Akhir', key: 'hmAkhir', width: 10 },
    { header: 'Durasi (Jam)', key: 'durasi', width: 12 },
    { header: 'Kapasitas (BCM)', key: 'kapasitas', width: 15 },
    { header: 'Productivity (BCM/Jam)', key: 'productivity', width: 20 }
  ];

  productivityData.forEach((item, index) => {
    prodSheet.addRow({
      no: index + 1,
      ...item,
      waktu: formatDateTime(item.waktu)
    });
  });

  // Style header
  prodSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  prodSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Sheet 2: Chart Summary
  const chartSheet = workbook.addWorksheet('Chart Summary');
  chartSheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const avgProd = (productivityData.reduce((sum, d) => sum + parseFloat(d.productivity || 0), 0) / productivityData.length).toFixed(2);
  const maxProd = Math.max(...productivityData.map(d => parseFloat(d.productivity || 0))).toFixed(2);
  const minProd = Math.min(...productivityData.map(d => parseFloat(d.productivity || 0))).toFixed(2);

  chartSheet.addRow({ metric: 'Excavator', value: excavatorId });
  chartSheet.addRow({ metric: 'Total Records', value: productivityData.length });
  chartSheet.addRow({ metric: 'Average Productivity (BCM/Jam)', value: avgProd });
  chartSheet.addRow({ metric: 'Max Productivity (BCM/Jam)', value: maxProd });
  chartSheet.addRow({ metric: 'Min Productivity (BCM/Jam)', value: minProd });

  chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  chartSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Sheet 3: Issue Log
  if (issuesData.length > 0) {
    const issueSheet = workbook.addWorksheet('Issue Log');

    issueSheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Waktu', key: 'waktu', width: 20 },
      { header: 'Excavator', key: 'excavator', width: 15 },
      { header: 'Delay Problem', key: 'delayProblem', width: 30 },
      { header: 'Productivity Problem', key: 'productivityProblem', width: 30 },
      { header: 'Catatan', key: 'catatan', width: 40 },
      { header: 'Catatan Lanjutan', key: 'catatanLanjutan', width: 40 },
      { header: 'Jumlah Foto', key: 'photoCount', width: 12 }
    ];

    for (let index = 0; index < issuesData.length; index++) {
      const issue = issuesData[index];

      const delayText = issue.delay ?
        `${issue.delay.mainCode} - ${issue.delay.subCode || ''}${issue.delay.customText ? ': ' + issue.delay.customText : ''}` : '-';

      const prodText = issue.productivity ?
        `${issue.productivity.mainCode} - ${issue.productivity.subOption || ''}${issue.productivity.customText ? ': ' + issue.productivity.customText : ''}` : '-';

      issueSheet.addRow({
        no: index + 1,
        waktu: formatDateTime(issue.timestamp),
        excavator: issue.excavator,
        delayProblem: delayText,
        productivityProblem: prodText,
        catatan: issue.notes || '-',
        catatanLanjutan: issue.followUpNotes || '-',
        photoCount: issue.imageIds ? issue.imageIds.length : 0
      });
    }

    issueSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    issueSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' }
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Productivity_${excavatorId}_${new Date().getTime()}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);

  showToast('Export Productivity ke Excel berhasil!', 'success');
}

async function exportProductivityToPDF(excavatorId, productivityData, issuesData) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4');
  let yPos = 15;

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(`Laporan Productivity - Excavator ${excavatorId}`, 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
  yPos += 10;

  // Section 1: Productivity Table
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('1. Productivity Data', 14, yPos);
  yPos += 5;

  const prodHeaders = [['No', 'Pengawas', 'NRP', 'Waktu', 'Ritase', 'HM Awal', 'HM Akhir', 'Durasi', 'Kapasitas', 'Productivity']];
  const prodTableData = productivityData.map((item, index) => [
    index + 1,
    item.namaPengawas,
    item.nrp,
    formatDateTime(item.waktu),
    item.jumlahRitase,
    item.hmAwal,
    item.hmAkhir,
    item.durasi,
    item.kapasitas,
    item.productivity
  ]);

  doc.autoTable({
    head: prodHeaders,
    body: prodTableData,
    startY: yPos,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [68, 114, 196] }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Section 2: Chart Summary
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('2. Productivity Trend Summary', 14, yPos);
  yPos += 5;

  const avgProd = (productivityData.reduce((sum, d) => sum + parseFloat(d.productivity || 0), 0) / productivityData.length).toFixed(2);
  const maxProd = Math.max(...productivityData.map(d => parseFloat(d.productivity || 0))).toFixed(2);
  const minProd = Math.min(...productivityData.map(d => parseFloat(d.productivity || 0))).toFixed(2);

  const summaryHeaders = [['Metric', 'Value']];
  const summaryData = [
    ['Total Records', productivityData.length],
    ['Average Productivity (BCM/Jam)', avgProd],
    ['Max Productivity (BCM/Jam)', maxProd],
    ['Min Productivity (BCM/Jam)', minProd]
  ];

  doc.autoTable({
    head: summaryHeaders,
    body: summaryData,
    startY: yPos,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [68, 114, 196] }
  });

  // Section 3: Issue Log
  if (issuesData.length > 0) {
    yPos = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (yPos > 160) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('3. Issue Log', 14, yPos);
    yPos += 5;

    const issueHeaders = [['No', 'Waktu', 'Delay Problem', 'Productivity Problem', 'Catatan', 'Foto']];
    const issueTableData = issuesData.map((issue, index) => {
      // Format multiple delays (with backward compatibility)
      const delays = getIssueDelays(issue);
      const delayText = delays.length > 0 ?
        delays.map(d => `${d.mainCode}-${d.subCode || ''}`).join(', ') : '-';

      // Format multiple productivities (with backward compatibility)
      const productivities = getIssueProductivities(issue);
      const prodText = productivities.length > 0 ?
        productivities.map(p => `${p.mainCode}-${p.subOption || ''}`).join(', ') : '-';

      return [
        index + 1,
        formatDateTime(issue.timestamp),
        delayText,
        prodText,
        (issue.notes || '-').substring(0, 50) + (issue.notes && issue.notes.length > 50 ? '...' : ''),
        issue.imageIds ? issue.imageIds.length : 0
      ];
    });

    doc.autoTable({
      head: issueHeaders,
      body: issueTableData,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 107, 107] }
    });
  }

  doc.save(`Productivity_${excavatorId}_${new Date().getTime()}.pdf`);
  showToast('Export Productivity ke PDF berhasil!', 'success');
}

// ==========================================
// Export Individual Excavator Data (Match Factor)
// ==========================================
window.exportMatchFactorData = async function (excavatorId, format) {
  try {
    // Filter data for this excavator
    const matchFactorData = AppState.matchFactorData.filter(d => d.noExcavator === excavatorId);
    const issuesData = AppState.issuesData.filter(d => d.excavator === excavatorId);

    if (matchFactorData.length === 0) {
      showAlert('Tidak ada data match factor untuk excavator ini', 'error');
      return;
    }

    if (format === 'excel') {
      await exportMatchFactorToExcel(excavatorId, matchFactorData, issuesData);
    } else if (format === 'pdf') {
      await exportMatchFactorToPDF(excavatorId, matchFactorData, issuesData);
    }
  } catch (error) {
    console.error('Export error:', error);
    showAlert('Gagal export data: ' + error.message, 'error');
  }
};

async function exportMatchFactorToExcel(excavatorId, matchFactorData, issuesData) {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Match Factor Table
  const mfSheet = workbook.addWorksheet('Match Factor Data');

  mfSheet.columns = [
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

  matchFactorData.forEach((item, index) => {
    mfSheet.addRow({
      no: index + 1,
      ...item,
      waktu: formatDateTime(item.waktu)
    });
  });

  // Style header
  mfSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  mfSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF9333EA' }
  };

  // Sheet 2: Chart Summary
  const chartSheet = workbook.addWorksheet('Chart Summary');
  chartSheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const avgMF = (matchFactorData.reduce((sum, d) => sum + parseFloat(d.matchFactor || 0), 0) / matchFactorData.length).toFixed(2);
  const maxMF = Math.max(...matchFactorData.map(d => parseFloat(d.matchFactor || 0))).toFixed(2);
  const minMF = Math.min(...matchFactorData.map(d => parseFloat(d.matchFactor || 0))).toFixed(2);

  chartSheet.addRow({ metric: 'Excavator', value: excavatorId });
  chartSheet.addRow({ metric: 'Total Records', value: matchFactorData.length });
  chartSheet.addRow({ metric: 'Average Match Factor', value: avgMF });
  chartSheet.addRow({ metric: 'Max Match Factor', value: maxMF });
  chartSheet.addRow({ metric: 'Min Match Factor', value: minMF });

  chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  chartSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF9333EA' }
  };

  // Sheet 3: Issue Log
  if (issuesData.length > 0) {
    const issueSheet = workbook.addWorksheet('Issue Log');

    issueSheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Waktu', key: 'waktu', width: 20 },
      { header: 'Excavator', key: 'excavator', width: 15 },
      { header: 'Delay Problem', key: 'delayProblem', width: 30 },
      { header: 'Productivity Problem', key: 'productivityProblem', width: 30 },
      { header: 'Catatan', key: 'catatan', width: 40 },
      { header: 'Catatan Lanjutan', key: 'catatanLanjutan', width: 40 },
      { header: 'Jumlah Foto', key: 'photoCount', width: 12 }
    ];

    for (let index = 0; index < issuesData.length; index++) {
      const issue = issuesData[index];

      const delayText = issue.delay ?
        `${issue.delay.mainCode} - ${issue.delay.subCode || ''}${issue.delay.customText ? ': ' + issue.delay.customText : ''}` : '-';

      const prodText = issue.productivity ?
        `${issue.productivity.mainCode} - ${issue.productivity.subOption || ''}${issue.productivity.customText ? ': ' + issue.productivity.customText : ''}` : '-';

      issueSheet.addRow({
        no: index + 1,
        waktu: formatDateTime(issue.timestamp),
        excavator: issue.excavator,
        delayProblem: delayText,
        productivityProblem: prodText,
        catatan: issue.notes || '-',
        catatanLanjutan: issue.followUpNotes || '-',
        photoCount: issue.imageIds ? issue.imageIds.length : 0
      });
    }

    issueSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    issueSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' }
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MatchFactor_${excavatorId}_${new Date().getTime()}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);

  showToast('Export Match Factor ke Excel berhasil!', 'success');
}

async function exportMatchFactorToPDF(excavatorId, matchFactorData, issuesData) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4');
  let yPos = 15;

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(`Laporan Match Factor - Excavator ${excavatorId}`, 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
  yPos += 10;

  // Section 1: Match Factor Table
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('1. Match Factor Data', 14, yPos);
  yPos += 5;

  const mfHeaders = [['No', 'Pengawas', 'NRP', 'Waktu', 'Jml HD', 'CT Hauler', 'CT Loader', 'Match Factor']];
  const mfTableData = matchFactorData.map((item, index) => [
    index + 1,
    item.namaPengawas,
    item.nrp,
    formatDateTime(item.waktu),
    item.jumlahHD,
    item.cycleTimeHauler,
    item.cycleTimeLoader,
    item.matchFactor
  ]);

  doc.autoTable({
    head: mfHeaders,
    body: mfTableData,
    startY: yPos,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [147, 51, 234] }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Section 2: Chart Summary
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('2. Match Factor Analysis Summary', 14, yPos);
  yPos += 5;

  const avgMF = (matchFactorData.reduce((sum, d) => sum + parseFloat(d.matchFactor || 0), 0) / matchFactorData.length).toFixed(2);
  const maxMF = Math.max(...matchFactorData.map(d => parseFloat(d.matchFactor || 0))).toFixed(2);
  const minMF = Math.min(...matchFactorData.map(d => parseFloat(d.matchFactor || 0))).toFixed(2);

  const summaryHeaders = [['Metric', 'Value']];
  const summaryData = [
    ['Total Records', matchFactorData.length],
    ['Average Match Factor', avgMF],
    ['Max Match Factor', maxMF],
    ['Min Match Factor', minMF]
  ];

  doc.autoTable({
    head: summaryHeaders,
    body: summaryData,
    startY: yPos,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [147, 51, 234] }
  });

  // Section 3: Issue Log
  if (issuesData.length > 0) {
    yPos = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (yPos > 160) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('3. Issue Log', 14, yPos);
    yPos += 5;

    const issueHeaders = [['No', 'Waktu', 'Delay Problem', 'Productivity Problem', 'Catatan', 'Foto']];
    const issueTableData = issuesData.map((issue, index) => {
      // Format multiple delays (with backward compatibility)
      const delays = getIssueDelays(issue);
      const delayText = delays.length > 0 ?
        delays.map(d => `${d.mainCode}-${d.subCode || ''}`).join(', ') : '-';

      // Format multiple productivities (with backward compatibility)
      const productivities = getIssueProductivities(issue);
      const prodText = productivities.length > 0 ?
        productivities.map(p => `${p.mainCode}-${p.subOption || ''}`).join(', ') : '-';

      return [
        index + 1,
        formatDateTime(issue.timestamp),
        delayText,
        prodText,
        (issue.notes || '-').substring(0, 50) + (issue.notes && issue.notes.length > 50 ? '...' : ''),
        issue.imageIds ? issue.imageIds.length : 0
      ];
    });

    doc.autoTable({
      head: issueHeaders,
      body: issueTableData,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 107, 107] }
    });
  }

  doc.save(`MatchFactor_${excavatorId}_${new Date().getTime()}.pdf`);
  showToast('Export Match Factor ke PDF berhasil!', 'success');
}

// ==========================================
// LocalStorage Functions
// ==========================================
function saveToLocalStorage() {
  try {
    // Check storage space before saving
    const issuesSize = JSON.stringify(AppState.issuesData).length;
    const totalSize = issuesSize + JSON.stringify(AppState.productivityData).length + JSON.stringify(AppState.matchFactorData).length;
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`💾 Attempting to save ${sizeMB}MB to localStorage`);
    console.log(`   - Issues: ${(issuesSize / (1024 * 1024)).toFixed(2)}MB (${AppState.issuesData.length} records)`);

    // Warn if approaching 5MB limit
    if (totalSize > 5 * 1024 * 1024) {
      console.warn('⚠️ Storage size exceeds 5MB, might fail in some browsers');
      showAlert(`Warning: Data berukuran ${sizeMB}MB, mungkin melebihi limit browser. Pertimbangkan untuk menghapus foto lama.`, 'warning');
    }

    localStorage.setItem('productivityData', JSON.stringify(AppState.productivityData));
    localStorage.setItem('matchFactorData', JSON.stringify(AppState.matchFactorData));
    localStorage.setItem('issuesData', JSON.stringify(AppState.issuesData));
    console.log('✅ Data saved successfully');
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error);

    if (error.name === 'QuotaExceededError') {
      showAlert(
        'Penyimpanan penuh! Silakan hapus beberapa foto atau issue lama. Gunakan fitur Backup untuk menyimpan data ke file.',
        'error'
      );
    } else {
      showAlert('Gagal menyimpan data ke localStorage', 'error');
    }
  }
}

function loadFromLocalStorage() {
  const productivity = localStorage.getItem('productivityData');
  const matchFactor = localStorage.getItem('matchFactorData');
  const issues = localStorage.getItem('issuesData');

  console.log('🔄 loadFromLocalStorage called:');
  console.log('  productivity exists:', !!productivity, 'length:', productivity?.length);
  console.log('  matchFactor exists:', !!matchFactor, 'length:', matchFactor?.length);
  console.log('  issues exists:', !!issues, 'length:', issues?.length);

  // Load all datasets first (without rendering)
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

  if (issues) {
    AppState.issuesData = JSON.parse(issues);
    console.log('  ✅ Loaded issues:', AppState.issuesData.length, 'records');
  }

  // Now render everything together (after all datasets loaded)
  if (productivity) {
    renderProductivityTable();
    updateProductivityChart();
  }

  if (matchFactor) {
    renderMatchFactorTable();
    updateMatchFactorChart();
  }

  if (issues) {
    renderIssuesTable();
  }

  updateTotalRecords();

  // Load and display last update timestamp
  const lastUpdateTimestamp = localStorage.getItem('lastUpdateTimestamp');
  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl && lastUpdateTimestamp) {
    const savedDate = new Date(lastUpdateTimestamp);
    lastUpdateEl.textContent = savedDate.toLocaleString('id-ID');
  }

  // Run migration for old base64 photos (one-time automatic migration)
  migrateBase64PhotosToIndexedDB();
}

/**
 * Migrate old base64 photos to IndexedDB (one-time migration)
 * Converts issue.photo (base64) to issue.imageIds (IndexedDB references)
 */
async function migrateBase64PhotosToIndexedDB() {
  // Check if migration is needed
  const needsMigration = AppState.issuesData.some(issue => issue.photo && !issue.imageIds);

  if (!needsMigration) {
    console.log('✅ No base64 photos to migrate');
    return;
  }

  console.log('🔄 Starting migration: base64 photos → IndexedDB');

  let migratedCount = 0;
  let failedCount = 0;

  for (const issue of AppState.issuesData) {
    // Skip if already migrated or no photo
    if (!issue.photo || issue.imageIds) continue;

    try {
      // Convert base64 to blob
      const base64Data = issue.photo;
      const blob = await imageStorage.base64ToBlob(base64Data, 'image/jpeg');

      // Store in IndexedDB
      const imageId = await imageStorage.storeImage(blob, issue.id.toString());

      // Update issue record
      issue.imageIds = [imageId];
      delete issue.photo; // Remove old base64 data

      migratedCount++;
      console.log(`✅ Migrated photo for issue ${issue.id}`);
    } catch (error) {
      console.error(`❌ Failed to migrate photo for issue ${issue.id}:`, error);
      failedCount++;
    }
  }

  if (migratedCount > 0) {
    // Save updated data
    saveToLocalStorage();

    const msg = `Migrated ${migratedCount} photo(s) to IndexedDB${failedCount > 0 ? ` (${failedCount} failed)` : ''}`;
    console.log(`✅ Migration complete: ${msg}`);
    showToast(msg, 'success');
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
async function backupData() {
  try {
    showAlert('Menyiapkan backup (termasuk foto dari IndexedDB)...', 'info');

    // Export images from IndexedDB
    let imagesBackup = [];
    try {
      imagesBackup = await imageStorage.exportImages();
      console.log(`✅ Exported ${imagesBackup.length} images from IndexedDB`);
    } catch (error) {
      console.warn('Failed to export images:', error);
      showAlert('Peringatan: Foto mungkin tidak terbackup!', 'warning');
    }

    // Collect all data from localStorage
    const backupData = {
      version: '3.0.0', // Bumped version for IndexedDB support
      exportDate: new Date().toISOString(),
      productivityData: AppState.productivityData,
      matchFactorData: AppState.matchFactorData,
      issuesData: AppState.issuesData,
      imagesData: imagesBackup, // New: Include IndexedDB images
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
        totalIssues: AppState.issuesData.length,
        totalImages: imagesBackup.length,
        totalRecords: AppState.productivityData.length + AppState.matchFactorData.length + AppState.issuesData.length,
        backupSizeEstimate: JSON.stringify(imagesBackup).length
      }
    };

    // Convert to JSON
    const jsonString = JSON.stringify(backupData, null, 2);
    const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);

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

    const msg = `Backup berhasil! ${backupData.metadata.totalProductivity} Productivity + ${backupData.metadata.totalMatchFactor} Match Factor + ${backupData.metadata.totalIssues} Issues + ${imagesBackup.length} foto (${sizeInMB}MB)`;
    showToast(msg, 'success');
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

  reader.onload = async function (e) {
    try {
      const backupData = JSON.parse(e.target.result);

      // Validate backup data structure
      if (!backupData.productivityData || !backupData.matchFactorData) {
        throw new Error('Format backup tidak valid');
      }

      // Get current photo count from IndexedDB
      let currentPhotoCount = 0;
      try {
        const storageInfo = await imageStorage.getStorageInfo();
        currentPhotoCount = storageInfo.count || 0;
      } catch (error) {
        console.warn('Could not get current photo count:', error);
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

      const currentTotal = AppState.productivityData.length + AppState.matchFactorData.length + AppState.issuesData.length;

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
                <tr class="border-b border-gray-200">
                  <td class="py-2 sm:py-3">
                    <div class="flex items-center gap-1.5 sm:gap-2">
                      <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span class="text-[10px] sm:text-xs font-medium text-gray-700">Issues Log</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-xs font-bold">
                      ${backupData.metadata.totalIssues || 0}
                    </span>
                  </td>
                  ${currentTotal > 0 ? `
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-200 text-gray-600 rounded-full text-[10px] sm:text-xs font-medium">
                      ${AppState.issuesData.length}
                    </span>
                  </td>
                  ` : ''}
                </tr>
                <tr class="border-b border-gray-200">
                  <td class="py-2 sm:py-3">
                    <div class="flex items-center gap-1.5 sm:gap-2">
                      <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span class="text-[10px] sm:text-xs font-medium text-gray-700">Photos</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-bold">
                      ${backupData.metadata.totalImages || 0}
                    </span>
                  </td>
                  ${currentTotal > 0 ? `
                  <td class="text-center">
                    <span class="inline-flex items-center justify-center min-w-[50px] sm:min-w-[60px] px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-200 text-gray-600 rounded-full text-[10px] sm:text-xs font-medium">
                      ${currentPhotoCount}
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

async function restoreData(backupData) {
  try {
    showAlert('Memulai restore data...', 'info');

    // Restore data to AppState
    AppState.productivityData = backupData.productivityData || [];
    AppState.matchFactorData = backupData.matchFactorData || [];
    AppState.issuesData = backupData.issuesData || [];

    // Restore IndexedDB images if present
    if (backupData.imagesData && backupData.imagesData.length > 0) {
      try {
        showAlert(`Memulihkan ${backupData.imagesData.length} foto ke IndexedDB...`, 'info');

        // Clear existing images first
        await imageStorage.clearAll();

        // Import images
        await imageStorage.importImages(backupData.imagesData);

        console.log(`✅ Restored ${backupData.imagesData.length} images to IndexedDB`);
      } catch (error) {
        console.error('Failed to restore images:', error);
        showAlert('Peringatan: Foto mungkin tidak terrestore!', 'warning');
      }
    }

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
    renderIssuesTable();
    updateProductivityChart();
    updateMatchFactorChart();
    updateFilterOptions();
    updateTotalRecords();
    updateLastUpdate();

    const imageMsg = backupData.imagesData && backupData.imagesData.length > 0
      ? ` + ${backupData.imagesData.length} foto`
      : '';
    showToast(
      `Restore berhasil! ${backupData.metadata.totalProductivity || 0} Productivity + ${backupData.metadata.totalMatchFactor || 0} Match Factor + ${backupData.metadata.totalIssues || 0} Issues${imageMsg} dipulihkan`,
      'success'
    );

    // Optional: Scroll to top to show the results
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {
    console.error('Restore data error:', error);
    showToast('Gagal restore data: ' + error.message, 'error');
  }
}

// ==========================================
// Clear All Data Function
// ==========================================
async function clearAllData() {
  showConfirm(
    'Hapus Semua Data?',
    'Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup jika diperlukan.',
    'trash',
    'red',
    async () => {
      try {
        showAlert('Menghapus semua data...', 'info');

        // Clear AppState
        AppState.productivityData = [];
        AppState.matchFactorData = [];
        AppState.issuesData = [];
        AppState.selectedExcavator = '';

        // Clear localStorage
        localStorage.removeItem('productivityData');
        localStorage.removeItem('matchFactorData');
        localStorage.removeItem('issuesData');

        // Clear all images from IndexedDB
        await imageStorage.clearAll();

        // Update UI
        renderProductivityTable();
        renderMatchFactorTable();
        renderIssuesTable();
        updateProductivityChart();
        updateMatchFactorChart();

        // Reset excavator filter
        const excavatorFilter = document.getElementById('excavatorFilter');
        if (excavatorFilter) {
          excavatorFilter.value = '';
        }

        showToast('Semua data berhasil dihapus', 'success');
      } catch (error) {
        console.error('Clear data error:', error);
        showToast('Gagal menghapus data: ' + error.message, 'error');
      }
    }
  );
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

// ==========================================
// Storage Usage Utility (localStorage + IndexedDB)
// ==========================================

/**
 * Calculate localStorage usage in bytes (UTF-8 accurate)
 * @returns {number} Total bytes used by localStorage
 */
function getLocalStorageBytes() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const value = localStorage.getItem(key) || '';
      // Measure UTF-8 bytes accurately using Blob
      total += new Blob([key]).size + new Blob([value]).size;
    }
  } catch (e) {
    console.warn('Error calculating localStorage size:', e);
  }
  return total;
}

/**
 * Get all IndexedDB databases and calculate approximate size
 * @returns {Promise<Object>} Object with dbNames array and total approximate bytes
 */
async function getIndexedDBInfo() {
  const result = { dbNames: [], approximateBytes: 0, details: [] };

  try {
    // Get all database names
    if (indexedDB.databases) {
      const databases = await indexedDB.databases();
      result.dbNames = databases.map(db => db.name);

      // For each database, try to open and estimate size
      for (const dbInfo of databases) {
        try {
          const dbSize = await estimateIndexedDBSize(dbInfo.name);
          result.details.push({
            name: dbInfo.name,
            version: dbInfo.version,
            approximateBytes: dbSize
          });
          result.approximateBytes += dbSize;
        } catch (e) {
          console.warn(`Could not estimate size for IndexedDB: ${dbInfo.name}`, e);
        }
      }
    } else {
      console.log('indexedDB.databases() not supported in this browser. Cannot enumerate DBs.');
    }
  } catch (e) {
    console.warn('Error getting IndexedDB info:', e);
  }

  return result;
}

/**
 * Estimate IndexedDB database size by reading all object stores
 * @param {string} dbName - Database name
 * @returns {Promise<number>} Approximate size in bytes
 */
function estimateIndexedDBSize(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error);

    request.onsuccess = (event) => {
      const db = event.target.result;
      let totalSize = 0;
      const objectStoreNames = Array.from(db.objectStoreNames);

      if (objectStoreNames.length === 0) {
        db.close();
        resolve(0);
        return;
      }

      try {
        const transaction = db.transaction(objectStoreNames, 'readonly');
        let completedStores = 0;

        objectStoreNames.forEach(storeName => {
          const objectStore = transaction.objectStore(storeName);
          const getAllRequest = objectStore.getAll();

          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            // Estimate size by JSON stringifying all records
            try {
              const jsonSize = new Blob([JSON.stringify(records)]).size;
              totalSize += jsonSize;
            } catch (e) {
              console.warn(`Could not stringify records from ${storeName}:`, e);
            }

            completedStores++;
            if (completedStores === objectStoreNames.length) {
              db.close();
              resolve(totalSize);
            }
          };

          getAllRequest.onerror = () => {
            completedStores++;
            if (completedStores === objectStoreNames.length) {
              db.close();
              resolve(totalSize);
            }
          };
        });
      } catch (e) {
        db.close();
        reject(e);
      }
    };
  });
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Show comprehensive storage usage in console
 * Displays localStorage, IndexedDB, and browser quota info
 * 
 * Usage: Call `showStorageUsage()` from browser console or page
 */
async function showStorageUsage() {
  console.log('%c=== Storage Usage Report ===', 'color: #4CAF50; font-weight: bold; font-size: 16px;');
  console.log('Generated at:', new Date().toLocaleString());
  console.log('');

  // localStorage info
  console.log('%c[localStorage]', 'color: #2196F3; font-weight: bold;');
  const localBytes = getLocalStorageBytes();
  const localEntries = localStorage.length;
  console.log('  Entries:', localEntries);
  console.log('  Size:', formatBytes(localBytes), `(${localBytes.toLocaleString()} bytes)`);

  // Show all localStorage keys
  if (localEntries > 0) {
    console.log('  Keys:');
    for (let i = 0; i < localEntries; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const keySize = new Blob([key]).size;
      const valueSize = new Blob([value]).size;
      console.log(`    - "${key}": ${formatBytes(keySize + valueSize)}`);
    }
  }
  console.log('');

  // IndexedDB info
  console.log('%c[IndexedDB]', 'color: #FF9800; font-weight: bold;');
  const idbInfo = await getIndexedDBInfo();

  if (idbInfo.dbNames.length === 0) {
    console.log('  No IndexedDB databases found.');
  } else {
    console.log('  Databases found:', idbInfo.dbNames.length);
    console.log('  Total approximate size:', formatBytes(idbInfo.approximateBytes),
      `(${idbInfo.approximateBytes.toLocaleString()} bytes)`);
    console.log('  Database details:');
    idbInfo.details.forEach(db => {
      console.log(`    - "${db.name}" (v${db.version}): ${formatBytes(db.approximateBytes)}`);
    });
  }
  console.log('');

  // Browser storage estimate (quota)
  console.log('%c[Browser Storage Quota]', 'color: #9C27B0; font-weight: bold;');
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota * 100).toFixed(2) : 0;

      console.log('  Total origin usage:', formatBytes(usage), `(${usage.toLocaleString()} bytes)`);
      console.log('  Origin quota:', formatBytes(quota), `(${quota.toLocaleString()} bytes)`);
      console.log('  Percent used:', percentUsed + '%');

      // Show breakdown if available (Chrome provides usageDetails)
      if (estimate.usageDetails) {
        console.log('  Usage breakdown:');
        Object.entries(estimate.usageDetails).forEach(([key, value]) => {
          console.log(`    - ${key}: ${formatBytes(value)}`);
        });
      }
    } catch (e) {
      console.warn('  Could not get storage estimate:', e);
    }
  } else {
    console.log('  navigator.storage.estimate() not supported in this browser.');
  }
  console.log('');

  // Combined summary
  const combinedBytes = localBytes + idbInfo.approximateBytes;
  console.log('%c[Combined Summary]', 'color: #4CAF50; font-weight: bold;');
  console.log('  localStorage + IndexedDB (approx):', formatBytes(combinedBytes),
    `(${combinedBytes.toLocaleString()} bytes)`);
  console.log('');
  console.log('%c=== End of Report ===', 'color: #4CAF50; font-weight: bold;');
}

// Expose globally for console access
window.showStorageUsage = showStorageUsage;

// Auto-run on page load (optional - comment out if you prefer manual calls)
// showStorageUsage();
