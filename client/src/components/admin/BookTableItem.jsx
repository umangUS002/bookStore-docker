import React from 'react'
import { assets } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

function BookTableItem({book, fetchBookss, index}) {

    const {title, createdAt} = book;

    const {axios, fetchBooks} = useAppContext();

    const deleteBook = async() => {
      const confirm = window.confirm('Sure you want to delete this Book?');
      if(!confirm) return;
      try {
        const {data} = await axios.post('/api/book/delete', {id: book._id});
        if(data.success){
          toast.success(data.message);
          await fetchBookss();
          await fetchBooks();
        }else{
          toast.error(data.message);
        } 
      } catch (error) {
          toast.error(error.message);
      }
    }

    const togglePublish = async() => {
        const {data} = await axios.post('/api/book/toggle-publish', {id: book._id});
        try {
          if(data.success){
            toast.success(data.message);
            await fetchBookss();
            await fetchBooks();
          }else{
            toast.error(data.message);
          } 
        } catch (error) {
            toast.error(error.message);
        }
        
    }


  return (
    <tr className='border-y border-gray-300'>
        <th className='px-2 py-4 text-left px-3 md:px-6'>{ index }</th>
        <td className='px-2 py-4'>{ title }</td>
        <td className='px-2 py-4 max-sm:hidden'>
            <p className={`${book.isPublished ? "text-green-600" : "text-orange-700"}`}>{book.isPublished ? 'Listed' : 'Not Listed'}</p>
        </td>
        <td className='px-2 py-4 flex text-xs gap-3'>
            <button onClick={togglePublish} className='border px-2 py-0.5 mt-1 rounded cursor-pointer'>
              {book.isPublished ? 'UnList' : 'List'}
            </button>
            <img src={assets.cross_icon} alt='' className='w-8 hover:scale-110 transition-all cursor-pointer' onClick={deleteBook} />
        </td>
    </tr>
  )
}

export default BookTableItem
