document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const themeToggle = document.getElementById('themeToggle');
    const clearChatBtn = document.getElementById('clearChat');
    const exportChatBtn = document.getElementById('exportChat');

    // Load chat history
    loadChatHistory();

    // Toggle dark/light mode
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Set initial theme
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ Light Mode';
    }

    // Clear chat
    clearChatBtn.addEventListener('click', () => {
        chatBox.innerHTML = '';
        localStorage.removeItem('chatHistory');
    });

    // Export chat
    exportChatBtn.addEventListener('click', () => {
        const chatText = Array.from(chatBox.querySelectorAll('.message')).map(el => {
            const role = el.classList.contains('user') ? 'You' : 'Claude';
            return `${role}: ${el.textContent}`;
        }).join('\n\n');
        
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'claude-chat.txt';
        a.click();
    });

    // Send message
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        userInput.value = '';

        appendMessage('assistant', '<span class="typing">Claude is typing...</span>');
        const assistantMsg = chatBox.lastElementChild;

        try {
            const response = await puter.ai.chat({
                model: 'claude-3-7-sonnet',
                messages: getChatHistory(),
                stream: true
            });

            let fullResponse = '';
            for await (const chunk of response) {
                fullResponse += chunk.content;
                assistantMsg.innerHTML = marked.parse(fullResponse) || fullResponse;
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            saveMessage('assistant', fullResponse);

        } catch (error) {
            assistantMsg.innerHTML = `❌ Error: ${error.message || 'Failed to reach Claude.'}`;
        }
    }

    function appendMessage(role, content) {
        const div = document.createElement('div');
        div.classList.add('message', role);
        div.innerHTML = role === 'user' ? content : marked.parse(content) || content;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function getChatHistory() {
        const messages = [];
        document.querySelectorAll('.message').forEach(el => {
            const role = el.classList.contains('user') ? 'user' : 'assistant';
            const content = el.textContent;
            if (!content.includes('Claude is typing')) messages.push({ role, content });
        });
        return messages;
    }

    function saveMessage(role, content) {
        let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        history.push({ role, content });
        localStorage.setItem('chatHistory', JSON.stringify(history));
    }

    function loadChatHistory() {
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        history.forEach(msg => appendMessage(msg.role, msg.content));
    }
});
