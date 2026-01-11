import React, { useRef, useState, useMemo } from 'react';
import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

function Header() {
  const { setInput, input, books } = useAppContext();
  const inputRef = useRef();
  const navigate = useNavigate();

  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get all unique authors and genres
  const allAuthors = useMemo(
    () => [...new Set(books.map((b) => b.author?.toLowerCase()))],
    [books]
  );
  const allGenres = useMemo(
    () => [...new Set(books.map((b) => b.genre?.toLowerCase()))],
    [books]
  );

  const query = input.trim().toLowerCase();

  let inputType = 'title';
  if (allAuthors.some((author) => author?.includes(query))) inputType = 'author';
  else if (allGenres.some((genre) => genre?.includes(query))) inputType = 'genre';

  const filteredSuggestions = books
    .filter((book) => {
      if (inputType === 'author') return book.author?.toLowerCase().includes(query);
      if (inputType === 'genre') return book.genre?.toLowerCase().includes(query);
      return book.title?.toLowerCase().includes(query);
    })
    .slice(0, 5);

  const onSubmitHandler = (e) => {
    e.preventDefault();
    setInput(inputRef.current.value);
    setShowSuggestions(false);
  };

  const onClear = () => {
    setInput('');
    inputRef.current.value = '';
    setShowSuggestions(false);
  };

  const handleSelect = (text, id) => {
    setInput(text);
    inputRef.current.value = text;
    setShowSuggestions(false);
  };

  return (
    <div className='mx-8 sm:mx-16 xl:mx-24 relative'>
      <div className='text-center mt-10 max-sm:mt-9 mb-8 max-sm:mb-5'>
        <div className='inline-flex items-center justify-center gap-4 px-6 py-1.5 mb-4 max-sm:mb-2 border-primary/40 bg-primary/10 rounded-full text-sm text-primary'>
          <p>New : AI Feature Integrated</p>
          <img src={assets.star_icon1} className='-ml-3 w-5 max-sm:w-3' alt='' />
        </div>

        <h1 className='text-4xl sm:text-6xl max-sm:mt-1  font-semibold sm:leading-16 text-gray-700'>
          Your own <span className='text-primary text-6xl'>Bookstore</span> <br /> Read. Escape. Repeat..
        </h1>
        <p className='my-6 max-sm:my-4 max-sm:mb-10 sm:my-8 max-w-2xl m-auto max-sm:text-xs text-gray-500'>
          This is your place to explore new worlds, dive into gripping stories, and discover books that speak to you.
        </p>

        <form
          onSubmit={onSubmitHandler}
          className='relative max-w-lg mx-auto border border-gray-300 bg-white rounded overflow-hidden'
        >
          <input
            ref={inputRef}
            type='text'
            placeholder='Search by title or author...'
            className='w-full px-4 py-3 outline-none'
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => input && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            value={input}
          />
          <button
            className='absolute right-1.5 top-1.5 bg-primary text-white px-4 py-1.5 rounded hover:scale-105 transition-all cursor-pointer'
            type='submit'
          >
            Search
          </button>

          {showSuggestions && (
            <ul className='absolute z-[9999] top-full left-0 right-0 bg-white border border-t-0 border-gray-300 rounded-b shadow max-h-60 overflow-y-auto text-sm'>
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((book) => {
                  let label =
                    inputType === 'author'
                      ? book.author
                      : inputType === 'genre'
                      ? book.genre
                      : book.title;

                  return (
                    <li
                      key={book._id}
                      onMouseDown={() => handleSelect(label, book._id)}
                      className='px-4 py-2 cursor-pointer hover:bg-primary hover:text-white transition-all'
                    >
                      {label}
                    </li>
                  );
                })
              ) : (
                <li className='px-4 py-2 text-gray-500'>No items found</li>
              )}
            </ul>
          )}
        </form>

        <div className='text-center'>
          {input && (
            <button
              onClick={onClear}
              className='border font-light text-xs mt-10 py-1 px-3 rounded-sm shadow-custom-sm cursor-pointer'
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      <img src={assets.gradient} className='absolute max-sm:top-10  max-sm:w-[600px] -top-50 -z-1 opacity-60 max-sm:opacity-80' />
    </div>

    // <section className="bg-[url('https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/hero/gradient-bg-with-grid.png')] bg-cover bg-center bg-no-repeat text-slate-800 text-sm min-h-screen pt-25">
    //   <div className="flex flex-col-reverse gap-10 md:flex-row px-4 md:px-16 lg:px-24 xl:px-32">

    //     {/* LEFT CONTENT */}
    //     <div className="max-md:text-center">
    //       <h5 className="text-4xl md:text-6xl/[76px] font-semibold max-w-2xl text-slate-900">
    //         Grow your network fuel your journey
    //       </h5>

    //       <p className="text-sm md:text-base max-w-md mt-6 max-md:px-2 text-slate-600">
    //         Meet like-minded people, collaborate on ideas, and grow your personal
    //         and professional network.
    //       </p>

    //       {/* STORE BUTTONS */}
    //       <div className="flex items-center gap-4 mt-6 max-md:justify-center">
    //         <button
    //           aria-label="appleStoreBtn"
    //           className="active:scale-95 transition-all"
    //           type="button"
    //         >
    //           <img
    //             className="md:w-40"
    //             src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/appleStoreBtn.svg"
    //             alt="Apple Store"
    //           />
    //         </button>

    //         <button
    //           aria-label="googlePlayBtn"
    //           className="active:scale-95 transition-all"
    //           type="button"
    //         >
    //           <img
    //             className="md:w-40"
    //             src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/googlePlayBtn.svg"
    //             alt="Google Play"
    //           />
    //         </button>
    //       </div>

    //       {/* USERS + RATING */}
    //       <div className="flex items-center mt-9 max-md:justify-center">
    //         <div className="flex -space-x-3.5 pr-3">
    //           {[
    //             "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200",
    //             "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
    //             "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200",
    //             "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=60",
    //             "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&q=60",
    //           ].map((img, index) => (
    //             <img
    //               key={index}
    //               src={img}
    //               alt="user"
    //               className="size-10 border-2 border-white rounded-full hover:-translate-y-px transition"
    //             />
    //           ))}
    //         </div>

    //         <div>
    //           <div className="flex items-center gap-px">
    //             {Array.from({ length: 5 }).map((_, i) => (
    //               <svg
    //                 key={i}
    //                 width="13"
    //                 height="12"
    //                 viewBox="0 0 13 12"
    //                 fill="none"
    //                 xmlns="http://www.w3.org/2000/svg"
    //               >
    //                 <path
    //                   d="M5.85536 0.463527C6.00504 0.00287118 6.65674 0.00287028 6.80642 0.463526L7.82681 3.60397C7.89375 3.80998 8.08572 3.94946 8.30234 3.94946H11.6044C12.0888 3.94946 12.2901 4.56926 11.8983 4.85397L9.22687 6.79486C9.05162 6.92219 8.97829 7.14787 9.04523 7.35388L10.0656 10.4943C10.2153 10.955 9.68806 11.338 9.2962 11.0533L6.62478 9.11244C6.44954 8.98512 6.21224 8.98512 6.037 9.11244L3.36558 11.0533C2.97372 11.338 2.44648 10.955 2.59616 10.4943L3.61655 7.35388C3.68349 7.14787 3.61016 6.92219 3.43491 6.79486L0.763497 4.85397C0.37164 4.56927 0.573027 3.94946 1.05739 3.94946H4.35944C4.57606 3.94946 4.76803 3.80998 4.83497 3.60397L5.85536 0.463527Z"
    //                   fill="#FF8F20"
    //                 />
    //               </svg>
    //             ))}
    //           </div>
    //           <p className="text-sm text-slate-500">
    //             Used by 1,000+ people
    //           </p>
    //         </div>
    //       </div>
    //     </div>

    //     {/* RIGHT IMAGE */}
    //     <div className="w-full md:max-w-xs lg:max-w-lg">
    //       <img
    //         className="w-full h-auto"
    //         src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/hero/users-group.png"
    //         alt="Users group"
    //       />
    //     </div>
    //   </div>
    // </section>

  );
}

export default Header;
