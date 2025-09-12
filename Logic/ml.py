import cv2
import mediapipe as mp
import numpy as np
import time

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils

# Variables for squat counter and feedback
count = 0
status = "UP"
feedback = ""
last_feedback_time = 0
FEEDBACK_DELAY = 2  # seconds between feedback messages

# Colors for visual feedback (BGR format)
GREEN = (0, 255, 0)
YELLOW = (0, 255, 255)
RED = (0, 0, 255)

def calculate_angle(a, b, c):
    """
    Calculates the angle between three points.
    a, b, c are tuples of (x, y) coordinates.
    """
    a = np.array(a)  # First point
    b = np.array(b)  # Mid point
    c = np.array(c)  # End point

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
    # Define thresholds for good form
    GOOD_KNEE_ANGLE = (90, 105)
    GOOD_HIP_ANGLE = (90, 105)

    # Hip angle feedback
    if hip_angle > GOOD_HIP_ANGLE[1]:
        feedback_text += "Straighten your back. "
    elif hip_angle < GOOD_HIP_ANGLE[0]:
        feedback_text += "Engage your core. "
    
    # Knee angle feedback
    if knee_angle < GOOD_KNEE_ANGLE[0]:
        feedback_text += "Don't go too deep. "
    
    return feedback_text

def main():
    """
    Main function to run the squat counter and feedback system.
    """
    global count, status, feedback, last_feedback_time
    
    # Access the webcam
    cap = cv2.VideoCapture(0)

    # Check if webcam is opened correctly
    if not cap.isOpened():
        print("Error: Could not open video stream. Please check your webcam connection.")
        return

    print("Webcam successfully opened. Press 'q' to exit.")
    
    while cap.isOpened():
        # Read a frame from the webcam
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame from webcam.")
            break

        # Flip the frame horizontally for a mirror effect
        frame = cv2.flip(frame, 1)

        # Convert the BGR image to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Process the frame and get pose landmarks
        result = pose.process(rgb_frame)

        # Draw landmarks on the frame if they are detected
        if result.pose_landmarks:
            # Commenting out the line below to remove the skeletal overlay
            # mp_drawing.draw_landmarks(frame, result.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # Extract landmarks for both sides of the body
            try:
                landmarks = result.pose_landmarks.landmark

                # Left side
                shoulder_l = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                            landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
                hip_l = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                         landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
                knee_l = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                          landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
                
                # Right side
                shoulder_r = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                            landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
                hip_r = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                         landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
                knee_r = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                          landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]

                # Calculate angles on both sides
                hip_angle_l = calculate_angle(shoulder_l, hip_l, knee_l)
                hip_angle_r = calculate_angle(shoulder_r, hip_r, knee_r)

                # Use the average of both hip angles for better accuracy
                hip_angle = (hip_angle_l + hip_angle_r) / 2

                knee_angle_l = calculate_angle(hip_l, knee_l, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value])
                knee_angle_r = calculate_angle(hip_r, knee_r, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value])
                
                # Use the average of both knee angles
                knee_angle = (knee_angle_l + knee_angle_r) / 2
                
                # Squat counter logic
                # Squat 'UP' position - knees are straight
                if knee_angle > 165 and hip_angle > 165:
                    status = "UP"
                
                # Squat 'DOWN' position and count
                if knee_angle < 100 and status == "UP":
                    status = "DOWN"
                    count += 1
                    feedback = "" # Reset feedback on a new rep
                
                # Check for bad form and provide feedback
                current_time = time.time()
                if status == "DOWN" and current_time - last_feedback_time > FEEDBACK_DELAY:
                    current_feedback = get_feedback(hip_angle, knee_angle)
                    if current_feedback:
                        feedback = current_feedback
                        last_feedback_time = current_time
                    else:
                        feedback = "Good job!"
                        last_feedback_time = current_time
            except Exception as e:
                print(f"Error during pose landmark processing: {e}")
        
        # Determine the color of the feedback bar
        feedback_color = YELLOW
        if "Good job" in feedback:
            feedback_color = GREEN
        elif feedback:
            feedback_color = RED
        
        # Draw the visual feedback bar at the top of the screen
        h, w, c = frame.shape
        cv2.rectangle(frame, (0, 0), (w, 50), feedback_color, -1)
        
        # Display the squat count, status, and feedback on the screen
        cv2.putText(frame, f"SQUATS: {count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
        
        # Display knee angle next to the knee
        if 'knee_angle' in locals() and landmarks:
            h, w, c = frame.shape
            knee_pos = (int(landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x * w) + 20, 
                        int(landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y * h))
            cv2.putText(frame, f"Knee Angle: {int(knee_angle)}", knee_pos,
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

        # Show the processed frame
        cv2.imshow("Squat Counter", frame)

        # Break the loop if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Release the webcam and destroy all windows
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
