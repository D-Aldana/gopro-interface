from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import requests

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

def get_gopro_status():
    # Return fake status for now
    return {
        "recording": True
    }

@socketio.on('start_gopros')
def start_gopros():
    print('Starting GoPros')
    # Return fake message for now
    emit('gopro_status', get_gopro_status())

@socketio.on('stop_gopros')
def stop_gopros():
    print('Stopping GoPros')
    # Return fake message for now
    emit('gopro_status', get_gopro_status())

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
