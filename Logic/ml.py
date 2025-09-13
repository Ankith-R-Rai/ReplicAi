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
    print("WARNING: GEMINI_API_KEY not found. Gemini features disabled.")
    gemini_model = None
else:
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel('gemini-pro-vision')

# --- Initialize MediaPipe ---
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# --- The Upgraded Tracker with More Detailed State ---
class ExerciseTracker:
    # --- FIXED: Corrected the typo from init to _init_ ---
    def _init_(self):
        """Initializes the tracker's state."""
        self.reset()

    def reset(self):
        """Resets all tracking variables to their default state."""
        self.good_reps = 0
        self.bad_reps = 0
        self.uncertain_reps = 0
        self.stage = None
        self.feedback = "Ready"
        self.angle = 0
        self.form_issue = None
        self.accuracy = 0
        self.gemini_coach_tip = "Start your set for an AI tip!"
        self.last_rep_confidence = 1.0
        self.last_rep_form_ok = False
        self.total_reps = 0
        self.is_new_rep = False


# --- Utility Functions ---
def calculate_angle(a, b, c):
    """Calculates the angle between three points."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return angle if angle <= 180.0 else 360 - angle

def calculate_confidence(landmarks, key_points):
    """Calculates a confidence score based on the visibility of key landmarks."""
    min_visibility = 1.0
    for point in key_points:
        visibility = landmarks[point.value].visibility
        if visibility < min_visibility:
            min_visibility = visibility
    return min_visibility


def get_gemini_coach_tip_async(image_bytes, prompt, tracker):
    """Fetches a coaching tip from Gemini in a separate thread."""
    if not gemini_model: 
        tracker.gemini_processing = False
        return
    current_time = time.time()
    if current_time - tracker.last_gemini_call_time < 10: # 10-second cooldown
        tracker.gemini_processing = False
        return
    tracker.last_gemini_call_time = current_time
    try:
        image_part = {"mime_type": "image/jpeg", "data": image_bytes}
        response = gemini_model.generate_content([prompt, image_part], stream=False)
        response.resolve()
        if response.text:
            tracker.gemini_coach_tip = response.text
    except Exception as e:
        print(f"Error with Gemini API: {e}")
        tracker.gemini_coach_tip = "Focus on your form."
    finally:
        tracker.gemini_processing = False

### MODIFIED FUNCTIONS FOR PROBABILISTIC LOGIC ###
def _process_squat(landmarks, tracker):
    """Processes a squat with selective classification logic."""
    # Define key landmarks for full-body visibility
    key_landmarks = [
        mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.RIGHT_HIP,
        mp_pose.PoseLandmark.LEFT_KNEE, mp_pose.PoseLandmark.RIGHT_KNEE,
        mp_pose.PoseLandmark.LEFT_ANKLE, mp_pose.PoseLandmark.RIGHT_ANKLE
    ]

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
    
    tracker.is_new_rep = False

    if is_deep_enough:
        if tracker.stage in [None, 'up']:
            tracker.stage = 'down'
            tracker.feedback = "Go up!"
            
        tracker.last_rep_form_ok = is_back_straight
        confidence = calculate_confidence(landmarks, key_landmarks)
        tracker.last_rep_confidence = confidence
        tracker.form_issue = "Keep Chest Up!" if not is_back_straight else None

    elif is_standing and tracker.stage == 'down':
        tracker.is_new_rep = True
        tracker.stage = 'up'
        
        if tracker.last_rep_confidence < 0.75:
            tracker.uncertain_reps += 1
            tracker.feedback = "Uncertain (Bad Visibility)"
        else:
            if tracker.last_rep_form_ok:
                tracker.good_reps += 1
                tracker.feedback = "Good Rep!"
            else:
                tracker.bad_reps += 1
                tracker.feedback = tracker.form_issue if tracker.form_issue else "Squat Deeper!"


def _process_bicep_curl(landmarks, tracker):
    """Processes a bicep curl with selective classification logic."""
    shoulder_lm = mp_pose.PoseLandmark.LEFT_SHOULDER
    elbow_lm = mp_pose.PoseLandmark.LEFT_ELBOW
    wrist_lm = mp_pose.PoseLandmark.LEFT_WRIST
    key_landmarks = [shoulder_lm, elbow_lm, wrist_lm]

    shoulder = [landmarks[shoulder_lm.value].x, landmarks[shoulder_lm.value].y]
    elbow = [landmarks[elbow_lm.value].x, landmarks[elbow_lm.value].y]
    wrist = [landmarks[wrist_lm.value].x, landmarks[wrist_lm.value].y]
    tracker.angle = calculate_angle(shoulder, elbow, wrist)
    
    is_curled = tracker.angle < 40
    is_extended = tracker.angle > 150
    CONFIDENCE_THRESHOLD = 0.75

    tracker.is_new_rep = False

    # At the peak of the curl, determine form and confidence
    if is_curled and tracker.stage in [None, 'down']:
        tracker.stage = 'up'
        tracker.feedback = "Squeeze!"
        
        confidence = calculate_confidence(landmarks, key_landmarks)
        tracker.last_rep_confidence = confidence
        tracker.last_rep_form_ok = True

    # After extending, judge the previous curl
    elif is_extended and tracker.stage == 'up':
        tracker.is_new_rep = True
        tracker.stage = 'down'
        
        if tracker.last_rep_confidence < CONFIDENCE_THRESHOLD:
            tracker.uncertain_reps += 1
            tracker.feedback = "Uncertain (Bad Visibility)"
        else:
            if tracker.last_rep_form_ok:
                tracker.good_reps += 1
                tracker.feedback = "Good Curl!"
            else:
                tracker.bad_reps += 1
                tracker.feedback = "Incomplete Rep!"
        
        # Reset for the next rep
        tracker.last_rep_form_ok = False
        tracker.last_rep_confidence = 1.0


def _process_pushup(landmarks, tracker):
    """Processes a pushup with selective classification logic."""
    key_landmarks = [
        mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.RIGHT_SHOULDER,
        mp_pose.PoseLandmark.LEFT_ELBOW, mp_pose.PoseLandmark.RIGHT_ELBOW,
        mp_pose.PoseLandmark.LEFT_WRIST, mp_pose.PoseLandmark.RIGHT_WRIST,
        mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.RIGHT_HIP
    ]

    shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
    wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
    hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    tracker.angle = calculate_angle(shoulder, elbow, wrist)
    
    # Form criteria
    is_down = tracker.angle < 90
    is_up = tracker.angle > 160
    is_back_straight = hip[1] > shoulder[1] # Check if hips are not sagging

    tracker.is_new_rep = False
    
    if is_down and tracker.stage in [None, 'up']:
        tracker.stage = "down"
        tracker.feedback = "Down"
        tracker.last_rep_form_ok = is_back_straight
        confidence = calculate_confidence(landmarks, key_landmarks)
        tracker.last_rep_confidence = confidence

    elif is_up and tracker.stage == 'down':
        tracker.is_new_rep = True
        tracker.stage = "up"
        
        if tracker.last_rep_confidence < 0.70:
            tracker.uncertain_reps += 1
            tracker.feedback = "Uncertain (Bad Visibility)"
        else:
            if tracker.last_rep_form_ok:
                tracker.good_reps += 1
                tracker.feedback = "Good Rep!"
            else:
                tracker.bad_reps += 1
                tracker.feedback = "Keep a Straight Back!"
        
        tracker.last_rep_form_ok = False


def _process_jumping_jack(landmarks, tracker):
    """Processes a jumping jack with selective classification logic."""
    # Define key landmarks for full-body visibility
    key_landmarks = [
        mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.RIGHT_SHOULDER,
        mp_pose.PoseLandmark.LEFT_WRIST, mp_pose.PoseLandmark.RIGHT_WRIST,
        mp_pose.PoseLandmark.LEFT_ANKLE, mp_pose.PoseLandmark.RIGHT_ANKLE
    ]
    
    # Get coordinates
    shoulder_l = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    wrist_l = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
    ankle_l = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
    ankle_r = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]

    # Form criteria
    leg_separation = abs(ankle_l[0] - ankle_r[0])
    arms_are_up = wrist_l[1] < shoulder_l[1] # Y-coordinate is smaller when higher
    
    is_out_position = leg_separation > 0.25 and arms_are_up
    is_in_position = leg_separation < 0.15
    CONFIDENCE_THRESHOLD = 0.70

    tracker.is_new_rep = False

    # At the peak "out" position, determine form and confidence
    if tracker.stage in [None, 'in'] and is_out_position:
        tracker.stage = "out"
        tracker.feedback = "Out!"
        
        confidence = calculate_confidence(landmarks, key_landmarks)
        tracker.last_rep_confidence = confidence
        tracker.last_rep_form_ok = True

    # After returning to "in" position, judge the previous jack
    elif tracker.stage == 'out' and is_in_position:
        tracker.is_new_rep = True
        tracker.stage = 'in'
        
        if tracker.last_rep_confidence < CONFIDENCE_THRESHOLD:
            tracker.uncertain_reps += 1
            tracker.feedback = "Uncertain (Full Body Not Visible)"
        else:
            if tracker.last_rep_form_ok:
                tracker.good_reps += 1
                tracker.feedback = "Good Jack!"
            else:
                tracker.bad_reps += 1
                tracker.feedback = "Incomplete Jack!"
                
        tracker.last_rep_form_ok = False
        tracker.last_rep_confidence = 1.0


def _process_lunge(landmarks, tracker):
    """Processes a lunge with selective classification logic."""
    key_landmarks = [
        mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.RIGHT_HIP,
        mp_pose.PoseLandmark.LEFT_KNEE, mp_pose.PoseLandmark.RIGHT_KNEE,
        mp_pose.PoseLandmark.LEFT_ANKLE, mp_pose.PoseLandmark.RIGHT_ANKLE
    ]

    hip_l = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    knee_l = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
    ankle_l = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
    hip_r = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
    knee_r = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
    ankle_r = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]

    left_knee_angle = calculate_angle(hip_l, knee_l, ankle_l)
    right_knee_angle = calculate_angle(hip_r, knee_r, ankle_r)
    tracker.angle = (left_knee_angle + right_knee_angle) / 2
    
    is_down_position = left_knee_angle < 110 and right_knee_angle < 110
    is_up_position = left_knee_angle > 160 and right_knee_angle > 160
    is_good_form = True # This would be a more complex check on torso and knee alignment
    
    tracker.is_new_rep = False
    
    if tracker.stage in [None, 'up'] and is_down_position:
        tracker.stage = 'down'
        tracker.feedback = 'Lunge Down'
        confidence = calculate_confidence(landmarks, key_landmarks)
        tracker.last_rep_confidence = confidence
        tracker.last_rep_form_ok = is_good_form

    elif tracker.stage == 'down' and is_up_position:
        tracker.is_new_rep = True
        tracker.stage = 'up'
        
        if tracker.last_rep_confidence < 0.70:
            tracker.uncertain_reps += 1
            tracker.feedback = "Uncertain (Bad Visibility)"
        else:
            if tracker.last_rep_form_ok:
                tracker.good_reps += 1
                tracker.feedback = "Up! Good Lunge."
            else:
                tracker.bad_reps += 1
                tracker.feedback = "Maintain Your Balance!"
                
        tracker.last_rep_form_ok = False
        tracker.last_rep_confidence = 1.0


# --- Main Processing Function (Dispatcher) ---
def process_frame(image, exercise_type, tracker):
    """Processes a video frame to analyze exercise form and count reps."""
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)
    
    try:
        landmarks = results.pose_landmarks.landmark
        
        # Dispatch to the correct exercise processor
        if exercise_type == 'squat':
            _process_squat(landmarks, tracker) 
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
        tracker.feedback = "No person detected"
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        tracker.feedback = "Error detecting pose"
    
    total_judged_reps = tracker.good_reps + tracker.bad_reps
    if total_judged_reps > 0:
        tracker.accuracy = (tracker.good_reps / total_judged_reps) * 100
    else:
        tracker.accuracy = 0
    
    return {
        "good_reps": tracker.good_reps,
        "bad_reps": tracker.bad_reps,
        "uncertain_reps": tracker.uncertain_reps,
        "feedback": tracker.feedback,
        "angle": round(tracker.angle, 2),
        "gemini_feedback": tracker.gemini_coach_tip,
        "accuracy": round(tracker.accuracy, 1)
    }