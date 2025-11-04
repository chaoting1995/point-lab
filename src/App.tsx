import './App.css'
import Footer from './components/Footer'
import PointTabs from './components/PointTabs'
import Header from './components/Header'
import Hero from './components/Hero'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <div className="app__main">
          <Hero />
          <PointTabs />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App
