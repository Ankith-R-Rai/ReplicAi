ReplicAI: Your Personal AI Workout Companion
ReplicAI is a web application that acts as your personal workout companion, using the power of computer vision to provide real-time feedback on your exercise form. Our goal is to help you work out safely and effectively, preventing injuries and maximizing your results.

🚀 Features
Live Form Correction: Get instant audio and visual feedback on your posture and technique.

Progress Tracking: Visualize your improvement over time with detailed analytics and charts.

Workout History: Review past sessions to identify patterns, track your progress, and stay motivated.

AI-Powered Analysis: Our application uses advanced computer vision to analyze your exercise form and accurately count your reps.

Secure Authentication: User data is kept safe and secure with our robust authentication system.

🛠️ Tech Stack
Frontend
React: A popular JavaScript library for building user interfaces.

Auth0 for React: For secure and easy-to-implement user authentication.

Chart.js & Recharts: To create beautiful and informative charts for progress tracking.

Tailwind CSS: A utility-first CSS framework for rapid UI development.

Backend
Flask: A lightweight and flexible Python web framework.

MongoDB: A NoSQL database for storing user and workout data.

OpenCV: An open-source computer vision library.

MediaPipe: A cross-platform, customizable ML solutions for live and streaming media.

Google Generative AI: For advanced AI-powered features.

📂 Project Structure
ReplicAi
├── Frontend
│   └── my-app
│       ├── public
│       └── src
│           ├── components
│           └── pages
└── Logic
    ├── __pycache__
    ├── app.py
    ├── auth.py
    └── ml.py
📦 Getting Started
Prerequisites
Make sure you have the following installed on your local machine:

Node.js and npm

Python and pip

MongoDB

Installation & Setup
Clone the repository:

Bash

git clone https://github.com/ankith-r-rai/replicai.git
cd replicai
Frontend Setup:

Bash

cd Frontend/my-app
npm install
Backend Setup:

Bash

cd ../../Logic
pip install -r requirements.txt
Environment Variables:

Create a .env file in the Logic directory and add your credentials:

MONGO_URI=<your_mongodb_uri>
AUTH0_DOMAIN=<your_auth0_domain>
AUTH0_API_AUDIENCE=<your_auth0_api_audience>
GEMINI_API_KEY=<your_gemini_api_key>
Create a .env.local file in the Frontend/my-app directory and add your credentials:

REACT_APP_AUTH0_DOMAIN=<your_auth0_domain>
REACT_APP_AUTH0_CLIENT_ID=<your_auth0_client_id>
REACT_APP_AUTH0_AUDIENCE=<your_auth0_api_audience>
🏃‍♂️ Usage
Start the backend server:

Bash

cd Logic
python app.py
Start the frontend development server:

Bash

cd Frontend/my-app
npm start
You can now view ReplicAI in your browser at http://localhost:3000.

🤝 Contributing
We welcome contributions from the community! If you'd like to contribute, please follow these steps:

Fork the repository.

Create a new branch (git checkout -b feature/your-feature-name).

Make your changes.

Commit your changes (git commit -m 'Add some feature').

Push to the branch (git push origin feature/your-feature-name).

Open a pull request.

Please make sure your code adheres to our coding standards and includes tests where applicable.

📞 Contact
If you have any questions, feedback, or suggestions, please feel free to reach out to us.