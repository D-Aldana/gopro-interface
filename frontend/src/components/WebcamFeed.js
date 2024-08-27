import React from 'react';

const VideoPlayer = ({ stream }) => {
  return (
    <div>
      {stream ? (
        <video autoPlay playsInline muted>
          <source src={URL.createObjectURL(stream)} type="video/mp4" />
        </video>
      ) : (
        <p>No webcam stream available</p>
      )}
    </div>
  );
};

export default VideoPlayer;
