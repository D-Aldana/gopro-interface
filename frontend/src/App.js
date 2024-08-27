import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import AudioControls from './components/AudioControls';
import GoproControls from './components/GoProControls';
import GoproStatus from './components/GoProStatuses';
import './App.css';

// Initialize a Socket.IO connection to the backend server
const socket = io('http://localhost:5000');

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]); // List of GoPro statuses
  const [selectedGopros, setSelectedGopros] = useState([]); // List of selected GoPros
  const [isRecording, setIsRecording] = useState(false); // Recording state for GoPros
  const [goproSettings, setGoproSettings] = useState({}); // GoPro settings by IP
  const [webcamStream, setWebcamStream] = useState(null); // Webcam stream
  const [soundDevices, setSoundDevices] = useState([]); // List of available sound devices
  const [isRecordingAudio, setIsRecordingAudio] = useState(false); // Recording state for audio
  const [selectedDevice, setSelectedDevice] = useState(null); // Selected audio device
  const [timer, setTimer] = useState('00:00:00'); // Timer for audio recording
  const [audioFilePath, setAudioFilePath] = useState(''); // File path of the saved audio file
  const [finalTimer, setFinalTimer] = useState(''); // Final timer value when recording stops

  useEffect(() => {
    // Fetch the webcam stream when the component is mounted
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => setWebcamStream(stream))
      .catch(err => console.error('Error accessing webcam:', err));
  }, []);

  useEffect(() => {
    // Fetch GoPro statuses periodically when not recording
    if (!isRecording) {
      const fetchStatus = () => socket.emit('get_gopro_status');
      const intervalId = setInterval(fetchStatus, 2000);
      return () => clearInterval(intervalId);
    }
  }, [isRecording]);

  useEffect(() => {
    // Listen for GoPro status updates from the server
    socket.on('gopro_status', (data) => {
      const updatedStatuses = data.map((status) => ({
        ip: status.ip,
        state: status.status === 200 ? 'Connected' : 'Disconnected',
      }));
      setGoproStatuses(updatedStatuses);
    });
    return () => socket.off('gopro_status');
  }, []);

  useEffect(() => {
    // Listen for GoPro recording response updates from the server
    socket.on('gopro_record_response', (responses) => {
      const updatedStatuses = goproStatuses.map((status) => {
        const response = responses.find((resp) => resp.ip === status.ip);
        if (response) {
          return {
            ...status,
            state: response.response === 200 ? (isRecording ? 'Recording' : 'Connected') : 'Error',
          };
        }
        return status;
      });
      setGoproStatuses(updatedStatuses);
    });
    return () => socket.off('gopro_record_response');
  }, [isRecording, goproStatuses]);

  useEffect(() => {
    // Listen for GoPro settings updates from the server
    socket.on('gopro_settings', (data) => {
      setGoproSettings((prevSettings) => ({
        ...prevSettings,
        [data.ip]: data.settings,
      }));
    });
    return () => socket.off('gopro_settings');
  }, []);

  useEffect(() => {
    // Listen for available sound devices from the server
    socket.on('audio_devices', (devices) => setSoundDevices(devices));
    fetchSoundDevices();
    return () => socket.off('audio_devices');
  }, []);

  useEffect(() => {
    // Listen for audio file save events from the server
    socket.on('audio_saved', (data) => setAudioFilePath(data.filepath));
    return () => socket.off('audio_saved');
  }, []);

  // Helper Functions
  const startTimer = () => {
    const startTime = new Date();
    const intervalId = setInterval(() => {
      const now = new Date();
      const elapsed = now - startTime;
      const minutes = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
      const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      setTimer(`${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(intervalId);
  };

  const startRecordingAudio = (deviceIndex) => {
    socket.emit('start_audio', deviceIndex);
    setIsRecordingAudio(true);
    startTimer();
  };

  const stopRecordingAudio = () => {
    socket.emit('stop_audio');
    setIsRecordingAudio(false);
    setFinalTimer(timer);
    setTimer('00:00:00');
  };

  const startGopros = () => {
    setIsRecording(true);
    socket.emit('start_gopros', selectedGopros);
  };

  const stopGopros = () => {
    setIsRecording(false);
    socket.emit('stop_gopros', selectedGopros);
  };

  const handleGoproSelection = (ip) => {
    setSelectedGopros((prevSelected) =>
      prevSelected.includes(ip)
        ? prevSelected.filter((selectedIp) => selectedIp !== ip)
        : [...prevSelected, ip]
    );
  };

  const updateAllGoproSettings = () => {
    const connectedGopros = goproStatuses
      .filter(status => status.state === 'Connected')
      .map(status => status.ip);
    socket.emit('update_all_gopro_settings', connectedGopros);
  };

  const fetchSoundDevices = () => {
    socket.emit('get_audio_devices');
  };

  const handleDeviceChange = (deviceIndex) => {
    const device = soundDevices.find(d => d.index === parseInt(deviceIndex, 10));
    setSelectedDevice(device);
  };

  return (
    <div className="App">
      <h1>GoPro Control Interface</h1>
      <div style={{ display: 'flex' }}>
        <div style={{ width: '500px' }}>
          <VideoPlayer stream={webcamStream} />
        </div>
        <div style={{ width: '300px', marginLeft: '20px' }}>
          <AudioControls
            soundDevices={soundDevices}
            selectedDevice={selectedDevice}
            isRecordingAudio={isRecordingAudio}
            timer={timer}
            finalTimer={finalTimer}
            audioFilePath={audioFilePath}
            fetchSoundDevices={fetchSoundDevices}
            handleDeviceChange={handleDeviceChange}
            startRecordingAudio={startRecordingAudio}
            stopRecordingAudio={stopRecordingAudio}
          />
        </div>
      </div>
      <GoproControls
        isRecording={isRecording}
        startGopros={startGopros}
        stopGopros={stopGopros}
        updateAllGoproSettings={updateAllGoproSettings}
      />
      <GoproStatus
        goproStatuses={goproStatuses}
        selectedGopros={selectedGopros}
        handleGoproSelection={handleGoproSelection}
        goproSettings={goproSettings}
        isRecording={isRecording}
      />
    </div>
  );
}

export default App;
