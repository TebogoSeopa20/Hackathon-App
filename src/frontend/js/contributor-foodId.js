// contributor-foodId.js
// Vendor Product Verification System

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Update user info
    updateUserInfo();

    // DOM Elements
    const barcodeOption = document.getElementById('barcodeOption');
    const searchOption = document.getElementById('searchOption');
    const manualOption = document.getElementById('manualOption');
    const newProductOption = document.getElementById('newProductOption');
    const barcodeScanner = document.getElementById('barcodeScanner');
    const manualInput = document.getElementById('manualInput');
    const newProductForm = document.getElementById('newProductForm');
    const searchResults = document.getElementById('searchResults');
    const startScannerBtn = document.getElementById('startScanner');
    const switchCameraBtn = document.getElementById('switchCamera');
    const captureBarcodeBtn = document.getElementById('captureBarcode');
    const barcodeInput = document.getElementById('barcodeInput');
    const submitBarcodeBtn = document.getElementById('submitBarcode');
    const productSearchInput = document.getElementById('productSearchInput');
    const productSearchBtn = document.getElementById('productSearchBtn');
    const verificationInfo = document.getElementById('verificationInfo');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const tryAgainBtn = document.getElementById('tryAgain');
    const addNewProductBtn = document.getElementById('addNewProduct');
    const newVerificationBtn = document.getElementById('newVerification');
    const requestVerificationBtn = document.getElementById('requestVerification');
    const generateCertificateBtn = document.getElementById('generateCertificate');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const recentVerified = document.getElementById('recentVerified');
    const productForm = document.getElementById('productForm');
    const cancelProductBtn = document.getElementById('cancelProduct');

    // State variables
    let currentCamera = 'environment';
    let scannerInitialized = false;
    let quaggaInitialized = false;
    let recentProducts = JSON.parse(localStorage.getItem('recentVerified') || '[]');
    let currentProductData = null;

    // Function to get initials from a name
    function getInitials(name) {
        if (!name) return '?';
        
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }

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

    // Initialize the page
    initPage();

    // Event Listeners
    barcodeOption.addEventListener('click', () => switchMode('barcode'));
    searchOption.addEventListener('click', () => switchMode('search'));
    manualOption.addEventListener('click', () => switchMode('manual'));
    newProductOption.addEventListener('click', () => switchMode('newProduct'));
    
    startScannerBtn.addEventListener('click', initBarcodeScanner);
    switchCameraBtn.addEventListener('click', switchCamera);
    captureBarcodeBtn.addEventListener('click', captureBarcode);
    submitBarcodeBtn.addEventListener('click', submitManualBarcode);
    productSearchBtn.addEventListener('click', searchProducts);
    productSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchProducts();
    });
    
    tryAgainBtn.addEventListener('click', resetScanner);
    addNewProductBtn.addEventListener('click', showNewProductForm);
    newVerificationBtn.addEventListener('click', resetScanner);
    requestVerificationBtn.addEventListener('click', requestVerification);
    generateCertificateBtn.addEventListener('click', generateCertificate);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    productForm.addEventListener('submit', handleProductSubmit);
    cancelProductBtn.addEventListener('click', () => switchMode('barcode'));

    // Functions
    function initPage() {
        // Load recently verified products
        displayRecentProducts();
    }

    function switchMode(mode) {
        // Update option cards
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('active');
        });
        
        if (mode === 'barcode') barcodeOption.classList.add('active');
        if (mode === 'search') searchOption.classList.add('active');
        if (mode === 'manual') manualOption.classList.add('active');
        if (mode === 'newProduct') newProductOption.classList.add('active');
        
        // Hide all sections
        document.querySelectorAll('.scanner-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        if (mode === 'barcode') {
            barcodeScanner.style.display = 'block';
            if (scannerInitialized && !quaggaInitialized) {
                initQuagga();
            }
        } else if (mode === 'manual') {
            manualInput.style.display = 'block';
        } else if (mode === 'search') {
            searchResults.style.display = 'block';
        } else if (mode === 'newProduct') {
            newProductForm.style.display = 'block';
            productForm.reset();
        }
        
        // Hide product info and error states
        verificationInfo.style.display = 'none';
        errorState.style.display = 'none';
    }

    function initBarcodeScanner() {
        if (!scannerInitialized) {
            initQuagga();
            scannerInitialized = true;
        }
        
        document.getElementById('scanner-placeholder').style.display = 'none';
        document.getElementById('scanner-view').style.display = 'block';
    }

    function initQuagga() {
        if (quaggaInitialized) return;
        
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#interactive'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: currentCamera
                }
            },
            decoder: {
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "upc_e_reader"]
            },
            locate: true
        }, function(err) {
            if (err) {
                console.error("Error initializing QuaggaJS:", err);
                alert("Failed to initialize camera. Please check permissions and try again.");
                return;
            }
            
            Quagga.start();
            quaggaInitialized = true;
            
            // Listen for detected barcodes
            Quagga.onDetected(function(result) {
                const code = result.codeResult.code;
                processBarcode(code);
            });
        });
    }

    function switchCamera() {
        Quagga.stop();
        quaggaInitialized = false;
        
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        
        setTimeout(() => {
            initQuagga();
        }, 500);
    }

    function captureBarcode() {
        // Force a capture if automatic detection isn't working
        Quagga.onProcessed(function(result) {
            if (result) {
                const drawingCtx = Quagga.canvas.ctx.overlay;
                const drawingCanvas = Quagga.canvas.dom.overlay;
                
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    result.boxes.filter(function(box) {
                        return box !== result.box;
                    }).forEach(function(box) {
                        Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                    });
                }
                
                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
                }
                
                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
                    processBarcode(result.codeResult.code);
                }
            }
        });
    }

    function processBarcode(barcode) {
        // Stop the scanner
        if (quaggaInitialized) {
            Quagga.stop();
            quaggaInitialized = false;
        }
        
        // Show loading state
        showLoading();
        
        // Fetch product data
        fetchProductData(barcode);
    }

    function submitManualBarcode() {
        const barcode = barcodeInput.value.trim();
        
        if (!barcode) {
            alert("Please enter a barcode");
            return;
        }
        
        if (!/^\d+$/.test(barcode)) {
            alert("Barcode must contain only numbers");
            return;
        }
        
        showLoading();
        fetchProductData(barcode);
    }

    function searchProducts() {
        const query = productSearchInput.value.trim();
        
        if (!query) {
            alert("Please enter a search term");
            return;
        }
        
        showLoading();
        
        // Use Open Food Facts search API
        fetch(`https://world.openfoodfacts.org/api/v2/search?fields=code,product_name,brands,image_url&search_terms=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.count === 0) {
                    document.getElementById('searchResultsList').innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No products found</h3>
                            <p>Try a different search term</p>
                        </div>
                    `;
                    return;
                }
                
                let resultsHTML = '';
                data.products.forEach(product => {
                    resultsHTML += `
                        <div class="result-item" data-barcode="${product.code}">
                            ${product.image_url ? 
                                `<img src="${product.image_url}" alt="${product.product_name}">` : 
                                `<div class="no-image"><i class="fas fa-image"></i></div>`
                            }
                            <div class="result-info">
                                <h4>${product.product_name || 'Unknown Product'}</h4>
                                <p>${product.brands || 'Unknown Brand'}</p>
                            </div>
                        </div>
                    `;
                });
                
                document.getElementById('searchResultsList').innerHTML = resultsHTML;
                
                // Add event listeners to result items
                document.querySelectorAll('.result-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const barcode = this.dataset.barcode;
                        showLoading();
                        fetchProductData(barcode);
                    });
                });
            })
            .catch(error => {
                console.error("Search error:", error);
                hideLoading();
                showError("Failed to search for products. Please try again.");
            });
    }

    function fetchProductData(barcode) {
        // Use Open Food Facts API to get product data
        fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,image_url,ingredients_text,allergens,nutriments,nutrition_grades,nutriscore_data,nutrient_levels,ecoscore_grade`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.status === 0) {
                    showError("Product not found in the database.");
                    return;
                }
                
                currentProductData = data;
                displayVerificationInfo(data);
                addToRecentProducts(data);
            })
            .catch(error => {
                console.error("API error:", error);
                hideLoading();
                showError("Failed to fetch product data. Please try again.");
            });
    }

    function displayVerificationInfo(data) {
        const product = data.product;
        
        // Update product header
        document.getElementById('productName').textContent = product.product_name || 'Unknown Product';
        document.getElementById('productBrand').textContent = product.brands || 'Unknown Brand';
        document.getElementById('productBarcode').textContent = data.code;
        
        // Update product image
        const productImage = document.getElementById('productImage');
        const productPlaceholder = document.getElementById('productPlaceholder');
        
        if (product.image_url) {
            productImage.innerHTML = `<img src="${product.image_url}" alt="${product.product_name}">`;
        } else {
            productImage.innerHTML = '<i class="fas fa-image" id="productPlaceholder"></i>';
        }
        
        // Update verification status
        updateVerificationStatus(product);
        
        // Update compliance checklist
        updateComplianceChecklist(product);
        
        // Update ingredients analysis
        updateIngredientsAnalysis(product);
        
        // Update safety assessment
        updateSafetyAssessment(product);
        
        // Update verification history
        updateVerificationHistory(data.code);
        
        // Show verification info and hide other sections
        verificationInfo.style.display = 'block';
        barcodeScanner.style.display = 'none';
        manualInput.style.display = 'none';
        searchResults.style.display = 'none';
        newProductForm.style.display = 'none';
        
        // Reset to compliance tab
        switchTab('compliance');
    }

    function updateVerificationStatus(product) {
        const verificationStatus = document.getElementById('verificationStatus');
        const generateCertificateBtn = document.getElementById('generateCertificate');
        
        // Check if product is already verified (mock logic)
        const isVerified = Math.random() > 0.5; // Random for demo
        
        if (isVerified) {
            verificationStatus.innerHTML = `
                <span class="verification-badge verified-badge">
                    <i class="fas fa-check-circle"></i> Verified
                </span>
            `;
            generateCertificateBtn.disabled = false;
        } else {
            verificationStatus.innerHTML = `
                <span class="verification-badge unverified-badge">
                    <i class="fas fa-clock"></i> Unverified
                </span>
            `;
            generateCertificateBtn.disabled = true;
        }
    }

    function updateComplianceChecklist(product) {
        const complianceChecklist = document.getElementById('complianceChecklist');
        const complianceScoreValue = document.getElementById('complianceScoreValue');
        const complianceProgress = document.getElementById('complianceProgress');
        const complianceExplanation = document.getElementById('complianceExplanation');
        
        // Mock compliance checks
        const complianceChecks = [
            { id: 'ingredients_list', label: 'Complete ingredients list', valid: !!product.ingredients_text },
            { id: 'allergens_declared', label: 'Allergens properly declared', valid: !!product.allergens || true },
            { id: 'nutrition_facts', label: 'Nutrition facts available', valid: !!product.nutriments },
            { id: 'no_harmful_additives', label: 'No harmful additives', valid: Math.random() > 0.3 },
            { id: 'proper_labeling', label: 'Proper labeling standards', valid: Math.random() > 0.2 }
        ];
        
        let complianceHTML = '';
        let validCount = 0;
        
        complianceChecks.forEach(check => {
            if (check.valid) validCount++;
            
            complianceHTML += `
                <div class="compliance-item ${check.valid ? 'valid' : 'invalid'}">
                    <i class="fas fa-${check.valid ? 'check' : 'times'}-circle"></i>
                    <span>${check.label}</span>
                </div>
            `;
        });
        
        complianceChecklist.innerHTML = complianceHTML;
        
        // Calculate compliance score
        const complianceScore = Math.round((validCount / complianceChecks.length) * 100);
        complianceScoreValue.textContent = `${complianceScore}%`;
        complianceProgress.style.width = `${complianceScore}%`;
        
        // Set explanation based on score
        if (complianceScore >= 80) {
            complianceExplanation.textContent = 'This product meets most safety standards.';
        } else if (complianceScore >= 60) {
            complianceExplanation.textContent = 'This product meets basic safety standards but needs improvement.';
        } else {
            complianceExplanation.textContent = 'This product does not meet basic safety standards.';
        }
    }

    function updateIngredientsAnalysis(product) {
        const ingredientsText = document.getElementById('ingredientsText');
        const ingredientsWarnings = document.getElementById('ingredientsWarnings');
        
        ingredientsText.textContent = product.ingredients_text || 'No ingredients information available.';
        
        // Mock ingredient warnings
        const warnings = [];
        if (product.ingredients_text) {
            const ingredients = product.ingredients_text.toLowerCase();
            
            if (ingredients.includes('hydrogenated') || ingredients.includes('partially hydrogenated')) {
                warnings.push('Contains trans fats (hydrogenated oils)');
            }
            
            if (ingredients.includes('high fructose corn syrup')) {
                warnings.push('Contains high fructose corn syrup');
            }
            
            if (ingredients.includes('artificial flavor') || ingredients.includes('artificial color')) {
                warnings.push('Contains artificial flavors or colors');
            }
            
            if (ingredients.includes('sodium nitrate') || ingredients.includes('sodium nitrite')) {
                warnings.push('Contains sodium nitrate/nitrite (preservative)');
            }
        }
        
        if (warnings.length > 0) {
            let warningsHTML = '<h4>Potential Concerns</h4><ul>';
            warnings.forEach(warning => {
                warningsHTML += `<li>${warning}</li>`;
            });
            warningsHTML += '</ul>';
            ingredientsWarnings.innerHTML = warningsHTML;
        } else {
            ingredientsWarnings.innerHTML = '<div class="ingredient-status positive"><i class="fas fa-check-circle"></i> No significant ingredient concerns detected</div>';
        }
        
        // Update allergens
        document.getElementById('allergensText').textContent = 
            product.allergens || 'No allergen information available.';
    }

    function updateSafetyAssessment(product) {
        const safetyStatus = document.getElementById('safetyStatus');
        const safetyRecommendations = document.getElementById('safetyRecommendations');
        
        // Mock safety assessment
        const safetyScore = Math.random() * 100;
        let safetyHTML = '';
        let recommendationsHTML = '';
        
        if (safetyScore >= 70) {
            safetyHTML = `
                <i class="fas fa-check-circle"></i>
                <p>This product appears to be generally safe for consumption.</p>
                <div class="safety-score">Safety Score: ${Math.round(safetyScore)}%</div>
            `;
            safetyStatus.className = 'safety-status safe';
            
            recommendationsHTML = `
                <li>Maintain current formulation and safety standards</li>
                <li>Continue monitoring for any ingredient changes</li>
            `;
        } else if (safetyScore >= 40) {
            safetyHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>This product has some safety concerns that should be addressed.</p>
                <div class="safety-score">Safety Score: ${Math.round(safetyScore)}%</div>
            `;
            safetyStatus.className = 'safety-status warning';
            
            recommendationsHTML = `
                <li>Consider reformulating to reduce problematic ingredients</li>
                <li>Improve labeling clarity for allergens</li>
                <li>Conduct additional safety testing</li>
            `;
        } else {
            safetyHTML = `
                <i class="fas fa-times-circle"></i>
                <p>This product has significant safety concerns.</p>
                <div class="safety-score">Safety Score: ${Math.round(safetyScore)}%</div>
            `;
            safetyStatus.className = 'safety-status danger';
            
            recommendationsHTML = `
                <li>Immediately review and reformulate product</li>
                <li>Consult with food safety experts</li>
                <li>Consider discontinuing product until safety issues are resolved</li>
            `;
        }
        
        safetyStatus.innerHTML = safetyHTML;
        safetyRecommendations.innerHTML = recommendationsHTML;
    }

    function updateVerificationHistory(barcode) {
        const verificationHistoryList = document.getElementById('verificationHistoryList');
        
        // Mock verification history
        const history = [
            { date: '2023-10-15', status: 'Verified', by: 'System Auto-Check' },
            { date: '2023-08-22', status: 'Review Requested', by: 'Vendor: Fresh Foods Inc.' },
            { date: '2023-05-10', status: 'Verified', by: 'Food Safety Expert: Dr. Amina' }
        ];
        
        let historyHTML = '';
        history.forEach(item => {
            historyHTML += `
                <div class="history-item">
                    <div class="history-date">${item.date}</div>
                    <div class="history-status ${item.status.toLowerCase()}">${item.status}</div>
                    <div class="history-by">By: ${item.by}</div>
                </div>
            `;
        });
        
        verificationHistoryList.innerHTML = historyHTML || '<p>No verification history available.</p>';
    }

    function switchTab(tabName) {
        // Update tab buttons
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName + 'Tab') {
                content.classList.add('active');
            }
        });
    }

    function addToRecentProducts(data) {
        const product = data.product;
        const productInfo = {
            code: data.code,
            name: product.product_name,
            brand: product.brands,
            image: product.image_url,
            verified: Math.random() > 0.5 // Random for demo
        };
        
        // Remove if already exists
        recentProducts = recentProducts.filter(p => p.code !== data.code);
        
        // Add to beginning of array
        recentProducts.unshift(productInfo);
        
        // Keep only last 5 items
        if (recentProducts.length > 5) {
            recentProducts = recentProducts.slice(0, 5);
        }
        
        // Save to localStorage
        localStorage.setItem('recentVerified', JSON.stringify(recentProducts));
        
        // Update UI
        displayRecentProducts();
    }

    function displayRecentProducts() {
        if (recentProducts.length === 0) {
            recentVerified.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recently verified products</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        recentProducts.forEach(product => {
            html += `
                <div class="verified-item" data-barcode="${product.code}">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}">` : 
                        `<div class="no-image"><i class="fas fa-image"></i></div>`
                    }
                    <div class="verified-info">
                        <h4>${product.name || 'Unknown Product'}</h4>
                        <p>${product.brand || 'Unknown Brand'}</p>
                        <span class="verification-badge ${product.verified ? 'verified-badge' : 'unverified-badge'}">
                            ${product.verified ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                </div>
            `;
        });
        
        recentVerified.innerHTML = html;
        
        // Add click event to recent items
        document.querySelectorAll('.verified-item').forEach(item => {
            item.addEventListener('click', function() {
                const barcode = this.dataset.barcode;
                showLoading();
                fetchProductData(barcode);
            });
        });
    }

    function requestVerification() {
        showLoading();
        
        // Simulate verification request
        setTimeout(() => {
            hideLoading();
            
            // Update verification status
            const verificationStatus = document.getElementById('verificationStatus');
            verificationStatus.innerHTML = `
                <span class="verification-badge verified-badge">
                    <i class="fas fa-check-circle"></i> Verification Requested
                </span>
            `;
            
            // Show success message
            alert('Verification request submitted successfully! Our team will review your product.');
            
            // Enable certificate button after a delay (simulating approval)
            setTimeout(() => {
                document.getElementById('generateCertificate').disabled = false;
                verificationStatus.innerHTML = `
                    <span class="verification-badge verified-badge">
                        <i class="fas fa-check-circle"></i> Verified
                    </span>
                `;
            }, 3000);
        }, 2000);
    }

    function generateCertificate() {
        // Generate a mock certificate
        const productName = document.getElementById('productName').textContent;
        const productBrand = document.getElementById('productBrand').textContent;
        const barcode = document.getElementById('productBarcode').textContent;
        
        const certificateData = {
            product: productName,
            brand: productBrand,
            barcode: barcode,
            verifiedDate: new Date().toLocaleDateString(),
            certificateId: 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            verifiedBy: 'Imbewu Food Safety System'
        };
        
        // Save to localStorage
        let certificates = JSON.parse(localStorage.getItem('vendorCertificates') || '[]');
        certificates.push(certificateData);
        localStorage.setItem('vendorCertificates', JSON.stringify(certificates));
        
        // Show success message
        alert(`Certificate generated successfully!\nCertificate ID: ${certificateData.certificateId}`);
        
        // Optionally redirect to certificates page
        // window.location.href = 'vendor-certificates.html';
    }

    function handleProductSubmit(e) {
        e.preventDefault();
        
        const productName = document.getElementById('productName').value;
        const productBrand = document.getElementById('productBrand').value;
        const productBarcode = document.getElementById('productBarcode').value;
        const productCategory = document.getElementById('productCategory').value;
        const productIngredients = document.getElementById('productIngredients').value;
        const productAllergens = document.getElementById('productAllergens').value;
        
        showLoading();
        
        // Simulate API call to add new product
        setTimeout(() => {
            hideLoading();
            
            // Create mock product data
            const newProduct = {
                status: 1,
                code: productBarcode || 'NEW-' + Date.now(),
                product: {
                    product_name: productName,
                    brands: productBrand,
                    categories: productCategory,
                    ingredients_text: productIngredients,
                    allergens: productAllergens
                }
            };
            
            currentProductData = newProduct;
            displayVerificationInfo(newProduct);
            
            alert('Product added successfully! Now verifying...');
        }, 2000);
    }

    function showNewProductForm() {
        errorState.style.display = 'none';
        switchMode('newProduct');
    }

    function showLoading() {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
    }

    function showError(message) {
        errorState.style.display = 'flex';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetScanner() {
        // Reset scanner state
        if (quaggaInitialized) {
            Quagga.stop();
            quaggaInitialized = false;
        }
        
        document.getElementById('scanner-placeholder').style.display = 'flex';
        document.getElementById('scanner-view').style.display = 'none';
        
        // Hide error state
        errorState.style.display = 'none';
        
        // Show barcode scanner
        barcodeScanner.style.display = 'block';
        verificationInfo.style.display = 'none';
    }
});