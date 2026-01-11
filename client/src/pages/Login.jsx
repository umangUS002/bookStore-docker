import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login(){
  const { login } = useContext(AuthContext);
  const [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const nav = useNavigate();
  async function onSubmit(e){
    e.preventDefault();
    await login(email,password);
    nav('/');
  }
  return (<form onSubmit={onSubmit}>
    <input value={email} onChange={e=>setEmail(e.target.value)} />
    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
    <button>Login</button>
  </form>);
}
