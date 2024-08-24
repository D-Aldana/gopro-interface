import os
import json

# Determine the path to the config file, defaulting to config/gopro_config.json
config_file_path = os.getenv("GOPRO_CONFIG_FILE", "./config/gopro_config.json")

def load_gopro_config():
    if os.path.exists(config_file_path):
        with open(config_file_path, 'r') as f:
            config = json.load(f)
            gopro_ips = config.get("gopros", [])
    else:
        gopro_ips = []
        
    return gopro_ips

def load_gopro_settings():
    if os.path.exists(config_file_path):
        with open(config_file_path, 'r') as f:
            config = json.load(f)
            gopro_params = config.get("gopro_settings", {})
    else:
        gopro_params = {}

    return gopro_params

hls_dir = os.getenv("HLS_DIR", "./hls_streams")
