import './App.css'
import Footer from './components/Footer'
import PointTabs from './components/PointTabs'
import Header from './components/Header'
import Hero from './components/Hero'
import HeroStats from './components/HeroStats'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="app__body">
        <Hero />
        <HeroStats />
        <div className="app__inner">
          <div className="app__main">
            <PointTabs />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App
