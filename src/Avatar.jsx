export default function Avatar({ username, x, y, color, isCurrentUser, lastMessage }) {
    return (
        <div style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -100%)',
            zIndex: 100,
            pointerEvents: 'none'
        }}>
            {/* Chat bubble */}
            {lastMessage && (
                <div style={{
                    position: 'absolute',
                    bottom: '85px',
                    left: '50%',
                    // 1. Centers the bubble regardless of its width
                    transform: 'translateX(-50%)', 
                    // 2. Grows horizontally up to 250px, then grows vertically
                    maxWidth: '250px', 
                    width: 'max-content', // Ensures it hugs the text tightly
                    
                    // 3. Text handling rules
                    overflowWrap: 'break-word', // Breaks long words if they overflow
                    wordWrap: 'break-word',     // Legacy support
                    hyphens: 'auto',            // Adds the hyphen (-) when breaking words
                    
                    backgroundColor: 'white',
                    border: '2px solid #333',
                    borderRadius: '15px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    textAlign: 'center', // Optional: centers text inside bubble
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                    {lastMessage}
                    
                    {/* The Triangle/Arrow */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        marginLeft: '-8px', // This stays fixed because arrow size is fixed
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid white'
                    }} />
                </div>
            )}
            
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
                {username[0].toUpperCase()}
            </div>
            
            {/* Username label */}
            <div style={{
                textAlign: 'center',
                marginTop: '5px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                textShadow: '2px 2px 4px black',
                whiteSpace: 'nowrap'
            }}>
                {username}
            </div>
        </div>
    );
}