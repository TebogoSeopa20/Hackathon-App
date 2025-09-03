// seeker-dashboard.js - JavaScript for Imbewu Seeker Dashboard

// Cultural greeting mappings
const culturalGreetings = {
    'zulu': { singular: 'Sawubona', plural: 'Sanibonani' },
    'xhosa': { singular: 'Molo', plural: 'Sanibonani' },
    'pedi': { singular: 'Thobela', plural: 'Thobela' },
    'tswana': { singular: 'Dumela', plural: 'Dumelang' },
    'sotho': { singular: 'Lumela', plural: 'Lumelang' },
    'tsonga': { singular: 'Avuxeni', plural: 'Avuxeni' },
    'swazi': { singular: 'Sawubona', plural: 'Sanibonani' },
    'venda': { singular: 'Ndaa', plural: 'Ndaa' },
    'ndebele': { singular: 'Lotjhani', plural: 'Lotjhanini' },
    'other': { singular: 'Hello', plural: 'Hello' },
    'global': { singular: 'Welcome', plural: 'Welcome' },
    'multiple': { singular: 'Greetings', plural: 'Greetings' },
    'ally': { singular: 'Welcome', plural: 'Welcome' }
};

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user is actually a seeker
    const user = auth.getCurrentUser();
    if (user.role !== 'seeker') {
        // Redirect to appropriate dashboard
        window.location.href = `${user.role}-dashboard.html`;
        return;
    }
    
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get target section ID
            const targetId = this.getAttribute('href').substring(1);
            
            // Hide all sections
            dashboardSections.forEach(section => section.classList.remove('active'));
            
            // Show target section
            document.getElementById(targetId).classList.add('active');
            
            // Close mobile sidebar if open
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    });
    
    // Logout functionality
    const logoutButton = document.querySelector('.btn-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            if (auth.handleLogout()) {
                window.location.href = 'login.html';
            }
        });
    }
    
    // Initialize stats animation
    animateStats();
    
    // Initialize interactive elements
    initInteractiveElements();
    
    // Load user-specific data
    loadUserData();
    
    // Initialize search functionality
    initSearch();
});

// Animate stats counters
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-info h3');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseInt(target.getAttribute('data-value') || target.textContent);
                const duration = 2000;
                const increment = finalValue / (duration / 16);
                let currentValue = 0;
                
                const timer = setInterval(() => {
                    currentValue += increment;
                    if (currentValue >= finalValue) {
                        target.textContent = finalValue;
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(currentValue);
                    }
                }, 16);
                
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => {
        stat.setAttribute('data-value', stat.textContent);
        stat.textContent = '0';
        observer.observe(stat);
    });
}

// Get appropriate greeting based on cultural affiliation
function getCulturalGreeting(culturalAffiliation) {
    // Default to English if no cultural affiliation specified
    if (!culturalAffiliation) {
        return { greeting: 'Hello', language: 'English' };
    }
    
    // Handle array case (multiple cultural affiliations)
    const primaryCulture = Array.isArray(culturalAffiliation) ? 
        culturalAffiliation[0] : culturalAffiliation;
    
    // Find the greeting for this culture
    const cultureKey = primaryCulture.toLowerCase();
    const greetingData = culturalGreetings[cultureKey] || culturalGreetings['other'];
    
    // For simplicity, we'll use singular form
    // In a real application, you might determine if plural is appropriate based on context
    return { 
        greeting: greetingData.singular, 
    };
}

// Initialize interactive elements
function initInteractiveElements() {
    // Plant identification button
    const identifyPlantBtn = document.querySelector('.welcome-actions .btn-primary');
    if (identifyPlantBtn) {
        identifyPlantBtn.addEventListener('click', function() {
            // Switch to plant identification section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#plant-identification"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('plant-identification').classList.add('active');
        });
    }
    
    // Explore knowledge button
    const exploreKnowledgeBtn = document.querySelector('.welcome-actions .btn-outline');
    if (exploreKnowledgeBtn) {
        exploreKnowledgeBtn.addEventListener('click', function() {
            // Switch to knowledge library section
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('[href="#knowledge-library"]').classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            document.getElementById('knowledge-library').classList.add('active');
        });
    }
    
    // Initialize plant identification camera
    const startCameraBtn = document.querySelector('.camera-placeholder .btn');
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', function() {
            initCamera();
        });
    }
}

