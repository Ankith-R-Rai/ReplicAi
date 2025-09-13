from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING
from bson import json_util
from dotenv import load_dotenv
from datetime import datetime
import os
import base64
import numpy as np
import cv2

# --- Import your custom modules ---
from auth import requires_auth
from ml import ExerciseTracker, process_frame

# --- App Initialization & DB Connection ---
load_dotenv()
app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set!")

client = MongoClient(MONGO_URI)
db = client["rvit24bcs153rvitm_db_user"]
users_collection = db["users"]
workouts_collection = db["workouts"]

# --- In-Memory Session Management ---
user_trackers = {}

# --- Helper Function ---
def get_or_create_user(auth0_id):
    """Ensures a user document exists in the database."""
    users_collection.find_one_and_update(
        {"auth0_id": auth0_id},
        {"$setOnInsert": {"auth0_id": auth0_id, "created_at": datetime.utcnow()}},
        upsert=True
    )

# --- API Endpoints ---
@app.route("/")
def index():
    return jsonify({"status": "ReplicAI backend is running."})

@app.route('/api/process_frame', methods=['POST'])
@requires_auth
def process_frame_endpoint(payload):
    """Analyzes a frame using a user-specific tracker instance."""
    auth0_id = payload.get("sub")
    
    if auth0_id not in user_trackers:
        user_trackers[auth0_id] = ExerciseTracker()
    tracker = user_trackers[auth0_id]

    data = request.get_json()
    try:
        image_data = base64.b64decode(data['image_data'].split(',')[1])
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None: raise ValueError("Failed to decode image")
    except Exception as e:
        return jsonify({"error": f"Invalid image data: {e}"}), 400

    exercise_type = data.get("exercise", "squat")
    result = process_frame(frame, exercise_type, tracker)
    
    return jsonify(result)

@app.route('/api/reset', methods=['POST'])
@requires_auth
def reset_session(payload):
    """Resets the tracker for the authenticated user."""
    auth0_id = payload.get("sub")
    if auth0_id in user_trackers:
        user_trackers[auth0_id].reset()
    return jsonify({"message": "Tracker reset successfully"})

@app.route('/api/save_workout', methods=['POST'])
@requires_auth
def save_workout(payload):
    """Saves a completed workout and resets the user's tracker."""
    auth0_id = payload.get("sub")
    get_or_create_user(auth0_id)
    
    workout_data = request.get_json()
    
    # UPDATED: Added average_accuracy
    new_workout = {
        "user_auth0_id": auth0_id,
        "exercise_type": workout_data.get("exercise_type"),
        "rep_count": workout_data.get("rep_count"),
        "duration_seconds": workout_data.get("duration_seconds"),
        "average_accuracy": workout_data.get("average_accuracy"),
        "completed_at": datetime.utcnow()
    }
    workouts_collection.insert_one(new_workout)
    
    if auth0_id in user_trackers:
        user_trackers[auth0_id].reset()
        
    return jsonify({"message": "Workout saved!"}), 201

@app.route("/api/history", methods=["GET"])
@requires_auth
def get_history(payload):
    """Retrieves workout history for the authenticated user."""
    auth0_id = payload.get("sub")
    user_workouts = workouts_collection.find({"user_auth0_id": auth0_id}).sort("completed_at", DESCENDING)
    return json_util.dumps(list(user_workouts)), 200, {'Content-Type': 'application/json'}

@app.route("/api/personal_bests", methods=["GET"])
@requires_auth
def get_personal_bests(payload):
    """NEW: Retrieves the user's max reps for each exercise for the confetti feature."""
    auth0_id = payload.get("sub")
    
    pipeline = [
        {"$match": {"user_auth0_id": auth0_id}},
        {"$group": {"_id": "$exercise_type", "maxReps": {"$max": "$rep_count"}}}
    ]
    bests = list(workouts_collection.aggregate(pipeline))
    
    bests_dict = {item["_id"]: item["maxReps"] for item in bests}
    
    return jsonify(bests_dict)

if __name__ == '__main__':
    app.run(debug=True, port=5000)