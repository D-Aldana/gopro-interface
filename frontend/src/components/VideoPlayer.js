import React, { useRef, useEffect } from 'react';

function VideoPlayer({ stream }) {
  /* ----- State Initialization ----- */
  const videoRef = useRef(null); // Ref to the video element

  /* ----- Effect Hooks ----- */
  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement) {
      // Set the srcObject directly to the video element
      videoElement.srcObject = stream;

      // Attempt to play the video automatically
      videoElement.play().catch(err => console.error('Error playing video:', err));
    }

    // Clean up the video stream when the component unmounts
    return () => {
      if (videoElement) {
        videoElement.srcObject = null; // Clear the video element's srcObject
      }
    };
  }, [stream]); // Re-run the effect when the stream changes

  /* ----- Rendering ----- */
  return (
    <div>
      <video
        ref={videoRef} // Attach the ref to the video element
        autoPlay // Ensure the video plays automatically
        playsInline // Allow inline playback on mobile devices
        style={{ width: '100%', height: 'auto', border: '1px solid black' }} // Basic video styling
      />
    </div>
  );
}

export default VideoPlayer;
