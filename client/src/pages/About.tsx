import Navbar from "../components/Navbar"

export default function About(){
    return(
        <>
        <Navbar />
        <div className="m-3 p-5 text-center">
            <h1 className="text-[3rem] font-bold text-brand">About Code Cafe</h1>
            <p className="text-xl text-foreground">An online judge to practice coding problems in C++ and Python.</p>
        </div>
        </>
    )
}
