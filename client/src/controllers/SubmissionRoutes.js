base = "https://localhost:8000/api"

export const get_all_submissions = async(obj) => {
    const res = await fetch(`${base}/submissions/`, {
        method: 'GET',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}