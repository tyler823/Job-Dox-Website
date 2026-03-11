import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import JobDoxPortal from './JobDoxPortal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <JobDoxPortal />
  </StrictMode>
)
