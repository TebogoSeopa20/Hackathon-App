// seeker-appointments.js
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let currentTab = 'contributors';
let contributors = [];
let appointments = [];
let currentFilters = {
    cultural_affiliation: 'all',
    expertise: 'all'
};
let appointmentFilters = {
    status: 'all',
    date: 'upcoming'
};

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update user info
    updateUserInfo();
    
    // Initialize event listeners
    initEventListeners();
    
    // Load initial data
    loadContributors();
    loadAppointments();
});

function updateUserInfo() {
    const user = auth.getCurrentUser();
    const userNameElement = document.querySelector('.user-name');
    const userAvatarContainer = document.querySelector('.user-avatar');
    
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
    
    if (userAvatarContainer) {
        // Clear existing content
        userAvatarContainer.innerHTML = '';
        
        // Create avatar with initials fallback
        if (user.avatar_url) {
            userAvatarContainer.innerHTML = `
                <img src="${user.avatar_url}" alt="${user.full_name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-initials" style="display: none;">
                    ${getInitials(user.full_name)}
                </div>
            `;
        } else {
            userAvatarContainer.innerHTML = `
                <div class="avatar-initials">
                    ${getInitials(user.full_name)}
                </div>
            `;
        }
    }
}

function getInitials(name) {
    if (!name) return '?';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

function initEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Filters
    document.getElementById('apply-filters').addEventListener('click', applyContributorFilters);
    document.getElementById('apply-appointment-filters').addEventListener('click', applyAppointmentFilters);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Appointment form submission
    document.getElementById('appointment-form').addEventListener('submit', handleAppointmentSubmit);
    
    // Check availability button
    document.getElementById('check-availability-btn').addEventListener('click', checkAvailability);
    
    // Cancel appointment button
    document.getElementById('cancel-appointment-btn').addEventListener('click', () => {
        document.getElementById('book-appointment-modal').classList.remove('active');
    });
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointment-date').min = today;
    
    // Contributor search
    document.getElementById('contributor-search').addEventListener('input', debounce(searchContributors, 300));
}

function switchTab(tab) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    currentTab = tab;
}

async function loadContributors() {
    try {
        showContributorsLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/users/role/contributor`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            contributors = data.data;
            
            // Apply filters
            let filteredContributors = contributors;
            
            if (currentFilters.cultural_affiliation !== 'all') {
                filteredContributors = filteredContributors.filter(contributor => 
                    contributor.cultural_affiliation === currentFilters.cultural_affiliation
                );
            }
            
            // Note: Since there's no expertise field in the API response,
            // we can't filter by expertise. We'll keep this for future implementation
            
            displayContributors(filteredContributors);
        } else {
            throw new Error('Failed to load contributors');
        }
    } catch (error) {
        console.error('Error loading contributors:', error);
        showNotification('Failed to load contributors', 'error');
    } finally {
        showContributorsLoading(false);
    }
}

async function searchContributors() {
    const searchTerm = document.getElementById('contributor-search').value.trim();
    
    if (searchTerm.length === 0) {
        loadContributors();
        return;
    }
    
    try {
        showContributorsLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/users/role/contributor`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Filter clientside for search
            const searchLower = searchTerm.toLowerCase();
            const filteredContributors = data.data.filter(contributor => {
                return (
                    contributor.full_name?.toLowerCase().includes(searchLower) ||
                    contributor.cultural_affiliation?.toLowerCase().includes(searchLower) ||
                    contributor.email?.toLowerCase().includes(searchLower)
                );
            });
            
            displayContributors(filteredContributors);
        } else {
            throw new Error('Failed to search contributors');
        }
    } catch (error) {
        console.error('Error searching contributors:', error);
        showNotification('Failed to search contributors', 'error');
    } finally {
        showContributorsLoading(false);
    }
}

