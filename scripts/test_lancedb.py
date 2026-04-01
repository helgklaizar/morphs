import lancedb
db = lancedb.connect("./test_db")
print("success lancedb")
import kuzu
db_kuzu = kuzu.Database("./test_kuzu")
print("success kuzu")
