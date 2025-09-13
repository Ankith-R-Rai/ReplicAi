import React from 'react';
import Webcam from 'react-webcam';

const WebcamComponent = () => {
    // Defines the camera constraints
    const videoConstraints = {
        width: 1280,
        height: 720,
        facingMode: 'user' // 'user' for front camera, 'environment' for back camera
    };

    // Callback function for when the webcam successfully loads
    const handleUserMedia = () => {
        console.log('Webcam access was successful.');
    };

    // Callback function for errors
    const handleUserMediaError = (error) => {
        console.error('Webcam Error:', error);
        // You can add a user-facing error message here
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <h2>Webcam Test Component</h2>
            <p>If you see your video feed below, the webcam is working correctly.</p>
            <Webcam
                audio={false}
                height={360}
                width={640}
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                style={{ border: '2px solid #333', borderRadius: '8px' }}
            />
        </div>
    );
};

export default WebcamComponent;