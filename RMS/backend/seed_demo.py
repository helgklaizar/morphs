import requests
import random
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8090/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzY1MjMwOTIsImlkIjoic2pkcHBsMnlsMzBseTQ2IiwidHlwZSI6ImFkbWluIn0.UzuGmWf4tXf8ZpxFyUXfe5aBymTFtHlTYaS3SOTGaO4"
HEADERS = {"Authorization": f"{TOKEN}"}

def post(coll, data):
    r = requests.post(f"{BASE_URL}/collections/{coll}/records", json=data, headers=HEADERS)
    if r.status_code >= 400:
        print(f"Error {coll}: {r.text}")
    return r.json()

print("Cleaning existing demo data (except Borsch base)...")
# Optional cleanup? No, user wants enrichment.

print("Seeding Menu...")
cat_ids = []
for c in ["Супы", "Горячее", "Закуски", "Напитки"]:
    cat_ids.append(post("menu_categories", {"name": c, "is_active": True})['id'])

menu_item_ids = []
dishes = [
    ("Харчо", 35, cat_ids[0]), ("Уха", 40, cat_ids[0]),
    ("Стейк", 95, cat_ids[1]), ("Плов", 55, cat_ids[1]), ("Пельмени", 45, cat_ids[1]),
    ("Цезарь", 45, cat_ids[1]), ("Бургер", 48, cat_ids[1]),
    ("Хумус", 25, cat_ids[2]), ("Гренки", 15, cat_ids[2]),
    ("Кофе", 12, cat_ids[3]), ("Чай", 10, cat_ids[3]), ("Пиво 0.5", 28, cat_ids[3])
]
for name, price, cid in dishes:
    item = post("menu_items", {"name": name, "price": price, "category_id": cid, "is_active": True})
    menu_item_ids.append(item['id'])

print("Seeding Inventory...")
inv_cat_ids = []
for c in ["Овощи", "Мясо", "Бакалея", "Напитки"]:
    inv_cat_ids.append(post("inventory_categories", {"name": c})['id'])

ing_ids = []
for i in range(10):
    ing = post("inventory_items", {
        "name": f"Ингредиент {i+1}", 
        "category_id": random.choice(inv_cat_ids),
        "unit": "кг",
        "price": random.randint(10, 50),
        "stock": random.randint(5, 50)
    })
    ing_ids.append(ing['id'])

print("Seeding Tables...")
for i in range(7, 16):
    post("tables", {
        "number": str(i),
        "seats": random.choice([2, 4, 6]),
        "zone": random.choice(["Зал 1", "Терраса"]),
        "position_x": random.randint(100, 500),
        "position_y": random.randint(100, 500),
        "is_active": True
    })

print("Seeding Workers...")
worker_ids = []
for name, role in [("Иван", "manager"), ("Мария", "waiter"), ("Алекс", "chef"), ("Сара", "waiter")]:
    w = post("workers", {"name": name, "role": role, "is_active": True, "salary_rate": 40})
    worker_ids.append(w['id'])

print("Seeding 200 Orders (Historical)...")
for i in range(200):
    days_ago = random.randint(0, 30)
    dt = datetime.now() - timedelta(days=days_ago)
    # Peak hours: 12-14 and 18-21
    hour = random.choices(list(range(24)), weights=[1,1,1,1,1,1,2,5,10,15,10,15,30,40,20,10,15,30,50,60,40,20,10,5])[0]
    dt = dt.replace(hour=hour, minute=random.randint(0, 59))
    
    amount = random.randint(40, 280)
    post("orders", {
        "customer_name": random.choice(["Клиент", "Аноним", "Гость", "Вип"]),
        "total_amount": amount,
        "status": "completed",
        "payment_method": random.choice(["cash", "bit"]),
        "created": dt.isoformat() + "Z"
    })

print("DONE!")
