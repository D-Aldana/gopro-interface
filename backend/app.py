import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os

# Import utility functions and configurations
from config import load_gopro_config, load_gopro_settings
from gopro_utils import update_gopro_ips, update_gopro_settings, get_gopro_settings, get_gopro_status, set_gopro_settings, enable_usb, start_gopro_record, stop_gopro
from audio_utils import get_audio_devices, start_audio_recording, stop_audio_recording

# Initialize the Flask application
app = Flask(__name__)

# Enable Cross-Origin Resource Sharing (CORS) to allow requests from other domains
CORS(app)

# Initialize SocketIO with eventlet as the async_mode
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Directory for storing audio recordings
AUDIO_DIR = 'audio_recordings'

# Load GoPro configuration and settings from configuration files
gopro_ips = load_gopro_config()
gopro_settings = load_gopro_settings()

# SocketIO event handlers

@socketio.on('update_all_gopro_settings')
def update_all_gopro_settings(selected_ips):
    """
    Update settings for all selected GoPros.

    Args:
        selected_ips (list): List of IPs for which the settings should be updated.
    """
    global gopro_settings
    # Reload GoPro settings
    gopro_settings = load_gopro_settings()
    
    # Iterate through selected IPs and update settings
    for ip in selected_ips:
        for setting in gopro_settings:
            set_gopro_settings(ip, setting)

@socketio.on('get_gopro_status')
def refresh_gopro_status():
    """
    Emit the status of all GoPros.
    """
    # Emit the status of all GoPros
    emit('gopro_status', get_gopro_status())
    
    # Emit current settings for each GoPro
    for ip in gopro_ips:
        curr_settings = get_gopro_settings(ip)
        if curr_settings:
            settings = [
                {'display_name': setting['display_name'], 
                 'setting': setting['setting'], 
                 'option': curr_settings.get(setting['setting'])} 
                for setting in gopro_settings
            ]
            emit('gopro_settings', {'ip': ip, 'settings': settings})

@socketio.on('start_gopros')
def start_gopros(selected_ips):
    """
    Start recording on the selected GoPros.

    Args:
        selected_ips (list): List of IPs for the GoPros to start recording.
    """
    responses = []
    
    # Start a background task for each selected GoPro
    for ip in selected_ips:
        socketio.start_background_task(start_gopro_thread, ip, responses)
    
    # Wait for a short period to allow all threads to complete
    socketio.sleep(1)
    
    # Emit the responses from all GoPros
    emit('gopro_record_response', responses)

def start_gopro_thread(ip, responses):
    """
    Thread function to start GoPro recording with settings.

    Args:
        ip (str): The IP address of the GoPro.
        responses (list): List to store responses from GoPro.
    """
    # Enable USB control for the GoPro
    enable_usb(ip)
    
    # Set each configuration setting for the GoPro
    for setting in gopro_settings:
        set_gopro_settings(ip, setting)
    
    # Retrieve current settings and verify
    curr_settings = get_gopro_settings(ip)
    verify_settings = all(
        curr_settings.get(setting['setting']) == int(setting['option']) 
        for setting in gopro_settings
    )
    
    if not verify_settings:
        response = 404
        print("Settings do not match", flush=True)
    else:
        # Start recording on the GoPro
        response = start_gopro_record(ip)
    
    # Append the response to the list
    responses.append({'ip': ip, 'response': response})

@socketio.on('stop_gopros')
def stop_gopros(selected_ips):
    """
    Stop recording on the selected GoPros.

    Args:
        selected_ips (list): List of IPs for the GoPros to stop recording.
    """
    responses = []
    
    # Start a background task for each selected GoPro
    for ip in selected_ips:
        socketio.start_background_task(stop_gopro_thread, ip, responses)
    
    # Wait for a short period to allow all threads to complete
    socketio.sleep(1)
    
    # Emit the responses from all GoPros
    emit('gopro_record_response', responses)

def stop_gopro_thread(ip, responses):
    """
    Thread function to stop GoPro recording.

    Args:
        ip (str): The IP address of the GoPro.
        responses (list): List to store responses from GoPro.
    """
    # Stop recording on the GoPro
    response = stop_gopro(ip)
    
    # Append the response to the list
    responses.append({'ip': ip, 'response': response})

@socketio.on('get_audio_devices')
def get_audio_devices_event():
    """
    Emit the list of available audio devices.
    """
    # Retrieve the list of available audio devices
    audio_devices = get_audio_devices()
    
    # Emit the list of audio devices
    emit('audio_devices', audio_devices)

@socketio.on('start_audio')
def start_audio(device_index):
    """
    Start audio recording on the selected device.

    Args:
        device_index (int): The index of the audio device to start recording from.
    """
    # Start audio recording in a background task
    socketio.start_background_task(start_audio_recording, device_index, socketio)

@socketio.on('stop_audio')
def stop_audio():
    """
    Stop audio recording and emit the file path.
    """
    # Stop audio recording and get the file path
    filepath = stop_audio_recording()
    
    # Emit the path of the saved audio file
    emit('audio_saved', {'filepath': filepath})

if __name__ == '__main__':
    # Run the Flask application with SocketIO on host 0.0.0.0 and port 5000
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
