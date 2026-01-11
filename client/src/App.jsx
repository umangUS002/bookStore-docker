import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookDetails from './pages/BookDetails';
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/AppContext';
import Login from './components/admin/Login';
import Layout from './pages/admin/Layout';
import DashBoard from './pages/admin/Dashboard';
import AddBooks from './pages/admin/AddBooks';
import ListBooks from './pages/admin/ListBooks';
import Comments from './pages/admin/Comments';
import 'quill/dist/quill.snow.css'
import UserLayout from './pages/user/UserLayout';
import Recommend from './pages/user/Recommend';
import Wishlist from './pages/user/Wishlist';

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

import { Analytics } from "@vercel/analytics/react"

function App() {

  const { token } = useAppContext();

  return (
    <div className='app'>
      <Toaster />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/book/:id' element={<BookDetails />} />
        <Route path='/login' element={<Login />} />
        <Route path='/admin' element={token ? <Layout /> : <Login />}>
          <Route index element={<DashBoard />} />
          <Route path='addBlog' element={<AddBooks />} />
          <Route path='listBlog' element={<ListBooks />} />
          <Route path='comments' element={<Comments />} />
        </Route>

        <Route
          path="/user"
          element={
            <>
              <SignedIn>
                <UserLayout />
              </SignedIn>

              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        >
          <Route index element={<Wishlist />} />
          <Route path="recommended" element={<Recommend />} />
        </Route>

      </Routes>
      <Analytics/>
    </div>
  )
}

export default App
