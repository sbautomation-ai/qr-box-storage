import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { BoxPage } from '@/pages/BoxPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { JoinPage } from '@/pages/JoinPage'
import { LoginPage } from '@/pages/LoginPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupRequiredPage } from '@/pages/SetupRequiredPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="/setup-required" element={<SetupRequiredPage />} />
        <Route element={<AppShell />}>
          <Route path="/boxes" element={<DashboardPage />} />
          <Route path="/boxes/:boxId" element={<BoxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/boxes" replace />} />
    </Routes>
  )
}
