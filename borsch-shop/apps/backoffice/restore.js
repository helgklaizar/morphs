const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "http://35.252.3.177:8000";
// We don't have the anon key easily, let's use psql on the VPS to dump to a JSON file, or we can use the gcloud command inside node.

