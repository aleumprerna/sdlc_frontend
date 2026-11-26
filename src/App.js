import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/login';
import Home from './components/Home';
import ProjectDetails from './components/ProjectDetails';
import { getAccessToken } from './api/utils';
import './App.css';

function RequireAuth({ children }) {
  return getAccessToken() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/projects/:projectId" element={<RequireAuth><ProjectDetails /></RequireAuth>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
