import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_socketio import SocketIO, emit
import requests
from config import gopro_ips

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

def get_gopro_status(status, message):
    # Return fake status to React for now
    return {
        'status': status,
        'message': message
    }

def start_all_gopros():
    success = True
    for ip in gopro_ips:
        print(f'Starting GoPro at {ip}')
        # TODO - Add code to start GoPro
    return success

def stop_all_gopros():
    success = True
    for ip in gopro_ips:
        print(f'Stopping GoPro at {ip}')
        # TODO - Add code to stop GoPro
    return success

@socketio.on('start_gopros')
def start_gopros():
    print('Starting GoPros')
    if start_all_gopros():
        emit('gopro_status', get_gopro_status("success", "GoPros started successfully"))
    else:
        emit('gopro_status', get_gopro_status("error", "Failed to start some or all GoPros"))

@socketio.on('stop_gopros')
def stop_gopros():
    print('Stopping GoPros')
    if stop_all_gopros():
        emit('gopro_status', get_gopro_status("stopped", "GoPros stopped successfully"))
    else:
        emit('gopro_status', get_gopro_status("error", "Failed to stop some or all GoPros"))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
