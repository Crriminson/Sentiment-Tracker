// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// Global variables
let entriesData = [];
let moodChart = null;

// DOM Elements - Updated to match your HTML IDs
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

// Wait for Chart.js to load
function waitForChart() {
    return new Promise((resolve) => {
        if (typeof Chart !== 'undefined') {
            debugLog('Chart.js already loaded');
            resolve();
        } else {
            debugLog('Waiting for Chart.js to load...');
            // Check every 100ms for Chart to be available
            const checkChart = setInterval(() => {
                if (typeof Chart !== 'undefined') {
                    clearInterval(checkChart);
                    debugLog('Chart.js loaded successfully');
                    resolve();
                }
            }, 100);
        }
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    debugLog('DOM loaded, initializing app...');
    
    // Check if all required elements exist
    debugLog('Checking DOM elements...', {
        journalForm: !!journalForm,
        journalText: !!journalText,
        journalDate: !!journalDate,
        submitBtn: !!submitBtn
    });
    
    if (!journalForm) {
        console.error('ERROR: Journal form not found!');
        return;
    }
    
    if (!journalText) {
        console.error('ERROR: Journal text area not found!');
        return;
    }
    
    try {
        // Wait for Chart.js to be available
        await waitForChart();
        debugLog('Chart.js ready');
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        if (journalDate) {
            journalDate.value = today;
            debugLog('Default date set to:', today);
        }
        
        // Add form submit listener with proper error handling
        if (journalForm) {
            journalForm.addEventListener('submit', async function(event) {
                debugLog('Form submit event triggered');
                try {
                    await handleFormSubmit(event);
                } catch (error) {
                    console.error('ERROR in form submit handler:', error);
                    showMessage(`Form submission error: ${error.message}`, 'error');
                }
            });
            debugLog('Form submit listener added');
        }
        
        // Load existing entries and stats
        debugLog('Loading initial data...');
        await loadEntries();
        await loadStats();
        debugLog('App initialization complete');
        
    } catch (error) {
        console.error('ERROR during app initialization:', error);
        showMessage('Failed to initialize app', 'error');
    }
});

// Handle form submission
async function handleFormSubmit(event) {
    debugLog('=== FORM SUBMIT HANDLER START ===');
    
    // CRITICAL: Prevent form default submission
    event.preventDefault();
    event.stopPropagation();
    
    debugLog('Default form submission prevented');
    
    try {
        const text = journalText.value.trim();
        const date = journalDate.value;
        
        debugLog('Form data extracted', { text: text.substring(0, 50) + '...', date });
        
        // Validation
        if (!text) {
            debugLog('Validation failed: empty text');
            showMessage('Please enter some text for your journal entry.', 'error');
            return false;
        }
        
        if (text.length < 5) {
            debugLog('Validation failed: text too short');
            showMessage('Please write at least 5 characters for better sentiment analysis.', 'error');
            return false;
        }
        
        debugLog('Validation passed, calling saveEntry...');
        await saveEntry(text, date);
        debugLog('=== FORM SUBMIT HANDLER COMPLETE ===');
        return false; // Ensure no form submission
        
    } catch (error) {
        console.error('ERROR in handleFormSubmit:', error);
        showMessage(`Form handling error: ${error.message}`, 'error');
        return false;
    }
}

// Save new journal entry
async function saveEntry(text, date) {
    debugLog('=== SAVE ENTRY START ===');
    
    try {
        // Show loading state immediately
        showLoading(true);
        hideResult();
        
        const requestData = {
            text: text,
            date: date
        };
        
        debugLog('Making API request', {
            url: `${API_BASE_URL}/api/entries`,
            method: 'POST',
            data: requestData
        });
        
        // Check if server is reachable first
        let healthResponse;
        try {
            healthResponse = await fetch(`${API_BASE_URL}/api/health`);
            debugLog('Health check response:', {
                status: healthResponse.status,
                ok: healthResponse.ok
            });
        } catch (healthError) {
            debugLog('Health check failed:', healthError.message);
            throw new Error('Cannot connect to server. Please make sure the Flask app is running on port 5000.');
        }
        
        // Make the actual request
        const response = await fetch(`${API_BASE_URL}/api/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        debugLog('API response received', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            debugLog('API error response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const newEntry = await response.json();
        debugLog('New entry received from API:', newEntry);
        
        // Show success
        showMessage('Entry saved successfully! 🎉', 'success');
        showResult(newEntry);
        
        // Clear form
        journalText.value = '';
        debugLog('Form cleared');
        
        // Reload data
        debugLog('Reloading data...');
        await Promise.all([loadEntries(), loadStats()]);
        debugLog('Data reload complete');
        
        debugLog('=== SAVE ENTRY COMPLETE ===');
        
    } catch (error) {
        console.error('=== SAVE ENTRY ERROR ===');
        console.error('Error details:', error);
        showMessage(`Failed to save entry: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Load entries from API
async function loadEntries() {
    debugLog('=== LOADING ENTRIES ===');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/entries`);
        debugLog('Entries API response:', {
            status: response.status,
            ok: response.ok
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load entries: ${response.status}`);
        }
        
        entriesData = await response.json();
        debugLog('Entries loaded:', {
            count: entriesData.length,
            sample: entriesData.slice(0, 2)
        });
        
        // Update UI
        displayRecentEntries();
        updateChart();
        debugLog('UI updated with new entries');
        
    } catch (error) {
        console.error('ERROR loading entries:', error);
        
        if (entriesList) {
            entriesList.innerHTML = '<div class="no-entries">Unable to load entries. Please check if the server is running.</div>';
        }
        
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
        }
    }
}

