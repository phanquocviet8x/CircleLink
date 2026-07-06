import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './views/Home';
import LiveBoard from './views/LiveBoard';
import HostAdmin from './views/HostAdmin';
import GuestCheckin from './views/GuestCheckin';
import EventDirectory from './views/EventDirectory';
import TermsOfService from './views/TermsOfService';
import PrivacyPolicy from './views/PrivacyPolicy';
import UserProfileSettings from './views/UserProfileSettings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event/:slug" element={<LiveBoard />} />
        <Route path="/event/:slug/admin" element={<HostAdmin />} />
        <Route path="/checkin/:slug" element={<GuestCheckin />} />
        <Route path="/directory/:slug" element={<EventDirectory />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/profile/:slug" element={<UserProfileSettings />} />
      </Routes>
    </Router>
  );
}

export default App;
