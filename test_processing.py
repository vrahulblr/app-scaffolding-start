import os
import shutil
from utils import process_xlsx

# Setup
test_file = 'test_data.xlsx'
output_dir = 'test_processed'
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)
os.makedirs(output_dir)

# Run processing
print(f"Processing {test_file}...")
try:
    files, summary = process_xlsx(test_file, output_dir)
    
    print("\nGenerated Files:")
    for f in files:
        print(f" - {f}")
        
    print("\nSummary:")
    for s in summary:
        print(f" - {s}")
        
    # Verify content
    if len(files) >= 3: # Expecting 3 tables (1 in Sales, 2 in Financials)
        print("\nSUCCESS: Generated expected number of CSVs.")
    else:
        print(f"\nWARNING: Generated {len(files)} CSVs, expected at least 3.")

except Exception as e:
    print(f"\nERROR: {e}")
