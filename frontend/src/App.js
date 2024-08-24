import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './VideoPlayer';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]);
  const [selectedGopros, setSelectedGopros] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [goproSettings, setGoproSettings] = useState({});
  const [webcamStream, setWebcamStream] = useState(null);

  useEffect(() => {
    // Access webcam stream
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        setWebcamStream(stream);
      })
      .catch(err => {
        console.error('Error accessing webcam:', err);
      });
  }, []);

  useEffect(() => {
    console.log('Webcam Stream:', webcamStream); // Check if the stream is correctly set
  }, [webcamStream]);


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

  return (
    <div className="App">
      <h1>GoPro Control Interface</h1>
      <div style={{width:'500px'}}>
        <VideoPlayer stream={webcamStream} />
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
