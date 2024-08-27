import requests
from config import load_gopro_config, load_gopro_settings

gopro_ips = load_gopro_config()
gopro_settings = load_gopro_settings()

def update_gopro_ips():
    global gopro_ips
    gopro_ips = load_gopro_config()

def update_gopro_settings():
    global gopro_settings
    gopro_settings = load_gopro_settings()

def get_gopro_status():
    responses = []
    for ip in gopro_ips:
        url = f'http://{ip}:8080/gopro/webcam/status'
        try:
            response = requests.get(url, timeout=1)
            status = 200 if response.json().get('status') in [0, 1] else 400
            responses.append({'ip': ip, 'status': status})
        except Exception as e:
            responses.append({'ip': ip, 'status': 400})
            print(f"Error getting status for {ip}: {e}", flush=True)
    return responses

def set_gopro_settings(ip, setting):
    url = f"http://{ip}:8080/gopro/camera/setting"
    query_string = {"setting": setting['setting'], "option": setting['option']}
    try:
        response = requests.get(url, params=query_string)
        if response.status_code == 200:
            print(f"GoPro setting set to {setting}:", response.json())
        else:
            raise Exception(f"Failed to set setting: {response.json()}")
    except Exception as e:
        print(f"Error setting setting: {e}")

def get_gopro_settings(ip):
    url = f'http://{ip}:8080/gopro/camera/state'
    response = requests.get(url)
    if response.status_code != 200:
        return False
    return response.json().get('settings')

def enable_usb(ip):
    url = f"http://{ip}:8080/gopro/camera/control/wired_usb"
    querystring = {"p": "1"}
    try:
        response = requests.get(url, params=querystring)
        if response.status_code != 200:
            raise Exception(f"Failed to enable USB: {response.text}")
        print(f"GoPro USB enabled: {response.status_code}", flush=True)
    except Exception as e:
        print(f"Error enabling USB for {ip}: {e}", flush=True)

def start_gopro_record(ip):
    url = f'http://{ip}:8080/gopro/camera/shutter/start'
    try:
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"Failed to start GoPro webcam: {response.text}")
        print(f'GoPro webcam {ip} started: {response.status_code}', flush=True)
        return response.status_code
    except Exception as e:
        print(f"Error starting webcam for {ip}: {e}", flush=True)
        return response.status_code

def stop_gopro(ip):
    url = f'http://{ip}:8080/gopro/camera/shutter/stop'
    try:
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"Failed to stop GoPro webcam: {response.text}")
        print(f"GoPro webcam {ip} stopped:", response.json(), flush=True)
        return response.status_code
    except Exception as e:
        print(f"Error stopping webcam for {ip}: {e}", flush=True)
        return response.status_code
