import React from 'react'
import { assets } from '../assets/assets'
import { footer_data } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

function Footer() {
  const { token } = useAppContext();
  
  const navigate = useNavigate();
  return (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 bg-primary/3'>
      <div className='flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-gray-500/30 text-gray-500'>
        <div>
          <div className='flex -ml-4 -mt-6 -mb-6'>
            <img src={assets.logo} className='h-16 w-18 cursor-pointer mt-3 mr-2' />
            <h1 className='mt-6 -ml-3 font-bold text-3xl text-primary'>Book Cart</h1>
          </div>
          <p className='max-w-[410px] mt-6'>Discover your next great read with Book Cart — your go-to destination for bestselling novels, timeless classics, and hidden literary gems. From thrilling mysteries to heartwarming tales, we bring the world of books to your fingertips.
            Explore detailed descriptions, read authentic reviews, and check ratings to confidently select your next read.
          </p>
        </div>
        <div className='flex flex-wrap justify-between w-full md:w-[45%] gap-5'>
          {footer_data.map((section, index) => (
            <div key={index}>
              <h3 className='font-semibold text-base text-gray-900 md:mb-5 mb-2'>{section.title}</h3>
              <ul className='text-sm space-y-1'>
                {section.links.map((link, i) => (
                  <li key={i}>
                    <a href='#' className='hover:underline transition'>{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/admin')} className='flex items-center gap-2 max-sm:gap-1 rounded-full text-sm max-sm:text-xs cursor-pointer bg-primary text-white px-3 max-sm:px-3 max-sm:mt-1 sm:px-5 py-2.5'>
          {token ? 'Admin' : 'Dashboard'}
          <img src={assets.arrow} alt='arrow' />
        </button>
      </div>
      <p className='py-4 text-center'>Copyright 2025 @ UmangSrivastava - All Rights Reserved</p>
    </div>
  )
}

export default Footer
