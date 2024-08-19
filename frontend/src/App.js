import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');  // Adjust the URL if necessary

function App() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    socket.on('gopro_status', (data) => {
      console.log(data);
      setStatus(data.status);
    });

    // Cleanup on component unmount
    return () => {
      socket.off('status');
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
      <p>Status: {status}</p>
    </div>
  );
}

export default App;
