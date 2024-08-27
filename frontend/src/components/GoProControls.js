import React from 'react';

const GoproControls = ({
  isRecording,
  startGopros,
  stopGopros,
  updateAllGoproSettings
}) => (
  <div>
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
  </div>
);

export default GoproControls;
