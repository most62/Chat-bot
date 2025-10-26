// Configuration
const CONFIG = {
    apiKey: '59bf01db-627f-4669-80a4-3c9eea1a3f5d',
    apiUrl: null, // Will be set based on the service
    maxTokens: 500,
    temperature: 0.7
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const apiStatus = document.getElementById('apiStatus');
const apiModal = document.getElementById('apiModal');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    loadChatHistory();
    loadApiConfig();
    testApiConnection();
    messageInput.focus();
});

// API Configuration Functions
function toggleApiSettings() {
    apiModal.classList.toggle('active');
}

function saveApiConfig() {
    const apiKey = document.getElementById('apiKey').value;
    const apiUrl = document.getElementById('apiUrl').value;
    
    if (!apiKey) {
        alert('Please enter API key');
        return;
    }
    
    CONFIG.apiKey = apiKey;
    CONFIG.apiUrl = apiUrl || null;
    
    localStorage.setItem('apiConfig', JSON.stringify({
        apiKey: apiKey,
        apiUrl: apiUrl
    }));
    
    toggleApiSettings();
    testApiConnection();
    showNotification('API configuration saved successfully!');
}

function loadApiConfig() {
    const savedConfig = localStorage.getItem('apiConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        CONFIG.apiKey = config.apiKey;
        CONFIG.apiUrl = config.apiUrl;
        document.getElementById('apiKey').value = config.apiKey;
        if (config.apiUrl) {
            document.getElementById('apiUrl').value = config.apiUrl;
        }
    }
}

async function testApiConnection() {
    updateApiStatus('checking', 'Testing API connection...');
    
    try {
        // Simple test message to check API
        const testResponse = await callAIAPI('Hello');
        if (testResponse && testResponse.success !== false) {
            updateApiStatus('connected', 'API Connected Successfully');
        } else {
            updateApiStatus('error', 'API Connection Failed - Using Fallback');
        }
    } catch (error) {
        console.error('API Test failed:', error);
        updateApiStatus('error', 'API Connection Failed - Using Fallback');
    }
}

function updateApiStatus(status, message) {
    apiStatus.className = `api-status ${status}`;
    apiStatus.innerHTML = `<i class="fas fa-circle"></i><span>${message}</span>`;
}

// Main Chat Functions
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Add user message
    addMessage(message, 'user');
    messageInput.value = '';
    adjustTextareaHeight();
    
    // Disable send button and show typing
    sendButton.disabled = true;
    showTypingIndicator();
    
    try {
        // Get AI response
        const aiResponse = await callAIAPI(message);
        hideTypingIndicator();
        
        if (aiResponse && aiResponse.success !== false) {
            addMessage(aiResponse.message, 'bot');
        } else {
            addMessage(getFallbackResponse(message), 'bot');
        }
        
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage(getFallbackResponse(message), 'bot');
    }
    
    sendButton.disabled = false;
    saveChatHistory();
    messageInput.focus();
}

// AI API Call Function
async function callAIAPI(userMessage) {
    // Try different API endpoints based on the API key format
    const endpoints = [
        'https://api.openai.com/v1/chat/completions',
        'https://api.anthropic.com/v1/messages',
        CONFIG.apiUrl // Custom API URL
    ].filter(url => url);

    for (const endpoint of endpoints) {
        try {
            let response;
            
            if (endpoint.includes('openai.com')) {
                response = await callOpenAIAPI(userMessage, endpoint);
            } else if (endpoint.includes('anthropic.com')) {
                response = await callAnthropicAPI(userMessage, endpoint);
            } else {
                // Generic API call for custom endpoints
                response = await callGenericAPI(userMessage, endpoint);
            }
            
            if (response) return response;
        } catch (error) {
            console.log(`API endpoint failed: ${endpoint}`, error);
            continue;
        }
    }
    
    throw new Error('All API endpoints failed');
}

async function callOpenAIAPI(userMessage, endpoint) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: userMessage
                }
            ],
            max_tokens: CONFIG.maxTokens,
            temperature: CONFIG.temperature
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
        message: data.choices[0].message.content,
        success: true
    };
}

async function callAnthropicAPI(userMessage, endpoint) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CONFIG.apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: "claude-3-sonnet-20240229",
            max_tokens: CONFIG.maxTokens,
            temperature: CONFIG.temperature,
            messages: [
                {
                    role: "user",
                    content: userMessage
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
        message: data.content[0].text,
        success: true
    };
}

async function callGenericAPI(userMessage, endpoint) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`
        },
        body: JSON.stringify({
            prompt: userMessage,
            max_tokens: CONFIG.maxTokens,
            temperature: CONFIG.temperature
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
        message: data.choices?.[0]?.text || data.response || data.message || "I received your message but couldn't process it properly.",
        success: true
    };
}

// Fallback responses when API fails
function getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    const responses = {
        greeting: [
            "Hello! I'm currently operating in fallback mode. Your API connection seems to have issues, but I'm still here to help!",
            "Hi there! I can see your message, but there might be an issue with the AI service. I'll do my best to assist you."
        ],
        programming: [
            "I'd love to help with programming questions! Currently, I'm running on basic mode. For detailed programming help, please check your API configuration.",
            "Programming is awesome! While I work on restoring full AI capabilities, you might want to check Stack Overflow or official documentation for detailed help."
        ],
        default: [
            "Thanks for your message! I'm experiencing some technical difficulties with the AI service. Please check your API key and try again.",
            "I received your message but couldn't connect to the AI service. Make sure your API key is correct and you have an active internet connection.",
            "Interesting question! Currently, I'm limited in my responses due to API connectivity issues. Please verify your API configuration in the settings."
        ]
    };

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return getRandomResponse(responses.greeting);
    } else if (lowerMessage.includes('programming') || lowerMessage.includes('code')) {
        return getRandomResponse(responses.programming);
    } else {
        return getRandomResponse(responses.default);
    }
}

// Utility Functions (same as before with improvements)
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const time = new Date().toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    // Format message with code blocks
    const formattedText = formatMessage(text);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${formattedText}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessage(text) {
    // Convert code blocks
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Convert inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert URLs to links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

function clearChat() {
    if (confirm('Are you sure you want to clear the chat?')) {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">
                        Hello! I'm your AI assistant. How can I help you today?
                    </div>
                    <div class="message-time" id="currentTime"></div>
                </div>
            </div>
        `;
        updateCurrentTime();
        localStorage.removeItem('chatHistory');
    }
}

function quickQuestion(question) {
    messageInput.value = question;
    sendMessage();
}

function getRandomResponse(responseArray) {
    return responseArray[Math.floor(Math.random() * responseArray.length)];
}

function saveChatHistory() {
    const messages = chatMessages.innerHTML;
    localStorage.setItem('chatHistory', messages);
}

function loadChatHistory() {
    const savedChat = localStorage.getItem('chatHistory');
    if (savedChat) {
        chatMessages.innerHTML = savedChat;
        scrollToBottom();
    }
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

function showNotification(message) {
    // Simple notification
    alert(message);
}

// Event listeners
messageInput.addEventListener('input', adjustTextareaHeight);

// Close modal when clicking outside
apiModal.addEventListener('click', function(e) {
    if (e.target === apiModal) {
        toggleApiSettings();
    }

});

