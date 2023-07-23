import React from 'react';
import Navbar from "../components/Navbar"
import { useNavigate } from 'react-router-dom';


export default function Home(){
    const navigate = useNavigate();
    return(
        <>
        <Navbar />
        <div className="m-3 p-5 text-center">
            <h1 className="text-[4rem] font-bold text-[#E6B17E]">Freshly brewed questions</h1>
            <h1 className="text-[5rem] font-bold text-[#C56E33]">For you to solve!</h1>
        </div>
        <div className="m-3 p-5 text-center">
            <button className="text-[2rem] font-bold text-white p-3 hover:bg-[#ec8626] bg-[#C56E33]  rounded" onClick={() => navigate('/problems')}>Start Brewing</button>
        </div>

   
        </>
    )
}
