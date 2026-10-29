import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import Navbar from "../components/Navbar";
import { register_user, login_user } from "../controllers/UserRoutes";
import "../styles/signup.css";
import coffeeCup from "../assets/coffee-cup.png";

const Signup = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    const [isSignUpMode, setIsSignUpMode] = useState(false);

    const handleSignUpClick = () => {
        setIsSignUpMode(true);
    };

    const handleSignInClick = () => {
        setIsSignUpMode(false);
    };
    const handleLogInSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        const obj = {
            username: name,
            password: password,
        };
        login_user(obj).then((data) => {
            if (data.tag) {
                localStorage.setItem("token", data.token);
                navigate("/");
                window.location.reload();
            } else {
                alert("Invalid Login");
            }
        });
    };
    const handleSignUpSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        const obj = {
            username: name,
            email: email,
            password: password,
        };
        // console.log(obj);
        register_user(obj).then((data) => {
            if (data.token) {
                alert(data.message);
            } else {
                alert(Object.values(data).flat().join("\n"));
            }
        });
        setName("");
        setEmail("");
        setPassword("");
    };

    return (
        <>
            <Navbar />
            <div className={`container ${isSignUpMode ? "sign-up-mode" : ""}`}>
                <div className="forms-container">
                    <div className="signin-signup">
                        <form method="POST" className="sign-in-form">
                            <h2 className="title">Sign in</h2>
                            <div className="input-field">
                                <i className="fas fa-user"></i>
                                <input
                                    type="text"
                                    name="txt"
                                    required
                                    value={name}
                                    placeholder="Username"
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <i className="fas fa-lock"></i>
                                <input
                                    type="password"
                                    name="pswd"
                                    required
                                    value={password}
                                    placeholder="Password"
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                            </div>
                            <motion.button
                                className="btn solid"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleLogInSubmit}
                            >
                                LOGIN
                            </motion.button>
                        </form>
                        <form action="#" className="sign-up-form">
                            <h2 className="title">Sign up</h2>
                            <div className="input-field">
                                <i className="fas fa-user"></i>
                                <input
                                    type="text"
                                    name="txt"
                                    required
                                    value={name}
                                    placeholder="Username"
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <i className="fas fa-envelope"></i>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={email}
                                    placeholder="Email"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <i className="fas fa-lock"></i>
                                <input
                                    type="password"
                                    name="pswd"
                                    required
                                    value={password}
                                    placeholder="Password"
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                            </div>
                            <motion.button
                                className="btn"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSignUpSubmit}
                            >
                                SIGN UP
                            </motion.button>
                        </form>
                    </div>
                </div>

                <div className="panels-container">
                    <div className="panel left-panel">
                        <div className="content">
                            <h3>New here ?</h3>
                            <p>
                                Make an account to submit solutions and keep track of what you have brewed.
                            </p>
                            <motion.button
                                className="btn transparent"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSignUpClick}
                            >
                                Sign up
                            </motion.button>
                            <img src={coffeeCup} className="image" alt="" />
                        </div>
                    </div>
                    <div className="panel right-panel">
                        <div className="content">
                            <h3>One of us ?</h3>
                            <p>
                                Welcome back. Sign in to pick up where you left off.
                            </p>
                            <motion.button
                                className="btn transparent"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSignInClick}
                            >
                                Sign in
                            </motion.button>
                        </div>
                        <img
                            src="https://i.ibb.co/nP8H853/Mobile-login-rafiki.png"
                            className="image"
                            alt=""
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Signup;
