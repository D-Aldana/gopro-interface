import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import requests
from config import load_gopro_config, load_gopro_settings, hls_dir

import sounddevice as sd
import soundfile as sf
import datetime
import pyaudio 
import wave

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
pyAud = pyaudio.PyAudio()

AUDIO_DIR = 'audio_recordings'
HLS_DIR = hls_dir  # Directory to store HLS streams
gopro_ips = load_gopro_config()
gopro_settings = load_gopro_settings()
audio_stream = None
frames = []

if not os.path.exists(HLS_DIR):
    os.makedirs(HLS_DIR)

#################### GOPRO FUNCTIONS ####################

##### GOPRO CONFIG #####
def update_gopro_ips():
    global gopro_ips
    gopro_ips = load_gopro_config()

def update_gopro_settings():
    global gopro_settings
    gopro_settings = load_gopro_settings()

##### GOPRO STATUS #####
def get_gopro_status():
    responses = []
    for ip in gopro_ips:
        url = f'http://{ip}:8080/gopro/webcam/status'
        try:
            response = requests.get(url, timeout=1) # Timeout after 1 second
            if response.json().get('status') in [0, 1]:
                status = 200
            else:
                status = 400
            responses.append({'ip': ip, 'status': status})
        except Exception as e:
            responses.append({'ip': ip, 'status': 400})
            print(f"Error getting status for {ip}: {e}", flush=True)
    return responses

##### GO PRO SETTINGS #####
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
    
def start_gopro_thread(ip, responses):
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
    responses.append({'ip': ip, 'response': response})

##### STOP GO PRO STREAMS #####
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
    
#################### AUDIO FUNCTIONS ####################
##### Get Audio Devices #####
def get_audio_devices():
    device_count = pyAud.get_device_count()
    devices = [pyAud.get_device_info_by_index(i) for i in range(device_count)]
    audio_devices = [{'name': device['name'], 'index': device['index']} for device in devices if device['maxInputChannels'] > 0]
    return audio_devices

def start_audio_recording(device_index):
    global audio_stream, frames
    frames = []
    
    # Audio recording parameters ########### Consult about changes
    format = pyaudio.paInt24
    channels = 1  # Number of channels (mono)
    rate = 44100  # Sampling rate in Hz
    chunk = 1024  # Size of each audio chunk

    # Start the audio stream
    audio_stream = pyAud.open(format=format, channels=channels,
                              rate=rate, input=True, input_device_index=device_index,
                              frames_per_buffer=chunk)
    
    print(f'Audio recording started on device {device_index}')

    # Record in the background
    while audio_stream:
        data = audio_stream.read(chunk)
        frames.append(data)
        socketio.sleep(0.01)  # Allow for asynchronous handling
    print('Audio recording stopped')

def stop_audio_recording():
    global audio_stream, frames
    if audio_stream is not None:
        audio_stream.close()

        audio_stream = None
        
        # Save the recorded frames as a WAV file
        filename = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S") + '.wav'
        filepath = os.path.join(AUDIO_DIR, filename)
        
        with wave.open(filepath, 'wb') as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(pyAud.get_sample_size(pyaudio.paInt24))  # 16-bit resolution
            wf.setframerate(44100)  # Sample rate
            wf.writeframes(b''.join(frames))
        
        print(f'Audio file saved: {filepath}')
        return filepath

#################### SOCKET.IO EVENTS ####################
@socketio.on('update_all_gopro_settings')
def update_all_gopro_settings(selected_ips):
    update_gopro_settings()
    for ip in selected_ips:
        for setting in gopro_settings:
            set_gopro_settings(ip, setting)

    
@socketio.on('get_gopro_status')
def refresh_gopro_status():
    emit('gopro_status', get_gopro_status())
    
    for ip in gopro_ips:
        curr_settings = get_gopro_settings(gopro_ips[0])
        if curr_settings:
            settings = [{'display_name': setting['display_name'], 
                         'setting': setting['setting'], 
                         'option': curr_settings.get(setting['setting'])} for setting in gopro_settings]
            emit('gopro_settings', {'ip': ip, 'settings': settings})

@socketio.on('start_gopros')
def start_gopros(selected_ips):
    responses = []
    
    for ip in selected_ips:
        socketio.start_background_task(start_gopro_thread, ip, responses)
    
    # Emitting response after all threads complete
    socketio.sleep(1) 
    emit('gopro_record_response', responses)

def stop_gopro_thread(ip, responses):
    response = stop_gopro(ip)
    responses.append({'ip': ip, 'response': response})

@socketio.on('stop_gopros')
def stop_gopros(selected_ips):
    responses = []
    
    for ip in selected_ips:
        socketio.start_background_task(stop_gopro_thread, ip, responses)
    
    # Emitting response after all threads complete
    socketio.sleep(1)  
    emit('gopro_record_response', responses)

@socketio.on('get_audio_devices')
def get_audio_devices_event():
    audio_devices = get_audio_devices()
    emit('audio_devices', audio_devices)

@socketio.on('start_audio')
def start_audio(device_index):
    socketio.start_background_task(start_audio_recording, device_index)

@socketio.on('stop_audio')
def stop_audio():
    filepath = stop_audio_recording()
    emit('audio_saved', {'filepath': filepath})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
