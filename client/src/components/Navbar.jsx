import React, { useState, useEffect } from "react";
import Logo from "../assets/logo-white.png";
import { Link } from "react-router-dom";
import { auth_user } from "../controllers/UserRoutes";

const Navbar = ({name}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [logout, setLogout] = useState(false);
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        if(localStorage.getItem("token")){
            let obj = {
                token: localStorage.getItem("token"),
            };
            auth_user(obj).then((data) => {
                if(data.tag){
                    let user_obj = {
                        username: data.username
                    }
                    setUserName(user_obj.username);
                }
            });
        }
    }, [logout]);
    return (
        <nav className="flex w-full items-center justify-between bg-[#fa840c] py-4 px-4">
            <div className="flex items-center">
                <Link to="/">
                    <img src={Logo} alt="" className="w-32 h-8" />
                </Link>
            </div>

            <ul className="hidden md:flex md:items-center">
                {localStorage.getItem("token") ? (
                    <>
                        <li className="ml-4 text-white">
                            {userName}
                        </li>
                        <li className="ml-4">
                            <Link
                                to="/signup"
                                className="text-white hover:text-[#ffd6af]"
                                onClick={() => {
                                    setLogout(true);
                                    localStorage.removeItem("token");
                                    window.location.reload();
                                }}
                            >
                                Logout
                            </Link>
                        </li>
                    </>
                ) : (
                    <>
                        <li className="ml-4">
                            <Link
                                to="/signup"
                                className="text-white hover:text-[#ffd6af]"
                            >
                                Login/Register
                            </Link>
                        </li>
                    </>
                )}
            </ul>
            <div className="md:hidden flex flex-col p-2">
                <div className="">
                    <button
                        className="text-gray-800 focus:outline-none"
                        onClick={toggleMenu}
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </div>

                {isMenuOpen && (
                    <ul className="md:hidden">
                        <li className="my-2">
                            <a
                                href="#"
                                className="text-gray-800 hover:text-gray-600"
                            >
                                Register
                            </a>
                        </li>
                        <li className="my-2">
                            <a
                                href="#"
                                className="text-gray-800 hover:text-gray-600"
                            >
                                Login
                            </a>
                        </li>
                    </ul>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
