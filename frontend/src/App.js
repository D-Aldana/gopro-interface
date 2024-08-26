import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import './App.css';

// Initialize a Socket.IO connection to the backend server
const socket = io('http://localhost:5000');

function App() {
  /* ----- State Initialization ----- */
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

  /* ----- Effect Hooks ----- */

  // Fetch the webcam stream when the component is mounted
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => setWebcamStream(stream)) // Set the webcam stream to state
      .catch(err => console.error('Error accessing webcam:', err)); // Handle webcam access errors
  }, []);

  // Fetch GoPro statuses periodically when not recording
  useEffect(() => {
    if (!isRecording) {
      const fetchStatus = () => socket.emit('get_gopro_status'); // Request GoPro statuses from the server
      const intervalId = setInterval(fetchStatus, 2000); // Fetch statuses every 2 seconds
      return () => clearInterval(intervalId); // Clear interval when component unmounts
    }
  }, [isRecording]);

  // Listen for GoPro status updates from the server
  useEffect(() => {
    socket.on('gopro_status', (data) => {
      const updatedStatuses = data.map((status) => ({
        ip: status.ip,
        state: status.status === 200 ? 'Connected' : 'Disconnected', // Update status based on response code
      }));
      setGoproStatuses(updatedStatuses); // Update the state with the new statuses
    });
    return () => socket.off('gopro_status'); // Clean up the event listener when the component unmounts
  }, []);

  // Listen for GoPro recording response updates from the server
  useEffect(() => {
    socket.on('gopro_record_response', (responses) => {
      const updatedStatuses = goproStatuses.map((status) => {
        const response = responses.find((resp) => resp.ip === status.ip);
        if (response) {
          return { 
            ...status, 
            state: response.response === 200 ? (isRecording ? 'Recording' : 'Connected') : 'Error' // Update status based on recording response
          };
        }
        return status;
      });
      setGoproStatuses(updatedStatuses); // Update the state with the new statuses
    });
    return () => socket.off('gopro_record_response'); // Clean up the event listener when the component unmounts
  }, [isRecording, goproStatuses]);

  // Listen for GoPro settings updates from the server
  useEffect(() => {
    socket.on('gopro_settings', (data) => {
      setGoproSettings((prevSettings) => ({
        ...prevSettings,
        [data.ip]: data.settings, // Update settings for the GoPro with the received IP
      }));
    });
    return () => socket.off('gopro_settings'); // Clean up the event listener when the component unmounts
  }, []);

  // Listen for available sound devices from the server
  useEffect(() => {
    socket.on('audio_devices', (devices) => setSoundDevices(devices)); // Update the state with the list of sound devices
    fetchSoundDevices(); // Fetch sound devices when component mounts
    return () => socket.off('audio_devices'); // Clean up the event listener when the component unmounts
  }, []);

  // Listen for audio file save events from the server
  useEffect(() => {
    socket.on('audio_saved', (data) => setAudioFilePath(data.filepath)); // Update the state with the saved audio file path
    return () => socket.off('audio_saved'); // Clean up the event listener when the component unmounts
  }, []);

  /* ----- Helper Functions ----- */

  // Start the timer for audio recording
  const startTimer = () => {
    const startTime = new Date(); // Record the start time
    const intervalId = setInterval(() => {
      const now = new Date();
      const elapsed = now - startTime; // Calculate elapsed time
      const minutes = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
      const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      setTimer(`${minutes}:${seconds}`); // Update the timer state
    }, 1000);
    return () => clearInterval(intervalId); // Clear interval when timer stops
  };

  // Start audio recording with the selected device
  const startRecordingAudio = (deviceIndex) => {
    socket.emit('start_audio', deviceIndex); // Request the server to start audio recording
    setIsRecordingAudio(true); // Update the audio recording state
    startTimer(); // Start the timer
  };

  // Stop audio recording
  const stopRecordingAudio = () => {
    socket.emit('stop_audio'); // Request the server to stop audio recording
    setIsRecordingAudio(false); // Update the audio recording state
    setFinalTimer(timer); // Capture the final timer value when recording stops
    setTimer('00:00:00'); // Reset the timer
  };

  // Start GoPro recording for selected cameras
  const startGopros = () => {
    setIsRecording(true); // Update the GoPro recording state
    socket.emit('start_gopros', selectedGopros); // Request the server to start recording on selected GoPros
  };

  // Stop GoPro recording
  const stopGopros = () => {
    setIsRecording(false); // Update the GoPro recording state
    socket.emit('stop_gopros', selectedGopros); // Request the server to stop recording on selected GoPros
  };

  // Handle GoPro selection for recording
  const handleGoproSelection = (ip) => {
    setSelectedGopros((prevSelected) =>
      prevSelected.includes(ip)
        ? prevSelected.filter((selectedIp) => selectedIp !== ip) // Remove GoPro from selection if already selected
        : [...prevSelected, ip] // Add GoPro to selection if not already selected
    );
  };

  // Update settings for all connected GoPros
  const updateAllGoproSettings = () => {
    const connectedGopros = goproStatuses
      .filter(status => status.state === 'Connected') // Filter for connected GoPros
      .map(status => status.ip);
    socket.emit('update_all_gopro_settings', connectedGopros); // Request the server to update settings for all connected GoPros
  };

  // Fetch available sound devices from the server
  const fetchSoundDevices = () => {
    socket.emit('get_audio_devices'); // Request the server to send available sound devices
  };

  // Handle audio device selection
  const handleDeviceChange = (deviceIndex) => {
    const device = soundDevices.find(d => d.index === parseInt(deviceIndex, 10)); // Find the selected device
    setSelectedDevice(device); // Update the state with the selected device
  };

  /* ----- Rendering ----- */
  return (
    <div className="App">
      <h1>GoPro Control Interface</h1>
      <div style={{ display: 'flex' }}>
        {/* Webcam video player */}
        <div style={{ width: '500px' }}>
          <VideoPlayer stream={webcamStream} /> {/* Pass webcam stream to VideoPlayer component */}
        </div>
        
        {/* Audio recording controls */}
        <div style={{ width: '300px', marginLeft: '20px' }}>
          <h3>Available Sound Devices</h3> 
          <button onClick={fetchSoundDevices}>Refresh Sound Devices</button> {/* Button to refresh sound devices */}
          
          <select onChange={(e) => handleDeviceChange(e.target.value)} value={selectedDevice?.index || ''}>
            <option value="" disabled>Select an audio device</option>
            {soundDevices.map((device) => (
              <option key={device.index} value={device.index}>
                {device.name} {/* Display each sound device name */}
              </option>
            ))}
          </select>
          
          {selectedDevice && (
            <div>
              {/* Display start/stop buttons based on recording state */}
              {!isRecordingAudio ? (
                <button onClick={() => startRecordingAudio(selectedDevice.index)}>
                  Start Recording Audio: {selectedDevice.name}
                </button>
              ) : (
                <div>
                  <button style={{ backgroundColor: 'red', color: 'white' }}>
                    Recording: {timer} {/* Display the recording timer */}
                  </button>
                  <button onClick={stopRecordingAudio}>Stop Recording</button>
                </div>
              )}
              
              {/* Display final recording timer and file path */}
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

      {/* GoPro recording control buttons */}
      {!isRecording ? (
        <button onClick={startGopros} disabled={isRecording}>Start Selected GoPros</button>
      ) : (
        <div>
          <button style={{ backgroundColor: 'red', color: 'white' }}>Recording</button>
          <button onClick={stopGopros}>Stop Recording</button>
        </div>
      )}

      {/* Update settings button */}
      <button onClick={updateAllGoproSettings} disabled={isRecording}>
        Update All Settings
      </button>
      
      {/* GoPro status grid */}
      <div className="status-grid">
        {goproStatuses.map((status, index) => (
          <div key={index} className="status-item">
            <input
              type="checkbox"
              checked={selectedGopros.includes(status.ip)}
              onChange={() => handleGoproSelection(status.ip)}
              disabled={isRecording} // Disable checkbox if recording
            />
            <strong>{status.ip}</strong>: 
            <span style={{ color: status.state === 'Recording' ? 'red' : 'black' }}>
              {status.state} {/* Display the current state of each GoPro */}
            </span>
            
            {/* Display GoPro settings */}
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
