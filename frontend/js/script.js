// HosteliQ - AI-Enhanced Search & Working Filters

console.log('🚀 HosteliQ JavaScript Loading (AI Search + Working Filters)...');

// AI Search Configuration
const AI_SEARCH_CONFIG = {
  suggestions: {
    students: [
      'computer science students', 'engineering students', 'first year students',
      'male students', 'female students', 'students without rooms',
      'active students', 'recent registrations'
    ],
    rooms: [
      'available rooms', 'single rooms', 'double rooms', 'ac rooms',
      'wifi rooms', 'male rooms', 'female rooms', 'ground floor rooms',
      'cheap rooms under 5000', 'premium rooms', 'vacant rooms'
    ],
    bookings: [
      'pending bookings', 'approved bookings', 'recent bookings',
      'semester bookings', 'academic year bookings', 'rejected bookings',
      'booking requests', 'active reservations'
    ]
  },

  // Smart search patterns for natural language
  patterns: {
    rooms: {
      'available': (rooms) => rooms.filter(r => r.status === 'Available'),
      'single': (rooms) => rooms.filter(r => r.roomType === 'Single'),
      'double': (rooms) => rooms.filter(r => r.roomType === 'Double'),
      'triple': (rooms) => rooms.filter(r => r.roomType === 'Triple'),
      'male': (rooms) => rooms.filter(r => r.gender === 'Male'),
      'female': (rooms) => rooms.filter(r => r.gender === 'Female'),
      'mixed': (rooms) => rooms.filter(r => r.gender === 'Mixed'),
      'ac': (rooms) => rooms.filter(r => r.facilities.includes('AC')),
      'wifi': (rooms) => rooms.filter(r => r.facilities.includes('WiFi')),
      'bathroom': (rooms) => rooms.filter(r => r.facilities.includes('Attached Bathroom')),
      'ground floor': (rooms) => rooms.filter(r => r.floor === 0),
      'first floor': (rooms) => rooms.filter(r => r.floor === 1),
      'cheap': (rooms) => rooms.filter(r => r.rent < 5000),
      'expensive': (rooms) => rooms.filter(r => r.rent > 8000),
      'vacant': (rooms) => rooms.filter(r => r.currentOccupancy === 0),
    },
    students: {
      'computer science': (students) => students.filter(s => s.course.toLowerCase().includes('computer')),
      'engineering': (students) => students.filter(s => s.course.toLowerCase().includes('engineering')),
      'first year': (students) => students.filter(s => s.year === 1),
      'second year': (students) => students.filter(s => s.year === 2),
      'third year': (students) => students.filter(s => s.year === 3),
      'fourth year': (students) => students.filter(s => s.year === 4),
      'male': (students) => students.filter(s => s.gender === 'Male'),
      'female': (students) => students.filter(s => s.gender === 'Female'),
      'without room': (students) => students.filter(s => !s.roomId),
      'with room': (students) => students.filter(s => s.roomId),
    },
    bookings: {
      'pending': (bookings) => bookings.filter(b => b.status === 'Pending'),
      'approved': (bookings) => bookings.filter(b => b.status === 'Approved'),
      'rejected': (bookings) => bookings.filter(b => b.status === 'Rejected'),
      'active': (bookings) => bookings.filter(b => b.status === 'Active'),
      'semester': (bookings) => bookings.filter(b => b.duration === 'Semester'),
      'academic year': (bookings) => bookings.filter(b => b.duration === 'Academic Year'),
      'summer': (bookings) => bookings.filter(b => b.duration === 'Summer'),
      'recent': (bookings) => bookings.filter(b => {
        const bookingDate = new Date(b.createdAt || b.startDate);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return bookingDate > weekAgo;
      })
    }
  }
};

// API Configuration (same as before)
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('hosteliQ_token');

// Global state with filters
let appState = {
  students: [],
  rooms: [],
  bookings: [],
  filters: {
    students: { search: '', year: '', course: '' },
    rooms: { search: '', status: '', type: '', gender: '', floor: '' },
    bookings: { search: '', status: '' }
  },
  currentPage: 'dashboard'
};

// AI-Powered Smart Search Function
function performSmartSearch(query, dataType) {
  if (!query.trim()) return appState[dataType];

  const data = appState[dataType];
  const lowerQuery = query.toLowerCase().trim();

  // Check for AI patterns first
  const patterns = AI_SEARCH_CONFIG.patterns[dataType] || {};

  // Apply multiple pattern matches
  let filteredData = data;
  for (const [pattern, filterFn] of Object.entries(patterns)) {
    if (lowerQuery.includes(pattern)) {
      filteredData = filterFn(filteredData);
    }
  }

  // If patterns matched, return filtered data
  if (filteredData.length !== data.length) {
    return filteredData;
  }

  // Fallback to traditional search
  return performTraditionalSearch(query, data, dataType);
}

// Traditional Search with Fuzzy Matching
function performTraditionalSearch(query, data, dataType) {
  const lowerQuery = query.toLowerCase();

  return data.filter(item => {
    switch (dataType) {
      case 'students':
        return (
          item.firstName.toLowerCase().includes(lowerQuery) ||
          item.lastName.toLowerCase().includes(lowerQuery) ||
          item.studentId.toLowerCase().includes(lowerQuery) ||
          item.email.toLowerCase().includes(lowerQuery) ||
          item.course.toLowerCase().includes(lowerQuery) ||
          fuzzyMatch(lowerQuery, item.firstName.toLowerCase()) ||
          fuzzyMatch(lowerQuery, item.lastName.toLowerCase())
        );

      case 'rooms':
        return (
          item.roomNumber.toLowerCase().includes(lowerQuery) ||
          item.roomType.toLowerCase().includes(lowerQuery) ||
          item.gender.toLowerCase().includes(lowerQuery) ||
          item.status.toLowerCase().includes(lowerQuery) ||
          item.facilities.some(f => f.toLowerCase().includes(lowerQuery)) ||
          fuzzyMatch(lowerQuery, item.roomNumber.toLowerCase())
        );

      case 'bookings':
        const student = item.studentId;
        const room = item.roomId;
        return (
          (student && (
            student.firstName.toLowerCase().includes(lowerQuery) ||
            student.lastName.toLowerCase().includes(lowerQuery) ||
            student.studentId.toLowerCase().includes(lowerQuery)
          )) ||
          (room && room.roomNumber.toLowerCase().includes(lowerQuery)) ||
          item.status.toLowerCase().includes(lowerQuery) ||
          item.duration.toLowerCase().includes(lowerQuery) ||
          item._id.toLowerCase().includes(lowerQuery)
        );

      default:
        return false;
    }
  });
}

