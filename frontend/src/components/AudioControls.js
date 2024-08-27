import React from 'react';

const AudioControls = ({
  soundDevices,
  selectedDevice,
  isRecordingAudio,
  timer,
  finalTimer,
  audioFilePath,
  fetchSoundDevices,
  handleDeviceChange,
  startRecordingAudio,
  stopRecordingAudio
}) => (
  <div>
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
);

export default AudioControls;
