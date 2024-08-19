from flask import Flask
from flask_socketio import SocketIO, emit
# import requests
import eventlet

eventlet.monkey_patch()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

def get_gopro_status(status):
    # Return fake status to React for now
    return {
        'status': status,
        'message': 'GoPros started successfully'
    }

@socketio.on('start_gopros')
def start_gopros():
    print('Starting GoPros')
    # Return fake message for now
    emit('gopro_status', get_gopro_status("success"))

@socketio.on('stop_gopros')
def stop_gopros():
    print('Stopping GoPros')
    # Return fake message for now
    emit('gopro_status', get_gopro_status("stopped"))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
