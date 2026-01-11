import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assets } from '../assets/assets';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import Moment from 'moment';
import Loader from '../components/Loader';
import StarRating from '../components/StarRating';
import BookCard from '../components/BookCard';

function BlogDetails() {

  const { id } = useParams();

  const { axios, similarBooks, fetchSimilarBooks } = useAppContext();

  const [data, setData] = useState(null);
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const fetchBlogData = async () => {
    try {
      const { data } = await axios.get(`/api/book/${id}`);
      data.success ? setData(data.book) : toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  };

  const fetchComments = async () => {
    try {
      const { data } = await axios.post('/api/book/comments', { bookId: id })
      if (data.success) {
        setComments(data.comments);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  const addComment = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/book/add-comment', { book: id, name, content })
      if (data.success) {
        toast.success(data.message);
        setName('');
        setContent('');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchBlogData();
    fetchComments();
    if (id) fetchSimilarBooks(id);
  }, [id]);

  return data ? (
    <div className="min-h-screen flex flex-col relative">
      <img src={assets.gradient} className='absolute -top-50 -z-1 opacity-100' />

      <Navbar />

      <div className='flex-1'>
        <div className='text-center mt-6 md:mt-10 text-gray-600'>
        <h1 className='text-2xl sm:text-5xl font-semibold max-w-2xl mx-auto text-gray-800'>{data.title}</h1>
        <p className='inline-block py-1 px-4 rounded-full mb-6 border text-sm border-primary/35 bg-primary/5 font-medium text-primary mt-3'>{data.author}</p>
      </div>

      <div className='mx-5 max-w-5xl md:mx-auto my-10 mt-6 md:flex md:gap-20 mb-2 md:mb-25'>
        <div className='md:w-1/2 w-full flex justify-center items-start mb-8 md:mb-0'>
          <img
            src={data.image}
            alt=''
            className='rounded-2xl w-full max-w-[300px] md:min-w-[400px] object-contain shadow-md'
          />
        </div>
        <div>
          <div className="flex flex-col gap-3 text-gray-700 text-sm md:text-base">
            <span className="font-semibold text-gray-900">Description:</span>
            <div className="prose max-w-none mb-4 text-gray-600" dangerouslySetInnerHTML={{ __html: data.description }}></div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div>
                <span className="font-semibold text-gray-900">Genre:</span>
                <p>{data.genre}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-900">ISBN:</span>
                <p>{data.isbn}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-900">Publisher:</span>
                <p>{data.publisher}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-900">Published:</span>
                <p>{data.publishedDate}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-900">Language:</span>
                <p>{data.language}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-900">Pages:</span>
                <p>{data.pages}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {data.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 inline-block bg-green-100 rounded-full text-green-700 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className='flex items-center gap-2'>
          {data.rating == null ? (
            <span className='text-xs text-gray-400'>
              No ratings yet
            </span>
          ) : (
            <StarRating rating={data.rating} />
          )}
        </div>

          </div>


        </div>
      </div>

      {/* Comments + Add Comment Section */}
      <div className='md:flex md:items-start md:justify-between gap-12 px-5 md:px-40 my-14'>

        {/* Left: Comments Section */}
        <div className='w-full md:w-2/3'>
          <p className='font-semibold mb-4 sm:text-xl'>Comments ({comments.length})</p>
          <div className='comments-scroll flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/30'>
            {comments.map((item, index) => (
              <div key={index} className='relative bg-primary/5 border border-primary/10 p-4 rounded-md text-gray-700'>
                <div className='flex items-center gap-2 mb-1'>
                  <img src={assets.user_icon} alt='' className='w-6 h-6' />
                  <p className='font-medium'>{item.name}</p>
                </div>
                <p className='text-sm ml-8'>{item.content}</p>
                <div className='absolute right-4 bottom-3 text-xs text-gray-500'>{Moment(item.createdAt).fromNow()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Add Comment Form */}
        <div className='w-full md:w-1/3 mt-20 md:mt-0 '>
          <p className='font-semibold sm:text-xl mb-0'>Add your comment</p>
          <p className='mb-4 text-sm'> (Rating is automatically updated based on comment sentiment.)</p>
          <form onSubmit={addComment} className='flex flex-col gap-4'>
            <input
              onChange={(e) => setName(e.target.value)}
              value={name}
              type='text'
              placeholder='Name'
              required
              className='w-full p-2 border border-gray-300 rounded-md outline-none'
            />
            <textarea
              onChange={(e) => setContent(e.target.value)}
              placeholder='Comment'
              value={content}
              className='w-full p-2 border border-gray-300 rounded-md outline-none h-40'
            />
            <button
              type='submit'
              className='bg-primary cursor-pointer text-white rounded-md px-6 py-2 hover:scale-105 transition-transform'
            >
              Submit
            </button>
          </form>
        </div>
      </div>

      {/*...Similar Books...*/}
      <div className="mt-24 mb-32 px-6 sm:px-16 xl:px-40">
        <h2 className="text-2xl font-semibold text-center mb-12">
          More Like This
        </h2>

        {/* Empty State */}
        {(!similarBooks || similarBooks.length === 0) && (
          <p className="text-center text-gray-500">
            No similar books found
          </p>
        )}

        {/* Similar Books Grid */}
        {similarBooks?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
            {similarBooks.map((book, index) => (
              <BookCard
                key={book._id || book.id || index}
                blog={{
                  ...book,
                  _id: book._id || book.id, // normalize id
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/*...Share Buttons...*/}
      <div className='my-24 mx-auto px-40 max-sm:px-5'>
        <p className='font-semibold my-4'>Share this article on Social Media</p>
        <div className='flex'>
          <img src={assets.facebook_icon} alt='' width={50} />
          <img src={assets.twitter_icon} alt='' width={50} />
          <img src={assets.googleplus_icon} alt='' width={50} />
        </div>
      </div>
      </div>

      

      <Footer />
    </div>
  ) : <Loader />
}

export default BlogDetails