// Fuzzy Search Function for Typo Tolerance
function fuzzyMatch(query, target) {
  if (query.length < 3) return false;

  const distance = levenshteinDistance(query, target);
  return distance <= Math.floor(query.length * 0.3); // 30% tolerance
}

// Levenshtein Distance for Fuzzy Matching
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Smart Search Suggestions
function showSearchSuggestions(input, dataType) {
  const query = input.value.toLowerCase().trim();
  if (query.length < 2) {
    hideSearchSuggestions(input);
    return;
  }

  const suggestions = AI_SEARCH_CONFIG.suggestions[dataType] || [];
  const matchedSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(query) ||
    fuzzyMatch(query, s.toLowerCase())
  ).slice(0, 5);

  if (matchedSuggestions.length === 0) {
    hideSearchSuggestions(input);
    return;
  }

  // Remove existing suggestions
  const existingSuggestions = document.getElementById('search-suggestions');
  if (existingSuggestions) {
    existingSuggestions.remove();
  }

  // Create suggestions dropdown
  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.id = 'search-suggestions';
  suggestionsDiv.className = 'search-suggestions';
  suggestionsDiv.innerHTML = matchedSuggestions.map(suggestion =>
    `<div class="suggestion-item" onclick="applySuggestion('${suggestion}', '${dataType}')">${suggestion}</div>`
  ).join('');

  input.parentElement.appendChild(suggestionsDiv);

  // Position suggestions
  const inputRect = input.getBoundingClientRect();
  suggestionsDiv.style.position = 'absolute';
  suggestionsDiv.style.top = (inputRect.bottom + window.scrollY) + 'px';
  suggestionsDiv.style.left = inputRect.left + 'px';
  suggestionsDiv.style.width = inputRect.width + 'px';
}

function hideSearchSuggestions(input) {
  const suggestions = document.getElementById('search-suggestions');
  if (suggestions) {
    suggestions.remove();
  }
}

function applySuggestion(suggestion, dataType) {
  const input = document.getElementById(`${dataType}Search`) ||
    document.getElementById(`${dataType.slice(0, -1)}Search`);
  if (input) {
    input.value = suggestion;
    hideSearchSuggestions(input);
    applySearchAndFilters(dataType);
  }
}

// Apply Search and Filters
function applySearchAndFilters(dataType) {
  const searchInput = document.getElementById(`${dataType}Search`) ||
    document.getElementById(`${dataType.slice(0, -1)}Search`);

  // Update search filter
  if (searchInput) {
    appState.filters[dataType].search = searchInput.value;
  }

  // Update other filters based on data type
  switch (dataType) {
    case 'students':
      const yearFilter = document.getElementById('yearFilter');
      const courseFilter = document.getElementById('courseFilter');
      if (yearFilter) appState.filters.students.year = yearFilter.value;
      if (courseFilter) appState.filters.students.course = courseFilter.value;
      break;

    case 'rooms':
      const statusFilter = document.getElementById('statusFilter');
      const typeFilter = document.getElementById('typeFilter');
      const genderFilter = document.getElementById('genderFilter');
      const floorFilter = document.getElementById('floorFilter');
      if (statusFilter) appState.filters.rooms.status = statusFilter.value;
      if (typeFilter) appState.filters.rooms.type = typeFilter.value;
      if (genderFilter) appState.filters.rooms.gender = genderFilter.value;
      if (floorFilter) appState.filters.rooms.floor = floorFilter.value;
      break;

    case 'bookings':
      const bookingStatusFilter = document.getElementById('bookingStatusFilter');
      if (bookingStatusFilter) appState.filters.bookings.status = bookingStatusFilter.value;
      break;
  }

  // Apply filters and render
  switch (dataType) {
    case 'students':
      renderStudents();
      break;
    case 'rooms':
      renderRooms();
      break;
    case 'bookings':
      renderBookings();
      break;
  }
}

// Filter Functions
function getFilteredStudents() {
  let filtered = appState.students;
  const filters = appState.filters.students;

  // Apply search
  if (filters.search) {
    filtered = performSmartSearch(filters.search, 'students');
  }

  // Apply year filter
  if (filters.year) {
    filtered = filtered.filter(s => s.year.toString() === filters.year);
  }

  // Apply course filter
  if (filters.course) {
    filtered = filtered.filter(s =>
      s.course.toLowerCase().includes(filters.course.toLowerCase())
    );
  }

  return filtered;
}

function getFilteredRooms() {
  let filtered = appState.rooms;
  const filters = appState.filters.rooms;

  // Apply search
  if (filters.search) {
    filtered = performSmartSearch(filters.search, 'rooms');
  }

  // Apply status filter
  if (filters.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }

  // Apply type filter
  if (filters.type) {
    filtered = filtered.filter(r => r.roomType === filters.type);
  }

  // Apply gender filter
  if (filters.gender) {
    filtered = filtered.filter(r => r.gender === filters.gender);
  }

  // Apply floor filter
  if (filters.floor) {
    filtered = filtered.filter(r => r.floor.toString() === filters.floor);
  }

  return filtered;
}

function getFilteredBookings() {
  let filtered = appState.bookings;
  const filters = appState.filters.bookings;

  // Apply search
  if (filters.search) {
    filtered = performSmartSearch(filters.search, 'bookings');
  }

  // Apply status filter
  if (filters.status) {
    filtered = filtered.filter(b => b.status === filters.status);
  }

  return filtered;
}

