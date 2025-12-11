export default function Avatar({ username, x, y, color, isCurrentUser }) {
    // Ensure Y is a number for math operations
    const safeY = parseFloat(y) || 0;
    
    // Calculate z-index: Higher Y = Higher Z-Index = On Top
    const depthIndex = Math.floor(safeY) + 100;

    return (
        <div 
            style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -100%)',
                zIndex: depthIndex,
                pointerEvents: 'none',
                transition: 'top 0.1s linear, left 0.1s linear',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}
        >
            {/* Avatar circle */}
            <div style={{
                width: '50px',
                height: '70px',
                backgroundColor: color,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                border: isCurrentUser ? '3px solid yellow' : '3px solid white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '24px'
            }}>
                {username ? username[0].toUpperCase() : '?'}
            </div>
            
            {/* Username label */}
            <div style={{
                marginTop: '5px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                textShadow: '2px 2px 4px black',
                whiteSpace: 'nowrap',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '2px 6px',
                borderRadius: '4px'
            }}>
                {username}
            </div>
        </div>
    );
}