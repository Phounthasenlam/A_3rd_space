import { useState, useRef, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, query, limitToLast, set, remove, onDisconnect } from 'firebase/database';

export default function PublicRoom({ username, roomId, onChangeRoom }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyHeight, setHistoryHeight] = useState(300);
    const [isDragging, setIsDragging] = useState(false);
    const [warningMessage, setWarningMessage] = useState("");
    const messagesEndRef = useRef(null);
    const lastMessageTime = useRef(0);
    const inputRef = useRef(null);
    
    // Track when we joined the current room
    const joinedAt = useRef(Date.now());
    
    // Avatar system state
    const [users, setUsers] = useState({});
    const [myPosition, setMyPosition] = useState({ x: 400, y: 300 });
    const [myColor] = useState(`#${Math.floor(Math.random()*16777215).toString(16)}`);
    const [userMessages, setUserMessages] = useState({});
    const keysPressed = useRef(new Set());
    
    const MAX_MESSAGES = 30;
    const COOLDOWN_TIME = 500;
    const MOVE_SPEED = 5;
    const BUBBLE_DURATION = 10000;

    // FIX 1: CLEAR DATA & RESET TIMER ON ROOM SWITCH
    useEffect(() => {
        // Reset the "Join Time" anchor.
        joinedAt.current = Date.now();
        
        setUsers({});
        setMessages([]);
        setUserMessages({});
    }, [roomId]);

    // LISTEN FOR MESSAGES
    useEffect(() => {
        const messagesRef = ref(database, `publicRooms/${roomId}/messages`);
        const messagesQuery = query(messagesRef, limitToLast(MAX_MESSAGES));
        
        const unsubscribe = onValue(messagesQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const messageList = Object.entries(data).map(([id, msg]) => ({
                    id,
                    ...msg
                }));
                setMessages(messageList);
                
                // Recalculate bubbles
                const now = Date.now();
                const newActiveBubbles = {};

                messageList.forEach(msg => {
                    // Check 1: Is the message recent enough to be a bubble?
                    const isRecent = (now - msg.timestamp < BUBBLE_DURATION);
                    
                    // Check 2: Is this MY message?
                    const isMe = msg.username === username;

                    // Check 3: Did this message happen after I joined this session?
                    const isNewSinceJoin = (msg.timestamp > joinedAt.current);

                    // LOGIC FIX:
                    // 1. If it's NOT me, show it (as long as it's recent).
                    // 2. If it IS me, only show it if I typed it during this session (isNewSinceJoin).
                    if (isRecent && (!isMe || isNewSinceJoin)) {
                        newActiveBubbles[msg.username] = {
                            text: msg.text,
                            timestamp: msg.timestamp
                        };
                    }
                });
                
                setUserMessages(newActiveBubbles);
            } else {
                setMessages([]);
                setUserMessages({});
            }
        });

        return () => unsubscribe();
    }, [roomId, username]); // Added username to dependency array just in case

    // BUBBLE CLEANUP INTERVAL
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setUserMessages(currentBubbles => {
                const nextBubbles = { ...currentBubbles };
                let hasChanges = false;
                Object.keys(nextBubbles).forEach(user => {
                    if (now - nextBubbles[user].timestamp > BUBBLE_DURATION) {
                        delete nextBubbles[user];
                        hasChanges = true;
                    }
                });
                return hasChanges ? nextBubbles : currentBubbles;
            });
        }, 1000); 
        return () => clearInterval(interval);
    }, []);

    // LISTEN FOR USERS
    useEffect(() => {
        const usersRef = ref(database, `publicRooms/${roomId}/users`);
        
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const now = Date.now();
                const activeUsers = {};
                Object.entries(data).forEach(([userId, userData]) => {
                    if (now - userData.lastSeen < 30000) {
                        activeUsers[userId] = userData;
                    }
                });
                setUsers(activeUsers);
            } else {
                setUsers({});
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    // WASD MOVEMENT
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName !== 'INPUT') {
                inputRef.current?.focus();
                return;
            }
            if (document.activeElement.tagName === 'INPUT') return;
            
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                keysPressed.current.add(key);
                e.preventDefault();
            }
        };

        const handleKeyUp = (e) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const moveInterval = setInterval(() => {
            if (keysPressed.current.size === 0) return;

            setMyPosition(prev => {
                let newX = prev.x;
                let newY = prev.y;

                if (keysPressed.current.has('w')) newY -= MOVE_SPEED;
                if (keysPressed.current.has('s')) newY += MOVE_SPEED;
                if (keysPressed.current.has('a')) newX -= MOVE_SPEED;
                if (keysPressed.current.has('d')) newX += MOVE_SPEED;

                newX = Math.max(50, Math.min(window.innerWidth - 50, newX));
                newY = Math.max(50, Math.min(window.innerHeight - 150, newY));

                return { x: newX, y: newY };
            });
        }, 1000 / 60);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(moveInterval);
        };
    }, []);

    // UPDATE MY POSITION & HANDLE DISCONNECTS
    useEffect(() => {
        const myUserRef = ref(database, `publicRooms/${roomId}/users/${username}`);
        
        onDisconnect(myUserRef).remove();

        set(myUserRef, {
            username: username,
            x: myPosition.x,
            y: myPosition.y,
            color: myColor,
            lastSeen: Date.now()
        });

        const interval = setInterval(() => {
            set(myUserRef, {
                username: username,
                x: myPosition.x,
                y: myPosition.y,
                color: myColor,
                lastSeen: Date.now()
            });
        }, 100);

        return () => {
            clearInterval(interval);
            onDisconnect(myUserRef).cancel();
            remove(myUserRef);
        };
    }, [roomId, username, myPosition.x, myPosition.y, myColor]);

    // SCROLL TO BOTTOM
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // WARNING TIMEOUT
    useEffect(() => {
        if (warningMessage) {
            const timer = setTimeout(() => setWarningMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [warningMessage]);

    const handleSubmit = () => {
        const now = Date.now();
        if (now - lastMessageTime.current < COOLDOWN_TIME) {
            setWarningMessage("Slow down! You're typing too fast");
            return;
        }

        if (input.trim()) {
            push(ref(database, `publicRooms/${roomId}/messages`), {
                username: username,
                text: input,
                timestamp: now
            });
            setInput('');
            lastMessageTime.current = now;
            setWarningMessage("");
            inputRef.current?.blur();
        }
    };

    const sendMessage = (e) => {
        if(e.key === "Enter") handleSubmit();   
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setHistoryHeight(Math.max(150, Math.min(e.clientY - 20, 600)));
        }
    };

    return (
        <div 
            style={{ 
                minHeight: '100vh', 
                paddingBottom: '100px', 
                position: 'relative' 
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
        >
            {/* NAV BAR */}
            <div className="ui-element" style={{
                position: 'fixed', top: '20px', left: '20px',
                display: 'flex', flexDirection: 'column', gap: '10px',
                zIndex: 1000, backgroundColor: 'white', padding: '15px',
                borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>Rooms:</h3>
                {['plaza', 'cafe', 'beach'].map(r => (
                    <button 
                        key={r}
                        onClick={() => onChangeRoom(r)}
                        style={{ 
                            padding: '8px 15px', cursor: 'pointer',
                            backgroundColor: roomId === r ? '#4CAF50' : 'white',
                            color: roomId === r ? 'white' : 'black',
                            border: '1px solid #ccc', borderRadius: '4px'
                        }}
                    >
                        {r === 'plaza' ? '🏛️' : r === 'cafe' ? '☕' : '🏖️'} {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                ))}
                <hr style={{ width: '100%', margin: '5px 0' }} />
                <button 
                    onClick={() => onChangeRoom('private')}
                    style={{ 
                        padding: '8px 15px', cursor: 'pointer',
                        backgroundColor: '#4CAF50', color: 'white',
                        border: 'none', borderRadius: '4px'
                    }}
                >
                    🎨 My Room
                </button>
            </div>

            <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
                {roomId.charAt(0).toUpperCase() + roomId.slice(1)} Room
            </h1>

            <div style={{
                position: 'fixed', bottom: '100px', left: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)', color: 'white',
                padding: '10px', borderRadius: '5px', fontSize: '12px'
            }}>
                Use <strong>WASD</strong> to move
            </div>

            {/* AVATARS */}
            {Object.entries(users).map(([userId, userData]) => (
                <Avatar
                    key={userId}
                    username={userData.username}
                    x={userData.x}
                    y={userData.y}
                    color={userData.color}
                    isCurrentUser={userData.username === username}
                    lastMessage={userMessages[userData.username]?.text}
                />
            ))}

            {/* CHAT HISTORY */}
            {isHistoryOpen && (
                <div className="ui-element" style={{
                    position: 'fixed', top: '20px', right: '20px',
                    width: '350px', height: `${historyHeight}px`,
                    backgroundColor: 'white', border: '2px solid #ccc',
                    borderRadius: '8px', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', opacity: "0.7"
                }}>
                    <div style={{
                        padding: '10px', backgroundColor: '#f0f0f0',
                        borderBottom: '1px solid #ccc', borderRadius: '6px 6px 0 0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <strong>Message History ({messages.length}/{MAX_MESSAGES})</strong>
                        <button onClick={() => setIsHistoryOpen(false)} style={{ padding: '2px 8px' }}>✕</button>
                    </div>
                    
                    <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {messages.length === 0 ? <p style={{ color: '#999' }}>No messages yet</p> : (
                            <>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{ marginBottom: '8px', padding: '5px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                        <strong>{msg.username}</strong>: {msg.text}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                    
                    <div 
                        onMouseDown={() => setIsDragging(true)}
                        style={{
                            height: '10px', backgroundColor: '#ddd', cursor: 'ns-resize',
                            borderRadius: '0 0 6px 6px', display: 'flex',
                            justifyContent: 'center', alignItems: 'center', fontSize: '12px', color: '#666'
                        }}
                    >
                        ⋮⋮⋮
                    </div>
                </div>
            )}
            
            {!isHistoryOpen && (
                <button 
                    className="ui-element"
                    onClick={() => setIsHistoryOpen(true)}
                    style={{
                        position: 'fixed', top: '20px', right: '20px',
                        padding: '10px 20px', backgroundColor: '#4CAF50',
                        color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
                    }}
                >
                    Chat History
                </button>
            )}
            
            {/* INPUT BAR */}
            <div className="ui-element" style={{ 
                position: 'fixed', bottom: '0', left: '0', right: '0',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '20px', backgroundColor: 'white', borderTop: '1px solid #ccc'
            }}>
                {warningMessage && (
                    <div style={{
                        marginBottom: '10px', padding: '8px 16px',
                        backgroundColor: '#fff3cd', color: '#856404',
                        borderRadius: '4px', fontSize: '14px'
                    }}>
                        {warningMessage}
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={sendMessage}
                        placeholder="Input message... "
                        style={{ width: "300px", height: '30px', padding: '5px' }}
                    />
                    <button onClick={handleSubmit}>Send</button>
                </div>
            </div>
        </div>
    );
}

export function Avatar({ username, x, y, color, isCurrentUser, lastMessage }) {
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
                    transform: 'translateX(-50%)', 
                    maxWidth: '250px', 
                    width: 'max-content',
                    overflowWrap: 'break-word',
                    wordWrap: 'break-word',
                    hyphens: 'auto',
                    backgroundColor: 'white',
                    border: '2px solid #333',
                    borderRadius: '15px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                    {lastMessage}
                    <div style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        marginLeft: '-8px',
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