// Setup Search and Filters
function setupSearchAndFilters() {
  // Students page
  const studentSearch = document.getElementById('studentSearch');
  if (studentSearch) {
    studentSearch.addEventListener('input', (e) => {
      showSearchSuggestions(e.target, 'students');
      setTimeout(() => applySearchAndFilters('students'), 300);
    });
    studentSearch.addEventListener('blur', () => {
      setTimeout(() => hideSearchSuggestions(studentSearch), 200);
    });
  }

  const yearFilter = document.getElementById('yearFilter');
  if (yearFilter) {
    yearFilter.addEventListener('change', () => applySearchAndFilters('students'));
  }

  // Rooms page
  const roomSearch = document.getElementById('roomSearch');
  if (roomSearch) {
    roomSearch.addEventListener('input', (e) => {
      showSearchSuggestions(e.target, 'rooms');
      setTimeout(() => applySearchAndFilters('rooms'), 300);
    });
    roomSearch.addEventListener('blur', () => {
      setTimeout(() => hideSearchSuggestions(roomSearch), 200);
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => applySearchAndFilters('rooms'));
  }

  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', () => applySearchAndFilters('rooms'));
  }

  // Bookings page
  const bookingSearch = document.getElementById('bookingSearch');
  if (bookingSearch) {
    bookingSearch.addEventListener('input', (e) => {
      showSearchSuggestions(e.target, 'bookings');
      setTimeout(() => applySearchAndFilters('bookings'), 300);
    });
    bookingSearch.addEventListener('blur', () => {
      setTimeout(() => hideSearchSuggestions(bookingSearch), 200);
    });
  }

  const bookingStatusFilter = document.getElementById('bookingStatusFilter');
  if (bookingStatusFilter) {
    bookingStatusFilter.addEventListener('change', () => applySearchAndFilters('bookings'));
  }

  console.log('🔍 AI Search and Filters initialized');
}

// Rest of the code remains the same as the previous error-handled version
// [Previous API, initialization, form handling, and rendering code...]

// API Helper Functions (same as before)
const api = {
  async call(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    };

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        showNotification(getErrorMessage(errorData.error), 'error');
        throw new Error(getErrorMessage(errorData.error));
      }
      return await response.json();
    } catch (error) {
      const message = error.message.includes('fetch')
        ? 'Unable to connect to server. Please check your connection.'
        : getErrorMessage(error.message);
      showNotification(message, 'error');
      throw new Error(message);
    }
  },

  students: {
    getAll: () => api.call('/students'),
    create: (data) => api.call('/students/register', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => api.call(`/students/${id}`, { method: 'DELETE' })
  },

  rooms: {
    getAll: () => api.call('/rooms'),
    create: (data) => api.call('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => api.call(`/rooms/${id}`, { method: 'DELETE' })
  },

  bookings: {
    getAll: () => api.call('/bookings'),
    create: (data) => api.call('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id, data) => api.call(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => api.call(`/bookings/${id}`, { method: 'DELETE' })
  }
};

// Error handling function
function getErrorMessage(error) {
  const errorMappings = {
    'Not authorized, no token': 'Please log in to continue.',
    'Student with this email or student ID already exists': 'A student with this email or ID is already registered.',
    'Room is not available': 'This room is currently unavailable for booking.',
    'Student already has an active booking': 'This student already has an active booking.',
  };
  return errorMappings[error] || error || 'An unexpected error occurred.';
}

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});

async function initializeApp() {
  try {
    await api.call('');
    setupNavigation();
    setupForms();
    setupSearchAndFilters(); // Initialize AI search and filters
    await loadAllData();
    showPage('dashboard');
    showNotification('Welcome to HosteliQ! AI-powered search is ready.', 'success');
  } catch (error) {
    console.error('Initialization failed:', error);
    setupNavigation();
    setupForms();
    setupSearchAndFilters();
    showPage('dashboard');
  }
}

async function loadAllData() {
  try {
    const [studentsResponse, roomsResponse, bookingsResponse] = await Promise.all([
      api.students.getAll().catch(() => ({ data: [] })),
      api.rooms.getAll().catch(() => ({ data: [] })),
      api.bookings.getAll().catch(() => ({ data: [] }))
    ]);

    appState.students = studentsResponse.data || [];
    appState.rooms = roomsResponse.data || [];
    appState.bookings = bookingsResponse.data || [];

    updateDashboard();
    renderStudents();
    renderRooms();
    renderBookings();
  } catch (error) {
    showNotification('Some data could not be loaded.', 'warning');
  }
}

// Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetPage = this.getAttribute('data-page');
      appState.currentPage = targetPage;
      showPage(targetPage);
      document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
}

// Form handling (simplified versions)
function setupForms() {
  const studentForm = document.getElementById('addStudentForm');
  if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await api.students.create({
          studentId: formData.get('studentId'),
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          password: formData.get('studentId'),
          course: formData.get('course'),
          year: parseInt(formData.get('year')),
          gender: formData.get('gender')
        });
        closeModal('addStudentModal');
        e.target.reset();
        showNotification('Student registered successfully!', 'success');
        await loadAllData();
      } catch (error) {
        console.error('Student registration failed:', error);
      }
    });
  }

  const roomForm = document.getElementById('addRoomForm');
  if (roomForm) {
    roomForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await api.rooms.create({
          roomNumber: formData.get('roomNumber'),
          floor: parseInt(formData.get('floor')),
          roomType: formData.get('roomType'),
          capacity: parseInt(formData.get('capacity')),
          gender: formData.get('gender'),
          rent: parseFloat(formData.get('rent')),
          facilities: formData.getAll('facilities')
        });
        closeModal('addRoomModal');
        e.target.reset();
        showNotification('Room added successfully!', 'success');
        await loadAllData();
      } catch (error) {
        console.error('Room creation failed:', error);
      }
    });
  }

  const bookingForm = document.getElementById('addBookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await api.bookings.create({
          studentId: formData.get('studentId'),
          roomId: formData.get('roomId'),
          startDate: formData.get('startDate'),
          duration: formData.get('duration')
        });
        closeModal('addBookingModal');
        e.target.reset();
        showNotification('Booking created successfully!', 'success');
        await loadAllData();
      } catch (error) {
        console.error('Booking creation failed:', error);
      }
    });
  }
}

