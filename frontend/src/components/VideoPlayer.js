// VideoPlayer.js
import React, { useRef, useEffect } from 'react';

function VideoPlayer({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement) {
      // Set the srcObject directly
      videoElement.srcObject = stream;

      // Make sure the video plays automatically
      videoElement.play().catch(err => console.error('Error playing video:', err));
    }

    return () => {
      if (videoElement) {
        // Clean up the stream
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: 'auto', border: '1px solid black' }}
      />
    </div>
  );
}

export default VideoPlayer;
