const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://borsch.shop');
async function test() {
  try {
    const raw = await pb.collection("menu_items").getFullList();
    console.log("Raw items:", raw.length);
    const filtered = await pb.collection("menu_items").getFullList({ filter: 'is_active = true', sort: 'name' });
    console.log("Active items:", filtered.length);
    if(raw.length > 0) {
      console.log("First item sample:", { name: raw[0].name, is_active: raw[0].is_active });
    }
  } catch(e) {
    console.error("ERROR", e);
  }
}
test();
