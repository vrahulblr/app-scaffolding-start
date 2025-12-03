document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const fileCatalog = document.getElementById('file-catalog');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');
    const logContent = document.getElementById('log-content');
    const clearLogBtn = document.getElementById('clear-log');
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-select');

    let chatHistoryData = [];

    // --- Logging Function ---
    function addLog(message) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    clearLogBtn.addEventListener('click', () => {
        logContent.innerHTML = '';
    });

    // --- File Upload ---
    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    async function handleFiles(files) {
        if (files.length === 0) return;

        const formData = new FormData();
        let validFiles = false;

        for (const file of files) {
            if (file.name.endsWith('.xlsx')) {
                formData.append('file', file);
                validFiles = true;
                addLog(`Queued file for upload: ${file.name}`);
            } else {
                addLog(`Skipped invalid file: ${file.name}`);
            }
        }

        if (!validFiles) return;

        addLog('Uploading and processing files...');

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                addLog('Files processed successfully.');
                updateCatalog(data.catalog);
            } else {
                addLog(`Error uploading files: ${data.error}`);
            }
        } catch (error) {
            addLog(`Network error during upload: ${error.message}`);
        }
    }

    function updateCatalog(catalog) {
        fileCatalog.innerHTML = '';
        catalog.forEach(item => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <div class="file-name">${item.filename}</div>
                <div class="file-summary">${item.summary}</div>
            `;
            fileCatalog.appendChild(div);
        });
    }

    // --- Chat ---
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = chatInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        const modelId = modelSelect.value;

        if (!message) return;
        if (!apiKey) {
            alert('Please enter your Gemini API Key.');
            return;
        }

        // Add User Message
        appendMessage('user', message);
        chatInput.value = '';
        chatHistoryData.push({ role: 'user', content: message });

        addLog(`Sending message to ${modelId}...`);
        sendBtn.disabled = true;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    api_key: apiKey,
                    model_id: modelId,
                    history: chatHistoryData
                })
            });

            const data = await response.json();

            if (response.ok) {
                addLog('Received response from Gemini.');
                appendMessage('model', data.response);
                chatHistoryData.push({ role: 'model', content: data.response });

                if (data.chart) {
                    addLog('Chart data received. Rendering chart...');
                    renderChart(data.chart);
                }
            } else {
                addLog(`Error from API: ${data.error}`);
                appendMessage('system', `Error: ${data.error}`);
            }
        } catch (error) {
            addLog(`Network error: ${error.message}`);
            appendMessage('system', `Error: ${error.message}`);
        } finally {
            sendBtn.disabled = false;
        }
    }

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';

        if (role === 'model') {
            contentDiv.innerHTML = marked.parse(text);
        } else {
            contentDiv.textContent = text;
        }

        div.appendChild(contentDiv);
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function renderChart(chartData) {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';

        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);

        // Append to chat history
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message model';
        messageDiv.appendChild(chartContainer);
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        new Chart(canvas, {
            type: chartData.type,
            data: chartData.data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: chartData.title,
                        color: '#c9d1d9'
                    },
                    legend: {
                        labels: {
                            color: '#8b949e'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#8b949e' },
                        grid: { color: '#30363d' }
                    },
                    y: {
                        ticks: { color: '#8b949e' },
                        grid: { color: '#30363d' }
                    }
                }
            }
        });
    }
});
