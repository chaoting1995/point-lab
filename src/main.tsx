import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageProvider'
import { AuthProvider } from './auth/AuthContext'
import './index.css'
import App from './App.tsx'
import TopicsPage from './pages/TopicsPage'
import TopicDetailPage from './pages/TopicDetailPage'
import TopicAddPage from './pages/TopicAddPage'
import PointAddPage from './pages/PointAddPage'
import GuidePage from './pages/GuidePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/topics/:id" element={<TopicDetailPage />} />
          <Route path="/topics/add" element={<TopicAddPage />} />
          <Route path="/points/add" element={<PointAddPage />} />
          <Route path="/guide" element={<GuidePage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