async function loadAppointments() {
    try {
        showAppointmentsLoading(true);
        
        const user = auth.getCurrentUser();
        const queryParams = new URLSearchParams({
            user_id: user.id
        });
        
        // Add status filter if not 'all'
        if (appointmentFilters.status !== 'all') {
            queryParams.append('status', appointmentFilters.status);
        }
        
        // Add date filter
        if (appointmentFilters.date === 'upcoming') {
            queryParams.append('upcoming', 'true');
        } else if (appointmentFilters.date === 'past') {
            queryParams.append('upcoming', 'false');
        }
        
        const response = await fetch(`${API_BASE_URL}/appointments?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            appointments = data.data;
            displayAppointments(appointments);
        } else {
            throw new Error('Failed to load appointments');
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showNotification('Failed to load appointments', 'error');
    } finally {
        showAppointmentsLoading(false);
    }
}

function displayContributors(contributors) {
    const container = document.getElementById('contributors-list');
    
    if (contributors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users fa-3x"></i>
                <h3>No contributors found</h3>
                <p>Try adjusting your search or filters to find cultural knowledge contributors</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = contributors.map(contributor => `
        <div class="contributor-card" data-id="${contributor.id}">
            <div class="contributor-header">
                <div class="contributor-avatar">
                    ${contributor.avatar_url ? 
                        `<img src="${contributor.avatar_url}" alt="${contributor.full_name}" 
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-initials" ${contributor.avatar_url ? 'style="display: none;"' : ''}>
                        ${getInitials(contributor.full_name)}
                    </div>
                </div>
                <div class="contributor-info">
                    <h3>${contributor.full_name || 'Cultural Contributor'}</h3>
                    <div class="contributor-meta">
                        <span class="cultural-affiliation">${contributor.cultural_affiliation || 'Various traditions'}</span>
                        ${contributor.is_verified ? `
                            <span class="verified-badge">
                                <i class="fas fa-check-circle"></i>
                                Verified
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="contributor-description">
                <p>Cultural knowledge contributor specializing in ${contributor.cultural_affiliation || 'various'} traditions.</p>
                <p class="contributor-contact">Contact: ${contributor.email}</p>
            </div>
            
            <div class="contributor-actions">
                <button class="btn btn-primary book-appointment-btn" data-id="${contributor.id}">
                    <i class="fas fa-calendar-plus"></i> Book Appointment
                </button>
                <button class="btn btn-outline view-profile-btn" data-id="${contributor.id}">
                    <i class="fas fa-user"></i> View Profile
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to buttons
    document.querySelectorAll('.book-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const contributorId = e.currentTarget.dataset.id;
            openBookAppointmentModal(contributorId);
        });
    });
    
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const contributorId = e.currentTarget.dataset.id;
            viewContributorProfile(contributorId);
        });
    });
}

function displayAppointments(appointments) {
    const container = document.getElementById('appointments-list');
    
    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar fa-3x"></i>
                <h3>No appointments found</h3>
                <p>You don't have any appointments scheduled yet</p>
                <button class="btn btn-primary" onclick="switchTab('contributors')">
                    Find Contributors
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appointments.map(appointment => `
        <div class="appointment-card" data-id="${appointment.id}">
            <div class="appointment-info">
                <h3 class="appointment-title">${appointment.title}</h3>
                <div class="appointment-meta">
                    <span class="appointment-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(appointment.start_time)}
                    </span>
                    <span class="appointment-time">
                        <i class="fas fa-clock"></i>
                        ${formatTimeRange(appointment.start_time, appointment.end_time)}
                    </span>
                    <span class="appointment-contributor">
                        <i class="fas fa-user"></i>
                        ${appointment.profiles?.full_name || 'Unknown Contributor'}
                    </span>
                </div>
                <div class="appointment-status status-${appointment.status}">
                    ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </div>
            </div>
            <div class="appointment-actions">
                <button class="btn btn-outline view-appointment-btn" data-id="${appointment.id}">
                    <i class="fas fa-eye"></i> Details
                </button>
                ${appointment.status === 'scheduled' || appointment.status === 'confirmed' ? `
                    <button class="btn btn-outline cancel-appointment-btn" data-id="${appointment.id}">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    // Add event listeners to buttons
    document.querySelectorAll('.view-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.currentTarget.dataset.id;
            viewAppointmentDetails(appointmentId);
        });
    });
    
    document.querySelectorAll('.cancel-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.currentTarget.dataset.id;
            cancelAppointment(appointmentId);
        });
    });
}

