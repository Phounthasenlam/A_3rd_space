import { useState } from 'react';

export default function LoginPage({onLogin}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState(""); 

    const handleSubmit = () => {
        if(username && password) {
            onLogin(username);
        }
    }

    return(
        <div style={{
                backgroundColor: "rgba(67, 36, 160, 1)", 
        }}>

            <div>
                <p style={{
                            textAlign: "center",
                            fontFamily: "Arial Black, Gadget, Arial, sans-serif",
                            fontSize: "50px",
                            transform: "scale(1.5,2)",
                            color: "rgba(255, 255, 255, 1)",
                            bottom: "20px"
                            
                }}>
                A Little Corner</p>
            </div>

            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    alignItems: 'center'
                }}>
                    <input 
                        type="text"
                        placeholder='Enter Username'
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        style={{ padding: '10px', width: '250px' }}
                    />

                    <input 
                        type="password"
                        placeholder='Enter Password'
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        style={{ padding: '10px', width: '250px' }}
                    />

                    <button 
                        onClick={handleSubmit}
                        style={{ padding: '10px 30px', cursor: 'pointer' }}
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>

    );
}