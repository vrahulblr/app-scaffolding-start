import os
import json
import logging
from flask import Flask, render_template, request, jsonify, session
from werkzeug.utils import secure_filename
from utils import process_xlsx, get_gemini_response, determine_chart_response
from google import genai

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
app.secret_key = os.urandom(24) # Secure secret key for sessions

# Configuration
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'xlsx'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    files = request.files.getlist('file')
    file_summaries = []
    
    # Initialize session file list if not present
    if 'uploaded_files' not in session:
        session['uploaded_files'] = []

    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            try:
                # Process the file (XLSX -> CSVs)
                generated_csvs, summary = process_xlsx(file_path, app.config['PROCESSED_FOLDER'])
                
                # Add to session
                session['uploaded_files'].extend(generated_csvs)
                session.modified = True
                
                file_summaries.append({
                    'filename': filename,
                    'summary': "; ".join(summary)
                })
                
            except Exception as e:
                return jsonify({'error': f"Failed to process {filename}: {str(e)}"}), 500
        else:
            return jsonify({'error': f"Invalid file type: {file.filename}"}), 400

    return jsonify({'message': 'Files uploaded and processed', 'catalog': file_summaries})

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    api_key = data.get('api_key')
    model_id = data.get('model_id', 'gemini-2.5-flash')
    history = data.get('history', [])
    
    if not message or not api_key:
        return jsonify({'error': 'Message and API Key are required'}), 400

    # Get context files from session
    context_files = session.get('uploaded_files', [])
    
    # Log the step
    logging.info(f"Chat request: {message} | Model: {model_id} | Files: {len(context_files)}")

    # Call Gemini
    response_text = get_gemini_response(message, history, api_key, model_id, context_files)
    
    # Check for chart
    chart_data = None
    try:
        # We use a separate client for the chart check to ensure we use the right key
        client = genai.Client(api_key=api_key)
        chart_data = determine_chart_response(client, response_text, model_id)
    except Exception as e:
        logging.warning(f"Chart determination failed: {e}")

    return jsonify({
        'response': response_text,
        'chart': chart_data
    })

@app.route('/reset', methods=['POST'])
def reset():
    session.clear()
    # Optional: Clean up uploaded files
    return jsonify({'message': 'Session reset'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
