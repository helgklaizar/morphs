use reqwest::Client;
use serde_json::Value;

macro_rules! send_req {
    ($req:expr, $event_succeeded:expr, $event_error:expr) => {
        match $req.send().await {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    $event_succeeded = true;
                    Ok(resp)
                } else if status.as_u16() == 404 {
                    Ok(resp) // 404 is handled gracefully in branching logic
                } else {
                    let err_msg = format!("HTTP {}", status);
                    $event_error = Some(err_msg);
                    Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, "HTTP Error")) as Box<dyn std::error::Error + Send + Sync>)
                }
            },
            Err(e) => {
                return Err(Box::new(e) as Box<dyn std::error::Error + Send + Sync>);
            }
        }
    };
}
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite, Row};
use std::time::Duration;
use tauri::{AppHandle, Manager, Emitter};

pub async fn start_sync_worker(app_handle: AppHandle, db_path: String) {
    let pool = match SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&format!("sqlite:{}", db_path))
        .await {
            Ok(p) => p,
            Err(e) => {
                log::error!("Failed to connect to SQLite for SyncEngine: {}", e);
                return;
            }
        };
        
    let http_client = Client::new();
    
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;
            
            let auth_token_res: Result<(String,), _> = sqlx::query_as("SELECT value FROM config WHERE key = 'auth_token'")
                .fetch_one(&pool)
                .await;
                
            let auth_token = match auth_token_res {
                Ok((val,)) => val,
                Err(_) => {
                    continue; // Skip if offline with no config
                }
            };
            
            let base_url_res: Result<(String,), _> = sqlx::query_as("SELECT value FROM config WHERE key = 'pb_url'")
                .fetch_one(&pool)
                .await;
                
            let base_url = match base_url_res {
                Ok((val,)) => val,
                Err(_) => "https://borsch.shop".to_string(), // fallback for backward compat
            };
            
            let mut changes_made = false;
            
            match push_updates(&pool, &http_client, &auth_token, &base_url).await {
                Ok(true) => changes_made = true,
                Ok(false) => {},
                Err(e) => log::error!("Push error: {}", e),
            }
            
            match pull_updates(&pool, &http_client, &auth_token, &base_url).await {
                Ok(true) => changes_made = true,
                Ok(false) => {},
                Err(e) => log::error!("Pull error: {}", e),
            }
            
            if changes_made {
                let _ = app_handle.emit("sync-completed", ());
            }
            
            let _ = http_client.get(&format!("{}/api/monitor/health?device_id=Tauri-Rust-1", base_url))
                .send()
                .await;
        }
    });
}

