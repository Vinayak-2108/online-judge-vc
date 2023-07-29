import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { get_all_submissions } from "../controllers/SubmissionRoutes";

const Submissions = () => {
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        get_all_submissions().then((data) => {
            const filteredData = data.slice(0,100);
            setSubmissions(filteredData);
            console.log(data);
        });
    }, []);
    const convertToRealTime = (timeString) => {
        const dateObj = new Date(timeString);
        const realTime = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
        const realDate = dateObj.toLocaleDateString();
        return `${realDate} - ${realTime}`;
    };
    return (
        <>
            <Navbar />
            <div className="flex flex-col items-center justify-center bg-[#f9f9f9] py-10">
                <div className="flex flex-col mt-6">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block">
                            <div className="shadow overflow-hidden sm:rounded-lg">
                                <table className="min-w-full text-xl text-gold">
                                    <thead className="bg-[#e2e2e2] text-xl uppercase border-b-2 border-gray-500 font-medium">
                                        <tr>
                                            <th></th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left tracking-wider"
                                            >
                                                User Name
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left tracking-wider"
                                            >
                                                Submission Time
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left tracking-wider"
                                            >
                                                Problem Name
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left tracking-wider"
                                            >
                                                Verdict
                                            </th>
                                        </tr>
                                    </thead>
                                    {submissions.reverse().map((sub, index) => (
                                        <>
                                            <tbody
                                                key={index}
                                                className="bg-[#e2e2e2]"
                                            >
                                                <tr className="bg-gray bg-opacity-20">
                                                    <td className="pl-4">
                                                        {index + 1}
                                                    </td>
                                                    <td className="flex px-6 py-4 whitespace-nowrap">
                                                        <h2 className="ml-2 font-medium">
                                                            {sub.user}
                                                        </h2>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {convertToRealTime(
                                                            sub.submission_time
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {sub.problem}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap ${sub.verdict==="Accepted"?("text-green-500"):("text-red-500")}`}>
                                                        {sub.verdict}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </>
                                    ))}
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Submissions;
