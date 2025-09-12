from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import numpy as np
import cv2

# Import from ml.py
from ml import process_frame, reset_tracker

app = Flask(__name__)
CORS(app)  # This allows your React app to make requests to this server

# NEW: Root route to show a status message
@app.route('/')
def index():
    return jsonify({"status": "Replic AI backend is running"})

@app.route('/api/analyze', methods=['POST'])
def analyze_frame():
    data = request.get_json()
    if 'image' not in data or 'exercise' not in data:
        return jsonify({"error": "Missing image or exercise data"}), 400

    # Decode the base64 image
    image_data = base64.b64decode(data['image'].split(',')[1])
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Get the selected exercise
    exercise_type = data['exercise']

    # Process the frame using our analysis function from ml.py
    result = process_frame(img, exercise_type)
    
    return jsonify(result)

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """Endpoint to reset the counter and state for a new session."""
    reset_tracker()
    return jsonify({"message": "Tracker reset successfully"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)