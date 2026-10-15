import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import BattlegroundsLobby from './components/BattlegroundsLobby';
import BattlegroundsGame from './components/BattlegroundsGame';
import Friends from './components/Friends';
import Chatbot from './components/Chatbot';

import Home from './components/Home';
import Features from './components/Features';
import Help from './components/Help';
import Details from './components/Details';
import Profile from './components/Profile';
import Rewards from './components/Rewards';
import Pdfquiz from './components/Pdfquiz';
import AdminAnalytics from './components/AdminAnalytics';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes (Accessible without login) */}
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/login" element={<Login />} />
          <Route path="/help" element={<Help />} />

          {/* Protected Routes (Authentication Required) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battlegrounds/lobby"
            element={
              <ProtectedRoute>
                <BattlegroundsLobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battlegrounds/game"
            element={
              <ProtectedRoute>
                <BattlegroundsGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pdf-quiz"
            element={
              <ProtectedRoute>
                <Pdfquiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/details"
            element={
              <ProtectedRoute>
                <Details />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Chatbot />
      </AuthProvider>
    </Router>
  );
}

export default App;
