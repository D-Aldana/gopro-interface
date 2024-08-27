import pyaudio
import wave
import datetime
import os

pyAud = pyaudio.PyAudio()
AUDIO_DIR = 'audio_recordings'
audio_stream = None
frames = []

def get_audio_devices():
    device_count = pyAud.get_device_count()
    devices = [pyAud.get_device_info_by_index(i) for i in range(device_count)]
    audio_devices = [{'name': device['name'], 'index': device['index']} for device in devices if device['maxInputChannels'] > 0]
    return audio_devices

def start_audio_recording(device_index, socketio):
    global audio_stream, frames
    frames = []
    
    format = pyaudio.paInt24
    channels = 1
    rate = 44100
    chunk = 1024

    audio_stream = pyAud.open(format=format, channels=channels,
                              rate=rate, input=True, input_device_index=device_index,
                              frames_per_buffer=chunk)
    
    print(f'Audio recording started on device {device_index}')

    while audio_stream:
        data = audio_stream.read(chunk)
        frames.append(data)
        socketio.sleep(0.01)
    print('Audio recording stopped')

def stop_audio_recording():
    try:
        global audio_stream, frames
        if audio_stream is not None:
            audio_stream.close()
            audio_stream = None
            
            filename = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S") + '.wav'
            filepath = os.path.join(AUDIO_DIR, filename)
            
            with wave.open(filepath, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(pyAud.get_sample_size(pyaudio.paInt24))
                wf.setframerate(44100)
                wf.writeframes(b''.join(frames))
            
            print(f'Audio file saved: {filepath}')
            return filepath
    except Exception as e:
        print(f"Error saving audio file: {e}")
        return None
