import React from 'react'
import { useNavigate } from 'react-router-dom'
import StarRating from './StarRating'
import WishlistButton from './WishListButton'

function BookCard({ blog }) {
  if (!blog) return null

  // ✅ normalize ID (CRITICAL)
  const bookId = blog._id || blog.id

  if (!bookId) {
    console.error("Invalid book object:", blog)
    return null
  }

  const {
    title,
    description,
    genre,
    image,
    author,
    rating
  } = blog

  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/book/${bookId}`)}
      className='w-full max-sm:mb-12 rounded-lg overflow-hidden shadow hover:scale-102 hover:shadow-primary/25 duration-300 cursor-pointer'
    >
      <img src={image} alt={title} className='aspect-[2/3]' />

      <div className='flex justify-between'>
        <span className='ml-5 max-sm:ml-1 mt-4 px-3 py-2 inline-block bg-primary/20 rounded-full text-primary text-xs'>
          {genre}
        </span>
        <div className='flex mt-4 px-3'>
          <WishlistButton bookId={bookId} />
        </div>
      </div>

      <div className='p-5 max-sm:p-2'>
        <h5 className='mb-1 max-sm:text-xs font-medium text-gray-900'>
          {title}
        </h5>

        <p className='mb-4 text-sm max-sm:text-xs text-gray-900'>
          {author}
        </p>

        <p className="mb-3 text-xs text-gray-600">
          <p dangerouslySetInnerHTML={{ __html: description.slice(0, 80) }} />
        </p>

        <div className='flex items-center gap-2'>
          {rating == null ? (
            <span className='text-xs text-gray-400'>
              No ratings yet
            </span>
          ) : (
            <StarRating rating={rating} />
          )}
        </div>
      </div>
    </div>
  )
}

export default BookCard
