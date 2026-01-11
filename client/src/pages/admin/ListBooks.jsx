import React, { useEffect, useState } from 'react'
import BookTableItem from '../../components/admin/BookTableItem';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

function ListBooks() {

  const [books,setBooks] = useState([]);
  const {axios} = useAppContext();

  const fetchBookss = async() => {
    try {
      const {data} = await axios.get('/api/admin/books');
      if(data.success){
        setBooks(data.books);
      } else {
        toast.error(data.message);
        console.log(error.message);
      }
    } catch (error) {
        toast.error(error.message);
        console.log(error.message);
    }
  }

  useEffect(()=>{
    fetchBookss();
  },[])

  return (
    <div className='flex-1 pt-5 pb-10 px-5 sm:pt-12 sm:pl-16 bg-blue-50/50 min-h-[calc(100vh-70px)]'>
      <h1>All Blogs</h1>
      <div className='relative h-4/5 max-w-4xl mt-4 overflow-x-auto shadow rounded-lg scrollbar-hide bg-white'>
            <table className='w-full text-sm text-gray-500'>
              <thead className='text-xs text-gray-600 text-left uppercase'>
                <tr>
                  <th scope='col' className='px-2 py-4 xl:px-6'>#</th>
                  <th scope='col' className='px-2 py-4'>Book Title</th>
                  <th scope='col' className='px-2 py-4 max-sm:hidden'>Status</th>
                  <th scope='col' className='px-2 py-4'>Actions</th>
                </tr>
              </thead>
              
              <tbody>
                {books.map((book,index)=>{
                    return <BookTableItem key={book._id} book={book} fetchBookss={fetchBookss} index={index + 1}/>
                })}
              </tbody>

            </table>
        </div>
    </div>
  )
}

export default ListBooks