// Modal functions
function showAddStudentModal() {
  document.getElementById('addStudentModal').style.display = 'block';
}

function showAddRoomModal() {
  document.getElementById('addRoomModal').style.display = 'block';
}

function showAddBookingModal() {
  populateBookingSelects();
  document.getElementById('addBookingModal').style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function populateBookingSelects() {
  const studentSelect = document.getElementById('bookingStudentSelect');
  const roomSelect = document.getElementById('bookingRoomSelect');

  studentSelect.innerHTML = '<option value="">Select Student</option>';
  roomSelect.innerHTML = '<option value="">Select Room</option>';

  appState.students.forEach(student => {
    const option = document.createElement('option');
    option.value = student._id;
    option.textContent = `${student.firstName} ${student.lastName} (${student.studentId})`;
    studentSelect.appendChild(option);
  });

  appState.rooms.filter(room => room.status === 'Available').forEach(room => {
    const option = document.createElement('option');
    option.value = room._id;
    option.textContent = `Room ${room.roomNumber} (${room.roomType})`;
    roomSelect.appendChild(option);
  });
}

// Dashboard
function updateDashboard() {
  document.getElementById('totalStudents').textContent = appState.students.length;
  document.getElementById('totalRooms').textContent = appState.rooms.length;
  document.getElementById('activeBookings').textContent =
    appState.bookings.filter(b => ['Pending', 'Approved', 'Active'].includes(b.status)).length;

  const totalCapacity = appState.rooms.reduce((sum, room) => sum + room.capacity, 0);
  const totalOccupancy = appState.rooms.reduce((sum, room) => sum + room.currentOccupancy, 0);
  const occupancyRate = totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : 0;
  document.getElementById('occupancyRate').textContent = occupancyRate + '%';
}

// Render functions with filtering
// Fixed frontend rendering function for students with proper room display

// Updated renderStudents function that properly shows room assignments
function renderStudents() {
  try {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const filteredStudents = getFilteredStudents();

    console.log('👥 Rendering students:', filteredStudents.length);
    console.log('📊 Students data sample:', filteredStudents.slice(0, 2));

    filteredStudents.forEach(student => {
      // FIXED: Proper room detection with multiple fallback methods
      let roomDisplay = 'Unassigned';
      let roomNumber = null;

      // Method 1: Check if roomId is populated object
      if (student.roomId && typeof student.roomId === 'object' && student.roomId.roomNumber) {
        roomNumber = student.roomId.roomNumber;
        roomDisplay = `Room ${roomNumber}`;
        console.log(`✅ Student ${student.studentId} assigned to ${roomDisplay} (populated object)`);
      }
      // Method 2: Check if roomId is string and find room in appState
      else if (student.roomId && typeof student.roomId === 'string') {
        const room = appState.rooms.find(r => r._id === student.roomId);
        if (room) {
          roomNumber = room.roomNumber;
          roomDisplay = `Room ${roomNumber}`;
          console.log(`✅ Student ${student.studentId} assigned to ${roomDisplay} (found in state)`);
        }
      }
      // Method 3: Check by looking at approved bookings
      else {
        const activeBooking = appState.bookings.find(booking =>
          booking.studentId &&
          (booking.studentId._id === student._id || booking.studentId === student._id) &&
          ['Approved', 'Active'].includes(booking.status)
        );

        if (activeBooking && activeBooking.roomId) {
          if (typeof activeBooking.roomId === 'object' && activeBooking.roomId.roomNumber) {
            roomNumber = activeBooking.roomId.roomNumber;
            roomDisplay = `Room ${roomNumber}`;
            console.log(`✅ Student ${student.studentId} assigned to ${roomDisplay} (from booking)`);
          } else if (typeof activeBooking.roomId === 'string') {
            const room = appState.rooms.find(r => r._id === activeBooking.roomId);
            if (room) {
              roomNumber = room.roomNumber;
              roomDisplay = `Room ${roomNumber}`;
              console.log(`✅ Student ${student.studentId} assigned to ${roomDisplay} (booking + room lookup)`);
            }
          }
        }
      }

      // If still unassigned, log it for debugging
      if (roomDisplay === 'Unassigned') {
        console.log(`⚠️ Student ${student.studentId} - No room assignment found`);
        console.log('   Student roomId:', student.roomId);
        console.log('   Active bookings for student:', appState.bookings.filter(b =>
          b.studentId && (b.studentId._id === student._id || b.studentId === student._id)
        ));
      }

      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${student.studentId}</td>
                <td>${student.firstName} ${student.lastName}</td>
                <td>${student.email}</td>
                <td>${student.course}</td>
                <td>${student.year}</td>
                <td>
                    <span class="room-assignment ${roomDisplay === 'Unassigned' ? 'unassigned' : 'assigned'}">
                        ${roomDisplay}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    // Show count
    const countElement = document.querySelector('.students-count');
    if (countElement) {
      const assignedCount = filteredStudents.filter(s => {
        return (s.roomId && ((typeof s.roomId === 'object' && s.roomId.roomNumber) || (typeof s.roomId === 'string'))) ||
          appState.bookings.some(booking =>
            booking.studentId &&
            (booking.studentId._id === s._id || booking.studentId === s._id) &&
            ['Approved', 'Active'].includes(booking.status)
          );
      }).length;

      countElement.innerHTML = `
                Showing ${filteredStudents.length} of ${appState.students.length} students
                <span class="assignment-stats">
                    (${assignedCount} assigned, ${filteredStudents.length - assignedCount} unassigned)
                </span>
            `;
    }

    console.log('👥 Student directory updated:', filteredStudents.length);
  } catch (error) {
    console.error('Student rendering error:', error);
    showNotification('Unable to display student list. Please refresh the page.', 'error');
  }
}

// Enhanced approve booking function that ensures data refresh
async function approveBooking(id) {
  try {
    console.log('🔄 Approving booking:', id);

    await api.bookings.updateStatus(id, {
      status: 'Approved',
      approvedBy: 'Admin'
    });

    showNotification('Booking has been approved and confirmed!', 'success');

    // CRITICAL: Wait a moment then reload ALL data to ensure room assignments show up
    setTimeout(async () => {
      console.log('🔄 Refreshing all data after booking approval...');
      await loadAllData();
    }, 1000);

  } catch (error) {
    console.error('Booking approval failed:', error);
    // Error already handled by API helper
  }
}

// Enhanced load data function that logs room assignments
async function loadAllData() {
  console.log('📊 Loading system data...');

  const loadingErrors = [];

  try {
    // Load students with retry logic
    try {
      const studentsResponse = await api.students.getAll();
      appState.students = studentsResponse.data || [];
      console.log('👥 Students loaded from database:', appState.students.length);

      // Log room assignment status
      const studentsWithRooms = appState.students.filter(s =>
        s.roomId && ((typeof s.roomId === 'object' && s.roomId.roomNumber) || typeof s.roomId === 'string')
      ).length;
      console.log(`🏠 Students with room assignments: ${studentsWithRooms}/${appState.students.length}`);

    } catch (error) {
      console.error('Failed to load students:', error);
      loadingErrors.push('student records');
      appState.students = [];
    }

    // Load rooms
    try {
      const roomsResponse = await api.rooms.getAll();
      appState.rooms = roomsResponse.data || [];
      console.log('🏠 Room inventory loaded:', appState.rooms.length);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      loadingErrors.push('room inventory');
      appState.rooms = [];
    }

    // Load bookings
    try {
      const bookingsResponse = await api.bookings.getAll();
      appState.bookings = bookingsResponse.data || [];
      console.log('📅 Booking records loaded:', appState.bookings.length);

      // Log approved bookings
      const approvedBookings = appState.bookings.filter(b => b.status === 'Approved').length;
      console.log(`✅ Approved bookings: ${approvedBookings}/${appState.bookings.length}`);

    } catch (error) {
      console.error('Failed to load bookings:', error);
      loadingErrors.push('booking records');
      appState.bookings = [];
    }

    // Update displays
    updateDashboard();
    renderStudents(); // This will now properly show room assignments
    renderRooms();
    renderBookings();

    // Show appropriate message based on loading results
    if (loadingErrors.length === 0) {
      console.log('✅ All data loaded successfully');
    } else if (loadingErrors.length < 3) {
      showNotification(`Some data could not be loaded: ${loadingErrors.join(', ')}. Other features are available.`, 'warning');
    } else {
      showNotification('Unable to load system data. Please refresh the page.', 'error');
    }

  } catch (error) {
    console.error('❌ Critical data loading error:', error);
    showNotification('System data unavailable. Please refresh the page or contact support.', 'error');
  }
}

// Add CSS for room assignment styling
const additionalCSS = `
.room-assignment.assigned {
    color: #28a745;
    font-weight: 600;
    background: #d4edda;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9rem;
}

.room-assignment.unassigned {
    color: #dc3545;
    font-weight: 500;
    background: #f8d7da;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9rem;
}

.assignment-stats {
    font-size: 0.85rem;
    color: #666;
    margin-left: 10px;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

function renderRooms() {
  const container = document.getElementById('roomsGrid');
  if (!container) return;

  container.innerHTML = '';
  const filteredRooms = getFilteredRooms();

  filteredRooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-card';

    const statusClass = `status-${room.status.toLowerCase()}`;
    const facilitiesHtml = room.facilities.map(f =>
      `<span class="facility-tag">${f}</span>`
    ).join('');

    card.innerHTML = `
            <div class="room-header">
                <div class="room-number">Room ${room.roomNumber}</div>
                <div class="room-status ${statusClass}">${room.status}</div>
            </div>
            <div class="room-details">
                <div class="room-detail">
                    <span>Type:</span>
                    <span>${room.roomType}</span>
                </div>
                <div class="room-detail">
                    <span>Floor:</span>
                    <span>${room.floor}</span>
                </div>
                <div class="room-detail">
                    <span>Occupancy:</span>
                    <span>${room.currentOccupancy}/${room.capacity}</span>
                </div>
                <div class="room-detail">
                    <span>Gender:</span>
                    <span>${room.gender}</span>
                </div>
                <div class="room-detail">
                    <span>Rent:</span>
                    <span>₹${room.rent}/month</span>
                </div>
            </div>
            ${facilitiesHtml ? `<div class="room-facilities">${facilitiesHtml}</div>` : ''}
            <div class="room-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteRoom('${room._id}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;

    container.appendChild(card);
  });

  // Show count
  const countElement = document.querySelector('.rooms-count');
  if (countElement) {
    countElement.textContent = `Showing ${filteredRooms.length} of ${appState.rooms.length} rooms`;
  }
}

function renderBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const filteredBookings = getFilteredBookings();

  filteredBookings.forEach(booking => {
    const student = booking.studentId;
    const room = booking.roomId;

    if (!student || !room) return;

    const row = document.createElement('tr');
    const statusClass = `status-${booking.status.toLowerCase()}`;

    row.innerHTML = `
            <td>${booking._id.slice(-6).toUpperCase()}</td>
            <td>${student.firstName} ${student.lastName}</td>
            <td>Room ${room.roomNumber}</td>
            <td>${new Date(booking.startDate).toLocaleDateString()}</td>
            <td>${booking.duration}</td>
            <td><span class="status-badge ${statusClass}">${booking.status}</span></td>
            <td>₹${booking.totalAmount}</td>
            <td>
                ${booking.status === 'Pending' ? `
                  <button class="btn btn-success btn-sm" onclick="approveBooking('${booking._id}')">
                    <i class="fas fa-check"></i> Approve
                  </button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteBooking('${booking._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

    tbody.appendChild(row);
  });

  // Show count
  const countElement = document.querySelector('.bookings-count');
  if (countElement) {
    countElement.textContent = `Showing ${filteredBookings.length} of ${appState.bookings.length} bookings`;
  }
}

// Delete functions
async function deleteStudent(id) {
  if (!confirm('Are you sure you want to remove this student?')) return;
  try {
    await api.students.delete(id);
    showNotification('Student removed successfully!', 'success');
    await loadAllData();
  } catch (error) {
    console.error('Student deletion failed:', error);
  }
}

