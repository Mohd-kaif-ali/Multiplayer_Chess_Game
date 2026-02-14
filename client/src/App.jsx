import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GameRoom from './pages/GameRoom';
import LoginPage from './pages/LoginPage';
import socket from './socket';

const SocketController = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const onMatchFound = (data) => {
      // data = { roomId, color, opponent }
      navigate(`/game/${data.roomId}`, { state: data });
    };

    socket.on('match_found', onMatchFound);

    return () => {
      socket.off('match_found', onMatchFound);
    };
  }, [navigate]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <SocketController />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/game/:roomId" element={<GameRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
