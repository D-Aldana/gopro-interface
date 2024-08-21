import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './App.css'; // Import your CSS file for custom styles

const socket = io('http://localhost:5000');  // Adjust the URL if necessary

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]);
  const [videoStreams, setVideoStreams] = useState({});
  const videoRefs = useRef({});
  const playerRefs = useRef({}); // Store initialized video.js player instances

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
    socket.on('gopro_status', (data) => {
      setGoproStatuses(data);
      const streams = {};
      data.forEach((status) => {
        streams[status.ip] = `http://localhost:5000/stream/${status.ip}/index.m3u8`; // HLS stream URL
      });
      setVideoStreams(streams);
    });

    // Cleanup on component unmount
    return () => {
      socket.off('gopro_status');
    };
  }, []);

  useEffect(() => {
    // Initialize or update Video.js players
    Object.entries(videoStreams).forEach(([ip, streamUrl]) => {
      if (videoRefs.current[ip]) {
        // Initialize the player if it hasn't been initialized
        if (!playerRefs.current[ip]) {
          playerRefs.current[ip] = videojs(videoRefs.current[ip], {
            controls: true,
            autoplay: false,
            preload: 'auto',
            sources: [{ src: streamUrl, type: 'application/x-mpegURL' }],
          });
        } else {
          // Update the source if the player already exists
          playerRefs.current[ip].src({ src: streamUrl, type: 'application/x-mpegURL' });
        }
      }
    });

    return () => {
      // Dispose of Video.js players on unmount
      Object.entries(playerRefs.current).forEach(([ip, player]) => {
        if (player && typeof player.dispose === 'function') {
          player.dispose();
        }
      });
      playerRefs.current = {}; // Reset player references after disposal
    };
  }, [videoStreams]);

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
      <div className="video-grid">
        <h2>Video Feeds</h2>
        {Object.entries(videoStreams).map(([ip, streamUrl]) => (
          <div key={ip} className="video-item">
            <h3>GoPro {ip}</h3>
            <video
              ref={(el) => (videoRefs.current[ip] = el)}
              className="video-js vjs-default-skin"
              controls
            ></video>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