async function deleteRoom(id) {
  if (!confirm('Are you sure you want to remove this room?')) return;
  try {
    await api.rooms.delete(id);
    showNotification('Room removed successfully!', 'success');
    await loadAllData();
  } catch (error) {
    console.error('Room deletion failed:', error);
  }
}

async function deleteBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    await api.bookings.delete(id);
    showNotification('Booking cancelled successfully!', 'success');
    await loadAllData();
  } catch (error) {
    console.error('Booking deletion failed:', error);
  }
}

async function approveBooking(id) {
  try {
    await api.bookings.updateStatus(id, { status: 'Approved', approvedBy: 'Admin' });
    showNotification('Booking approved successfully!', 'success');
    await loadAllData();
  } catch (error) {
    console.error('Booking approval failed:', error);
  }
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

console.log('✅ HosteliQ Ready (AI Search + Working Filters Enabled)');

// AI Chatbot JavaScript - Add to your existing script.js

// AI Configuration
// WITH this Gemini config:
// REPLACE your current GEMINI_CONFIG with this:
const GEMINI_CONFIG = {
    API_KEY: 'AIzaSyCxt-eIUj3D_KXJ41lcB5zSBVeOiiPmdrw', // Your key (works!)
    MODEL: 'gemini-1.5-flash-latest', // Updated model name
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
};


// AI Chat State
let aiChatOpen = false;
let aiChatHistory = [];

// Initialize AI Chatbot
// REPLACE your initializeAIChat function with this:
function initializeAIChat() {
    console.log('🤖 Initializing AI Chatbot with Google Gemini...');
    
    const chatContainer = document.getElementById('aiChatContainer');
    if (chatContainer) {
        chatContainer.classList.remove('open');
        aiChatOpen = false;
    }
    
    aiChatHistory = [];
    
    console.log('✅ Gemini AI Chatbot initialized');
}


// Toggle AI Chat Open/Close
function toggleAIChat() {
  const chatContainer = document.getElementById('aiChatContainer');
  const toggleIcon = document.getElementById('aiToggleIcon');

  if (aiChatOpen) {
    // Close chat
    chatContainer.classList.remove('open');
    toggleIcon.classList.remove('fa-chevron-up');
    toggleIcon.classList.add('fa-chevron-down');
    aiChatOpen = false;
  } else {
    // Open chat
    chatContainer.classList.add('open');
    toggleIcon.classList.remove('fa-chevron-down');
    toggleIcon.classList.add('fa-chevron-up');
    aiChatOpen = true;

    // Focus on input
    setTimeout(() => {
      document.getElementById('aiChatInput').focus();
    }, 300);
  }
}

// Handle Enter key press in chat input
function handleAIChatKeyPress(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendAIMessage();
  }
}

// Quick question buttons
function askQuickQuestion(question) {
  document.getElementById('aiChatInput').value = question;
  sendAIMessage();
}

