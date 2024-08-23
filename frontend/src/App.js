import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [goproStatuses, setGoproStatuses] = useState([]);
  const [videoStreams, setVideoStreams] = useState({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamReady, setStreamReady] = useState({});
  const [checkedStreams, setCheckedStreams] = useState({});
  const [activeStreams, setActiveStreams] = useState({}); // Track which streams are active
  const videoRefs = useRef({});
  const playerRefs = useRef({});

  useEffect(() => {
    const fetchStatus = () => {
      socket.emit('get_gopro_status');
    };

    const intervalId = setInterval(fetchStatus, 2000); // Run every 2 seconds

    return () => clearInterval(intervalId); // Clean up on component unmount
  }, []);

  useEffect(() => {
    socket.on('gopro_status', (data) => {
      setGoproStatuses(data);
      if (isStreaming) {
        const streams = {};
        data.forEach((status) => {
          var ip_convert = status.ip.replace(/\./g, '_');
          const streamUrl = `http://localhost:5000/hls_streams/gopro_${ip_convert}.m3u8`;
          streams[status.ip] = streamUrl;

          // Initialize activeStreams with default values if not set
          if (!(status.ip in activeStreams)) {
            setActiveStreams(prev => ({ ...prev, [status.ip]: true }));
          }

          // Only check readiness if we haven't already confirmed the stream is ready
          if (!checkedStreams[status.ip]) {
            checkStreamReady(`gopro_${ip_convert}.m3u8`, status.ip);
          }
        });
        setVideoStreams(streams);
      }
    });

    return () => {
      socket.off('gopro_status');
    };
  }, [isStreaming, checkedStreams, activeStreams]);

  const checkStreamReady = async (filename, ip) => {
    try {
      const response = await fetch(`http://localhost:5000/hls_streams/check_ready/${filename}`);
      const result = await response.json();
      setStreamReady(prev => ({ ...prev, [ip]: result.ready }));

      // If stream is ready, mark it as checked and stop further checks
      if (result.ready) {
        setCheckedStreams(prev => ({ ...prev, [ip]: true }));
        console.log("Stream is ready for GoPro", ip);
      } 
    } catch (error) {
      console.error(`Error checking stream for ${ip}:`, error);
      setStreamReady(prev => ({ ...prev, [ip]: false }));
    }
  };

  useEffect(() => {
    if (isStreaming) {
      Object.entries(videoStreams).forEach(([ip, streamUrl]) => {
        if (videoRefs.current[ip] && streamReady[ip] && activeStreams[ip] && !playerRefs.current[ip]) {
          playerRefs.current[ip] = videojs(videoRefs.current[ip], {
            controls: false,
            autoplay: true,
            muted: true,
            liveui: true,
            preload: 'auto',
            sources: [{ src: streamUrl, type: 'application/x-mpegURL' }],
          });

          playerRefs.current[ip].on('error', () => {
            console.error(`Error loading video for GoPro ${ip}`);
          });
        }
      });
    }

    return () => {
      if (!isStreaming) {
        Object.entries(playerRefs.current).forEach(([ip, player]) => {
          if (player && typeof player.dispose === 'function') {
            player.dispose();
          }
        });
        playerRefs.current = {};
      }
    };
  }, [videoStreams, isStreaming, streamReady, activeStreams]);

  const startGopros = () => {
    setIsStreaming(true);
    socket.emit('start_gopros');
  };

  const stopGopros = () => {
    setIsStreaming(false);
    setStreamReady({});        // Clear streamReady state
    setCheckedStreams({});      // Clear checkedStreams state
    setActiveStreams({});       // Turn off all streams
    socket.emit('stop_gopros');
  };

  const toggleStream = (ip) => {
    setActiveStreams(prev => ({ ...prev, [ip]: !prev[ip] }));
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
      {isStreaming && (
        <div className="video-grid">
          <h2>Video Feeds</h2>
          {Object.entries(videoStreams).map(([ip, streamUrl]) => (
            <div key={ip} className="video-item" style={{ display: activeStreams[ip] ? 'block' : 'none' }}>
              <h3>GoPro {ip} 
              {isStreaming && (
                <button onClick={() => toggleStream(ip)}>
                  {activeStreams[ip] ? 'Hide Stream' : 'Show Stream'}
                </button>
              )}
              </h3>
              {streamReady[ip] ? (
                <video
                  ref={(el) => (videoRefs.current[ip] = el)}
                  className="video-js vjs-default-skin"
                  controls
                ></video>
              ) : (
                <p>Loading stream...</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
