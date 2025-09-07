document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');
    const micBtn = document.getElementById('micBtn');
    const fileList = document.getElementById('fileList');
    const themeToggle = document.getElementById('themeToggle');
    const clearChatBtn = document.getElementById('clearChat');
    const exportChatBtn = document.getElementById('exportChat');

    let uploadedFiles = [];
    let isListening = false;
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    // Load chat history
    loadChatHistory();

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ Light Mode';
    }

    // Clear chat
    clearChatBtn.addEventListener('click', () => {
        chatBox.innerHTML = '';
        localStorage.removeItem('chatHistory');
        uploadedFiles = [];
        fileList.innerHTML = '';
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
        a.download = `claude-chat-${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
    });

    // File upload
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (!uploadedFiles.find(f => f.name === file.name)) {
                uploadedFiles.push(file);
                addFileTag(file);
            }
        });
        fileInput.value = '';
    });

    function addFileTag(file) {
        const tag = document.createElement('div');
        tag.className = 'file-tag';
        tag.innerHTML = `
            📄 ${file.name}
            <span class="remove" onclick="removeFile('${file.name}')">×</span>
        `;
        fileList.appendChild(tag);
    }

    window.removeFile = function(fileName) {
        uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
        const tag = Array.from(fileList.children).find(el => el.textContent.includes(fileName));
        if (tag) tag.remove();
    };

    // Voice input
    micBtn.addEventListener('click', toggleVoiceInput);

    function toggleVoiceInput() {
        if (isListening) {
            recognition.stop();
            micBtn.classList.remove('listening');
            isListening = false;
        } else {
            recognition.start();
            micBtn.classList.add('listening');
            isListening = true;
        }
    }

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        userInput.value = text;
        micBtn.classList.remove('listening');
        isListening = false;
        setTimeout(sendMessage, 500);
    };

    recognition.onerror = () => {
        micBtn.classList.remove('listening');
        isListening = false;
        alert('Voice recognition error. Try again.');
    };

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
        if (!text && uploadedFiles.length === 0) return;

        let fullMessage = text;

        // Simulate file content reading (in real app, you'd extract text)
        if (uploadedFiles.length > 0) {
            const fileNames = uploadedFiles.map(f => f.name).join(', ');
            fullMessage += `\n\n[Attached files: ${fileNames}]`;
            // Here you could extract text from PDF/DOCX using libraries like pdf.js, mammoth.js
            // For demo, we just mention the files
        }

        appendMessage('user', fullMessage);
        userInput.value = '';
        uploadedFiles = [];
        fileList.innerHTML = '';

        appendMessage('assistant', '<span class="typing">Claude is thinking...</span>');
        const assistantMsg = chatBox.lastElementChild;

        try {
            const messages = getChatHistory();
            messages.push({ role: 'user', content: fullMessage });

            const response = await puter.ai.chat({
                model: 'claude-3-7-sonnet',
                messages: messages,
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
            assistantMsg.innerHTML = `❌ Error: ${error.message || 'Failed to reach Claude. Try again.'}`;
        }
    }

    function appendMessage(role, content) {
        const div = document.createElement('div');
        div.classList.add('message', role);
        div.innerHTML = role === 'user' ? escapeHtml(content) : marked.parse(content) || escapeHtml(content);
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getChatHistory() {
        const messages = [];
        document.querySelectorAll('.message').forEach(el => {
            const role = el.classList.contains('user') ? 'user' : 'assistant';
            const content = el.textContent;
            if (!content.includes('Claude is thinking')) messages.push({ role, content });
        });
        return messages;
    }

    function saveMessage(role, content) {
        let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        history.push({ role, content, timestamp: Date.now() });
        localStorage.setItem('chatHistory', JSON.stringify(history));
    }

    function loadChatHistory() {
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        history.forEach(msg => appendMessage(msg.role, msg.content));
    }
});
