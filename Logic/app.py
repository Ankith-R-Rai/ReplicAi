from dotenv import load_dotenv
import os
import json
import base64
import numpy as np
import cv2
from io import BytesIO
from PIL import Image
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util
from authlib.integrations.flask_oauth2 import ResourceProtector
from auth import Auth0JWTBearerTokenValidator
from datetime import datetime

# --- Import ML Logic ---
from ml import ExerciseTracker, process_frame

# Load environment variables from the .env file
load_dotenv()

# --- APP SETUP ---
app = Flask(__name__)

# --- CORS CONFIGURATION (CRUCIAL FIX) ---
# This allows the React frontend to communicate with the backend.
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})


# --- AUTH0 CONFIGURATION ---
validator = Auth0JWTBearerTokenValidator(
    os.environ.get("AUTH0_DOMAIN"),
    os.environ.get("AUTH0_API_AUDIENCE")
)
require_auth = ResourceProtector()
require_auth.register_token_validator(validator)

# --- MONGODB CONFIGURATION ---
try:
    mongo_client = MongoClient(os.environ.get("MONGO_URI"))
    db = mongo_client.get_database("replicai_db")
    users_collection = db.get_collection("users")
    workouts_collection = db.get_collection("workouts")
    print("✅ Successfully connected to MongoDB.")
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    mongo_client = None

# --- ML MODEL STATE ---
tracker = ExerciseTracker()

# --- HELPER FUNCTIONS ---
def parse_json(data):
    """Custom JSON parser to handle MongoDB's ObjectId and datetime."""
    return json.loads(json_util.dumps(data))

def get_or_create_user(auth0_id):
    """Finds a user by their Auth0 ID ('sub') or creates a new one."""
    if not mongo_client or not auth0_id:
        return None
    
    try:
        user_profile = users_collection.find_one_and_update(
            {'_id': auth0_id},
            {'$setOnInsert': {'_id': auth0_id, 'created_at': datetime.utcnow()}},
            upsert=True,
            return_document=True
        )
        if user_profile:
            print(f"User '{auth0_id}' found or created.")
        return user_profile
    except Exception as e:
        print(f"❌ MongoDB error in get_or_create_user: {e}")
        return None

# --- API ENDPOINTS ---

@app.route("/")
def home():
    """Health check endpoint."""
    return "ReplicAI API is running!"

@app.route("/api/reset", methods=["POST"])
def reset_tracker():
    """Resets the exercise tracker state for a new session."""
    tracker.reset()
    print("🏋️  Tracker reset for new session.")
    return jsonify({"message": "Tracker reset"}), 200

@app.route("/api/analyze", methods=["POST"])
def analyze_frame():
    """Receives a video frame, processes it, and returns analysis."""
    data = request.get_json()
    if not data or 'image' not in data or 'exercise' not in data:
        return jsonify({"error": "Missing image or exercise data"}), 400
        
    image_data = data['image'].split(',')[1]
    exercise_type = data['exercise']
    
    try:
        img_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(img_bytes))
        frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        analysis_result = process_frame(frame, exercise_type, tracker)
        return jsonify(analysis_result)
    except Exception as e:
        print(f"❌ Error during frame analysis: {e}")
        return jsonify({"error": "Failed to analyze frame"}), 500


@app.route("/api/workout", methods=["POST"], endpoint="save_workout")
@require_auth()
def save_workout_route():
    """Saves a completed workout session to the database."""
    if not mongo_client:
        return jsonify({"error": "Database connection failed"}), 500
        
    auth0_id = g.auth_token_payload.get('sub')
    if not auth0_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    get_or_create_user(auth0_id)

    try:
        workout_data = request.json
        new_workout = {
            "user_id": auth0_id,
            "exercise_type": workout_data.get("exercise_type"),
            "rep_count": workout_data.get("rep_count"),
            "duration_seconds": workout_data.get("duration_seconds"),
            "average_accuracy": workout_data.get("average_accuracy", 0),
            "completion_timestamp": datetime.utcnow(),
        }
        workouts_collection.insert_one(new_workout)
        print(f"✅ Workout saved for user {auth0_id}")
        return jsonify({"message": "Workout saved successfully!"}), 201
    except Exception as e:
        print(f"❌ Error saving workout: {e}")
        return jsonify({"error": "Failed to save workout data."}), 500

@app.route("/api/workout", methods=["GET"], endpoint="get_workout_history")
@require_auth()
def get_workout_history_route():
    """Retrieves all workout sessions for the authenticated user."""
    if not mongo_client:
        return jsonify({"error": "Database connection failed"}), 500
        
    auth0_id = g.auth_token_payload.get('sub')
    if not auth0_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        user_workouts = workouts_collection.find({"user_id": auth0_id}).sort("completion_timestamp", -1)
        workout_list = list(user_workouts)
        return parse_json(workout_list), 200
    except Exception as e:
        print(f"❌ Error fetching workout history: {e}")
        return jsonify({"error": "Failed to retrieve workout history."}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

