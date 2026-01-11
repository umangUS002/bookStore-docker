import React, { useEffect, useState } from 'react';
import { API } from '../api';

export default function Recommendations(){
  const [items, setItems] = useState([]);
  useEffect(()=>{ (async ()=>{
    const r = await API.get('/recommendations');
    setItems(r.data || []);
  })(); }, []);
  return (
    <div>
      <h3>Recommended for you</h3>
      <div style={{display:'flex', gap:12}}>
        {items.map(b => <div key={b._id} style={{width:180}}>
          <div>{b.title}</div><div>{b.authors?.join(', ')}</div>
        </div>)}
      </div>
    </div>
  );
}
