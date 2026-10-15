## Problem  
Traditional learning methods are often **boring and passive**, leading to:  
- Lack of motivation  
- Reduced retention ability  
- No personalized or customizable study environment  

## Solution – Edventure  
**Edventure** is a **gamified learning platform** that makes study sessions engaging and adaptive using AI and personalized learning technology.  

## API Endpoints

### Authentication (`/auth`)
- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/logout` - Logout user (GET for browser redirects)
- `POST /auth/logout` - Logout user (POST for AJAX requests)
- `GET /auth/current_user` - Get current authenticated user
- `POST /auth/update_profile` - Update user profile
- `POST /auth/update_points` - Update user points and badges
- `GET /auth/leaderboard` - Get leaderboard data
- `POST /auth/login` - Login user
- `POST /auth/update-avatar` - Update user avatar

### Chatbot (`/chatbot`)
- `POST /chatbot/` - Send message to AI tutor chatbot

### Friends (`/friends`)
- `GET /friends/search` - Search users by username or name
- `GET /friends/` - Get user's friends list
- `POST /friends/add/:friendId` - Add friend
- `DELETE /friends/remove/:friendId` - Remove friend

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

ACCESS_TOKEN_SECRET=your_access_token_secret_key_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key_here
REFRESH_TOKEN_EXPIRY=10d

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_CHATBOT=your_gemini_chatbot_api_key
DEEPSEEK_API_KEY_CHATBOT=your_deepseek_api_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Frontend (`frontend/.env`)
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000
```

## How to Run Locally

1. **Clone and Setup:**
   ```bash
   git clone https://github.com/your-username/Edventure.git
   cd Edventure
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Copy .env and fill in your values
   npm start
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   # Copy .env and fill in your values
   npm run dev
   ```

4. **Access the Application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## Features

- **Gamified Learning:** Earn points, unlock badges, titles & avatars, and compete on multi-tier leaderboards
- **Battlegrounds:** Real-time 1v1 multiplayer quiz battles with instant AI Rival matchmaking
- **Practice Mode & Syllabus RAG:** Upload study PDFs for grounded AI quiz generation
- **AI Chatbot Tutor:** Personal AI copilot for academic problem-solving
- **Squad System:** Connect with peers and build study squads
- **Profile & Honors Shop:** Customize hero avatars, equip earned titles, track daily streaks

## Technologies Used

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js (ES Modules), Express.js (Modular Monolith / Clean MVC)
- **Database & Storage:** MongoDB (Mongoose), Cloudinary (Buffered Stream Storage)
- **Distributed Cache & State:** Redis (Sorted Sets, Hashes, Redis Pub/Sub Adapter)
- **Asynchronous Task Queue:** BullMQ (Concurrency: 5, Exponential Backoff)
- **AI & RAG Engine:** Google Gemini 2.0 Flash, text-embedding-004 (768-dim Vectors), Cosine Similarity
- **Authentication:** Stateless Dual-Token JWT (Access & Refresh in HttpOnly Cookies), Google OAuth 2.0
- **Real-time Networking:** Socket.io with Redis Cluster Adapter

