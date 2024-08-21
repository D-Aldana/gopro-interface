import requests

# GoPro's IP address when connected via USB or Wi-Fi
GOPRO_IP = "172.21.100.51"

# Endpoints to check GoPro status
STATUS_ENDPOINT = f"http://{GOPRO_IP}:8080/gopro/webcam/status"
INFO_ENDPOINT = f"http://{GOPRO_IP}:8080/gopro/webcam/version"

def check_gopro_status():
    try:
        # Send a request to the status endpoint
        status_response = requests.get(STATUS_ENDPOINT)
        if status_response.status_code == 200:
            print("GoPro Status:")
            print(status_response.json())
        else:
            print(f"Failed to fetch status. HTTP Code: {status_response.status_code}")
        
        # Send a request to the info endpoint
        info_response = requests.get(INFO_ENDPOINT)
        if info_response.status_code == 200:
            print("GoPro Info:")
            print(info_response.json())
        else:
            print(f"Failed to fetch info. HTTP Code: {info_response.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"Error communicating with GoPro: {e}")

if __name__ == "__main__":
    check_gopro_status()
