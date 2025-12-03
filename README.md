# AI Data Analyst (MCP Client)

A web application that allows users to upload XLSX files and chat with an AI agent to analyze the data. The app uses Google Gemini models for analysis and chart generation, and is designed to function as an MCP (Model Context Protocol) client.

## Features

- **File Upload**: Drag & Drop XLSX files.
- **Smart Processing**: Automatically extracts tables from sheets and converts them to CSVs for AI processing.
- **AI Chat**: Chat with your data using Gemini 2.5 Flash or Gemini 3 Pro Preview.
- **Data Visualization**: Automatically generates charts (Bar, Line, Pie, Scatter, Histogram) based on the data.
- **MCP Client**: Structured to support Model Context Protocol integration.
- **Secure**: API Keys are not stored and are required per session.

## Setup

1.  **Clone the repository** (or navigate to the project directory).
2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run the application**:
    ```bash
    python3 app.py
    ```
4.  **Open in Browser**:
    Navigate to `http://127.0.0.1:5000`

## Usage

1.  **Enter API Key**: Input your Google Gemini API Key in the sidebar.
2.  **Select Model**: Choose between Gemini 2.5 Flash (default) or Gemini 3 Pro Preview.
3.  **Upload Data**: Drag and drop an XLSX file into the upload area. The app will process it and show a summary in the catalog.
4.  **Chat**: Ask questions about your data in the chat box.
    - *Example*: "What is the total revenue?"
    - *Example*: "Show me a bar chart of sales by region."

## Tech Stack

- **Backend**: Python, Flask, `openpyxl`, `google-genai`
- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript
- **AI**: Google Gemini API (File Search)

## MCP Integration

The application includes a `mcp_client.py` module that provides a skeleton for connecting to MCP servers. It is designed to be extended with actual connection logic (Stdio/SSE) to allow the AI agent to call external tools.
