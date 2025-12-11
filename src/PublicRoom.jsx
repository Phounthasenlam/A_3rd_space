import { useState, useRef, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, query, limitToLast } from 'firebase/database';

export default function PublicRoom({ username, roomId, onChangeRoom }) {  // Added onChangeRoom
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyHeight, setHistoryHeight] = useState(300);
    const [isDragging, setIsDragging] = useState(false);
    const [warningMessage, setWarningMessage] = useState("");
    const messagesEndRef = useRef(null);
    const lastMessageTime = useRef(0);
    
    const MAX_MESSAGES = 30;
    const COOLDOWN_TIME = 500;

    // LISTEN FOR MESSAGES FROM FIREBASE
    useEffect(() => {
        const messagesRef = ref(database, `publicRooms/${roomId}/messages`);
        const messagesQuery = query(messagesRef, limitToLast(MAX_MESSAGES));
        
        onValue(messagesQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const messageList = Object.entries(data).map(([id, msg]) => ({
                    id,
                    ...msg
                }));
                setMessages(messageList);
            } else {
                setMessages([]);
            }
        });
    }, [roomId]);  // Added roomId dependency

    // Auto-scroll to bottom when new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Clear warning after 3 seconds
    useEffect(() => {
        if (warningMessage) {
            const timer = setTimeout(() => setWarningMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [warningMessage]);

    // SAVE MESSAGE TO FIREBASE
    const handleSubmit = () => {
        const now = Date.now();
        
        if (now - lastMessageTime.current < COOLDOWN_TIME) {
            setWarningMessage("Slow down! You're typing too fast");
            return;
        }

        if (input.trim()) {
            const messagesRef = ref(database, `publicRooms/${roomId}/messages`);
            push(messagesRef, {
                username: username,
                text: input,
                timestamp: now
            });
            
            setInput('');
            lastMessageTime.current = now;
            setWarningMessage("");
        }
    };

    const sendMessage = (e) => {
        if(e.key === "Enter")
            handleSubmit();   
    };

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const newHeight = e.clientY - 20;
            setHistoryHeight(Math.max(150, Math.min(newHeight, 600)));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div 
            style={{ minHeight: '100vh', paddingBottom: '100px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Room Navigation Bar - Top Left */}
            <div style={{
                position: 'fixed',
                top: '20px',
                left: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 1000,
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>Rooms:</h3>
                <button 
                    onClick={() => onChangeRoom('plaza')}
                    style={{ 
                        padding: '8px 15px', 
                        cursor: 'pointer',
                        backgroundColor: roomId === 'plaza' ? '#4CAF50' : 'white',
                        color: roomId === 'plaza' ? 'white' : 'black',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                    }}
                >
                    🏛️ Plaza
                </button>
                <button 
                    onClick={() => onChangeRoom('cafe')}
                    style={{ 
                        padding: '8px 15px', 
                        cursor: 'pointer',
                        backgroundColor: roomId === 'cafe' ? '#4CAF50' : 'white',
                        color: roomId === 'cafe' ? 'white' : 'black',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                    }}
                >
                    ☕ Cafe
                </button>
                <button 
                    onClick={() => onChangeRoom('beach')}
                    style={{ 
                        padding: '8px 15px', 
                        cursor: 'pointer',
                        backgroundColor: roomId === 'beach' ? '#4CAF50' : 'white',
                        color: roomId === 'beach' ? 'white' : 'black',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                    }}
                >
                    🏖️ Beach
                </button>
                <hr style={{ width: '100%', margin: '5px 0' }} />
                <button 
                    onClick={() => onChangeRoom('private')}
                    style={{ 
                        padding: '8px 15px', 
                        cursor: 'pointer',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    🎨 My Room
                </button>
            </div>

            {/* Room Title */}
            <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
                {roomId.charAt(0).toUpperCase() + roomId.slice(1)} Room
            </h1>

            {/* Message History Window - Top Right */}
            {isHistoryOpen && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    width: '350px',
                    height: `${historyHeight}px`,
                    backgroundColor: 'white',
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    opacity: "0.7"
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#f0f0f0',
                        borderBottom: '1px solid #ccc',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <strong>Message History ({messages.length}/{MAX_MESSAGES})</strong>
                        <button onClick={() => setIsHistoryOpen(false)} style={{ padding: '2px 8px' }}>✕</button>
                    </div>
                    
                    {/* Content - Scrollable */}
                    <div style={{
                        flex: 1,
                        padding: '10px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {messages.length === 0 ? (
                            <p style={{ color: '#999' }}>No messages yet</p>
                        ) : (
                            <>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{ 
                                        marginBottom: '8px',
                                        padding: '5px',
                                        backgroundColor: '#f9f9f9',
                                        borderRadius: '4px'
                                    }}>
                                        <strong>{msg.username}</strong>: {msg.text}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                    
                    {/* Draggable Resize Handle */}
                    <div 
                        onMouseDown={handleMouseDown}
                        style={{
                            height: '10px',
                            backgroundColor: '#ddd',
                            cursor: 'ns-resize',
                            borderRadius: '0 0 6px 6px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '12px',
                            color: '#666'
                        }}
                    >
                        ⋮⋮⋮
                    </div>
                </div>
            )}
            
            {/* History Tab Button - Shows when closed */}
            {!isHistoryOpen && (
                <button 
                    onClick={() => setIsHistoryOpen(true)}
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Chat History
                </button>
            )}
            
            {/* Fixed chatbar at bottom center */}
            <div style={{ 
                position: 'fixed',
                bottom: '0',
                left: '0',
                right: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: 'white',
                borderTop: '1px solid #ccc'
            }}>
                {/* Warning message */}
                {warningMessage && (
                    <div style={{
                        marginBottom: '10px',
                        padding: '8px 16px',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        {warningMessage}
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={sendMessage}
                        placeholder="Input message... "
                        style={{
                            width: "300px",
                            height: '30px',
                            padding: '5px'
                        }}
                    />
                    <button onClick={handleSubmit}>Send</button>
                </div>
            </div>
        </div>
    );
}