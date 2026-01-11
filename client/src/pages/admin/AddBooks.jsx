import React, { use, useEffect, useRef, useState } from 'react'
import { assets, bookGenre } from '../../assets/assets';
import Quill from 'quill';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import {parse} from "marked";

const AddBlog = () => {

  const {axios, fetchBooks} = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const editorRef = useRef(null);
  const quillRef = useRef(null);

  const [image, setImage] = useState(false);
  const [genre, setGenre] = useState("Romance");
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setISBN] = useState('');
  const [language, setLanguage] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [publisher, setPublisher] = useState('');
  const [pages, setPages] = useState('');
  const [rating, setRating] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);


  const generateContent = async() => {
    if(!title) return toast.error('Please enter a title');

    try {
      setLoading(true);
      const {data} = await axios.post('/api/book/generate', {prompt: title});
      if(data.success){
        quillRef.current.root.innerHTML = parse(data.content);
      }else{
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const onSubmitHandler = async (e) => {
  e.preventDefault();
  setIsAdding(true);

  if (!image) {
    toast.error("Please upload a cover image");
    setIsAdding(false);
    return;
  }
  // Immediately compute finalTags instead of waiting for React to update state
  const newTags = tagInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '');
  const finalTags = [...tags, ...newTags];

  try {
    const book = {
      title, author, 
      description: quillRef.current.root.innerHTML,
      genre, isbn, publisher, language, pages, rating, tags: finalTags, publishedDate, isPublished
    };

    const formData = new FormData();
    formData.append('book', JSON.stringify(book));
    formData.append('image', image);

    const { data } = await axios.post('/api/book/add', formData);

    if (data.success) {
      toast.success(data.message);
      setImage(false);
      setTitle("");
      setISBN('');
      setLanguage('');
      setPages('');
      setPublishedDate('');
      setPublisher('');
      setRating('');
      setAuthor("");
      quillRef.current.root.innerHTML = '';
      setGenre('Horror');
      setTags([]);
      setTagInput('');
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    setIsAdding(false);
    fetchBooks();
  }
};


  useEffect(()=>{
    // Initiate Quill only once
    if(!quillRef.current && editorRef.current){
      quillRef.current = new Quill(editorRef.current, {theme: 'snow'})
    }
  },[])

  return (
        <form onSubmit={onSubmitHandler} className='flex-1 bg-blue-50/50 text-gray-600 min-h-full overflow-scroll md:pb-20 md:pt-2 p-3'>
          <div className='bg-white w-full max-w-3xl p-4 md:p-10 sm:m-10 shadow rounded'>
            <p>Upload Cover Image</p>
            <label htmlFor='image'>
              <img src={!image ? assets.upload_area : URL.createObjectURL(image)} alt='' className='mt-2 h-16 rounded cursor-pointer'/>
              <input onChange={(e)=> setImage(e.target.files[0])} type='file' id='image' hidden required/>
            </label>

            <p className='mt-4'>Book Title</p>
            <input type='text' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setTitle(e.target.value)} value={title} />

            <p className='mt-4'>Author</p>
            <input type='text' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setAuthor(e.target.value)} value={author} />

            <p className='mt-4'>ISBN</p>
            <input type='number' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setISBN(e.target.value)} value={isbn} />
            
            <p className='mt-4'>Enter Tags</p>
            <input
                type="text"
                value={tagInput}
                placeholder="Enter tags separated by commas"
                onChange={(e) => setTagInput(e.target.value)}
                className='w-full max-w-lg m-2 mb-4 p-2 border border-gray-300 outline-none rounded'
            />

            <div className='flex'>
                <p className='mt-4'>Language</p>
                <input type='text' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setLanguage(e.target.value)} value={language} />
                <p className='mt-4'>Pages</p>
                <input type='number' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setPages(e.target.value)} value={pages} />
            </div>

            <div className='flex'>
                <p className='mt-4'>Publisher</p>
                <input type='text' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setPublisher(e.target.value)} value={publisher} />
                <p className='mt-4'>Rating</p>
                <input type='number' placeholder='Type Here' className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setRating(e.target.value)} value={rating} />
            </div>
            <p className='mt-4'>Published Date</p>  
            <input type='date' placeholder='Type Here' required className='w-full max-w-lg m-2 p-2 border border-gray-300 outline-none rounded' onChange={e => setPublishedDate(e.target.value)} value={publishedDate} />          
            
            
            <p className='mt-4'>Book Description</p>
            <div className='max-w-lg h-74 pb-16 sm:pb-10 pt-2 relative'>
                <div ref={editorRef}></div>
                {loading && (
                  <div className='absolute right-0 top-0 bottom-0 left-0 flex items-center justify-center bg-black/10 mt-2'>
                    <div className='w-8 h-8 rounded-full border-2 border-t-white animate-spin'></div>
                  </div>)
                }
                <button disabled={loading} className='absolute bottom-1 right-2 ml-2 text-xs text-white bg-black/70 px-4 py-1.5 rounded hover:underline cursor-pointer' type='button' onClick={generateContent}>Generate with AI</button>
            </div>

            <p className='mt-4'>Book Genre</p>
            <select onChange={e => setGenre(e.target.value)} name='genre' className='mt-2 px-3 py-2 border text-gray-500 border-gray-300 outline-none rounded'>
              <option value="genre">Select Genre</option>
              {bookGenre.map((item, index)=>{
                return <option key={index} value={item}>{item}</option>
              })}
            </select>
            <div className='flex gap-2 mt-4'>
              <p>Publish Now</p>
              <input type='checkbox' checked={isPublished} className='scale-125 cursor-pointer' onChange={e => setIsPublished(e.target.checked)}/>
            </div>

            <button disabled={isAdding} type='submit' className='mt-8 w-40 h-10 bg-primary text-white rounded cursor-pointer text-sm'>
              {isAdding ? 'Adding...' : 'Add Book'}
            </button>

          </div>
        </form>
    );
};

export default AddBlog
