import React from 'react'
import { useAppContext } from '../../context/AppContext'
import BookCard from '../../components/BookCard';

function Recommend() {
  const { recommendations } = useAppContext();

  return (
    <div>
      <div className='mt-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-14 max-sm:gap-3 mb-28 mx-3 sm:mx-16 xl:mx-40'>
        {recommendations.map((book) => book && <BookCard key={book._id} blog={book} /> )}
      </div>
    </div>
  )
}

export default Recommend
