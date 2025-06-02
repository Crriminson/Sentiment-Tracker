// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// Global variables
let entriesData = [];
let moodChart = null;

// DOM Elements
const journalForm = document.getElementById('journalForm');
const journalText = document.getElementById('entryText');
const journalDate = document.getElementById('entryDate');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultContainer = document.getElementById('resultContainer');
const sentimentScore = document.getElementById('sentimentScore');
const sentimentLabel = document.getElementById('sentimentLabel');
const chartCanvas = document.getElementById('moodChart');
const entriesList = document.getElementById('entriesList');
const messageContainer = document.getElementById('messageContainer');
const noDataMessage = document.getElementById('noDataMessage');

// Stats elements
const totalEntries = document.getElementById('totalEntries');
const positiveEntries = document.getElementById('positiveEntries');
const negativeEntries = document.getElementById('negativeEntries');
const neutralEntries = document.getElementById('neutralEntries');

// Debug logging function
function debugLog(message, data = null) {
    console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
    if (data) {
        console.log(data);
    }
}

// Test API connection
async function testConnection() {
    try {
        debugLog('Testing backend connection...');
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        debugLog('✅ Backend connection successful', data);
        return true;
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        showMessage('Cannot connect to server. Make sure the Flask backend is running on port 5000.', 'error');
        return false;
    }
}

// Wait for Chart.js to load
function waitForChart() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        const checkChart = setInterval(() => {
            attempts++;
            if (typeof Chart !== 'undefined') {
                clearInterval(checkChart);
                debugLog('Chart.js loaded successfully');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkChart);
                console.error('Chart.js failed to load after 5 seconds');
                reject(new Error('Chart.js failed to load'));
            }
        }, 100);
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    debugLog('🚀 DOM loaded, initializing Journal App...');
    
    try {
        // Check if required elements exist
        if (!journalForm) {
            throw new Error('Journal form not found');
        }
        if (!journalText) {
            throw new Error('Journal text input not found');
        }
        if (!journalDate) {
            throw new Error('Journal date input not found');
        }
        
        debugLog('✅ All required DOM elements found');
        
        // Test backend connection first
        const isConnected = await testConnection();
        if (!isConnected) {
            return; // Don't continue if backend is not available
        }
        
        // Wait for Chart.js to be available
        try {
            await waitForChart();
            debugLog('📊 Chart.js ready');
        } catch (error) {
            console.error('Chart.js loading failed:', error);
            showMessage('Chart visualization unavailable', 'error');
        }
        
        // Set default date to today
        journalDate.value = new Date().toISOString().split('T')[0];
        debugLog('📅 Default date set');
        
        // Add form submit listener with proper binding
        journalForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            try {
                await handleFormSubmit(event);
            } catch (error) {
                console.error('Form submission error:', error);
                showMessage(`Form error: ${error.message}`, 'error');
            }
            
            return false; // Ensure form doesn't submit
        });
        
        debugLog('📝 Form event listener attached');
        
        // Load initial data
        await loadInitialData();
        
        debugLog('🎉 App initialization complete');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showMessage(`Initialization error: ${error.message}`, 'error');
    }
});

// Load initial data
async function loadInitialData() {
    debugLog('📚 Loading initial data...');
    
    try {
        // Load data in parallel
        const [entriesResult, statsResult] = await Promise.allSettled([
            loadEntries(),
            loadStats()
        ]);
        
        if (entriesResult.status === 'rejected') {
            console.error('Failed to load entries:', entriesResult.reason);
        }
        
        if (statsResult.status === 'rejected') {
            console.error('Failed to load stats:', statsResult.reason);
        }
        
        debugLog('✅ Initial data loading complete');
        
    } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        showMessage('Failed to load data from server', 'error');
    }
}

