import requests
from time import sleep

# GoPro's IP address when connected via USB or Wi-Fi
GOPRO_IP = "172.21.100.51"

url = f"http://{GOPRO_IP}:8080/gopro/camera/control/wired_usb"

querystring = {"p":"1"}
start_endpoint = f"http://{GOPRO_IP}:8080/gopro/camera/shutter/start"
stop_endpoint  = f"http://{GOPRO_IP}:8080/gopro/camera/shutter/stop"

def enable_usb():
    try:
        response = requests.get(url, params=querystring)
        print(f"GoPro USB enabled:", response)

    except Exception as e:
        print(f"Error enabling USB: {e}")

def start_record():
    # params = {"mode": "start"}
    try:
        
        response = requests.get(start_endpoint)
        print(f"GoPro record started:", response)
    
    except Exception as e:
        print(f"Error starting record: {e}")

def stop_record():
    # params = {"mode": "stop"}
    try:
        response = requests.get(stop_endpoint)
        print(f"GoPro record stopped:", response)
    except Exception as e:
        print(f"Error stopping record: {e}")

def start_gopro_stream():
    port = 8554
    cam_params = {
        "protocol": "ts"
    }
    try:
        # Send a request to the start endpoint
        start_response = requests.get(f"http://{GOPRO_IP}:8080/gopro/camera/stream/start", params=cam_params)
        if start_response.status_code == 200:
            print("Started GoPro stream")
        else:
            # print(f"Failed to start stream. HTTP Code: {start_response.status_code}")
            print("Failed to start stream: ", start_response)
        
        # port += 1  # Increment port for each GoPro
    
    except requests.exceptions.RequestException as e:
        print(f"Error communicating with GoPro: {e}")


def stop_gopro_stream():
    try:
        # Send a request to the stop endpoint
        stop_response = requests.get(f"http://{GOPRO_IP}:8080/gopro/camera/stream/stop")
        if stop_response.status_code == 200:
            print("Stopped GoPro stream")
        else:
            print(f"Failed to stop stream. HTTP Code: {stop_response.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"Error communicating with GoPro: {e}")

# def get_gopro_status(gopro_ips):
#     responses = []
#     for ip in gopro_ips:
#         url = f'http://{ip}:8080/gopro/webcam/status'
#         response = requests.get(url)
#         status = response.json()
#         response = {'error': 0, 'status': status}
#         responses.append({'ip': ip, 'status': response})
#     return responses

if __name__ == "__main__":
    enable_usb()
    start_record()
    # print(get_gopro_status([GOPRO_IP]))
    sleep(5)
    stop_record()