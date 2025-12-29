
  # PM Mock Studio Design

  This is a code bundle for PM Mock Studio Design

  ## Architecture

  The application uses **Firebase Cloud Functions** to handle AI interviewer responses. The backend no longer requires a local server to be running.

  ## Setup

  ### 1. Install Dependencies

  ```bash
  npm i
  ```

  ### 2. Deploy Cloud Functions

  The AI interviewer functionality is handled by Firebase Cloud Functions. You need to deploy them once:

  ```bash
  # Install Firebase CLI (if not already installed)
  npm install -g firebase-tools

  # Login to Firebase
  firebase login

  # Install function dependencies
  cd functions
  npm install
  cd ..

  # Deploy functions
  firebase deploy --only functions
  ```

  After deployment, the functions will automatically:
  - Generate the first interview question when an interview starts
  - Process user messages and generate AI responses
  - Generate insights when an interview is completed

  ### 3. Run the Development Server

  ```bash
  npm run dev
  ```

  ## Migration from Local Worker

  If you were previously using the local worker (`server/worker.js`), you can now stop it. The Cloud Functions handle all backend processing automatically.

  **Note:** The local worker (`server/worker.js`) is kept for reference but is no longer needed once Cloud Functions are deployed.
  
