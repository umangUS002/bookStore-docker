import React from 'react'
import { assets } from '../../assets/assets'
import { Outlet, useNavigate } from 'react-router-dom';
import SideBar from '../../components/admin/SideBar';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

function Layout() {

  const {axios, setToken, navigate} = useAppContext();

  const logout = async() => {
        localStorage.removeItem('token');
        axios.defaults.headers.common['Authorization'] = null;
        setToken(null);
        navigate('/');
  }

  return (
    <>
      <div className='flex items-center justify-between py-2 h-[70px] px-4 sm:px-12 border-b border-gray-200'>
        <div className='flex -ml-4'>
            <img onClick={()=> navigate('/')} src={assets.logo} className='h-16 w-18 cursor-pointer mt-3 mr-2' />
            <h1 onClick={()=> navigate('/')} className='mt-6 -ml-3 font-bold text-3xl text-primary cursor-pointer'>Book Cart</h1>
        </div>
        <button onClick={logout}  className='text-sm px-4 md:px-8  py-2 bg-primary text-white rounded-full cursor-pointer'>Logout</button>
      </div>
      <div className='flex h-[calc(100vh-70px)]'>
          <SideBar/>
          <div className='flex-1 overflow-auto min-h-full'>
            <Outlet/>
          </div>
      </div>
    </>
  )
}

export default Layout
