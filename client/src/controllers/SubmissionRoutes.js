const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export const get_all_submissions = async() => {
    const res = await fetch(`${base}/submissions/`);
    const ans = await res.json();
    return ans;
}
