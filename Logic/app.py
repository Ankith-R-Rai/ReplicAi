import cv2
import mediapipe as mp
import numpy as np
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app) # Enable CORS for frontend communication

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# Variables for squat counter
count = 0
status = "UP"
feedback = ""

def calculate_angle(a, b, c):
    """
    Calculates the angle between three points.
    a, b, c are tuples of (x, y) coordinates.
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180.0:
        angle = 360 - angle
    
    return angle

def get_feedback(hip_angle, knee_angle):
    """
    Determines feedback based on hip and knee angles.
    """
    feedback_text = ""
    GOOD_KNEE_ANGLE = (90, 105)
    GOOD_HIP_ANGLE = (90, 105)

    if hip_angle > GOOD_HIP_ANGLE[1]:
        feedback_text += "Straighten your back. "
    elif hip_angle < GOOD_HIP_ANGLE[0]:
        feedback_text += "Engage your core. "
    
    if knee_angle < GOOD_KNEE_ANGLE[0]:
        feedback_text += "Don't go too deep. "
    
    return feedback_text

@app.route('/process_frame', methods=['POST'])
def process_frame():
    """
    API endpoint to receive and process a single webcam frame.
    """
    global count, status, feedback
    
    try:
        # Decode the base64 image data from the request
        data = request.json
        img_data = base64.b64decode(data['image_data'].split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Convert to RGB and process with MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb_frame)

        if result.pose_landmarks:
            landmarks = result.pose_landmarks.landmark
            
            # Use left side for calculations
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]

            hip_angle = calculate_angle(shoulder, hip, knee)
            knee_angle = calculate_angle(hip, knee, ankle)

            # Squat counter logic
            if knee_angle > 165 and hip_angle > 165:
                status = "UP"
                feedback = "Good job!"
            
            if knee_angle < 100 and status == "UP":
                status = "DOWN"
                count += 1
                current_feedback = get_feedback(hip_angle, knee_angle)
                if current_feedback:
                    feedback = current_feedback
                else:
                    feedback = "Good job!"

        return jsonify({
            "count": count,
            "status": status,
            "feedback": feedback
        })

    except Exception as e:
        print(f"Error processing frame: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Flask backend is running 🚀", "status": "OK"})

if __name__ == '__main__':
    # You can change the port here if needed
    app.run(host='0.0.0.0', port=5000)
