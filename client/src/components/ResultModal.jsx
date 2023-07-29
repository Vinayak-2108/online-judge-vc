import { motion } from "framer-motion";
import Backdrop from "./Backdrop";

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
                    <div
                        className={`px-6 py-4 whitespace-nowrap ${
                            result === "Accepted"
                                ? "text-green-500"
                                : "text-red-500"
                        }`}
                    >
                        Verdict: {result}
                    </div>
                </div>
                <motion.button
                    className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                >
                    Close
                </motion.button>
            </motion.div>
        </Backdrop>
    );
};

export default ResultModal;
