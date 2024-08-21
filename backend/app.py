import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
import os
import subprocess
import requests
from threading import Thread
from config import gopro_ips, gopro_params

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

HLS_DIR = './hls_streams'  # Directory to store HLS streams
ffmpeg_processes = {}  # Store FFmpeg processes for each GoPro

if not os.path.exists(HLS_DIR):
    os.makedirs(HLS_DIR)

#################### FUNCTIONS ####################

##### START GO PRO STREAMS #####
def start_gopro_stream(ip, port):
    print(f'Starting GoPro stream from {ip} on port {port}')
    gopro_params['port'] = port
    # Start the GoPro webcams
    url = f'http://{ip}:8080/gopro/webcam/start'
    
    try:
        response = requests.get(url, params=gopro_params)
        print(f'GoPro webcam {ip} on {port} started: {response.json()}')
    except Exception as e:
        print(f"Error starting webcam for {ip}: {e}")
        return
    
    # FFmpeg command to convert UDP stream to HLS
    ffmpeg_command = [
        'ffmpeg', '-i', f'udp://@:{port}', '-c:v', 'copy',
        '-f', 'hls', '-hls_time', '2', '-hls_list_size', '0', '-hls_flags', 'delete_segments',
        os.path.join(HLS_DIR, f'gopro_{ip}.m3u8')
    ]
    
    try:
        # Run FFmpeg command and store process reference
        process = subprocess.Popen(ffmpeg_command)
        ffmpeg_processes[ip] = process
    except Exception as e:
        print(f"Error starting stream for {ip}: {e}")

def start_all_gopros():
    port = 8554
    for ip in gopro_ips:
        thread = Thread(target=start_gopro_stream, args=(ip, port))
        thread.start()
        port += 1  # Increment port for each GoPro

##### STOP GO PRO STREAMS #####
def stop_all_gopros():
    print('Stopping all GoPro streams')
    
    # Stop the GoPro webcam and terminate FFmpeg processes
    for ip in gopro_ips:
        # Stop GoPro webcam (uncomment when testing with real cameras)
        url = f'http://{ip}:8080/gopro/webcam/stop'

        try:
            response = requests.get(url)
            print(f"GoPro webcam {ip} stopped:", response.json())
        except Exception as e:
            print(f"Error stopping webcam for {ip}: {e}")
            
        # Terminate the FFmpeg process
        if ip in ffmpeg_processes:
            process = ffmpeg_processes[ip]
            process.terminate()
            process.wait()
            del ffmpeg_processes[ip]
            print(f"Stopped GoPro stream from {ip}")

    # Emit the updated status to the frontend
    emit('gopro_status', get_gopro_status(0))

##### GET GO PRO STATUS #####
def get_gopro_status(status=0):
    responses = []
    for ip in gopro_ips:
        url = f'http://{ip}:8080/gopro/webcam/status'
        response = requests.get(url)
        status = response.json()
        response = {'error': 0, 'status': status}
        responses.append({'ip': ip, 'status': response})
    return responses


#################### ROUTES ####################

@app.route('/hls/<path:filename>')
def serve_hls_stream(filename):
    return send_from_directory(HLS_DIR, filename)

@socketio.on('get_gopro_status')
def refresh_gopro_status():
    emit('gopro_status', get_gopro_status())

@socketio.on('start_gopros')
def start_gopros():
    print('Starting GoPros')
    start_all_gopros()
    emit('gopro_status', get_gopro_status(1))

@socketio.on('stop_gopros')
def stop_gopros():
    print('Stopping GoPros')
    stop_all_gopros()
    emit('gopro_status', get_gopro_status(0))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
