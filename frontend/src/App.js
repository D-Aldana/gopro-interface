import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');  // Adjust the URL if necessary

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]);

  useEffect(() => {
    // Function to request the current status
    const fetchStatus = () => {
      socket.emit('get_gopro_status');
    };

    // Request the status when the component mounts
    fetchStatus();

    // Set up periodic status check every 30 seconds (adjust interval as needed)
    const intervalId = setInterval(fetchStatus, 30000);

    // Clean up on component unmount
    return () => {
      socket.off('gopro_status');
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    // Update state when new status data is received
    socket.on('gopro_status', (data) => {
      console.log(data);
      setGoproStatuses(data);
    });

    // Cleanup on component unmount
    return () => {
      socket.off('gopro_status');
    };
  }, []);

  const startGopros = () => {
    socket.emit('start_gopros');
  };

  const stopGopros = () => {
    socket.emit('stop_gopros');
  };

  return (
    <div className="App">
      <h1>GoPro Control Interface</h1>
      <button onClick={startGopros}>Start GoPros</button>
      <button onClick={stopGopros}>Stop GoPros</button>
      <div>
        <h2>Status:</h2>
        <ul>
          {goproStatuses.map((status, index) => (
            <li key={index}>
              <strong>{status.ip}</strong>: Status - {status.status.error ? 'Error' : 'OK'}, Details: {JSON.stringify(status.status)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
