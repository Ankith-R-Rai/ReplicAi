import cv2
import mediapipe as mp
import numpy as np
import time
import os
import google.generativeai as genai
from dotenv import load_dotenv
import threading

# --- Load API Key and Configure Gemini ---
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY not found. AI coaching will be disabled.")
    gemini_model = None
else:
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel('gemini-pro-vision')

# --- Initialize MediaPipe ---
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# --- The Upgraded Tracker with More Detailed State ---
class ExerciseTracker:
    def __init__(self):
        """Initializes the tracker's state."""
        self.reset()

    def reset(self):
        """Resets all tracking variables to their default state."""
        self.counter = 0
        self.stage = None
        self.feedback = "Ready"
        self.angle = 0
        self.rep_validated = False
        self.form_issue = None
        self.total_reps = 0
        self.accuracy = 0
        self.gemini_coach_tip = "Start your set for an AI tip!"
        self.gemini_processing = False
        self.last_gemini_call_time = 0

# --- Utility and Gemini Functions ---
def calculate_angle(a, b, c):
    a = np.array(a); b = np.array(b); c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return angle if angle <= 180.0 else 360 - angle

def get_gemini_coach_tip_async(image_bytes, prompt, tracker):
    if not gemini_model or tracker.gemini_processing: return
    current_time = time.time()
    if current_time - tracker.last_gemini_call_time < 10: return
        
    tracker.gemini_processing = True
    tracker.last_gemini_call_time = current_time
    
    def call_gemini():
        try:
            image_part = {"mime_type": "image/jpeg", "data": image_bytes}
            response = gemini_model.generate_content([prompt, image_part], stream=False)
            response.resolve()
            if response.text: tracker.gemini_coach_tip = response.text
        except Exception as e:
            print(f"Error with Gemini API: {e}")
            tracker.gemini_coach_tip = "Focus on maintaining a straight back."
        finally:
            tracker.gemini_processing = False
            
    threading.Thread(target=call_gemini).start()

# --- Exercise Logic Functions ---

def _process_squat(landmarks, tracker, image):
    hip_l = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    knee_l = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
    ankle_l = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
    shoulder_l = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    
    knee_angle = calculate_angle(hip_l, knee_l, ankle_l)
    back_angle = calculate_angle(shoulder_l, hip_l, knee_l)
    tracker.angle = knee_angle
    
    is_deep_enough = knee_angle < 110
    is_standing = knee_angle > 160
    is_back_straight = back_angle > 70

    if is_deep_enough:
        if tracker.stage in [None, 'up']:
            tracker.stage = 'down'
        tracker.feedback = "Now, drive up!"
        tracker.rep_validated = is_back_straight
        tracker.form_issue = None if is_back_straight else "Keep Chest Up!"
        
        if not is_back_straight and not tracker.gemini_processing:
             _, buffer = cv2.imencode('.jpg', image)
             image_bytes = buffer.tobytes()
             prompt = "Analyze this squat. The user's back is bent. Provide a short, encouraging coaching tip."
             get_gemini_coach_tip_async(image_bytes, prompt, tracker)
    elif is_standing:
        if tracker.stage == 'down':
            tracker.stage = 'up'
            tracker.total_reps += 1
            if tracker.rep_validated:
                tracker.counter += 1
                tracker.feedback = "Good Rep!"
            else:
                tracker.feedback = tracker.form_issue if tracker.form_issue else "Squat Deeper!"
        else:
            tracker.feedback = "Lower your body to begin."
        tracker.rep_validated = False
        tracker.form_issue = None

def _process_bicep_curl(landmarks, tracker):
    shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
    wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
    tracker.angle = calculate_angle(shoulder, elbow, wrist)
    
    is_curled = tracker.angle < 40
    is_extended = tracker.angle > 150

    # FIXED: Corrected rep counting logic for a full cycle
    if is_curled:
        if tracker.stage in [None, 'down']:
            tracker.stage = 'up'
        tracker.feedback = "Squeeze at the top!"
    elif is_extended:
        if tracker.stage == 'up':
            tracker.stage = 'down'
            tracker.counter += 1
            tracker.total_reps += 1 # Only count a rep after a full up-down cycle
            tracker.feedback = "Good Curl!"
        else:
            tracker.feedback = "Curl the weight up."

