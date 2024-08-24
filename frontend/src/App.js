import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]);
  const [selectedGopros, setSelectedGopros] = useState([]); // Track selected GoPros
  const [isRecording, setIsRecording] = useState(false);
  const [goproSettings, setGoproSettings] = useState({}); // Object to store settings keyed by IP

  useEffect(() => {
    if (!isRecording) {
      // Fetch GoPro statuses every 2 seconds
      const fetchStatus = () => {
        socket.emit('get_gopro_status');
      };

      const intervalId = setInterval(fetchStatus, 2000); // Run every 2 seconds
      return () => clearInterval(intervalId); // Clean up on component unmount
    }
  }, [isRecording]);

  useEffect(() => {
    socket.on('gopro_status', (data) => {
      // Update GoPro status with the server response
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
      // Process the start/stop responses and update the statuses
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
      // Update GoPro settings with the server response
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
    socket.emit('start_gopros', selectedGopros); // Emit selected GoPros to start recording
  };

  const stopGopros = () => {
    setIsRecording(false);
    socket.emit('stop_gopros', selectedGopros); // Emit selected GoPros to stop recording
  };

  const handleGoproSelection = (ip) => {
    setSelectedGopros((prevSelected) =>
      prevSelected.includes(ip)
        ? prevSelected.filter((selectedIp) => selectedIp !== ip)
        : [...prevSelected, ip]
    );
  };

  return (
    <div className="App">
      <h1>GoPro Control Interface</h1>
      <button onClick={startGopros} disabled={isRecording}>Start Selected GoPros</button>
      <button onClick={stopGopros} disabled={!isRecording}>Stop Selected GoPros</button>
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
