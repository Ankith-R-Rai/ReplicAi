from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import base64
import numpy as np

# Import our new ML logic module from the ml.py file
from ml import ExerciseTracker, process_frame

app = Flask(__name__)
# Enable CORS to allow your frontend to communicate with this backend
CORS(app)  

# A global tracker instance. In a real multi-user app, this would be a 
# dictionary of trackers mapped to unique user session IDs.
tracker = ExerciseTracker()

@app.route('/')
def index():
    """Root route to confirm the backend is running."""
    return jsonify({"status": "Replic AI backend with Temporal & Gemini feedback is running"})

@app.route('/api/analyze', methods=['POST'])
def analyze_frame():
    """Analyzes a single video frame sent from the frontend."""
    data = request.get_json()
    if not data or 'image' not in data or 'exercise' not in data:
        return jsonify({"error": "Missing image or exercise data in request"}), 400

    # Decode the base64 image string sent from the frontend
    try:
        image_data = base64.b64decode(data['image'].split(',')[1])
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        return jsonify({"error": f"Invalid or corrupt image data: {e}"}), 400

    exercise_type = data['exercise']

    # Use the process_frame function from ml.py to do all the heavy lifting
    result = process_frame(img, exercise_type, tracker)
    
    return jsonify(result)

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """Endpoint to reset the counter and state for a new session or exercise."""
    tracker.reset()
    return jsonify({"message": "Tracker reset successfully"})

if __name__ == '__main__':
    # Runs the Flask app on localhost, port 5000
    app.run(debug=True, port=5000)