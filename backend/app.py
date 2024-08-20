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
    for ip in gopro_ips:
        print(f'Starting GoPro at {ip}')
        ####### USE WHEN READY TO TEST
        # url = f'http://{ip}:8080/gopro/webcam/start'
        # response = requests.request("GET", url)
        # print(response.json())

def stop_all_gopros():
    for ip in gopro_ips:
        print(f'Stopping GoPro at {ip}')
        ####### USE WHEN READY TO TEST
        # url = f'http://{ip}:8080/gopro/webcam/stop'
        # response = requests.request("GET", url)
        # print(response.json())

def get_gopro_status(status=0):
    responses = []
    for ip in gopro_ips:
        ####### USE WHEN READY TO TEST
        # url = f'http://{ip}:8080/gopro/webcam/status'
        # response = requests.request("GET", url)
        # responses.append({'ip': ip, 'status': response.json()})
        response = {'error': 0, 'status': status}
        responses.append({'ip': ip, 'status': response})
    
    return responses

#################### ROUTES ####################

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
