import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { BoxPage } from '@/pages/BoxPage'
import { CancellationAndRefundsPage } from '@/pages/CancellationAndRefundsPage'
import { DeleteAccountPage } from '@/pages/DeleteAccountPage'
import { DemoPage } from '@/pages/DemoPage'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { JoinPage } from '@/pages/JoinPage'
import { LoginPage } from '@/pages/LoginPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupRequiredPage } from '@/pages/SetupRequiredPage'
import { WithdrawPage } from '@/pages/WithdrawPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/demo/:slug?" element={<DemoPage />} />
      <Route path="/login" element={<LoginPage key="login" />} />
      <Route path="/signup" element={<LoginPage key="signup" mode="signup" />} />
      <Route path="/account/delete" element={<DeleteAccountPage />} />
      <Route path="/account/withdraw" element={<WithdrawPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/cancellation-and-refunds" element={<CancellationAndRefundsPage />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
