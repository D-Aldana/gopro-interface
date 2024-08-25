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
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);

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
      const updatedStatuses = data.map((status) => {
        const state = (status.status === 200) ? 'Connected' : 'Disconnected';
        return { ip: status.ip, state };
      });
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
          if (response.response === 200) {
            return { ...status, state: isRecording ? 'Recording' : 'Connected' };
          } else {
            return { ...status, state: 'Error' };
          }
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
        [data.ip]: data.settings
      }));
    });

    return () => {
      socket.off('gopro_settings');
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

  const handleDeviceSelection = (device) => {
    setSelectedDevice(device);
    if (!device) {
      setAvailableChannels([]);
      setSelectedChannels([]);
      return;
    }
    setAvailableChannels([...Array(device.channels).keys()]);  // Simulate channels based on device
    setSelectedChannels([]);
  };

  const handleChannelSelection = (channel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(ch => ch !== channel)
        : [...prev, channel]
    );
  };

  const startRecording = () => {
    socket.emit('start_recording', { device: selectedDevice, channels: selectedChannels });
  };

  const stopRecording = () => {
    socket.emit('stop_recording');
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
          <select onChange={(e) => handleDeviceSelection(soundDevices[e.target.value])}>
            <option value="">Select a Device</option>
            {soundDevices.map((device, index) => (
              <option key={index} value={index}>{device.name}</option>
            ))}
          </select>

          {availableChannels.length > 0 && (
            <div>
              <h4>Select Channels:</h4>
              {availableChannels.map(channel => (
                <div key={channel}>
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel)}
                    onChange={() => handleChannelSelection(channel)}
                  />
                  Channel {channel + 1}
                </div>
              ))}
            </div>
          )}

          <button onClick={startRecording} disabled={!selectedDevice || selectedChannels.length === 0}>
            Start Recording
          </button>
          <button onClick={stopRecording} disabled={!isRecording}>
            Stop Recording
          </button>
        </div>
      </div>

      <button onClick={startGopros} disabled={isRecording}>Start Selected GoPros</button>
      <button onClick={stopGopros} disabled={!isRecording}>Stop Selected GoPros</button>
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
