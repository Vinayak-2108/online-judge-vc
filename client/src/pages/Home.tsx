import Navbar from "../components/Navbar"
import { useNavigate } from 'react-router';


export default function Home(){
    const navigate = useNavigate();
    return(
        <>
        <Navbar />
        <div className="m-3 p-5 text-center">
            <h1 className="text-[4rem] font-bold text-foreground">Freshly brewed questions</h1>
            <h1 className="text-[5rem] font-bold text-brand">For you to solve!</h1>
        </div>
        <div className="m-3 p-5 text-center">
            <button className="text-[2rem] font-bold text-primary-foreground p-3 hover:bg-brand-fill hover:text-brand-ink bg-primary  rounded-sm" onClick={() => navigate('/problems')}>Start Brewing</button>
        </div>

   
        </>
    )
}
