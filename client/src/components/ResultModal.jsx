import { motion } from "framer-motion";
import Backdrop from "../Backdrop/Backdrop";

const dropIn = {
    hidden: {
        y: "-100vh",
        opacity: 0,
    },
    visible: {
        y: "0",
        opacity: 1,
        transition: {
            duration: 0.1,
            type: "spring",
            damping: 25,
            stiffness: 500,
        },
    },
    exit: {
        y: "100vh",
        opacity: 0,
    },
};

const ResultModal = ({ open, onClose, result }) => {
    if (!open) return null;
    console.log(result);
    return (
        <Backdrop onClick={onClose}>
            <motion.div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center"
                variants={dropIn}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <div className="flex flex-col items-center min-h-[50px]">
                    {result == "true" && (
                        <p className="text-2xl font-xl font-bold mt-2">
                            <span className="green_gradient">Correct answer ✔</span> 
                        </p>
                    )}
                    {result == "false" && (
                        <p className="text-2xl font-bold mt-2">
                            <span className="orange_gradient">Wrong answer</span> ❌
                        </p>
                    )}
                </div>
                <motion.button
                    className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                >
                    Reset
                </motion.button>
            </motion.div>
        </Backdrop>
    );
};

export default ResultModal;