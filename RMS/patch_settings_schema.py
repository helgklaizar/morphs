import sqlite3
import json

db_path = '/home/klai/pocketbase/pb_data/data.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT id, schema FROM _collections WHERE name='landing_settings'")
row = cursor.fetchone()

if row:
    schema = json.loads(row['schema'])
    
    # Check if fields already exist
    field_names = [f['name'] for f in schema]
    
    dirty = False
    if 'target_margin' not in field_names:
        schema.append({
            "system": False,
            "id": "target_margin",
            "name": "target_margin",
            "type": "number",
            "required": False,
            "presentable": False,
            "unique": False,
            "options": {
                "min": None,
                "max": None,
                "noDecimal": False
            }
        })
        dirty = True
        
    if 'critical_food_cost' not in field_names:
        schema.append({
            "system": False,
            "id": "critical_food_cost",
            "name": "critical_food_cost",
            "type": "number",
            "required": False,
            "presentable": False,
            "unique": False,
            "options": {
                "min": None,
                "max": None,
                "noDecimal": False
            }
        })
        dirty = True

    if dirty:
        cursor.execute("UPDATE _collections SET schema = ? WHERE name='landing_settings'", (json.dumps(schema),))
        conn.commit()
        print("Schema patched.")
    else:
        print("Schema already has the fields.")
else:
    print("Collection not found.")

conn.close()
