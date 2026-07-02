import { Route, Routes } from 'react-router-dom'
import EditPage from './pages/EditPage'
import Home from './pages/Home'
import WidgetPage from './pages/WidgetPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/edit/:id" element={<EditPage />} />
      <Route path="/w/:widget" element={<WidgetPage layout="embed" />} />
      <Route path="/f/:widget" element={<WidgetPage layout="fullscreen" />} />
    </Routes>
  )
}