function openBookAppointmentModal(contributorId) {
    const contributor = contributors.find(c => c.id === contributorId);
    if (!contributor) return;
    
    // Populate contributor info in modal
    const modalContributorInfo = document.getElementById('modal-contributor-info');
    modalContributorInfo.innerHTML = `
        <div class="contributor-avatar">
            ${contributor.avatar_url ? 
                `<img src="${contributor.avatar_url}" alt="${contributor.full_name}" 
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                ''
            }
            <div class="avatar-initials" ${contributor.avatar_url ? 'style="display: none;"' : ''}>
                ${getInitials(contributor.full_name)}
            </div>
        </div>
        <div>
            <h4>${contributor.full_name || 'Cultural Contributor'}</h4>
            <p>${contributor.cultural_affiliation || 'Cultural Knowledge Contributor'}</p>
        </div>
    `;
    
    // Set contributor ID in hidden field
    document.getElementById('contributor-id').value = contributorId;
    
    // Clear form fields
    document.getElementById('appointment-title').value = '';
    document.getElementById('appointment-date').value = '';
    document.getElementById('start-time').value = '';
    document.getElementById('end-time').value = '';
    document.getElementById('appointment-type').value = 'video';
    document.getElementById('appointment-notes').value = '';
    document.getElementById('availability-result').innerHTML = '';
    
    // Show modal
    document.getElementById('book-appointment-modal').classList.add('active');
}

async function checkAvailability() {
    const contributorId = document.getElementById('contributor-id').value;
    const date = document.getElementById('appointment-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    if (!date || !startTime || !endTime) {
        showNotification('Please select a date and time range first', 'error');
        return;
    }
    
    try {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        
        if (startDateTime >= endDateTime) {
            showNotification('End time must be after start time', 'error');
            return;
        }
        
        const queryParams = new URLSearchParams({
            user_id: contributorId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString()
        });
        
        const response = await fetch(`${API_BASE_URL}/availability?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        const result = await response.json();
        const availabilityResult = document.getElementById('availability-result');
        
        if (result.available) {
            availabilityResult.className = 'availability-result availability-available';
            availabilityResult.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>This time slot is available!</span>
            `;
        } else {
            availabilityResult.className = 'availability-result availability-unavailable';
            availabilityResult.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <span>This time slot is not available. Please choose a different time.</span>
                ${result.conflicting_appointments && result.conflicting_appointments.length > 0 ? `
                    <div class="conflicting-appointments">
                        <p>Conflicting appointments:</p>
                        <ul>
                            ${result.conflicting_appointments.map(appt => `
                                <li>${appt.title} (${formatTimeRange(appt.start_time, appt.end_time)})</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        showNotification('Failed to check availability', 'error');
    }
}

async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const user = auth.getCurrentUser();
    const contributorId = document.getElementById('contributor-id').value;
    const title = document.getElementById('appointment-title').value;
    const date = document.getElementById('appointment-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const type = document.getElementById('appointment-type').value;
    const notes = document.getElementById('appointment-notes').value;
    
    if (!title || !date || !startTime || !endTime) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    if (startDateTime >= endDateTime) {
        showNotification('End time must be after start time', 'error');
        return;
    }
    
    try {
        const appointmentData = {
            user_id: contributorId,
            title: title,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            appointment_type: type,
            notes: notes,
            status: 'scheduled'
        };
        
        const response = await fetch(`${API_BASE_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            document.getElementById('book-appointment-modal').classList.remove('active');
            showNotification('Appointment booked successfully!', 'success');
            
            // Reload appointments if we're on that tab
            if (currentTab === 'my-appointments') {
                loadAppointments();
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to book appointment');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showNotification(error.message || 'Failed to book appointment', 'error');
    }
}

async function viewAppointmentDetails(appointmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
            headers: {
                'Authorization': `Bearer ${auth.getAccessToken()}`
            }
        });
        
        if (response.ok) {
            const appointment = await response.json();
            const modalContent = document.getElementById('appointment-detail-content');
            
            modalContent.innerHTML = `
                <div class="appointment-detail-header">
                    <h4>${appointment.title}</h4>
                    <span class="appointment-status status-${appointment.status}">
                        ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                </div>
                
                <div class="appointment-detail-info">
                    <div class="detail-item">
                        <i class="fas fa-user"></i>
                        <span>With: ${appointment.profiles?.full_name || 'Unknown Contributor'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Date: ${formatDate(appointment.start_time)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>Time: ${formatTimeRange(appointment.start_time, appointment.end_time)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-video"></i>
                        <span>Type: ${appointment.appointment_type.replace('-', ' ')}</span>
                    </div>
                    ${appointment.notes ? `
                        <div class="detail-item">
                            <i class="fas fa-sticky-note"></i>
                            <span>Notes: ${appointment.notes}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${appointment.status === 'scheduled' || appointment.status === 'confirmed' ? `
                    <div class="appointment-detail-actions">
                        <button class="btn btn-outline" id="cancel-detail-appointment-btn">
                            <i class="fas fa-times"></i> Cancel Appointment
                        </button>
                    </div>
                ` : ''}
            `;
            
            // Add event listener for cancel button
            if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
                document.getElementById('cancel-detail-appointment-btn').addEventListener('click', () => {
                    cancelAppointment(appointmentId);
                });
            }
            
            // Show modal
            document.getElementById('appointment-detail-modal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading appointment details:', error);
        showNotification('Failed to load appointment details', 'error');
    }
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
        const user = auth.getCurrentUser();
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getAccessToken()}`
            },
            body: JSON.stringify({ user_id: user.id })
        });
        
        if (response.ok) {
            showNotification('Appointment cancelled successfully', 'success');
            
            // Close modals and reload appointments
            document.getElementById('appointment-detail-modal').classList.remove('active');
            loadAppointments();
        } else {
            throw new Error('Failed to cancel appointment');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Failed to cancel appointment', 'error');
    }
}

