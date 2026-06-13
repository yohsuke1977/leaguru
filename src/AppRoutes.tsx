import { Routes, Route } from 'react-router-dom'
import App from './App'
import ContactPage from './pages/ContactPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import TokushoPage from './pages/TokushoPage'
import OperatorPage from './pages/OperatorPage'
import SuccessPage from './pages/SuccessPage'

// クライアント（main.tsx）とプリレンダリング（entry-server.tsx）で共有するルート定義
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/"         element={<App />} />
      <Route path="/success"  element={<SuccessPage />} />
      <Route path="/contact"  element={<ContactPage />} />
      <Route path="/terms"    element={<TermsPage />} />
      <Route path="/privacy"  element={<PrivacyPage />} />
      <Route path="/tokusho"  element={<TokushoPage />} />
      <Route path="/operator" element={<OperatorPage />} />
    </Routes>
  )
}