// Initialize camera for plant identification
function initCamera() {
    // This would typically access the device camera
    // For demonstration, we'll simulate camera activation
    const cameraPlaceholder = document.querySelector('.camera-placeholder');
    if (cameraPlaceholder) {
        cameraPlaceholder.innerHTML = `
            <div class="camera-active">
                <div class="camera-viewfinder"></div>
                <button class="btn btn-primary capture-btn">Capture Plant</button>
            </div>
        `;
        
        // Add event listener for capture button
        const captureBtn = document.querySelector('.capture-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', simulatePlantIdentification);
        }
    }
}

// Simulate plant identification process
function simulatePlantIdentification() {
    // This would typically send the image to a backend for identification
    // For demonstration, we'll simulate the process
    const cameraActive = document.querySelector('.camera-active');
    if (cameraActive) {
        cameraActive.innerHTML = `
            <div class="identifying">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Identifying plant...</p>
            </div>
        `;
        
        // Simulate identification process
        setTimeout(() => {
            showIdentificationResult();
        }, 2000);
    }
}

// Show plant identification result
function showIdentificationResult() {
    const cameraView = document.querySelector('.camera-view');
    if (cameraView) {
        cameraView.innerHTML = `
            <div class="identification-result">
                <div class="plant-image-large" style="background-color: #8D6E63;"></div>
                <div class="plant-details">
                    <h3>African Wormwood</h3>
                    <p class="scientific-name">Artemisia afra</p>
                    <div class="cultural-info">
                        <h4>Traditional Uses</h4>
                        <p>Used for respiratory health, fever reduction, and spiritual cleansing in many Southern African cultures.</p>
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary">Save to Collection</button>
                        <button class="btn btn-outline">Learn More</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Load user-specific data
function loadUserData() {
    const user = auth.getCurrentUser();
    
    // Update user name in navbar
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && user.full_name) {
        userNameElement.textContent = user.full_name;
    }
    
    // Get cultural greeting
    const culturalAffiliation = user.cultural_affiliation;
    const { greeting, language } = getCulturalGreeting(culturalAffiliation);
    
    // Update welcome message with cultural greeting
    const welcomeHeading = document.querySelector('.welcome-banner h1');
    if (welcomeHeading) {
        welcomeHeading.innerHTML = `${greeting}, ${user.full_name || 'Seeker'}!`;
        
        // Add language attribution as a subtle indicator
        const languageIndicator = document.createElement('span');
        languageIndicator.className = 'language-indicator';
        languageIndicator.style.fontSize = '0.7em';
        languageIndicator.style.opacity = '0.7';
        welcomeHeading.appendChild(languageIndicator);
    }
    
    // Update cultural context message
    const welcomeMessage = document.querySelector('.welcome-banner p');
    if (welcomeMessage && culturalAffiliation) {
        const culturalContext = Array.isArray(culturalAffiliation) ? 
            culturalAffiliation[0] : culturalAffiliation;
        
        // Format the cultural context for display
        const formattedCulture = culturalContext.charAt(0).toUpperCase() + culturalContext.slice(1);
        if (formattedCulture === 'Other') {
            welcomeMessage.innerHTML = `Today is a good day to learn about <span class="cultural-highlight">traditional healing plants</span> in your culture.`;
        } else {
            welcomeMessage.innerHTML = `Today is a good day to learn about <span class="cultural-highlight">traditional healing plants</span> in ${formattedCulture} culture.`;
        }
    }
    
    // Load user stats from server (simulated)
    simulateUserStatsLoading();
}

// Simulate loading user stats from server
function simulateUserStatsLoading() {
    // This would typically be an API call
    setTimeout(() => {
        const userStats = {
            plants_learned: 24,
            traditions_understood: 12,
            cultural_badges: 3,
            learning_time: 18
        };
        
        // Update stats cards
        document.querySelectorAll('.stat-info h3')[0].textContent = userStats.plants_learned;
        document.querySelectorAll('.stat-info h3')[1].textContent = userStats.traditions_understood;
        document.querySelectorAll('.stat-info h3')[2].textContent = userStats.cultural_badges;
        document.querySelectorAll('.stat-info h3')[3].textContent = userStats.learning_time + 'h';
    }, 1000);
}

// Handle search functionality
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-btn');
    
    if (searchInput && searchButton) {
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                // Redirect to search results or filter content
                console.log('Searching for:', query);
                // Switch to knowledge library and filter results
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.querySelector('[href="#knowledge-library"]').classList.add('active');
                
                document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
                document.getElementById('knowledge-library').classList.add('active');
                
                // Implement actual search functionality here
            }
        };
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        searchButton.addEventListener('click', performSearch);
    }
}