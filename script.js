// DeepSeek API Configuration
const DEEPSEEK_CONFIG = {
    apiKey: 'sk-36ed5e4b24d848869eafdc3774d347e2', // Your DeepSeek API Key
    apiUrl: 'https://api.deepseek.com/v1/chat/completions', // DeepSeek API Endpoint
    model: 'deepseek-chat', // DeepSeek model name
    maxTokens: 1000,
    temperature: 0.7
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const apiStatus = document.getElementById('apiStatus');

// Initialize Chat
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    loadChatHistory();
    testDeepSeekConnection();
    messageInput.focus();
});

// Test DeepSeek API Connection
async function testDeepSeekConnection() {
    updateApiStatus('checking', 'Testing DeepSeek API connection...');
    
    try {
        const testResponse = await callDeepSeekAPI('Hello, are you working?');
        if (testResponse && testResponse.success) {
            updateApiStatus('connected', '✅ DeepSeek API Connected Successfully');
        } else {
            updateApiStatus('error', '❌ DeepSeek API Failed - Check API Key');
        }
    } catch (error) {
        console.error('DeepSeek API Test failed:', error);
        updateApiStatus('error', '❌ DeepSeek API Connection Failed');
    }
}

// Update API Status Display
function updateApiStatus(status, message) {
    apiStatus.className = `api-status ${status}`;
    apiStatus.innerHTML = `<i class="fas fa-circle"></i><span>${message}</span>`;
}

// Handle Enter Key
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Main Message Sending Function
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    adjustTextareaHeight();
    
    // Disable send button and show typing indicator
    sendButton.disabled = true;
    showTypingIndicator();
    
    try {
        // Call DeepSeek API for response
        const aiResponse = await callDeepSeekAPI(message);
        hideTypingIndicator();
        
        if (aiResponse && aiResponse.success) {
            addMessage(aiResponse.message, 'bot');
        } else {
            const errorMsg = aiResponse?.error || 'Failed to get response from DeepSeek AI';
            addMessage(`❌ Error: ${errorMsg}\n\nPlease check your API key and try again.`, 'bot');
        }
        
    } catch (error) {
        console.error('API Error:', error);
        hideTypingIndicator();
        addMessage(`❌ Network Error: ${error.message}\n\nPlease check your internet connection and API configuration.`, 'bot');
    }
    
    sendButton.disabled = false;
    saveChatHistory();
    messageInput.focus();
}

// DeepSeek API Call Function
async function callDeepSeekAPI(userMessage) {
    try {
        const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: DEEPSEEK_CONFIG.model,
                messages: [
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                max_tokens: DEEPSEEK_CONFIG.maxTokens,
                temperature: DEEPSEEK_CONFIG.temperature,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return {
                success: true,
                message: data.choices[0].message.content,
                usage: data.usage
            };
        } else {
            throw new Error('Invalid response format from DeepSeek API');
        }
        
    } catch (error) {
        console.error('DeepSeek API Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Add Message to Chat UI
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const time = new Date().toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${formatMessage(text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Format Message with Markdown-like syntax
function formatMessage(text) {
    // Convert code blocks with language specification
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
        const language = lang || 'text';
        return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Convert inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic text
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert URLs to links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Escape HTML for code blocks
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show Typing Indicator
function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    scrollToBottom();
}

// Hide Typing Indicator
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// Scroll to Bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Adjust Textarea Height
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// Clear Chat History
function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">
                        Namaste! 👋 I'm your DeepSeek AI assistant. 
                        <br><br>
                        I can help you with:
                        <br>• Answering complex questions
                        <br>• Programming and coding
                        <br>• Content writing
                        <br>• Problem solving
                        <br>• Research and analysis
                        <br>• Creative tasks
                        <br><br>
                        Ask me anything - I'm powered by real AI!
                    </div>
                    <div class="message-time" id="currentTime"></div>
                </div>
            </div>
        `;
        updateCurrentTime();
        localStorage.removeItem('deepseekChatHistory');
    }
}

// Quick Question Buttons
function quickQuestion(question) {
    messageInput.value = question;
    sendMessage();
}

// Update Current Time
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

// Save Chat History
function saveChatHistory() {
    const messages = chatMessages.innerHTML;
    localStorage.setItem('deepseekChatHistory', messages);
}

// Load Chat History
function loadChatHistory() {
    const savedChat = localStorage.getItem('deepseekChatHistory');
    if (savedChat) {
        chatMessages.innerHTML = savedChat;
        scrollToBottom();
    }
}

// Event Listeners
messageInput.addEventListener('input', adjustTextareaHeight);