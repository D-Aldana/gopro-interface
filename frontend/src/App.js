import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]);
  const [selectedGopros, setSelectedGopros] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [goproSettings, setGoproSettings] = useState({});
  const [webcamStream, setWebcamStream] = useState(null);
  const [soundDevices, setSoundDevices] = useState([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [timer, setTimer] = useState('00:00:00');
  const [audioFilePath, setAudioFilePath] = useState('');
  const [finalTimer, setFinalTimer] = useState(''); // New state for final timer value

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        setWebcamStream(stream);
      })
      .catch(err => {
        console.error('Error accessing webcam:', err);
      });
  }, []);

  useEffect(() => {
    if (!isRecording) {
      const fetchStatus = () => {
        socket.emit('get_gopro_status');
      };

      const intervalId = setInterval(fetchStatus, 2000);
      return () => clearInterval(intervalId);
    }
  }, [isRecording]);

  useEffect(() => {
    socket.on('gopro_status', (data) => {
      const updatedStatuses = data.map((status) => ({
        ip: status.ip,
        state: status.status === 200 ? 'Connected' : 'Disconnected',
      }));
      setGoproStatuses(updatedStatuses);
    });

    return () => {
      socket.off('gopro_status');
    };
  }, []);

  useEffect(() => {
    socket.on('gopro_record_response', (responses) => {
      const updatedStatuses = goproStatuses.map((status) => {
        const response = responses.find((resp) => resp.ip === status.ip);
        if (response) {
          return { ...status, state: response.response === 200 ? (isRecording ? 'Recording' : 'Connected') : 'Error' };
        }
        return status;
      });
      setGoproStatuses(updatedStatuses);
    });

    return () => {
      socket.off('gopro_record_response');
    };
  }, [isRecording, goproStatuses]);

  useEffect(() => {
    socket.on('gopro_settings', (data) => {
      setGoproSettings((prevSettings) => ({
        ...prevSettings,
        [data.ip]: data.settings,
      }));
    });

    return () => {
      socket.off('gopro_settings');
    };
  }, []);

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
    setFinalTimer(timer); // Capture the final timer value
    setTimer('00:00:00');
  };

  useEffect(() => {
    socket.on('audio_saved', (data) => {
      setAudioFilePath(data.filepath); // Capture the saved file path
    });

    return () => {
      socket.off('audio_saved');
    };
  }, []);

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

  useEffect(() => {
    socket.on('audio_devices', (devices) => {
      setSoundDevices(devices);
    });

    fetchSoundDevices();

    return () => {
      socket.off('audio_devices');
    };
  }, []);

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
          <h3>Available Sound Devices</h3> 
          <button onClick={fetchSoundDevices}>Refresh Sound Devices</button>
          <select onChange={(e) => handleDeviceChange(e.target.value)} value={selectedDevice?.index || ''}>
            <option value="" disabled>Select an audio device</option>
            {soundDevices.map((device) => (
              <option key={device.index} value={device.index}>
                {device.name}
              </option>
            ))}
          </select>
          
          {selectedDevice && (
            <div>
              {!isRecordingAudio ? (
                <button onClick={() => startRecordingAudio(selectedDevice.index)}>
                  Start Recording Audio: {selectedDevice.name}
                </button>
              ) : (
                <div>
                  <button style={{ backgroundColor: 'red', color: 'white' }}>
                    Recording: {timer}
                  </button>
                  <button onClick={stopRecordingAudio}>Stop Recording</button>
                </div>
              )}
              {finalTimer && (
                <div>
                  <p>Recording stopped at: {finalTimer}</p>
                  {audioFilePath && <p>Audio saved to: {audioFilePath}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isRecording ? (
        <button onClick={startGopros} disabled={isRecording}>Start Selected GoPros</button>
      ) : (
        <div>
          <button style={{ backgroundColor: 'red', color: 'white' }}>Recording</button>
          <button onClick={stopGopros}>Stop Recording</button>
        </div>
      )}
      <button onClick={updateAllGoproSettings} disabled={isRecording}>
        Update All Settings
      </button>
      <div className="status-grid">
        {goproStatuses.map((status, index) => (
          <div key={index} className="status-item">
            <input
              type="checkbox"
              checked={selectedGopros.includes(status.ip)}
              onChange={() => handleGoproSelection(status.ip)}
              disabled={isRecording}
            />
            <strong>{status.ip}</strong>: 
            <span style={{ color: status.state === 'Recording' ? 'red' : 'black' }}>
              {status.state}
            </span>
            {goproSettings[status.ip] && (
              <div>
                <h3>Settings:</h3>
                <pre>{JSON.stringify(goproSettings[status.ip], null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
