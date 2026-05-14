import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import ContactPage from './pages/ContactPage.tsx'
import TermsPage from './pages/TermsPage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import TokushoPage from './pages/TokushoPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<App />} />
        <Route path="/contact"  element={<ContactPage />} />
        <Route path="/terms"    element={<TermsPage />} />
        <Route path="/privacy"  element={<PrivacyPage />} />
        <Route path="/tokusho"  element={<TokushoPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
