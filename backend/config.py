import os
import json

def load_gopro_config():
    # Determine the path to the config file, defaulting to config/gopro_config.json
    config_file_path = os.getenv("GOPRO_CONFIG_FILE", "./config/gopro_config.json")
    
    if os.path.exists(config_file_path):
        with open(config_file_path, 'r') as f:
            config = json.load(f)
            gopro_ips = config.get("gopros", [])

            # Extract the parameters for each GoPro
            gopro_params = config.get("gopro_params", {})
    else:
        gopro_ips = []
        gopro_params = {}
        
    return gopro_ips, gopro_params

gopro_ips, gopro_params = load_gopro_config()
hls_dir = os.getenv("HLS_DIR", "./hls_streams")
