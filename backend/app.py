import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import requests
from threading import Thread, Lock
from config import gopro_ips, gopro_params
import ffmpeg

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

HLS_DIR = './hls_streams'  # Directory to store HLS streams
ffmpeg_processes = {}  # Store FFmpeg processes for each GoPro
stop_lock = Lock()  # Lock for synchronizing access to FFmpeg processes

if not os.path.exists(HLS_DIR):
    os.makedirs(HLS_DIR)

#################### FUNCTIONS ####################

##### START GO PRO STREAMS #####
def start_gopro_stream(ip, port):
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
    input_url = f'udp://@:{port}'
    ip_convert = ip.replace('.', '_') # Replace '.' with '_' in IP address
    output_path = os.path.join(HLS_DIR, f'gopro_{ip_convert}.m3u8')
    
    try:
        # Run FFmpeg command and store process reference
        process = (
            ffmpeg
            .input(input_url)
            .output(output_path, 
                    format='hls', 
                    g=120, 
                    hls_time=1, 
                    hls_list_size=3, 
                    hls_flags='delete_segments+round_durations', 
                    fflags='+genpts+discardcorrupt')
            .run_async(pipe_stdout=True, pipe_stderr=True)
        )
        ffmpeg_processes[ip] = process
        print(f"Started FFmpeg process for GoPro {ip} on {port}")
    except ffmpeg.Error as e:
        print(f"Error starting FFmpeg process for GoPro {ip}: {e}")

def start_all_gopros():
    port = 8554
    for ip in gopro_ips:
        thread = Thread(target=start_gopro_stream, args=(ip, port))
        thread.start()
        port += 1  # Increment port for each GoPro

##### STOP GO PRO STREAMS #####
def stop_all_gopros():
    def stop_gopro(ip):
        # Stop the GoPro webcam 
        url = f'http://{ip}:8080/gopro/webcam/stop'
        try:
            response = requests.get(url)
            print(f"GoPro webcam {ip} stopped:", response.json())
        except Exception as e:
            print(f"Error stopping webcam for {ip}: {e}")

        # Terminate the FFmpeg process
        if stop_lock.acquire(timeout=10):  # Wait for up to 10 seconds to acquire the lock
            try:
                if ip in ffmpeg_processes:
                    process = ffmpeg_processes[ip]
                    process.kill()
                    process.wait()
                    del ffmpeg_processes[ip]
                    print(f"Stopped GoPro stream from {ip}")
            finally:
                stop_lock.release()  # Ensure the lock is released
        else:
            print(f"Timeout acquiring lock for {ip}")

    for ip in gopro_ips:
        stop_gopro(ip)


##### GET GO PRO STATUS #####
def get_gopro_status():
    responses = []
    for ip in gopro_ips:
        url = f'http://{ip}:8080/gopro/webcam/status'
        response = requests.get(url)
        status = response.json()
        response = {'error': 0, 'status': status}
        responses.append({'ip': ip, 'status': response})
    return responses


#################### ROUTES ####################

@app.route('/hls_streams/<filename>')
def serve_hls_stream(filename):
    response = send_from_directory(HLS_DIR, filename)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    print(f"Sent {filename}")
    return response

@app.route('/hls_streams/check_ready/<filename>')
def check_stream_ready(filename):
    file_path = f'./hls_streams/{filename}'
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()
            segments = content.count('#EXTINF')
            # Check if there is at least 1 segments available
            if segments >= 1:
                print("Segments ready")
                return jsonify({"ready": True})
            return jsonify({"ready": segments >= 1})
    return jsonify({"ready": False})

@socketio.on('get_gopro_status')
def refresh_gopro_status():
    emit('gopro_status', get_gopro_status())

@socketio.on('start_gopros')
def start_gopros():
    start_all_gopros()
    print('Started all GoPros')
    emit('gopro_status', get_gopro_status())

@socketio.on('stop_gopros')
def stop_gopros():
    stop_all_gopros()
    print('Stopped all GoPros')
    for file in os.listdir(HLS_DIR): # Remove all HLS files
        os.remove(os.path.join(HLS_DIR, file))
    print('Removed all HLS files')
    emit('gopro_status', get_gopro_status())

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
