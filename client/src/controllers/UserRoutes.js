const base = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/accounts`;

export const register_user = async(obj) => {
    const res = await fetch(`${base}/signup`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const login_user = async(obj) => {
    const res = await fetch(`${base}/login`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const auth_user = async() => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}/test_token`, {
        method: 'POST',
        headers: {
            "Authorization": `Token ${token}`,
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const logout_user = async() => {
    const token = localStorage.getItem('token');
    await fetch(`${base}/logout`, {
        method: 'POST',
        headers: {
            "Authorization": `Token ${token}`,
        },
    }).catch(() => {});
    localStorage.removeItem('token');
}
