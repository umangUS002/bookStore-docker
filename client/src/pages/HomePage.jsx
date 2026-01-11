import React from 'react'
import Navbar from '../components/Navbar'
import Header from '../components/Header'
import BookList from '../components/BookList'
import BookCard from '../components/BookCard'
import Footer from '../components/Footer'
import NewsLetter from '../components/NewsLetter'

function HomePage() {
  return (
    <div>
      <Navbar/>
      <Header/>
      <BookList/>
      <BookCard/>
      <NewsLetter/>
      <Footer/>
    </div>
  )
}

export default HomePage
