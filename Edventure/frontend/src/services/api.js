import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor: automatically refresh access token on 401 Unauthorized
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh-token')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// ==============================================================================
// AUTHENTICATION & PROFILE API
// ==============================================================================
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/current-user'),
  updateProfile: (profileData) => api.put('/auth/update-profile', profileData),
  updatePoints: (points, badge) => api.post('/auth/update-points', { points, badge }),
  getLeaderboard: (type = 'global', classLevel = 10) =>
    api.get(`/auth/leaderboard?type=${type}&classLevel=${classLevel}`)
};

// ==============================================================================
// PRACTICE QUESTIONS & MISTAKE NOTEBOOK API
// ==============================================================================
export const practiceAPI = {
  getQuestions: (params) => api.get('/api/practice-questions', { params }),
  getRandomQuiz: (subject, difficulty, classLevel, count = 5) =>
    api.get('/api/practice-questions/random', {
      params: { subject, difficulty, classLevel, count }
    }),
  getQuestionById: (id) => api.get(`/api/practice-questions/${id}`),
  createQuestion: (data) => api.post('/api/practice-questions', data),
  recordMistake: (mistakeData) => api.post('/api/practice-questions/mistakes/record', mistakeData),
  getMistakesList: () => api.get('/api/practice-questions/mistakes/list'),
  getMistakesQuiz: () => api.get('/api/practice-questions/mistakes/quiz'),
  explainMistake: (data) => api.post('/api/practice-questions/mistakes/explain', data)
};

// ==============================================================================
// RAG SYLLABUS COPILOT & DOCUMENT QUIZ API
// ==============================================================================
export const ragAPI = {
  uploadDocument: (formData) =>
    api.post('/api/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  askCopilot: (question, subject, classLevel, documentId) =>
    api.post('/api/rag/ask', { question, subject, classLevel, documentId }),
  getDocuments: (subject, classLevel) =>
    api.get('/api/rag/documents', { params: { subject, classLevel } }),
  getDocumentById: (id) => api.get(`/api/rag/documents/${id}`),
  generateDocumentQuiz: (documentId) => api.post(`/api/rag/documents/${documentId}/quiz`)
};

// ==============================================================================
// REWARDS SHOP API
// ==============================================================================
export const shopAPI = {
  getCatalog: () => api.get('/api/shop'),
  purchaseItem: (type, itemId) => api.post('/api/shop/purchase', { type, itemId }),
  equipItem: (type, itemId) => api.post('/api/shop/equip', { type, itemId })
};

// ==============================================================================
// FRIENDS API
// ==============================================================================
export const friendsAPI = {
  getFriends: () => api.get('/api/friends'),
  searchFriends: (q) => api.get('/api/friends/search', { params: { q } }),
  addFriend: (friendId) => api.post(`/api/friends/add/${friendId}`),
  removeFriend: (friendId) => api.delete(`/api/friends/remove/${friendId}`)
};

// ==============================================================================
// ADMIN & OBSERVABILITY API
// ==============================================================================
export const adminAPI = {
  getMetrics: () => api.get('/api/admin/metrics')
};

export default api;