// Main function to send AI message
async function sendAIMessage() {
  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const question = input.value.trim();

  if (!question) return;

  // Disable input and button
  input.disabled = true;
  sendBtn.disabled = true;

  try {
    // Add user message to chat
    addChatMessage(question, 'user');
    input.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Get AI response
    const response = await getAIResponse(question);

    // Remove typing indicator and add AI response
    hideTypingIndicator();
    addChatMessage(response, 'ai');

  } catch (error) {
    console.error('AI Chat Error:', error);
    hideTypingIndicator();
    addChatMessage('Sorry, I\'m having trouble connecting right now. Please try again later.', 'ai', true);
  } finally {
    // Re-enable input and button
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

// REPLACE your entire getAIResponse function with this:
// Privacy-Safe AI - Rooms, Prices & Technical Info Only
// Replace your getAIResponse function with this privacy-focused version:

async function getAIResponse(question) {
    console.log('🤖 Sending privacy-safe request to Google Gemini...');
    
    // Analyze question type to determine response scope
    const q = question.toLowerCase();
    const isGeneralQuestion = q.includes('tell me about') || q.includes('overview') || 
                             q.includes('what is') || q.includes('system') || 
                             q.includes('complete') || q.includes('all') ||
                             q.includes('everything') || q.includes('full');
    
    // ROOM INFORMATION (No personal data, just room specs)
    const roomInfo = appState.rooms.map(room => ({
        number: room.roomNumber,
        type: room.roomType,
        floor: room.floor,
        capacity: room.capacity,
        currentOccupancy: room.currentOccupancy || 0,
        availableSpots: room.capacity - (room.currentOccupancy || 0),
        status: room.status,
        genderPolicy: room.gender,
        monthlyRent: room.rent,
        facilities: room.facilities || [],
        isAvailable: room.status === 'Available' && (room.currentOccupancy || 0) < room.capacity
    }));

    // GENERAL SYSTEM STATISTICS (No personal info)
    const systemStats = {
        totalStudents: appState.students.length,
        totalRooms: appState.rooms.length,
        availableRooms: roomInfo.filter(r => r.isAvailable).length,
        occupiedRooms: roomInfo.filter(r => r.currentOccupancy > 0).length,
        totalCapacity: roomInfo.reduce((sum, r) => sum + r.capacity, 0),
        currentOccupancy: roomInfo.reduce((sum, r) => sum + r.currentOccupancy, 0),
        occupancyRate: calculateOccupancyRate(),
        pendingBookings: appState.bookings.filter(b => b.status === 'Pending').length,
        approvedBookings: appState.bookings.filter(b => b.status === 'Approved').length
    };

    // ROOM TYPE AND PRICING ANALYSIS
    const roomAnalysis = {
        byType: roomInfo.reduce((acc, r) => {
            if (!acc[r.type]) {
                acc[r.type] = { count: 0, available: 0, avgRent: 0, rents: [] };
            }
            acc[r.type].count++;
            acc[r.type].rents.push(r.monthlyRent);
            if (r.isAvailable) acc[r.type].available++;
            return acc;
        }, {}),
        byGenderPolicy: roomInfo.reduce((acc, r) => {
            if (!acc[r.genderPolicy]) {
                acc[r.genderPolicy] = { count: 0, available: 0 };
            }
            acc[r.genderPolicy].count++;
            if (r.isAvailable) acc[r.genderPolicy].available++;
            return acc;
        }, {}),
        byFloor: roomInfo.reduce((acc, r) => {
            const floor = `Floor ${r.floor}`;
            if (!acc[floor]) {
                acc[floor] = { count: 0, available: 0, avgRent: 0 };
            }
            acc[floor].count++;
            if (r.isAvailable) acc[floor].available++;
            return acc;
        }, {}),
        priceRange: {
            lowest: Math.min(...roomInfo.map(r => r.monthlyRent)),
            highest: Math.max(...roomInfo.map(r => r.monthlyRent)),
            average: Math.round(roomInfo.reduce((sum, r) => sum + r.monthlyRent, 0) / roomInfo.length)
        }
    };

    // Calculate average rents by type
    Object.keys(roomAnalysis.byType).forEach(type => {
        const rents = roomAnalysis.byType[type].rents;
        roomAnalysis.byType[type].avgRent = Math.round(rents.reduce((a, b) => a + b, 0) / rents.length);
    });

    // AVAILABLE FACILITIES ACROSS ALL ROOMS
    const allFacilities = [...new Set(roomInfo.flatMap(r => r.facilities))];

    let prompt;
    
    if (isGeneralQuestion) {
        prompt = `You are HosteliQ AI Assistant. Provide information about rooms, pricing, and system features. Do NOT share any personal information about students or staff.

HOSTEL ROOM INFORMATION:

ROOM INVENTORY (${systemStats.totalRooms} rooms total):
${roomInfo.map(r => 
    `Room ${r.number}: ${r.type} room, Floor ${r.floor}, ${r.capacity} capacity (${r.availableSpots} spots available), ${r.status}, ${r.genderPolicy} policy, ₹${r.monthlyRent}/month, Facilities: ${r.facilities.join(', ') || 'Basic'}`
).join('\n')}

ROOM ANALYSIS BY TYPE:
${Object.entries(roomAnalysis.byType).map(([type, data]) => 
    `${type}: ${data.count} rooms, ${data.available} available, Average rent: ₹${data.avgRent}/month`
).join('\n')}

PRICING INFORMATION:
- Price Range: ₹${roomAnalysis.priceRange.lowest} - ₹${roomAnalysis.priceRange.highest} per month
- Average Rent: ₹${roomAnalysis.priceRange.average} per month
- Room Types: ${Object.keys(roomAnalysis.byType).join(', ')}

OCCUPANCY STATISTICS:
- Total Capacity: ${systemStats.totalCapacity} students
- Current Occupancy: ${systemStats.currentOccupancy} students (${systemStats.occupancyRate}%)
- Available Rooms: ${systemStats.availableRooms} out of ${systemStats.totalRooms}
- Pending Bookings: ${systemStats.pendingBookings}

FACILITIES AVAILABLE:
${allFacilities.join(', ') || 'Basic amenities'}

SYSTEM FEATURES:
- Online room booking system
- Real-time availability tracking
- Automated booking workflow
- Payment management system
- Room allocation by gender policy
- Multi-floor accommodation
- Facilities management
- Occupancy analytics
- AI-powered assistance

Question: ${question}

Provide comprehensive information about rooms, pricing, facilities, and system capabilities. Focus on helping users understand accommodation options and technical features.`;
    } else {
        prompt = `You are HosteliQ AI Assistant. Answer questions about rooms, pricing, and technical features. Do NOT share personal information about individuals.

ROOM & PRICING DATA:

AVAILABLE ROOMS:
${roomInfo.filter(r => r.isAvailable).map(r => 
    `Room ${r.number}: ${r.type}, Floor ${r.floor}, ${r.capacity} capacity, ${r.genderPolicy} policy, ₹${r.monthlyRent}/month, Facilities: [${r.facilities.join(', ') || 'Basic'}]`
).join('\n')}

PRICING BY ROOM TYPE:
${Object.entries(roomAnalysis.byType).map(([type, data]) => 
    `${type} rooms: ₹${data.avgRent}/month average (${data.available}/${data.count} available)`
).join('\n')}

FLOOR-WISE AVAILABILITY:
${Object.entries(roomAnalysis.byFloor).map(([floor, data]) => 
    `${floor}: ${data.available}/${data.count} rooms available`
).join('\n')}

GENDER POLICIES:
${Object.entries(roomAnalysis.byGenderPolicy).map(([policy, data]) => 
    `${policy}: ${data.available}/${data.count} rooms available`
).join('\n')}

SYSTEM CAPABILITIES:
- Room booking and management
- Real-time availability tracking
- Payment processing
- Occupancy monitoring
- Facilities management
- Gender policy enforcement
- Multi-floor accommodation
- Automated workflows

QUICK STATS:
- Total Students: ${systemStats.totalStudents}
- Available Rooms: ${systemStats.availableRooms}/${systemStats.totalRooms}
- Occupancy Rate: ${systemStats.occupancyRate}%
- Price Range: ₹${roomAnalysis.priceRange.lowest} - ₹${roomAnalysis.priceRange.highest}

Question: ${question}

Instructions:
- Answer questions about room availability, pricing, and facilities
- Explain system features and technical capabilities
- Provide accommodation options and recommendations
- Do NOT mention specific student names, emails, or personal details
- Focus on helping users find suitable rooms and understand the system
- Be helpful for general inquiries about the hostel management system`;
    }

    try {
        const response = await fetch(`${GEMINI_CONFIG.API_URL}?key=${GEMINI_CONFIG.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: isGeneralQuestion ? 400 : 250,
                    topP: 0.95,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API Error:', errorData);
            
            if (response.status === 403) {
                throw new Error('Gemini API key invalid. Please check your API key.');
            } else if (response.status === 429) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else {
                throw new Error(`Gemini API Error: ${response.status}`);
            }
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        console.log('✅ Privacy-safe Gemini response delivered');
        return aiResponse;
        
    } catch (error) {
        console.error('❌ Gemini AI Error:', error);
        throw error;
    }
}

// Privacy-safe example questions the AI can handle:
const PRIVACY_SAFE_QUESTIONS = [
    // Room information
    "What rooms are available?",
    "Show me single rooms with prices",
    "Which rooms have AC and WiFi?",
    "What's the cheapest available room?",
    "What rooms are on the ground floor?",
    "Show me double rooms under ₹6000",
    
    // Pricing inquiries
    "What's the price range for rooms?",
    "How much do single rooms cost?",
    "What's the average rent?",
    "Show me rooms by price",
    "What's the most expensive room type?",
    
    // Technical/System information
    "How does the booking system work?",
    "What facilities are available?",
    "What are the gender policies?",
    "How do I book a room?",
    "What's the occupancy rate?",
    "What system features do you have?",
    
    // General statistics
    "How many rooms are available?",
    "What's the current occupancy?",
    "How many pending bookings are there?",
    "What types of rooms do you have?",
    "What floors have available rooms?"
];



// Get current hostel context for AI
function getHostelContext() {
  const availableRooms = appState.rooms.filter(r => r.status === 'Available');
  const pendingBookings = appState.bookings.filter(b => b.status === 'Pending');
  const approvedBookings = appState.bookings.filter(b => b.status === 'Approved');

  return {
    totalStudents: appState.students.length,
    totalRooms: appState.rooms.length,
    availableRooms: availableRooms.length,
    pendingBookings: pendingBookings.length,
    approvedBookings: approvedBookings.length,
    occupancyRate: calculateOccupancyRate()
  };
}

// Calculate occupancy rate
function calculateOccupancyRate() {
  if (appState.rooms.length === 0) return 0;

  const totalCapacity = appState.rooms.reduce((sum, room) => sum + room.capacity, 0);
  const totalOccupancy = appState.rooms.reduce((sum, room) => sum + room.currentOccupancy, 0);

  return totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : 0;
}

// Add message to chat interface
function addChatMessage(message, sender, isError = false) {
  const messagesContainer = document.getElementById('aiChatMessages');
  const messageDiv = document.createElement('div');

  const isUser = sender === 'user';
  messageDiv.className = `ai-message ${isUser ? 'user-message' : ''}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = `ai-avatar ${isUser ? 'user-avatar' : ''}`;
  avatarDiv.textContent = isUser ? '👤' : '🤖';

  const textDiv = document.createElement('div');
  textDiv.className = `ai-text ${isUser ? 'user-text' : ''}`;

  if (isError) {
    textDiv.classList.add('ai-error');
  }

  // Convert markdown-like formatting to HTML
  const formattedMessage = formatAIMessage(message);
  textDiv.innerHTML = formattedMessage;

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(textDiv);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format AI message (simple markdown-like formatting)
function formatAIMessage(message) {
  return message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/\n/g, '<br>') // Line breaks
    .replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
}

// Show typing indicator
function showTypingIndicator() {
  const messagesContainer = document.getElementById('aiChatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message ai-typing';
  typingDiv.id = 'typingIndicator';

  typingDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-text">
            <span>AI is thinking</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Test AI connection (for debugging)
async function testAIConnection() {
  try {
    console.log('🧪 Testing AI connection...');
    const response = await getAIResponse('Hello, are you working?');
    console.log('✅ AI Connection test successful:', response);
    showNotification('AI Assistant is ready to help!', 'success');
  } catch (error) {
    console.error('❌ AI Connection test failed:', error);
    showNotification('AI Assistant is currently unavailable.', 'error');
  }
}

// Enhanced initialization to include AI
const originalInitializeApp = initializeApp;
// Add AI initialization to existing initializeApp function
// Find your original initializeApp function and modify it like this:

async function initializeApp() {
    console.log('📱 Initializing HosteliQ Management System...');
    
    try {
        // Test API connection first
        await api.call('');
        console.log('✅ System connected successfully');
        
        // Initialize components
        setupNavigation();
        setupForms();
        setupSearchAndFilters(); // Your existing search filters
        
        // Initialize AI chat (NEW)
        initializeAIChat();
        
        // Load data
        await loadAllData();
        
        // Show dashboard
        showPage('dashboard');
        
        console.log('✅ HosteliQ System Ready');
        showNotification('Welcome to HosteliQ! AI-powered search is ready.', 'success');
        
        // Test AI connection if API key is provided (NEW)
        if (GEMINI_CONFIG.OPENAI_API_KEY && GEMINI_CONFIG.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
            setTimeout(() => {
                console.log('🤖 AI Assistant ready');
            }, 2000);
        } else {
            console.log('⚠️ OpenAI API key not configured. AI features disabled.');
            showNotification('AI Assistant requires OpenAI API key to function.', 'warning');
        }
        
    } catch (error) {
        console.error('❌ System initialization failed:', error);
        showNotification('System is currently offline. Please refresh the page or contact support.', 'error');
        
        // Still setup navigation so user can navigate
        setupNavigation();
        setupForms();
        setupSearchAndFilters();
        initializeAIChat(); // NEW
        showPage('dashboard');
    }
}


// Add some example prompts for users
const AI_EXAMPLE_QUESTIONS = [
  "How many students are registered?",
  "Which rooms are currently available?",
  "What is the current occupancy rate?",
  "Show me recent booking requests",
  "How many pending bookings do we have?",
  "What's the most expensive room?",
  "Which floor has the most available rooms?",
  "How many male vs female students are there?"
];

// Function to get random example question
function getRandomExampleQuestion() {
  return AI_EXAMPLE_QUESTIONS[Math.floor(Math.random() * AI_EXAMPLE_QUESTIONS.length)];
}

console.log('🤖 AI Chatbot module loaded');

// Add this temporarily to test
console.log('API Key length:', GEMINI_CONFIG.OPENAI_API_KEY.length);
console.log('Starts with sk-:', GEMINI_CONFIG.OPENAI_API_KEY.startsWith('sk-'));
console.log('Has spaces:', GEMINI_CONFIG.OPENAI_API_KEY.includes(' '));
console.log('First 10 characters:', GEMINI_CONFIG.OPENAI_API_KEY.substring(0, 10));