async fn push_updates(pool: &Pool<Sqlite>, client: &Client, auth_token: &str, base_url: &str) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Only process pending events with < 5 retries (dead-letter after 5 attempts)
    let pending_records = sqlx::query(
        "SELECT id, entity_type, action, payload_json, retry_count FROM outbox_events WHERE status = 'pending' AND retry_count < 5 ORDER BY created_at ASC LIMIT 50"
    )
    .fetch_all(pool)
    .await?;

    if pending_records.is_empty() {
        return Ok(false);
    }

    let mut any_success = false;
    
    for row in pending_records {
        let event_id: String = row.try_get("id").unwrap_or_default();
        let entity_type: String = row.try_get("entity_type").unwrap_or_default();
        let action: String = row.try_get("action").unwrap_or_default();
        let payload_json: String = row.try_get("payload_json").unwrap_or_default();
        let retry_count: i64 = row.try_get("retry_count").unwrap_or(0);
        
        let payload: Value = serde_json::from_str(&payload_json).unwrap_or_else(|_| serde_json::json!({}));
        let mut event_succeeded = false;
        let mut event_error: Option<String> = None;
        
        if entity_type == "orders" {
            let order_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            
            if action == "delete_order" {
                let pb_url = format!("{}/api/collections/orders/records/{}", base_url, order_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "sync_order" {
                let pb_order = serde_json::json!({
                    "id": order_id,
                    "customer_name": payload.get("customerName").unwrap_or(&Value::Null),
                    "customer_phone": payload.get("customerPhone").unwrap_or(&Value::Null),
                    "status": payload.get("status").unwrap_or(&Value::Null),
                    "total_amount": payload.get("totalAmount").unwrap_or(&Value::Null),
                    "payment_method": payload.get("paymentMethod").unwrap_or(&Value::Null),
                    "is_archived": if payload.get("isArchived").and_then(|v| v.as_bool()).unwrap_or(false) { 1 } else { 0 },
                    "reservation_date": payload.get("reservationDate").unwrap_or(&Value::Null),
                    "table_id": payload.get("tableId").unwrap_or(&Value::String("".to_string()))
                });
                
                let patch_url = format!("{}/api/collections/orders/records/{}", base_url, order_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_order), event_succeeded, event_error)?;
                    
                if resp.status().as_u16() == 404 {
                    let post_url = &format!("{}/api/collections/orders/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_order), event_succeeded, event_error)?;
                }
                
                if let Some(items) = payload.get("items").and_then(|i| i.as_array()) {
                    for item in items {
                        let item_id = item.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                        if item_id.is_empty() { continue; }
                        let pb_item = serde_json::json!({
                            "id": item_id,
                            "order_id": order_id,
                            "menu_item_name": item.get("menuItemName").unwrap_or(&Value::Null),
                            "quantity": item.get("quantity").unwrap_or(&Value::Null),
                            "price_at_time": item.get("priceAtTime").unwrap_or(&Value::Null),
                            "menu_item_id": item.get("menuItemId").unwrap_or(&Value::Null)
                        });
                        
                        let i_patch_url = format!("{}/api/collections/order_items/records/{}", base_url, item_id);
                        let i_resp = send_req!(client.patch(&i_patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                        if i_resp.status().as_u16() == 404 {
                            let _ = send_req!(client.post(&format!("{}/api/collections/order_items/records", base_url)).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                        }
                    }
                }
            }
        } else if entity_type == "inventory_categories" {
            let cat_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "category_delete" {
                let pb_url = format!("{}/api/collections/inventory_categories/records/{}", base_url, cat_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else {
                let pb_cat = if action == "category_add" {
                    serde_json::json!({
                        "id": cat_id,
                        "name": payload.get("name").unwrap_or(&Value::Null),
                        "order_index": payload.get("orderIndex").unwrap_or(&Value::Null),
                        "is_visible_in_assemblies": payload.get("isVisibleInAssemblies").unwrap_or(&Value::Null),
                        "is_visible_in_recipe": payload.get("isVisibleInRecipe").unwrap_or(&Value::Null),
                    })
                } else if action == "category_update_visibility" {
                    let field = payload.get("field").and_then(|v| v.as_str()).unwrap_or_default();
                    let field_val = payload.get("newValue").unwrap_or(&Value::Null);
                    if field == "is_visible_in_assemblies" {
                        serde_json::json!({ "is_visible_in_assemblies": field_val })
                    } else {
                        serde_json::json!({ "is_visible_in_recipe": field_val })
                    }
                } else if action == "category_update_order" {
                    serde_json::json!({
                        "order_index": payload.get("orderIndex").unwrap_or(&Value::Null),
                    })
                } else {
                    serde_json::json!({})
                };
                
                let patch_url = format!("{}/api/collections/inventory_categories/records/{}", base_url, cat_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_cat), event_succeeded, event_error)?;
                if resp.status().as_u16() == 404 {
                    let post_url = &format!("{}/api/collections/inventory_categories/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_cat), event_succeeded, event_error)?;
                }
            }
        } else if entity_type == "inventory_items" {
            let item_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "item_delete" {
                let pb_url = format!("{}/api/collections/inventory_items/records/{}", base_url, item_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "item_save" {
                let pb_item = serde_json::json!({
                    "id": item_id,
                    "name": payload.get("name").unwrap_or(&Value::Null),
                    "price": payload.get("price").unwrap_or(&Value::Null),
                    "unit": payload.get("unit").unwrap_or(&Value::Null),
                    "quantity": payload.get("quantity").unwrap_or(&Value::Null),
                    "category_id": payload.get("categoryId").unwrap_or(&Value::Null),
                    "supplier": payload.get("supplier").unwrap_or(&Value::Null),
                    "pack_size": payload.get("packSize").unwrap_or(&Value::Null),
                    "recipe_unit": payload.get("recipeUnit").unwrap_or(&Value::Null),
                    "yield_per_unit": payload.get("yieldPerUnit").unwrap_or(&Value::Null),
                    "is_prep": payload.get("isPrep").unwrap_or(&Value::Null),
                });
                
                let patch_url = format!("{}/api/collections/inventory_items/records/{}", base_url, item_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                if resp.status().as_u16() == 404 {
                    let post_url = &format!("{}/api/collections/inventory_items/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                }
            } else if action == "item_update_quantity" {
                let pb_item = serde_json::json!({
                    "quantity": payload.get("quantity").unwrap_or(&Value::Null),
                });
                let patch_url = format!("{}/api/collections/inventory_items/records/{}", base_url, item_id);
                let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
            }
        } else if entity_type == "clients" {
            let client_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "client_delete" {
                let pb_url = format!("{}/api/collections/clients/records/{}", base_url, client_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "client_add" || action == "client_update" {
                let mut pb_client = serde_json::Map::new();
                if let Some(v) = payload.get("name") { pb_client.insert("name".to_string(), v.clone()); }
                if let Some(v) = payload.get("phone") { pb_client.insert("phone".to_string(), v.clone()); }
                if let Some(v) = payload.get("address") { pb_client.insert("address".to_string(), v.clone()); }
                if let Some(v) = payload.get("email") { pb_client.insert("email".to_string(), v.clone()); }
                
                let patch_url = format!("{}/api/collections/clients/records/{}", base_url, client_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_client), event_succeeded, event_error)?;
                if resp.status().as_u16() == 404 {
                    pb_client.insert("id".to_string(), Value::String(client_id.to_string()));
                    let post_url = &format!("{}/api/collections/clients/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_client), event_succeeded, event_error)?;
                }
            }
        } else if entity_type == "suppliers" {
            let supplier_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "supplier_delete" {
                let pb_url = format!("{}/api/collections/suppliers/records/{}", base_url, supplier_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else {
                let mut pb_s = serde_json::Map::new();
                if let Some(v) = payload.get("name") { pb_s.insert("name".to_string(), v.clone()); }
                if let Some(v) = payload.get("phone") { pb_s.insert("phone".to_string(), v.clone()); }
                if let Some(v) = payload.get("email") { pb_s.insert("email".to_string(), v.clone()); }
                if let Some(v) = payload.get("address") { pb_s.insert("address".to_string(), v.clone()); }
                if let Some(v) = payload.get("category") { pb_s.insert("category".to_string(), v.clone()); }
                if let Some(v) = payload.get("notes") { pb_s.insert("notes".to_string(), v.clone()); }

                let patch_url = format!("{}/api/collections/suppliers/records/{}", base_url, supplier_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_s), event_succeeded, event_error)?;
                if resp.status().as_u16() == 404 {
                    pb_s.insert("id".to_string(), Value::String(supplier_id.to_string()));
                    let post_url = &format!("{}/api/collections/suppliers/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_s), event_succeeded, event_error)?;
                }
            }
        } else if entity_type == "supplier_orders" {
            let order_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "order_delete" {
                let pb_url = format!("{}/api/collections/supplier_orders/records/{}", base_url, order_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "order_status" {
                let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("draft");
                let pb_body = serde_json::json!({ "status": status });
                let patch_url = format!("{}/api/collections/supplier_orders/records/{}", base_url, order_id);
                let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_body), event_succeeded, event_error)?;
            } else if action == "order_create" {
                let mut pb_o = serde_json::Map::new();
                if let Some(v) = payload.get("supplierId") { pb_o.insert("supplier_id".to_string(), v.clone()); }
                if let Some(v) = payload.get("totalAmount") { pb_o.insert("total_amount".to_string(), v.clone()); }
                if let Some(v) = payload.get("status") { pb_o.insert("status".to_string(), v.clone()); }
                if let Some(v) = payload.get("items") { 
                    pb_o.insert("items".to_string(), Value::String(v.to_string())); 
                }
                if let Some(v) = payload.get("id") { pb_o.insert("id".to_string(), v.clone()); }

                let post_url = &format!("{}/api/collections/supplier_orders/records", base_url);
                let resp = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_o), event_succeeded, event_error)?;
                if resp.status().is_client_error() {
                    let patch_url = format!("{}/api/collections/supplier_orders/records/{}", base_url, order_id);
                    let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_o), event_succeeded, event_error)?;
                }
            }
        } else if entity_type == "workers" {
            let worker_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "worker_delete" {
                let pb_url = format!("{}/api/collections/workers/records/{}", base_url, worker_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "worker_add" || action == "worker_update" {
                let mut pb_worker = serde_json::Map::new();
                if let Some(v) = payload.get("name") { pb_worker.insert("name".to_string(), v.clone()); }
                if let Some(v) = payload.get("role") { pb_worker.insert("role".to_string(), v.clone()); }
                if let Some(v) = payload.get("hourly_rate") { pb_worker.insert("hourly_rate".to_string(), v.clone()); }
                if let Some(v) = payload.get("phone") { pb_worker.insert("phone".to_string(), v.clone()); }
                if let Some(v) = payload.get("status") { pb_worker.insert("status".to_string(), v.clone()); }
                
                let patch_url = format!("{}/api/collections/workers/records/{}", base_url, worker_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_worker), event_succeeded, event_error)?;
                if resp.status().as_u16() == 404 {
                    pb_worker.insert("id".to_string(), Value::String(worker_id.to_string()));
                    let post_url = &format!("{}/api/collections/workers/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_worker), event_succeeded, event_error)?;
                }
            }
        } else if entity_type == "tables" {
            let table_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "table_delete" {
                let pb_url = format!("{}/api/collections/tables/records/{}", base_url, table_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "table_update" {
                let mut pb_item = serde_json::Map::new();
                if let Some(v) = payload.get("number") { pb_item.insert("number".to_string(), v.clone()); }
                if let Some(v) = payload.get("seats") { pb_item.insert("seats".to_string(), v.clone()); }
                if let Some(v) = payload.get("zone") { pb_item.insert("zone".to_string(), v.clone()); }
                if let Some(v) = payload.get("position_x") { pb_item.insert("position_x".to_string(), v.clone()); }
                if let Some(v) = payload.get("position_y") { pb_item.insert("position_y".to_string(), v.clone()); }
                if let Some(v) = payload.get("is_active") { pb_item.insert("is_active".to_string(), v.clone()); }

                let patch_url = format!("{}/api/collections/tables/records/{}", base_url, table_id);
                let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
            } else if action == "table_create" {
                let mut pb_item = serde_json::Map::new();
                if let Some(v) = payload.get("number") { pb_item.insert("number".to_string(), v.clone()); }
                if let Some(v) = payload.get("seats") { pb_item.insert("seats".to_string(), v.clone()); }
                if let Some(v) = payload.get("zone") { pb_item.insert("zone".to_string(), v.clone()); }
                if let Some(v) = payload.get("position_x") { pb_item.insert("position_x".to_string(), v.clone()); }
                if let Some(v) = payload.get("position_y") { pb_item.insert("position_y".to_string(), v.clone()); }
                if let Some(v) = payload.get("is_active") { pb_item.insert("is_active".to_string(), v.clone()); }
                if let Some(v) = payload.get("id") { pb_item.insert("id".to_string(), v.clone()); }

                let post_url = &format!("{}/api/collections/tables/records", base_url);
                let resp = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                if resp.status().is_client_error() {
                    let patch_url = format!("{}/api/collections/tables/records/{}", base_url, table_id);
                    let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                }
            }
        } else if entity_type == "recipes" {
            let recipe_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "recipe_delete" {
                let pb_url = format!("{}/api/collections/recipes/records/{}", base_url, recipe_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "recipe_save" {
                let mut pb_item = serde_json::Map::new();
                if let Some(v) = payload.get("name") { pb_item.insert("name".to_string(), v.clone()); }
                if let Some(v) = payload.get("portions") { pb_item.insert("portions".to_string(), v.clone()); }
                if let Some(v) = payload.get("isPrep") { pb_item.insert("is_prep".to_string(), v.clone()); }
                if let Some(v) = payload.get("prepInventoryId") { pb_item.insert("prep_inventory_id".to_string(), v.clone()); }
                if let Some(v) = payload.get("id") { pb_item.insert("id".to_string(), v.clone()); }

                let post_url = &format!("{}/api/collections/recipes/records", base_url);
                let resp = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                if resp.status().is_client_error() {
                    let patch_url = format!("{}/api/collections/recipes/records/{}", base_url, recipe_id);
                    let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                }

                // Handle ingredients
                if let Some(ings) = payload.get("ingredients").and_then(|v| v.as_array()) {
                    // Try to clear old (if updating)
                    // It's safer to not query PB and just ignore overlaps if possible, but PocketBase needs clean inserts
                    // For now we just push new ingredients (in a real robust sync we should query and delete old first)
                    for ing in ings {
                        let mut pb_ing = serde_json::Map::new();
                        pb_ing.insert("recipe_id".to_string(), Value::String(recipe_id.to_string()));
                        if let Some(v) = ing.get("inventoryItemId") { pb_ing.insert("inventory_item_id".to_string(), v.clone()); }
                        if let Some(v) = ing.get("nestedRecipeId") { pb_ing.insert("nested_recipe_id".to_string(), v.clone()); }
                        if let Some(v) = ing.get("quantity") { pb_ing.insert("quantity".to_string(), v.clone()); }
                        let ing_post_url = &format!("{}/api/collections/recipe_ingredients/records", base_url);
                        let _ = send_req!(client.post(ing_post_url).header("Authorization", auth_token).json(&pb_ing), event_succeeded, event_error)?;
                    }
                }
            }
        } else if entity_type == "assemblies" {
            let assembly_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "assembly_delete" {
                let pb_url = format!("{}/api/collections/assemblies/records/{}", base_url, assembly_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "assembly_save" {
                let mut pb_item = serde_json::Map::new();
                if let Some(v) = payload.get("name") { pb_item.insert("name".to_string(), v.clone()); }
                if let Some(v) = payload.get("id") { pb_item.insert("id".to_string(), v.clone()); }

                let post_url = &format!("{}/api/collections/assemblies/records", base_url);
                let resp = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                if resp.status().is_client_error() {
                    let patch_url = format!("{}/api/collections/assemblies/records/{}", base_url, assembly_id);
                    let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                }

                if let Some(items) = payload.get("items").and_then(|v| v.as_array()) {
                    for itm in items {
                        let mut pb_itm = serde_json::Map::new();
                        pb_itm.insert("assembly_id".to_string(), Value::String(assembly_id.to_string()));
                        if let Some(v) = itm.get("inventoryItemId") { pb_itm.insert("inventory_item_id".to_string(), v.clone()); }
                        if let Some(v) = itm.get("quantity") { pb_itm.insert("quantity".to_string(), v.clone()); }
                        let itm_post_url = &format!("{}/api/collections/assembly_items/records", base_url);
                        let _ = send_req!(client.post(itm_post_url).header("Authorization", auth_token).json(&pb_itm), event_succeeded, event_error)?;
                    }
                }
            }
        } else if entity_type == "shifts" {
            let shift_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "shift_start" {
                let pb_shift = serde_json::json!({
                    "id": shift_id,
                    "worker_id": payload.get("worker_id").unwrap_or(&Value::Null),
                    "start_time": payload.get("start_time").unwrap_or(&Value::Null),
                });
                let post_url = &format!("{}/api/collections/shifts/records", base_url);
                let resp = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_shift), event_succeeded, event_error)?;
                if resp.status().is_client_error() {
                    let patch_url = format!("{}/api/collections/shifts/records/{}", base_url, shift_id);
                    let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_shift), event_succeeded, event_error)?;
                }
            } else if action == "shift_end" {
                let pb_shift = serde_json::json!({
                    "end_time": payload.get("end_time").unwrap_or(&Value::Null),
                    "total_hours": payload.get("total_hours").unwrap_or(&Value::Null),
                    "total_pay": payload.get("total_pay").unwrap_or(&Value::Null),
                });
                let patch_url = format!("{}/api/collections/shifts/records/{}", base_url, shift_id);
                let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_shift), event_succeeded, event_error)?;
            }
        } else if entity_type == "menu" {
            let item_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            if action == "menu_item_delete" {
                let pb_url = format!("{}/api/collections/menu_items/records/{}", base_url, item_id);
                let _ = send_req!(client.delete(&pb_url).header("Authorization", auth_token), event_succeeded, event_error)?;
            } else if action == "menu_item_update_stock" {
                let pb_item = serde_json::json!({
                    "stock": payload.get("stock").unwrap_or(&Value::Null),
                });
                let patch_url = format!("{}/api/collections/menu_items/records/{}", base_url, item_id);
                let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
            } else if action == "menu_item_toggle_active" {
                let pb_item = serde_json::json!({
                    "is_active": payload.get("is_active").unwrap_or(&Value::Null),
                });
                let patch_url = format!("{}/api/collections/menu_items/records/{}", base_url, item_id);
                let _ = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
            } else if action == "menu_item_save" {
                let mut pb_item = serde_json::Map::new();
                if let Some(v) = payload.get("name") { pb_item.insert("name".to_string(), v.clone()); }
                if let Some(v) = payload.get("price") { pb_item.insert("price".to_string(), v.clone()); }
                if let Some(v) = payload.get("description") { pb_item.insert("description".to_string(), v.clone()); }
                if let Some(v) = payload.get("stock") { pb_item.insert("stock".to_string(), v.clone()); }
                if let Some(v) = payload.get("isActive") { pb_item.insert("is_active".to_string(), v.clone()); }
                if let Some(v) = payload.get("isPoll") { pb_item.insert("is_poll".to_string(), v.clone()); }
                if let Some(v) = payload.get("categoryId") { pb_item.insert("category_id".to_string(), v.clone()); }
                if let Some(v) = payload.get("kitchenDepartment") { pb_item.insert("kitchen_department".to_string(), v.clone()); }
                if let Some(v) = payload.get("isPrep") { pb_item.insert("is_prep".to_string(), v.clone()); }
                if let Some(v) = payload.get("unit") { pb_item.insert("unit".to_string(), v.clone()); }
                if let Some(v) = payload.get("writeOffOnProduce") { pb_item.insert("write_off_on_produce".to_string(), v.clone()); }

                let patch_url = format!("{}/api/collections/menu_items/records/{}", base_url, item_id);
                let resp = send_req!(client.patch(&patch_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                if resp.status().as_u16() == 404 {
                    pb_item.insert("id".to_string(), Value::String(item_id.to_string()));
                    let post_url = &format!("{}/api/collections/menu_items/records", base_url);
                    let _ = send_req!(client.post(post_url).header("Authorization", auth_token).json(&pb_item), event_succeeded, event_error)?;
                }
            }
        }

        // ── Conditional status update (critical fix) ─────────────────
        // event_succeeded is set to true only when a 2xx response was received.
        // Until all entity branches explicitly set it, we default to marking synced
        // to keep fire-and-forget events unblocked.
        let _ = retry_count; // suppress unused-variable warning
        if event_succeeded || event_error.is_none() {
            sqlx::query("UPDATE outbox_events SET status = 'synced' WHERE id = ?")
                .bind(&event_id)
                .execute(pool)
                .await?;
            any_success = true;
        } else {
            let err_msg = event_error.as_deref().unwrap_or("unknown error");
            sqlx::query(
                "UPDATE outbox_events SET retry_count = retry_count + 1, last_error = ?, status = CASE WHEN retry_count + 1 >= 5 THEN 'dead_letter' ELSE 'pending' END WHERE id = ?"
            )
            .bind(err_msg)
            .bind(&event_id)
            .execute(pool)
            .await?;
            log::warn!("Outbox event {} failed (attempt {}): {}", event_id, retry_count + 1, err_msg);
        }
    }

    Ok(any_success)
}

async fn pull_updates(_pool: &Pool<Sqlite>, _client: &Client, _auth_token: &str, _base_url: &str) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // A full resilient implementation would sync PB records and UPSERT into orders.
    // Punting this for later as push_updates is the core requirement.
    Ok(false)
}
