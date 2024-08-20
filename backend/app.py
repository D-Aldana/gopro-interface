import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_socketio import SocketIO, emit
import requests
from config import gopro_ips

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

#################### FUNCTIONS ####################

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

def get_gopro_status():
    responses = []
    for ip in gopro_ips:
        ####### USE WHEN READY TO TEST
        # url = f'http://{ip}/gopro/webcam/status'
        # response = requests.request("GET", url)
        # responses.append({'ip': ip, 'status': response.json()})
        response = {'error': 0, 'status': 1}
        responses.append({'ip': ip, 'status': response})
    
    return responses

#################### ROUTES ####################

@socketio.on('get_gopro_status')
def refresh_gopro_status():
    emit('gopro_status', get_gopro_status())

@socketio.on('start_gopros')
def start_gopros():
    print('Starting GoPros')
    if start_all_gopros():
        emit('gopro_status', get_gopro_status())
    else:
        emit('gopro_status', get_gopro_status())

@socketio.on('stop_gopros')
def stop_gopros():
    print('Stopping GoPros')
    if stop_all_gopros():
        emit('gopro_status', get_gopro_status())
    else:
        emit('gopro_status', get_gopro_status())

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
