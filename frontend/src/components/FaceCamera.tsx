import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';

interface FaceCameraProps {
    onCapture: (descriptor: Float32Array) => void;
    mode: 'REGISTER' | 'ATTENDANCE';
}

const FaceCamera: React.FC<FaceCameraProps> = ({ onCapture, mode }) => {
    const webcamRef = useRef<Webcam>(null);
    const [status, setStatus] = useState('Loading AI Models...');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [livenessConfirmed, setLivenessConfirmed] = useState(false);
    const [, setBlinkCount] = useState(0);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setStatus('Models Loaded. Please Blink to verify liveness.');
            } catch (err) {
                console.error(err);
                setStatus('Failed to load AI models. Check internet.');
            }
        };
        loadModels();
    }, []);

    const detect = async () => {
        if (webcamRef.current && webcamRef.current.video?.readyState === 4) {
            const video = webcamRef.current.video;

            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length > 0) {
                const face = detections[0];

                // --- FAST PATH: Attendance Mode ---
                // If in attendance mode, just check for a clear face (high confidence)
                // We assume liveness was checked strictly during registration.
                // For higher security, we could keep liveness here too, but user asked for speed.
                if (mode === 'ATTENDANCE' && !livenessConfirmed) {
                    if (face.detection.score > 0.85) {
                        setLivenessConfirmed(true);
                        setStatus('Face Verified. Submitting...');
                        capture(face.descriptor);
                        return;
                    }
                }

                // --- STRICT PATH: Registration Mode ---
                // Require blink detection to ensure it's a real person registering
                const landmarks = face.landmarks;
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                const leftEAR = getEAR(leftEye);
                const rightEAR = getEAR(rightEye);

                // Blink detection threshold
                if (leftEAR < 0.25 && rightEAR < 0.25) {
                    if (!livenessConfirmed) {
                        setBlinkCount(prev => prev + 1);
                        // Simple noise filter: require consistent blink or just one valid blink
                        setStatus('Blink Detected! Capturing...');
                        setLivenessConfirmed(true);

                        // Delay slightly to capture open eyes?
                        setTimeout(() => {
                            capture(face.descriptor);
                        }, 500);
                    }
                }
            }
        }
    };

    const capture = (descriptor: Float32Array) => {
        onCapture(descriptor);
    };

    // Helper: Eye Aspect Ratio
    const getEAR = (eye: faceapi.Point[]) => {
        const A = dist(eye[1], eye[5]);
        const B = dist(eye[2], eye[4]);
        const C = dist(eye[0], eye[3]);
        return (A + B) / (2.0 * C);
    };

    const dist = (p1: faceapi.Point, p2: faceapi.Point) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };

    useEffect(() => {
        let interval: any;
        if (modelsLoaded && !livenessConfirmed) {
            interval = setInterval(() => {
                detect();
            }, 200);
        }
        return () => clearInterval(interval);
    }, [modelsLoaded, livenessConfirmed]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative rounded-lg overflow-hidden shadow-lg bg-black">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user' }}
                    className="w-full h-64 md:h-96 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 flex flex-col items-center">
                    <p className="text-sm font-bold mb-2">{status}</p>
                    {modelsLoaded && (
                        <button
                            onClick={async () => {
                                if (webcamRef.current?.video) {
                                    const detections = await faceapi.detectAllFaces(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks()
                                        .withFaceDescriptors();
                                    if (detections.length > 0) {
                                        capture(detections[0].descriptor);
                                    } else {
                                        setStatus('No face detected for manual capture');
                                    }
                                }
                            }}
                            className="bg-blue-600 px-4 py-1 rounded text-sm hover:bg-blue-700"
                        >
                            Manual Capture (Force)
                        </button>
                    )}
                </div>
            </div>
            <p className="mt-4 text-gray-500 text-sm">
                {mode === 'REGISTER'
                    ? "Blink naturally to verify you are human."
                    : "Look at the camera to verify attendance."}
            </p>
        </div>
    );
};

export default FaceCamera;
