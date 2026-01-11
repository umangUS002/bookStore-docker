import React from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../../assets/assets'

function UserSidebar() {
    return (
        <div className='flex flex-col border-r border-gray-200 min-h-full pt-6'>

            <NavLink end={true} to='/user' className={({ isActive }) => `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-64 cursor-pointer ${isActive && "bg-primary/10 border-r-4 border-primary"}`}>
                <img src={assets.add_icon} alt='' className='min-w-4 w-5' />
                <p className='hidden md:inline-block'>WishList</p>
            </NavLink>

            <NavLink end={true} to='/user/recommended' className={({ isActive }) => `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-64 cursor-pointer ${isActive && "bg-primary/10 border-r-4 border-primary"}`}>
                <img src={assets.home_icon} alt='' className='min-w-4 w-5' />
                <p className='hidden md:inline-block'>Recommended</p>
            </NavLink>

        </div>
    )
}

export default UserSidebar
