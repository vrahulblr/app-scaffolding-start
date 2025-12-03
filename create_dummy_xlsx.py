import pandas as pd
import openpyxl

# Create dummy data
data1 = {
    'Product': ['Widget A', 'Widget B', 'Widget C'],
    'Sales': [100, 200, 150],
    'Region': ['North', 'South', 'East']
}

data2 = {
    'Month': ['Jan', 'Feb', 'Mar'],
    'Revenue': [1000, 1200, 1100],
    'Expenses': [800, 900, 850]
}

df1 = pd.DataFrame(data1)
df2 = pd.DataFrame(data2)

# Save to XLSX
with pd.ExcelWriter('test_data.xlsx', engine='openpyxl') as writer:
    df1.to_excel(writer, sheet_name='Sales', index=False)
    # Add some empty rows to simulate blocks
    df2.to_excel(writer, sheet_name='Financials', index=False, startrow=0)
    df1.to_excel(writer, sheet_name='Financials', index=False, startrow=10)