// Handle form submission
async function handleFormSubmit(event) {
    debugLog('=== FORM SUBMIT HANDLER START ===');
    
    try {
        const text = journalText.value.trim();
        const date = journalDate.value;
        
        debugLog('Form data extracted', { 
            textLength: text.length, 
            textPreview: text.substring(0, 50) + '...', 
            date 
        });
        
        // Validation
        if (!text) {
            showMessage('Please enter some text for your journal entry.', 'error');
            return;
        }
        
        if (text.length < 5) {
            showMessage('Please write at least 5 characters for better sentiment analysis.', 'error');
            return;
        }
        
        if (!date) {
            showMessage('Please select a date for your entry.', 'error');
            return;
        }
        
        debugLog('✅ Validation passed, saving entry...');
        
        // Save entry
        await saveEntry(text, date);
        
        debugLog('=== FORM SUBMIT HANDLER COMPLETE ===');
        
    } catch (error) {
        console.error('ERROR in handleFormSubmit:', error);
        showMessage(`Submission failed: ${error.message}`, 'error');
        throw error;
    }
}

// Save new journal entry
async function saveEntry(text, date) {
    debugLog('💾 Saving journal entry...');
    
    try {
        showLoading(true);
        hideResult();
        
        const requestData = { text, date };
        debugLog('Sending request to backend', requestData);
        
        const response = await fetch(`${API_BASE_URL}/api/entries`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        debugLog('Backend response received', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }
        
        const newEntry = await response.json();
        debugLog('✅ Entry saved successfully', newEntry);
        
        // Show success feedback
        showMessage('Entry saved successfully! 🎉', 'success');
        showResult(newEntry);
        
        // Clear form
        journalText.value = '';
        
        // Reload all data to ensure consistency
        await loadInitialData();
        
    } catch (error) {
        console.error('❌ Error saving entry:', error);
        showMessage(`Failed to save entry: ${error.message}`, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Load entries from API
async function loadEntries() {
    debugLog('📖 Loading entries from API...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/entries`);
        
        debugLog('Entries API response', {
            status: response.status,
            ok: response.ok
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load entries: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        entriesData = Array.isArray(data) ? data : [];
        
        debugLog('✅ Entries loaded', {
            count: entriesData.length,
            sample: entriesData.slice(0, 2)
        });
        
        // Update UI components
        displayRecentEntries();
        updateChart();
        
    } catch (error) {
        console.error('❌ Error loading entries:', error);
        
        // Update UI to show error state
        if (entriesList) {
            entriesList.innerHTML = '<div class="no-entries">Unable to load entries. Please check if the server is running.</div>';
        }
        
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
        }
        
        throw error;
    }
}

// Load statistics
async function loadStats() {
    debugLog('📊 Loading statistics from API...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        
        debugLog('Stats API response', {
            status: response.status,
            ok: response.ok
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load stats: HTTP ${response.status}`);
        }
        
        const stats = await response.json();
        debugLog('✅ Stats loaded', stats);
        
        updateStats(stats);
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        // Set default stats
        updateStats({
            total_entries: 0,
            positive_count: 0,
            negative_count: 0,
            neutral_count: 0
        });
        throw error;
    }
}

// Update statistics display
function updateStats(stats) {
    debugLog('📈 Updating stats display', stats);
    
    if (totalEntries) totalEntries.textContent = stats.total_entries || 0;
    if (positiveEntries) positiveEntries.textContent = stats.positive_count || 0;
    if (negativeEntries) negativeEntries.textContent = stats.negative_count || 0;
    if (neutralEntries) neutralEntries.textContent = stats.neutral_count || 0;
}

// Display recent entries
function displayRecentEntries() {
    debugLog('📋 Displaying recent entries', { count: entriesData.length });
    
    if (!entriesList) {
        debugLog('❌ Entries list element not found');
        return;
    }
    
    if (entriesData.length === 0) {
        entriesList.innerHTML = '<div class="no-entries">No entries yet. Write your first journal entry!</div>';
        return;
    }
    
    const recentEntries = entriesData.slice(0, 5);
    
    entriesList.innerHTML = recentEntries.map(entry => {
        const sentimentClass = entry.sentiment_label.toLowerCase();
        const date = new Date(entry.date).toLocaleDateString();
        const truncatedText = entry.text.length > 100 ? 
            entry.text.substring(0, 100) + '...' : entry.text;
        
        return `
            <div class="entry-item">
                <div class="entry-header">
                    <span class="entry-date">${date}</span>
                    <span class="entry-sentiment ${sentimentClass}">
                        ${entry.sentiment_label} (${entry.sentiment.toFixed(2)})
                    </span>
                </div>
                <div class="entry-text">${truncatedText}</div>
            </div>
        `;
    }).join('');
    
    debugLog('✅ Recent entries displayed');
}

// Update sentiment chart
// Update sentiment chart (simplified version without time scale)
function updateChart() {
    debugLog('📊 Updating chart...');
    
    if (!chartCanvas) {
        debugLog('❌ Chart canvas element not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        debugLog('❌ Chart.js not available');
        if (noDataMessage) noDataMessage.style.display = 'block';
        return;
    }
    
    if (!entriesData || entriesData.length === 0) {
        debugLog('ℹ️ No data for chart');
        if (noDataMessage) noDataMessage.style.display = 'block';
        if (moodChart) {
            moodChart.destroy();
            moodChart = null;
        }
        return;
    }
    
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    // Prepare chart data - sort by date
    const sortedEntries = entriesData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedEntries.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const sentimentData = sortedEntries.map(entry => entry.sentiment || 0);
    
    debugLog('Chart data prepared', { points: sentimentData.length, labels, sentimentData });
    
    // Destroy existing chart if it exists
    if (moodChart) {
        moodChart.destroy();
        moodChart = null;
    }
    
    try {
        // Create new chart with simplified configuration
        moodChart = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sentiment Score',
                    data: sentimentData,
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.2,
                    pointBackgroundColor: '#4F46E5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        // Remove time scale - use category scale (default)
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        min: -1,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Sentiment Score'
                        },
                        ticks: {
                            callback: function(value) {
                                if (value > 0.1) return 'Positive';
                                if (value < -0.1) return 'Negative';
                                return 'Neutral';
                            }
                        }
                    }
                }
            }
        });
        
        debugLog('✅ Chart created successfully');
        
    } catch (error) {
        console.error('❌ Error creating chart:', error);
        if (noDataMessage) noDataMessage.style.display = 'block';
    }
}

// Show loading state
function showLoading(show) {
    debugLog('⏳ Setting loading state', { loading: show });
    
    if (submitBtn) submitBtn.disabled = show;
    if (submitText) submitText.style.display = show ? 'none' : 'inline';
    if (loadingSpinner) loadingSpinner.style.display = show ? 'inline' : 'none';
}

// Show analysis result
function showResult(entry) {
    debugLog('✅ Showing analysis result', entry);
    
    if (!resultContainer) return;
    
    if (sentimentScore) {
        sentimentScore.textContent = entry.sentiment.toFixed(2);
        sentimentScore.className = `score ${entry.sentiment_label.toLowerCase()}`;
    }
    
    if (sentimentLabel) {
        sentimentLabel.textContent = entry.sentiment_label;
        sentimentLabel.className = `label ${entry.sentiment_label.toLowerCase()}`;
    }
    
    resultContainer.style.display = 'block';
}

// Hide analysis result
function hideResult() {
    if (resultContainer) {
        resultContainer.style.display = 'none';
    }
}

// Show success/error messages
function showMessage(message, type) {
    debugLog('💬 Showing message', { message, type });
    
    if (!messageContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageContainer.contains(messageDiv)) {
            messageContainer.removeChild(messageDiv);
        }
    }, 5000);
}

// Error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showMessage('An unexpected error occurred', 'error');
});

// Error handling for general JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error || event.message);
    showMessage('A JavaScript error occurred', 'error');
});