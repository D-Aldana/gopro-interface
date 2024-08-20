import os
import json

def load_gopro_config():
    # Determine the path to the config file, defaulting to config/gopro_config.json
    config_file_path = os.getenv("GOPRO_CONFIG_FILE", "config/gopro_config.json")
    
    if os.path.exists(config_file_path):
        with open(config_file_path, 'r') as f:
            config = json.load(f)
            return config.get("gopros", [])

    # Default to an empty list if the config file is not found
    return []

gopro_ips = load_gopro_config()