function applyContributorFilters() {
    const culturalAffiliation = document.getElementById('cultural-affiliation').value;
    
    currentFilters = {};
    
    if (culturalAffiliation !== 'all') {
        currentFilters.cultural_affiliation = culturalAffiliation;
    }
    
    loadContributors();
}

function applyAppointmentFilters() {
    const status = document.getElementById('appointment-status').value;
    const date = document.getElementById('appointment-date').value;
    
    appointmentFilters = {};
    
    if (status !== 'all') {
        appointmentFilters.status = status;
    }
    
    if (date !== 'all') {
        appointmentFilters.date = date;
    }
    
    loadAppointments();
}

function viewContributorProfile(contributorId) {
    // This would typically open a contributor profile page or modal
    showNotification('Contributor profile view coming soon', 'info');
}

function showContributorsLoading(show) {
    const container = document.getElementById('contributors-list');
    if (show) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading contributors...</span>
            </div>
        `;
    }
}

function showAppointmentsLoading(show) {
    const container = document.getElementById('appointments-list');
    if (show) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading appointments...</span>
            </div>
        `;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return `${start.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    })} - ${end.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    })}`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Add notification styles if not already added
if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
        .notification {
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            background: hsl(var(--card));
            color: hsl(var(--card-foreground));
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification.success {
            border-left: 4px solid hsl(var(--success));
        }
        
        .notification.error {
            border-left: 4px solid hsl(var(--error));
        }
        
        .notification.info {
            border-left: 4px solid hsl(var(--wisdom-accent));
        }
        
        .notification-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            margin-left: auto;
        }
    `;
    document.head.appendChild(styles);
}

// Add avatar initials styles
const avatarStyles = document.createElement('style');
avatarStyles.textContent = `
    .avatar-initials {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: hsl(var(--wisdom-accent));
        color: white;
        font-weight: 600;
    }
    
    .contributor-avatar {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
    }
    
    .contributor-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .contributor-contact {
        font-size: 0.875rem;
        color: hsl(var(--muted-foreground));
        margin-top: 0.5rem;
    }
`;
document.head.appendChild(avatarStyles);

// Add appointment detail styles
const detailStyles = document.createElement('style');
detailStyles.textContent = `
    .appointment-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid hsl(var(--border));
    }
    
    .appointment-detail-info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .detail-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .detail-item i {
        width: 20px;
        color: hsl(var(--muted-foreground));
    }
    
    .appointment-detail-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 2rem;
    }
    
    .conflicting-appointments {
        margin-top: 0.5rem;
        font-size: 0.75rem;
    }
    
    .conflicting-appointments ul {
        margin: 0.5rem 0 0 1rem;
    }
`;
document.head.appendChild(detailStyles);

