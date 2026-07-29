# Intervexa: AI-Powered Mock Interview System
**Complete Project Analysis & Presentation Guide**

This document provides a highly detailed breakdown of the Intervexa project. It is specifically structured to help you answer questions during your presentation: What is used, why it is used, where it is used, why alternatives were rejected, how it works, and how it is integrated.

---

## 1. FRONTEND ARCHITECTURE

### **What is used?**
- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Styling:** TailwindCSS 4, Radix UI (for accessible UI components)
- **Language:** TypeScript

### **Why is it used? (Q use hua hai?)**
- **Next.js:** It provides Server-Side Rendering (SSR) and Static Site Generation (SSG), making the application extremely fast and SEO-friendly. The new App Router allows for highly efficient routing and layouts.
- **TailwindCSS:** Allows rapid UI development without leaving the HTML/JSX. It creates a highly responsive and modern design seamlessly.
- **Radix UI:** Provides unstyled, accessible components (like Modals, Dropdowns) so we don't have to build complex UI logic from scratch, ensuring the app is accessible to all users.

### **Where is it used? (Kahan use hua hai?)**
- Used in the entire client-facing application (`/app`, `/components`, `/hooks`). 
- It handles the Dashboard, Interview Setup, actual Interview Interface, and Results pages.

### **Why were alternatives NOT used? (Alternatives q nai use kiye?)**
- **React (without Next.js) / Vite:** Pure React requires setting up manual routing (React Router) and lacks native SSR. Next.js handles routing out-of-the-box and provides better performance for a complex app like this.
- **Bootstrap / Custom CSS:** Bootstrap looks generic and outdated. Custom CSS is hard to maintain in large projects. Tailwind provides utility classes that keep styles tightly coupled with components, making maintenance easier.

### **How does it work & integrate? (Kese kaam ho rha hai?)**
- The frontend acts as the user interface. When a user clicks "Start Interview," the frontend (using `lib/api.ts`) sends an HTTP POST request to the Node.js backend to initialize a session.
- Authentication is managed via a React Context (`contexts/auth-context.tsx`). It stores the JWT token locally and injects it into every API request header for security.

---

## 2. BACKEND ARCHITECTURE

### **What is used?**
- **Runtime & Framework:** Node.js with Express 5
- **Database:** MongoDB with Mongoose 9 (ODM)
- **Authentication:** JWT (JSON Web Tokens) & Google OAuth 2.0

### **Why is it used? (Q use hua hai?)**
- **Node.js & Express:** JavaScript is used on the frontend, so using Node.js allows for full-stack JavaScript development (context switching is minimal). Express is lightweight and highly flexible for building REST APIs.
- **MongoDB:** It is a NoSQL database. Interview data (transcripts, AI analysis results, metrics) can vary in structure. A document-based database like MongoDB is perfect for storing JSON-like unstructured/semi-structured data.
- **JWT:** Allows stateless authentication. The server doesn't need to store session data; it just verifies the token, making the application highly scalable.

### **Where is it used? (Kahan use hua hai?)**
- Located in the `/backend` folder.
- It manages user profiles, interview session states, saving answers, calculating aggregate scores, and handling the core business logic.

### **Why were alternatives NOT used? (Alternatives q nai use kiye?)**
- **Django / Python (for the main backend):** While Python is great for AI, Django can be heavy and slower for simple I/O operations (like saving a user). Node.js is non-blocking and handles asynchronous API requests (like fetching data from the AI gateway) much better.
- **PostgreSQL / MySQL:** SQL requires rigid schemas. Since AI feedback (strengths, weaknesses, metrics) can change as models evolve, a rigid table structure would require constant database migrations. MongoDB provides the required flexibility.
- **Sessions/Cookies instead of JWT:** Server-side sessions require server memory. JWTs are stored on the client side, reducing server load.

### **How does it work & integrate? (Kese kaam ho rha hai?)**
- The backend exposes RESTful API endpoints (e.g., `POST /api/answers/submit`).
- When an answer is submitted, the Express controller saves the answer to MongoDB immediately to prevent blocking the UI.
- **Integration:** It then *asynchronously* triggers the AI evaluation by making a request to the Python AI Gateway. Once the AI returns the score, the backend updates the database document.

---

## 3. AI GATEWAY & MICROSERVICES