def _process_pushup(landmarks, tracker):
    shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
    wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
    tracker.angle = calculate_angle(shoulder, elbow, wrist)

    is_down = tracker.angle < 90
    is_up = tracker.angle > 160

    if is_down:
        if tracker.stage in [None, 'up']:
            tracker.stage = "down"
        tracker.feedback = "Push back up!"
    elif is_up:
        if tracker.stage == 'down':
            tracker.stage = "up"
            tracker.counter += 1
            tracker.total_reps += 1
            tracker.feedback = "Good Pushup!"
        else:
            tracker.feedback = "Lower your chest."

def _process_jumping_jack(landmarks, tracker):
    # This logic is complex and seems reasonable, so we'll mainly add dynamic feedback.
    shoulder_l = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    hip_l = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    elbow_l = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
    ankle_l = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
    ankle_r = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

    shoulder_angle = calculate_angle(hip_l, shoulder_l, elbow_l)
    tracker.angle = shoulder_angle
    leg_separation = abs(ankle_l.x - ankle_r.x)

    is_out_position = shoulder_angle > 65 and leg_separation > 0.22
    is_in_position = shoulder_angle < 35 and leg_separation < 0.18

    if is_out_position:
        if tracker.stage in [None, 'in']:
            tracker.stage = "out"
        tracker.feedback = "Out!"
    elif is_in_position:
        if tracker.stage == 'out':
            tracker.stage = 'in'
            tracker.counter += 1
            tracker.total_reps += 1
            tracker.feedback = "In!"
        else:
            tracker.feedback = "Start with feet together."
            
def _process_lunge(landmarks, tracker):
    hip_l = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    knee_l = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
    ankle_l = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
    hip_r = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
    knee_r = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
    ankle_r = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]

    left_knee_angle = calculate_angle(hip_l, knee_l, ankle_l)
    right_knee_angle = calculate_angle(hip_r, knee_r, ankle_r)
    tracker.angle = min(left_knee_angle, right_knee_angle)
    
    is_down_position = left_knee_angle < 110 and right_knee_angle < 110
    is_up_position = left_knee_angle > 160 and right_knee_angle > 160

    if is_down_position:
        if tracker.stage in [None, 'up']:
            tracker.stage = 'down'
        tracker.feedback = 'Drive back up!'
    elif is_up_position:
        if tracker.stage == 'down':
            tracker.stage = 'up'
            tracker.counter += 1
            tracker.total_reps += 1
            tracker.feedback = 'Good Lunge!'
        else:
            tracker.feedback = "Step into a lunge."

# --- Main Processing Function (Dispatcher) ---
def process_frame(image, exercise_type, tracker):
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)
    
    try:
        landmarks = results.pose_landmarks.landmark
        
        # UPDATED: All exercises are now called
        if exercise_type == 'squat':
            _process_squat(landmarks, tracker, image)
        elif exercise_type == 'bicep_curl':
            _process_bicep_curl(landmarks, tracker)
        elif exercise_type == 'pushup':
            _process_pushup(landmarks, tracker)
        elif exercise_type == 'jumping_jack':
            _process_jumping_jack(landmarks, tracker)
        elif exercise_type == 'lunge':
            _process_lunge(landmarks, tracker)
        else:
            tracker.feedback = f"'{exercise_type}' is not implemented."
            
    except AttributeError:
        tracker.feedback = "No person detected. Make sure you're fully in frame."
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        tracker.feedback = "Error detecting pose."
    
    if tracker.total_reps > 0:
        tracker.accuracy = (tracker.counter / tracker.total_reps) * 100
    else:
        tracker.accuracy = 0
    
    return {
        "count": tracker.counter,
        "feedback": tracker.feedback,
        "angle": round(tracker.angle, 2),
        "stage": tracker.stage,
        "gemini_feedback": tracker.gemini_coach_tip,
        "accuracy": round(tracker.accuracy, 1)
    }