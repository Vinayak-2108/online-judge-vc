"use client";

import { type FC } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

/*  TYPES  */

interface SwapFormTexts {
    signInTitle: string;
    signUpTitle: string;
    signInSubtitle: string;
    signUpSubtitle: string;
    signInButton: string;
    signUpButton: string;
    footerSignIn: string;
    footerSignUp: string;
    footerSignInCta: string;
    footerSignUpCta: string;
}

interface SwapFormProps {
    isSignIn: boolean;
    onModeChange: (isSignIn: boolean) => void;
    texts?: Partial<SwapFormTexts>;
}

/*  DEFAULT TEXTS  */

const DEFAULT_TEXTS: SwapFormTexts = {
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    signInSubtitle: "Hey friend, welcome back!",
    signUpSubtitle: "Just one more step to get started!",
    signInButton: "Get Sign In Code",
    signUpButton: "Create Account",
    footerSignIn: "Don't have account?",
    footerSignUp: "Already have account?",
    footerSignInCta: "Create Account",
    footerSignUpCta: "Sign In",
};

/*  COMPONENT  */

export const SwapForm: FC<SwapFormProps> = ({
    isSignIn,
    onModeChange,
    texts = {},
}) => {
    const mergedTexts = { ...DEFAULT_TEXTS, ...texts };

    /* Animations */
    const variants: Variants = {
        initial: {
            opacity: 0,
            y: -30,
            scale: 0.97,
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
        },
        exit: {
            opacity: 0,
            y: -30,
            scale: 0.97,
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={isSignIn ? "signin" : "signup"}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    ease: "easeIn",
                    duration: 0.3,
                }}
                className="w-xs sm:w-sm bg-[#F6F5FA] dark:bg-zinc-900  rounded-[32px] overflow-hidden border-[1.5px] border-[#E6E6EF] dark:border-zinc-800 transition-colors"
            >
                <div className="p-6 sm:p-8 pb-8 sm:pb-10 border-b-[1.2px] bg-[#FEFEFE] dark:bg-zinc-950 rounded-[28px] border-[#E6E6EF] dark:border-zinc-800 transition-colors">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#191919] dark:text-zinc-100 mb-1.5 sm:mb-2 text-center sm:text-left">
                        {isSignIn
                            ? mergedTexts.signInTitle
                            : mergedTexts.signUpTitle}
                    </h2>

                    <p className="text-[#ADADB0] dark:text-zinc-500 text-[15px] sm:text-[17px] mb-4 sm:mb-6 text-center sm:text-left">
                        {isSignIn
                            ? mergedTexts.signInSubtitle
                            : mergedTexts.signUpSubtitle}
                    </p>

                    {/* Email */}
                    <div className="space-y-6 sm:space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-[#0B0B0B] dark:text-zinc-300 mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="you@school.edu"
                                className="w-full px-4 py-2.5 rounded-xl border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-black dark:focus:ring-zinc-400 outline-none  text-[15px] sm:text-base"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="w-full py-3 sm:py-3.5 bg-[#030303] dark:bg-zinc-100 text-[#FAFAFA] dark:text-zinc-900 rounded-xl font-semibold  text-[15px] sm:text-base"
                        >
                            {isSignIn
                                ? mergedTexts.signInButton
                                : mergedTexts.signUpButton}
                        </motion.button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#F6F5FA] dark:bg-zinc-900 py-3 sm:py-4 text-center">
                    <p className="text-[#a8a7b0] dark:text-zinc-500 text-[13px] sm:text-[14px]">
                        {isSignIn
                            ? mergedTexts.footerSignIn
                            : mergedTexts.footerSignUp}
                        <button
                            onClick={() => onModeChange(!isSignIn)}
                            className="ml-1 font-medium text-black dark:text-white"
                        >
                            {isSignIn
                                ? mergedTexts.footerSignInCta
                                : mergedTexts.footerSignUpCta}
                        </button>
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};