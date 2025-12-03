import os
import csv
import json
import logging
import openpyxl
import pandas as pd
from google import genai
from google.genai import types

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_xlsx(file_path, output_dir):
    """
    Extracts tables from an XLSX file and converts them to CSVs.
    Tries to identify distinct blocks of data (tables) within each sheet.
    """
    logging.info(f"Processing XLSX file: {file_path}")
    generated_files = []
    summary = []

    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            data = list(ws.values)
            
            if not data:
                continue

            # Simple block detection: split by empty rows
            # This is a heuristic. If a row is entirely None, it's a separator.
            blocks = []
            current_block = []
            
            for row in data:
                if any(cell is not None for cell in row):
                    current_block.append(row)
                else:
                    if current_block:
                        blocks.append(current_block)
                        current_block = []
            if current_block:
                blocks.append(current_block)

            logging.info(f"Found {len(blocks)} blocks in sheet '{sheet_name}'")

            for i, block in enumerate(blocks):
                if not block:
                    continue
                
                # Convert block to DataFrame
                # Assume first row of the block is header
                try:
                    df = pd.DataFrame(block[1:], columns=block[0])
                    # Drop columns that are all None (unnamed empty columns in the middle of nowhere)
                    df = df.dropna(axis=1, how='all')
                    
                    csv_filename = f"{os.path.splitext(os.path.basename(file_path))[0]}_{sheet_name}_table_{i+1}.csv"
                    csv_path = os.path.join(output_dir, csv_filename)
                    df.to_csv(csv_path, index=False)
                    
                    generated_files.append(csv_path)
                    summary.append(f"Sheet: {sheet_name}, Table {i+1}: {len(df)} rows, Columns: {', '.join(map(str, df.columns.tolist()))}")
                except Exception as e:
                    logging.error(f"Error processing block {i} in sheet {sheet_name}: {e}")

    except Exception as e:
        logging.error(f"Failed to process XLSX: {e}")
        raise e

    return generated_files, summary

def upload_to_gemini(client, file_path, mime_type="text/csv"):
    """
    Uploads a file to Gemini File API.
    """
    try:
        logging.info(f"Uploading file to Gemini: {file_path}")
        with open(file_path, "rb") as f:
            file_upload = client.files.upload(file=f, config=dict(mime_type=mime_type))
        logging.info(f"Uploaded file: {file_upload.name}")
        return file_upload
    except Exception as e:
        logging.error(f"Failed to upload file to Gemini: {e}")
        raise e

def get_gemini_response(message, history, api_key, model_id, context_files):
    """
    Interacts with Gemini API.
    """
    try:
        client = genai.Client(api_key=api_key)
        
        # Upload context files if they haven't been uploaded yet (or re-upload for this session)
        # In a real app, we might cache these URIs. For now, we'll assume they are passed as file objects or we upload them here.
        # Optimization: The caller should manage file uploads and pass the file objects/URIs.
        # But to keep it simple, we will assume context_files contains local paths and we upload them every time (inefficient but stateless)
        # OR better: The caller (app.py) manages the uploads and passes the `types.Content` or file resources.
        
        # Let's assume context_files is a list of local paths. We upload them.
        # NOTE: For production, we should check if files are already uploaded.
        
        uploaded_files = []
        for file_path in context_files:
            uploaded_files.append(upload_to_gemini(client, file_path))

        # Create the prompt with file context
        # For File Search or just context, we can pass the file objects directly in the generate_content call
        
        # Construct the conversation history
        contents = []
        for msg in history:
            role = "user" if msg['role'] == 'user' else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg['content'])]))
        
        # Add current message and files
        parts = [types.Part.from_text(text=message)]
        for uf in uploaded_files:
            parts.append(types.Part.from_uri(file_uri=uf.uri, mime_type=uf.mime_type))
            
        contents.append(types.Content(role="user", parts=parts))

        logging.info(f"Sending request to Gemini model: {model_id}")
        
        # Configure generation
        config = types.GenerateContentConfig(
            temperature=0.7,
        )

        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=config
        )
        
        return response.text

    except Exception as e:
        logging.error(f"Gemini API Error: {e}")
        return f"Error: {str(e)}"

def determine_chart_response(client, text_response, model_id):
    """
    Analyzes the text response to determine if a chart is needed.
    Returns a JSON object if a chart is recommended, else None.
    """
    try:
        prompt = f"""
        Analyze the following response and determine if it contains data suitable for a chart.
        
        Response:
        {text_response}
        
        Heuristics:
        - Bar Chart: Comparing discrete categories or values
        - Line Chart: Showing trends and changes over time
        - Pie Chart: Displaying proportions or percentages of a whole
        - Scatter Plot: Exploring the relationship or correlation between two variables
        - Histogram: Representing the distribution of numerical data
        
        If a chart is suitable, return a JSON object with the following structure:
        {{
            "type": "bar" | "line" | "pie" | "scatter" | "histogram",
            "title": "Chart Title",
            "data": {{
                "labels": ["Label1", "Label2", ...],
                "datasets": [
                    {{
                        "label": "Dataset Label",
                        "data": [10, 20, ...]
                    }}
                ]
            }}
        }}
        
        If no chart is suitable, return {{ "chart": false }}.
        Return ONLY valid JSON.
        """
        
        response = client.models.generate_content(
            model=model_id,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        result = json.loads(response.text)
        if result.get("chart") is False:
            return None
        return result

    except Exception as e:
        logging.error(f"Chart determination error: {e}")
        return None
