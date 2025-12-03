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

    // --- Icons (SVGs) ---
    const icons = {
        thumbsUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
        thumbsDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>`,
        copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
        pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`, // Generic file icon for PDF
        pptx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="M9 15l3 3 3-3"></path></svg>` // Generic file icon for PPTX
    };

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

            // Add Action Bar
            const actionBar = document.createElement('div');
            actionBar.className = 'action-bar';

            const actions = [
                { name: 'thumbsUp', icon: icons.thumbsUp, action: () => addLog('User gave positive feedback.') },
                { name: 'thumbsDown', icon: icons.thumbsDown, action: () => addLog('User gave negative feedback.') },
                {
                    name: 'copy', icon: icons.copy, action: () => {
                        navigator.clipboard.writeText(text);
                        addLog('Response copied to clipboard.');
                    }
                },
                {
                    name: 'share', icon: icons.share, action: () => {
                        alert('Share URL: https://mbaintern.com/share/mock-id-123');
                        addLog('Share link generated.');
                    }
                },
                {
                    name: 'pdf', icon: icons.pdf, action: () => {
                        alert('Exporting as PDF...');
                        addLog('Exported as PDF.');
                    }
                },
                {
                    name: 'pptx', icon: icons.pptx, action: () => {
                        alert('Exporting as PPTX...');
                        addLog('Exported as PPTX.');
                    }
                }
            ];

            actions.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.innerHTML = item.icon;
                btn.title = item.name;
                btn.onclick = item.action;
                actionBar.appendChild(btn);
            });

            div.appendChild(actionBar);

        } else {
            contentDiv.textContent = text;
        }

        // Insert content before action bar if model
        if (role === 'model') {
            div.insertBefore(contentDiv, div.firstChild);
        } else {
            div.appendChild(contentDiv);
        }

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