### **What is used?**
- **Framework:** Python with Flask 3.1.1 (and Gunicorn for production serving)
- **Speech-To-Text (STT):** OpenAI's Whisper
- **NLP Evaluation:** Sentence-BERT (`sentence-transformers`)
- **Voice Analysis:** Wav2Vec2 (`transformers`, `librosa`)
- **Facial Analysis:** DeepFace (with OpenCV and TensorFlow)
- **Answer Generation & LLM:** Groq API (using the OpenAI compatible SDK)
- **Fusion Model:** Scikit-learn, Numpy, PyTorch

### **Why is it used? (Q use hua hai?)**
- **Python/Flask:** Python is the undisputed king of Machine Learning. Flask provides a lightweight bridge to expose these Python models as HTTP APIs so the Node.js backend can communicate with them.
- **Whisper:** State-of-the-art accuracy for converting spoken audio to text.
- **Sentence-BERT:** Standard NLP models analyze exact words. Sentence-BERT analyzes *semantic meaning*, meaning if a user says "I solved the bug" vs "I fixed the error", it knows they mean the same thing.
- **Wav2Vec2:** Specifically designed for audio feature extraction. It can detect tone, pitch, and confidence in the user's voice.
- **DeepFace:** A lightweight but powerful framework for emotion and facial recognition, crucial for body language scoring.
- **Groq:** Lightning-fast inference for Large Language Models. It generates dynamic questions and realistic feedback much faster than standard OpenAI endpoints.

### **Where is it used? (Kahan use hua hai?)**
- Located in the `/ai_gateway` folder.
- It handles the heavy lifting of processing video/audio files uploaded by the user during the interview.

### **Why were alternatives NOT used? (Alternatives q nai use kiye?)**
- **Doing AI in Node.js (TensorFlow.js):** Python has a much richer ML ecosystem. Running heavy models like Whisper or DeepFace in Node.js would be incredibly slow and unstable.
- **Standard BERT vs Sentence-BERT:** Standard BERT is too slow for real-time sentence comparison because it requires feeding both sentences together. Sentence-BERT pre-computes embeddings, making it drastically faster for comparing answers to ideal answers.
- **OpenAI/ChatGPT for everything:** While we use Groq for generation, using a third-party API for *audio* and *video* analysis would be extremely expensive and slow (due to large file uploads). Using local models (Whisper, DeepFace) saves cost and keeps data processing fast and local.

### **How does it work & integrate? (Kese kaam ho rha hai?)**
1. **The Request:** Node.js sends a request to the Python Flask Gateway (`http://localhost:8000`) containing the user's audio/video or text answer.
2. **Parallel Processing:**
   - The STT model transcribes the audio.
   - The NLP model compares the transcribed text against the expected answer.
   - The Voice model analyzes the tone of the raw audio.
   - The Facial model analyzes frames from the video.
3. **The Fusion:** All these individual scores are passed into the "Fusion Model". The Fusion model calculates a weighted overall score (e.g., 50% Content, 25% Delivery, 25% Body Language).
4. **The Return:** Python sends this final structured JSON object back to Node.js.

---

## 4. SYSTEM WORKFLOW (Kese Sab Integate Hua Hai)

To answer *"Kese integrate hua hai or kya kaam ho rha hai?"*:

1. **User Action:** The user speaks an answer into their microphone/camera on the Next.js Frontend.
2. **Frontend -> Backend:** Next.js sends this media file to the Node.js Backend (`/api/answers/submit`).
3. **Backend -> Database:** Node.js immediately saves a "Pending" record in MongoDB so the user can proceed to the next question without waiting.
4. **Backend -> AI Gateway:** Node.js makes an internal API call to the Python Flask Server.
5. **AI Processing:** Python runs Whisper (Audio to Text) -> DeepFace (Emotions) -> Wav2Vec2 (Tone) -> Sentence-BERT (Meaning).
6. **Backend Update:** Python returns the final scores. Node.js updates the "Pending" record in MongoDB with the actual scores and feedback.
7. **Frontend Display:** When the interview ends, the Next.js frontend fetches the updated records from Node.js and displays beautiful charts (using Recharts) to the user.

## 5. SUMMARY FOR PRESENTATION (Key Takeaways)

- **Q Kiya hai? (Why did we build this?):** To solve the problem of interview anxiety and lack of real-time, comprehensive feedback. Traditional systems only check text. Intervexa checks *what* you say (NLP), *how* you say it (Voice), and *how you look* saying it (Facial).
- **Architecture Strategy:** We used a Microservices approach. Node.js handles the web server and database quickly, while Python is dedicated entirely to running heavy AI models. This prevents the web server from freezing while AI computes.
