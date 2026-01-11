import React from 'react'
import { assets } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

function CommentTableItem({comment, fetchComments}) {

    const {book, createdAt, _id} = comment;
    const BlogDate = new Date(createdAt);

    const {axios} = useAppContext();

    const approveComment = async() => {
        try {
            const {data} = await axios.post('/api/admin/approve-comment', {id: _id});
            if(data.success){
                toast.success(data.message);
                fetchComments();
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const deleteComment = async() => {
        try {
            const confirm = window.confirm("Sure to delete this comment");
            if(!confirm) return;

            const {data} = await axios.post('/api/admin/delete-comment', {id: _id});
            if(data.success){
                toast.success(data.message);
                fetchComments();
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

  return (
    <tr className='order-y border-gray-300'>
        <td className='px-6 py-4'>
            <b className='font-medium text-gray-600'>Book</b> : {book.title}
            <br/>
            <br/>
            <b className='font-medium text-gray-600'>Name</b> : {comment.name}
            <br/>
            <b className='font-medium text-gray-600'>Comment</b> : {comment.content}
        </td>
        <td className='px-6 py-4 max-sm:hidden'>
            {BlogDate.toLocaleDateString()}
        </td>
        <td>
            <div className='inline-flex items-center gap-2'>
                {
                !comment.isApproved ? 
                <img onClick={approveComment} src={assets.tick_icon} className='w-5 hover:scale-110 transition-all cursor-pointer ml-5'/> : 
                <p className='text-xs border border-green-600 bg-green-100 text-green-600 rounded-full px-1 py-1'>
                    Arroved
                </p>}
                <img onClick={deleteComment} src={assets.bin_icon} alt='' className='w-5 hover:scale-110 transition-all cursor-pointer'/>
            </div>
        </td>
    </tr>
  )
}

export default CommentTableItem
