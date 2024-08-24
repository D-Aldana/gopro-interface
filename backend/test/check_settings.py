import requests

# GoPro's IP address when connected via USB or Wi-Fi
GOPRO_IP = "172.21.100.51"

url = f"http://{GOPRO_IP}:8080/gopro/camera/setting"

def set_fps(fps):
    querystring = {"setting": "3", "option": fps} # 3 is the setting for FPS
    try:
        response = requests.get(url, params=querystring)
        print(f"GoPro FPS set to {fps}:", response.status_code)
    except Exception as e:
        print(f"Error setting FPS: {e}")

def set_resolution(res):
    querystring = {"setting": "2", "option": res} # 2 is the setting for resolution
    try:
        response = requests.get(url, params=querystring)
        print(f"GoPro resolution set to {res}:", response.status_code)
    except Exception as e:
        print(f"Error setting resolution: {e}")

def set_max_lens(max_lens):
    querystring = {"setting": "162", "option": max_lens} # 162 is the setting for max lens
    try:
        response = requests.get(url, params=querystring)
        print(f"GoPro max lens set to {max_lens}:", response.status_code)
    except Exception as e:
        print(f"Error setting max lens: {e}")

def check_settings(fps, res, max_lens):
    url = f"http://{GOPRO_IP}:8080/gopro/camera/state"
    try:
        response = requests.get(url)
        curr_fps = response.json()['settings'].get("3")
        curr_res = response.json()['settings'].get("2")
        curr_max_lens = response.json()['settings'].get("162")
        if curr_fps == fps and curr_res == res and curr_max_lens == max_lens:
            print("Settings match")
        else:
            print("Settings do not match")
            print(f"Current FPS: {curr_fps}, Current Resolution: {curr_res}, Current Max Lens: {curr_max_lens}")
    except Exception as e:
        print(f"Error getting GoPro settings: {e}")

if __name__ == "__main__":
    set_fps(5) # Only 5, 8, 10 available options (60, 30, 24)
    set_resolution(9) # Only 4 (2.7k), 6 (2.7k 4:3), 9 (1080) available options
    set_max_lens(1) # 0 (off), 1 (on) available options
    check_settings(5, 9, 1)