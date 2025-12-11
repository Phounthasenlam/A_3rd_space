export default function RoomSelector({ username, onSelectRoom }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
            gap: '20px'
        }}>
            <h1>Welcome, {username}!</h1>
            <h2>Choose a Room:</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3>Public Rooms:</h3>
                <button 
                    onClick={() => onSelectRoom('plaza')}
                    style={{ padding: '15px 30px', fontSize: '16px', cursor: 'pointer' }}
                >
                    🏛️ Plaza
                </button>
                <button 
                    onClick={() => onSelectRoom('cafe')}
                    style={{ padding: '15px 30px', fontSize: '16px', cursor: 'pointer' }}
                >
                    ☕ Cafe
                </button>
                <button 
                    onClick={() => onSelectRoom('beach')}
                    style={{ padding: '15px 30px', fontSize: '16px', cursor: 'pointer' }}
                >
                    🏖️ Beach
                </button>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Personal Space:</h3>
                <button 
                    onClick={() => onSelectRoom('private')}
                    style={{ padding: '15px 30px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                    🎨 My Private Room
                </button>
            </div>
        </div>
    );
}