// Load statistics
async function loadStats() {
    debugLog('=== LOADING STATS ===');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        debugLog('Stats API response:', {
            status: response.status,
            ok: response.ok
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load stats: ${response.status}`);
        }
        
        const stats = await response.json();
        debugLog('Stats loaded:', stats);
        
        updateStats(stats);
        
    } catch (error) {
        console.error('ERROR loading stats:', error);
        // Fail silently for stats
    }
}

// Update statistics display
function updateStats(stats) {
    debugLog('Updating stats display:', stats);
    
    if (totalEntries) totalEntries.textContent = stats.total_entries || 0;
    if (positiveEntries) positiveEntries.textContent = stats.positive_count || 0;
    if (negativeEntries) negativeEntries.textContent = stats.negative_count || 0;
    if (neutralEntries) neutralEntries.textContent = stats.neutral_count || 0;
}

// Display recent entries
function displayRecentEntries() {
    debugLog('Displaying recent entries:', entriesData.length);
    
    if (!entriesList) {
        debugLog('Entries list element not found');
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
    
    debugLog('Recent entries displayed');
}

// Update sentiment chart
function updateChart() {
    debugLog('Updating chart...');
    
    if (!chartCanvas) {
        debugLog('Chart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        debugLog('Chart.js not available, retrying...');
        setTimeout(updateChart, 500);
        return;
    }
    
    if (!entriesData || entriesData.length === 0) {
        debugLog('No data for chart');
        if (noDataMessage) noDataMessage.style.display = 'block';
        return;
    }
    
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    // Prepare chart data
    const chartData = entriesData
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => ({
            x: entry.date,
            y: entry.sentiment
        }));
    
    debugLog('Chart data prepared:', chartData);
    
    // Destroy existing chart
    if (moodChart) {
        moodChart.destroy();
    }
    
    try {
        const ctx = chartCanvas.getContext('2d');
        moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Sentiment Score',
                    data: chartData,
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4F46E5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Date',
                            font: { size: 14, weight: 'bold' }
                        }
                    },
                    y: {
                        min: -1,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Sentiment Score',
                            font: { size: 14, weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
        
        debugLog('Chart created successfully');
        
    } catch (error) {
        console.error('ERROR creating chart:', error);
    }
}

// Show loading state
function showLoading(show) {
    debugLog('Setting loading state:', show);
    
    if (submitBtn) submitBtn.disabled = show;
    if (submitText) submitText.style.display = show ? 'none' : 'inline';
    if (loadingSpinner) loadingSpinner.style.display = show ? 'inline' : 'none';
}

// Show analysis result
function showResult(entry) {
    debugLog('Showing result:', entry);
    
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
    debugLog('Showing message:', { message, type });
    
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

// Add error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showMessage('An unexpected error occurred', 'error');
});

// Add error handling for general JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error || event.message);
    showMessage('A JavaScript error occurred', 'error');
});