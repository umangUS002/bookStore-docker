import React from 'react'
import { bookGenre } from '../assets/assets'
import { useState } from 'react';
import BookCard from './BookCard';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useEffect } from 'react';

function BookList() {

    const [menu, setMenu] = useState("All");
    const {books, input} = useAppContext();
    
    const filteredBooks = () => {
      if(input === ''){
        return books;
      }
      return books.filter((book) => book.title.toLowerCase().includes(input.toLowerCase()) || book.author.toLowerCase().includes(input.toLowerCase()))
    }

    useEffect(()=>{
      filteredBooks();
    },[])

  return (
    <div>
      <div className='flex flex-wrap justify-center gap-4 max-sm:gap-3 sm:gap-8 my-10 max-sm:my-7 max-sm:p-3 relative'>
        {bookGenre.map((item)=>(
            <div key={item} className='relative'>
                <button onClick={()=>setMenu(item)} className={`cursor-pointer text-gray-500 ${menu === item && 'text-white px-4 pt-0.5'}`}>
                    {item}
                    {menu === item && (
                        <motion.div layoutId='underline' transition={{type:'spring',stiffness: 500,damping:30}}
                            className='absolute left-0 right-0 top-0 h-7 -z-1 bg-primary rounded-full'>
                        </motion.div>
                    )}
                </button>
            </div>
        ))}
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-14 max-sm:gap-5 mb-28 mx-8 sm:mx-16 xl:mx-40'>
        {filteredBooks().filter((book) => menu === "All" ? true : book.genre === menu).
        map((book) => book && <BookCard key={book._id} blog={book} /> )}
      </div>
    </div>
  )
}

export default BookList
