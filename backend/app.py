import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import requests
from threading import Thread, Lock
from config import gopro_ips, gopro_settings, hls_dir
import ffmpeg

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

HLS_DIR = hls_dir  # Directory to store HLS streams
ffmpeg_processes = {}  # Store FFmpeg processes for each GoPro
stop_lock = Lock()  # Lock for synchronizing access to FFmpeg processes

if not os.path.exists(HLS_DIR):
    os.makedirs(HLS_DIR)

#################### FUNCTIONS ####################

##### GET GO PRO STATUS #####
def get_gopro_status():
    responses = []
    for ip in gopro_ips:
        url = f'http://{ip}:8080/gopro/webcam/status'
        response = requests.get(url)
        if response.json().get('status') in [0, 1]:
            status = 200
        else:
            status = 400
        responses.append({'ip': ip, 'status': status})
    return responses

##### SET GO PRO SETTINGS #####
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
    
    curr_settings = response.json().get('settings')
    return curr_settings

##### Enable USB Control #####
def enable_usb(ip):
    url = f"http://{ip}:8080/gopro/camera/control/wired_usb"
    querystring = {"p":"1"}

    try:
        response = requests.get(url, params=querystring)
        if response.status_code != 200:
            raise Exception(f"Failed to enable USB: {response.text}")
        print(f"GoPro USB enabled: {response.status_code}", flush=True)

    except Exception as e:
        print(f"Error enabling USB for {ip}: {e}", flush=True)

    
##### START GO PRO STREAMS #####
def start_gopro_record(ip):
    # Start the GoPro webcams
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
    
    # # FFmpeg command to convert UDP stream to HLS
    # input_url = f'udp://@:{port}'
    # ip_convert = ip.replace('.', '_') # Replace '.' with '_' in IP address
    # output_path = os.path.join(HLS_DIR, f'gopro_{ip_convert}.m3u8')
    
    # try:
    #     # Run FFmpeg command and store process reference
    #     process = (
    #         ffmpeg
    #         .input(input_url)
    #         .output(output_path, 
    #                 format='hls', 
    #                 codec='copy',  # Copy the input codec (no re-encoding)
    #                 hls_time=1,
    #                 hls_list_size=3,
    #                 hls_flags='delete_segments+round_durations',
    #                 start_number=0,
    #                 fflags='+genpts+discardcorrupt')
    #         .run_async(pipe_stdout=True, pipe_stderr=True)
    #     )
    #     ffmpeg_processes[ip] = process
    #     print(f"Started FFmpeg process for GoPro {ip}", flush=True)
    # except ffmpeg.Error as e:
    #     print(f"Error starting FFmpeg process for GoPro {ip}: {e}", flush=True)

##### STOP GO PRO STREAMS #####
def stop_gopro(ip):
    # Stop the GoPro webcam 
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
    
# def delete_hls_files(ip):
#     ip_convert = ip.replace('.', '_') # Replace '.' with '_' in IP address
#     file_path = os.path.join(HLS_DIR, f'gopro_{ip_convert}.m3u8')
#     ts_path = os.path.join(HLS_DIR, f'gopro_{ip_convert}*.ts')
#     try:
#         os.remove(file_path)
#         os.system(f'rm {ts_path}')
#         print(f"Deleted HLS files for {ip}", flush=True)
#     except Exception as e:
#         print(f"Error deleting HLS files for {ip}: {e}", flush=True)

#################### ROUTES ####################

# @app.route('/hls_streams/<filename>')
# def serve_hls_stream(filename):
#     response = send_from_directory(HLS_DIR, filename)
#     response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
#     response.headers['Pragma'] = 'no-cache'
#     response.headers['Expires'] = '0'
#     print(f"Sent {filename}")
#     return response

# @app.route('/hls_streams/check_ready/<filename>')
# def check_stream_ready(filename):
#     file_path = f'./hls_streams/{filename}'
#     if os.path.exists(file_path):
#         with open(file_path, 'r') as f:
#             content = f.read()
#             segments = content.count('#EXTINF')
#             # Check if there is at least 1 segments available
#             if segments >= 1:
#                 print("Segments ready", flush=True)
#                 return jsonify({"ready": True})
#             return jsonify({"ready": segments >= 1})
#     return jsonify({"ready": False})

#################### SOCKET.IO EVENTS ####################
@socketio.on('get_gopro_status')
def refresh_gopro_status():
    emit('gopro_status', get_gopro_status())
    
    for ip in gopro_ips:
        curr_settings = get_gopro_settings(gopro_ips[0])
        if curr_settings:
            # Extract the current settings for each GoPro and put it in the format of gopro_settings (display_name, setting, options)
            settings = [{'display_name': setting['display_name'], 
                         'setting': setting['setting'], 
                         'option': curr_settings.get(setting['setting'])} for setting in gopro_settings]
            emit('gopro_settings', {'ip': ip, 'settings': settings})

@socketio.on('start_gopros')
def start_gopros(selected_ips):
    responses = []
    for ip in selected_ips:
        enable_usb(ip)
        for setting in gopro_settings:
            set_gopro_settings(ip, setting)
        
        curr_settings = get_gopro_settings(ip)
        verify_settings = None
        for setting in gopro_settings:
            if curr_settings.get(setting['setting']) == int(setting['option']):
                verify_settings = True
            else:
                verify_settings = False
                print(f'current: {curr_settings.get(setting["setting"])}, setting: {setting["option"]}')
                break
        if not verify_settings:
            response = 404
            print("Settings do not match", flush=True)
        else:
            response = start_gopro_record(ip)
            emit('gopro_settings', {'ip': ip, 'settings': gopro_settings})
        responses.append({'ip': ip, 'response': response})
    print('Started selected GoPros', flush=True)
    emit('gopro_record_response', responses)


@socketio.on('stop_gopros')
def stop_gopros(selected_ips):
    responses = []
    for ip in selected_ips:
        response = stop_gopro(ip)
        responses.append({'ip': ip, 'response': response})
    print('Stopped selected GoPros', flush=True)
    emit('gopro_record_response', responses)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
