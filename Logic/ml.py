import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# --- State is managed in a simple class to handle a user session ---
class ExerciseTracker:
    def __init__(self):
        self.counter = 0
        self.stage = None
        self.feedback = "Ready"
        self.angle = 0

# A global tracker for simplicity. In a real app, you'd map this to user IDs.
tracker = ExerciseTracker()

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle

def process_frame(image, exercise_type):
    """Processes a single image frame and returns analysis data."""
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image_rgb.flags.writeable = False
    results = pose.process(image_rgb)
    image_rgb.flags.writeable = True
    
    try:
        landmarks = results.pose_landmarks.landmark
        
        if exercise_type == 'squat':
            hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            tracker.angle = calculate_angle(hip, knee, ankle)
            
            if tracker.angle < 90:
                tracker.stage = "down"
                tracker.feedback = "Good Form"
            elif tracker.angle > 160 and tracker.stage == 'down':
                tracker.stage = "up"
                tracker.counter += 1
                tracker.feedback = "Up"
        
        elif exercise_type == 'pushup':
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            tracker.angle = calculate_angle(shoulder, elbow, wrist)

            if tracker.angle < 90:
                tracker.stage = "down"
            elif tracker.angle > 160 and tracker.stage == 'down':
                tracker.stage = "up"
                tracker.counter += 1
                tracker.feedback = "Up"

        elif exercise_type == 'bicep_curl':
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            tracker.angle = calculate_angle(shoulder, elbow, wrist)
            
            if tracker.angle < 30:
                tracker.stage = "up"
            elif tracker.angle > 160 and tracker.stage == 'up':
                tracker.stage = "down"
                tracker.counter += 1
                tracker.feedback = "Down"

        # Add logic for 'lunge' and 'jumping_jack' here if needed

    except:
        tracker.feedback = "No person detected"
        pass
        
    return {
        "reps": tracker.counter,
        "feedback": tracker.feedback,
        "angle": tracker.angle
    }

def reset_tracker():
    """Resets the tracker's state for a new session."""
    global tracker
    tracker = ExerciseTracker()