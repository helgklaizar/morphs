import os
import json
from mlx_agent import CoreMind
from core.logger import logger

class ArchivistMorph:
    def __init__(self):
        self.mind = CoreMind()
        logger.info("📚 [Archivist-Morph] Woke up. Checking for local memory overflow...")

    def fold_memory(self):
        """
        Checks the blueprints folder and json files.
        If they are too large, it compresses the history into bullet-points.
        """
        blueprints_dir = "../blueprints"
        if not os.path.exists(blueprints_dir):
            return

        for filename in os.listdir(blueprints_dir):
            if not filename.endswith(".json"):
                continue

            filepath = os.path.join(blueprints_dir, filename)
            try:
                with open(filepath, "r") as f:
                    content = f.read()
            except Exception as e:
                logger.info(f"⚠️ [Archivist] Error opening {filename}: {e}")
                continue

            # Memory Folding Logic: If the context has grown too large
            if len(content) > 3000:
                logger.info(f"🧹 [Archivist-Morph] File {filename} is too large ({len(content)} bytes). Starting compression (Memory Folding)...")
                
                prompt = (
                    f"You are an Archivist. Compress this agent work log into the shortest and most concise bullet-points possible.\n"
                    f"Leave ONLY the essence: architecture, API paths, table names, and keys. Remove all fluff.\n"
                    f"SOURCE:\n{content}"
                )
                
                schema = (
                    "<thought>Write whatever you want</thought>\n"
                    "<code>Here is the compressed JSON with key metrics (keys, endpoints, architecture)</code>"
                )
                
                result = self.mind.think_structured(prompt, schema, max_tokens=1000, expert_adapter="archivist")
                compressed_json_str = result.get("code", "")
                
                # Saving back as a mini-snapshot
                try:
                    compressed_json = json.loads(compressed_json_str)
                    with open(filepath, "w") as f:
                        json.dump(compressed_json, f, indent=4)
                    logger.info(f"📦 [Archivist-Morph] Success! File {filename} is compressed. AI context tokens have been freed.")
                except Exception as e:
                    logger.info(f"⚠️ [Archivist-Morph] Error parsing compressed JSON, skipping. {e}")
            else:
                pass

if __name__ == "__main__":
    arch = ArchivistMorph()
    arch.fold_memory()
