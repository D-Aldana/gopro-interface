import requests
from time import sleep

# GoPro's IP address when connected via USB or Wi-Fi
GOPRO_IPS = ["172.21.100.51", "172.26.129.51"]

# Endpoints to check GoPro status
# STATUS_ENDPOINT = f"http://{GOPRO_IP}:8080/gopro/webcam/status"

def start_gopro_stream():
    port = 8554
    for GOPRO_IP in GOPRO_IPS:
        cam_params = {
            "res": "7",
            "fov": "0",
            "port": f'{port}',
            "protocol": "ts"
        }
        try:
            # Send a request to the start endpoint
            start_response = requests.get(f"http://{GOPRO_IP}:8080/gopro/webcam/start", params=cam_params)
            if start_response.status_code == 200:
                print("Started GoPro stream")
            else:
                print(f"Failed to start stream. HTTP Code: {start_response.status_code}")
            
            port += 1  # Increment port for each GoPro
        
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with GoPro: {e}")


def stop_gopro_stream():
    for GOPRO_IP in GOPRO_IPS:
        try:
            # Send a request to the stop endpoint
            stop_response = requests.get(f"http://{GOPRO_IP}:8080/gopro/webcam/stop")
            if stop_response.status_code == 200:
                print("Stopped GoPro stream")
            else:
                print(f"Failed to stop stream. HTTP Code: {stop_response.status_code}")
        
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with GoPro: {e}")

def check_gopro_status():
    for GOPRO_IP in GOPRO_IPS:
        try:
            # Send a request to the status endpoint
            status_response = requests.get(f'http://{GOPRO_IP}:8080/gopro/webcam/status')
            if status_response.status_code == 200:
                print("GoPro Status:")
                print(status_response.json())
            else:
                print(f"Failed to fetch status. HTTP Code: {status_response.status_code}")
        
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with GoPro: {e}")

if __name__ == "__main__":
    check_gopro_status()
    start_gopro_stream()
    check_gopro_status()
    sleep(20)
    stop_gopro_stream()
    