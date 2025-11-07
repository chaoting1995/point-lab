import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageProvider'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './auth/AuthContext'
import './index.css'
import App from './App.tsx'
import TopicsPage from './pages/TopicsPage'
import TopicDetailPage from './pages/TopicDetailPage'
import TopicAddPage from './pages/TopicAddPage'
import PointAddPage from './pages/PointAddPage'
import TopicEditPage from './pages/TopicEditPage'
import PointEditPage from './pages/PointEditPage'
import GuidePage from './pages/GuidePage'
import AuthCallback from './pages/AuthCallback'
import UserProfilePage from './pages/UserProfilePage'
import AdminPage from './pages/AdminPage'

const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5',
      dark: '#4338ca',
    },
  },
})

// 已不需要舊資料遷移（正式站無舊使用者資料）

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/topics/:id" element={<TopicDetailPage />} />
            <Route path="/topics/add" element={<TopicAddPage />} />
            <Route path="/topics/edit/:id" element={<TopicEditPage />} />
            <Route path="/points/add" element={<PointAddPage />} />
            <Route path="/points/edit/:id" element={<PointEditPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/users/:id" element={<UserProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/users" element={<AdminPage />} />
            <Route path="/admin/reports" element={<AdminPage />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
