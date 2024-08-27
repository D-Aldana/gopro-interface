import React from 'react';

const GoproStatus = ({ goproStatuses, selectedGopros, handleGoproSelection, goproSettings, isRecording }) => (
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
);

export default GoproStatus;
