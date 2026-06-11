import useSmoothScroll from './hooks/useSmoothScroll'
import useReveal from './hooks/useReveal'
import Hero from './components/Hero'
import About from './components/About'
import Works from './components/Works'
import Skills from './components/Skills'
import Contact from './components/Contact'
import Footer from './components/Footer'
import './app.css'

export default function App() {
  useSmoothScroll()
  useReveal()

  return (
    <>
      <a className="skip-link" href="#works">
        本文へスキップ
      </a>
      <Hero />
      <main>
        <About />
        <Works />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
