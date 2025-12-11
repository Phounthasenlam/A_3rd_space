import { useState, useRef, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, query, limitToLast, set, remove, onDisconnect } from 'firebase/database';
import Avatar from './Avatar';

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
    const chatContainerRef = useRef(null);
    const shouldAutoScroll = useRef(false);
    const prevMessagesLength = useRef(0);
    
    const joinedAt = useRef(Date.now());
    
    const [users, setUsers] = useState({});
    const [myPosition, setMyPosition] = useState({ x: 400, y: 300 });
    const [myColor] = useState(`#${Math.floor(Math.random()*16777215).toString(16)}`);
    const [userMessages, setUserMessages] = useState({});
    const keysPressed = useRef(new Set());
    const messageCounter = useRef(0);
    
    const MAX_MESSAGES = 30;
    const COOLDOWN_TIME = 500;
    const MOVE_SPEED = 5;
    const BUBBLE_DURATION = 10000;

    useEffect(() => {
        joinedAt.current = Date.now();
        setUsers({});
        setMessages([]);
        setUserMessages({});
    }, [roomId]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    useEffect(() => {
        const messagesRef = ref(database, `publicRooms/${roomId}/messages`);
        const messagesQuery = query(messagesRef, limitToLast(MAX_MESSAGES));
        
        const unsubscribe = onValue(messagesQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const messageList = Object.entries(data).map(([id, msg]) => ({
                    id,
                    ...msg
                })).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(messageList);
                
                const now = Date.now();
                const newActiveBubbles = {};

                messageList.forEach(msg => {
                    const isRecent = (now - msg.timestamp < BUBBLE_DURATION);
                    const isMe = msg.username === username;
                    const isNewSinceJoin = (msg.timestamp > joinedAt.current);

                    if (isRecent && (!isMe || isNewSinceJoin)) {
                        messageCounter.current += 1;
                        newActiveBubbles[msg.username] = {
                            text: msg.text,
                            timestamp: msg.timestamp,
                            zIndex: 5000 + messageCounter.current
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
    }, [roomId, username]);

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

    useEffect(() => {
        const usersRef = ref(database, `publicRooms/${roomId}/users`);
        
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const now = Date.now();
                const activeUsers = {};
                Object.entries(data).forEach(([userId, userData]) => {
                    if (now - userData.lastSeen < 900000) {
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

    useEffect(() => {
        if (chatContainerRef.current && messages.length > prevMessagesLength.current) {
            const container = chatContainerRef.current;
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
            
            if (isAtBottom || shouldAutoScroll.current) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 0);
            }
        }
        
        prevMessagesLength.current = messages.length;
    }, [messages]);

    useEffect(() => {
        if (isHistoryOpen && chatContainerRef.current) {
            const checkPosition = () => {
                const container = chatContainerRef.current;
                if (container) {
                    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
                    shouldAutoScroll.current = isAtBottom;
                }
            };
            setTimeout(checkPosition, 50);
        }
    }, [isHistoryOpen]);

    useEffect(() => {
        if (warningMessage) {
            const timer = setTimeout(() => setWarningMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [warningMessage]);

    const handleSubmit = () => {
        if (!input.trim()) {
            return;
        }

        const now = Date.now();
        if (now - lastMessageTime.current < COOLDOWN_TIME) {
            setWarningMessage("Slow down! You're typing too fast");
            return;
        }

        push(ref(database, `publicRooms/${roomId}/messages`), {
            username: username,
            text: input,
            timestamp: now
        });
        setInput('');
        lastMessageTime.current = now;
        setWarningMessage("");
        inputRef.current?.blur();
        shouldAutoScroll.current = true;
    };

    const sendMessage = (e) => {
        if(e.key === "Enter") handleSubmit();   
    };

    const handleChatScroll = (e) => {
        const container = e.target;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
        shouldAutoScroll.current = isAtBottom;
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setHistoryHeight(Math.max(150, Math.min(e.clientY - 20, 600)));
        }
    };

    const getRoomStyle = () => {
        const baseStyle = {
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#ffffffff',
        };

        // If the room is 'plaza', add the background image
        if (roomId === 'plaza') {
            return {
                ...baseStyle,
                backgroundImage: 'url("/images/Town_Image.png")', // Path relative to public folder
                backgroundSize: 'contain',   // Ensures image covers screen without distortion (crops)
                backgroundPosition: 'center', // Centers the image
                backgroundRepeat: 'no-repeat'
            };
        }

        return baseStyle;
    };

    return (
        <div 
            style={getRoomStyle()}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
        >
            {warningMessage && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '10px 20px',
                    backgroundColor: '#fff3cd', color: '#856404',
                    borderRadius: '8px', fontSize: '14px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                    zIndex: 10001
                }}>
                    {warningMessage}
                </div>
            )}

            <div className="ui-element" style={{
                position: 'fixed', top: '20px', left: '20px',
                display: 'flex', flexDirection: 'column', gap: '10px',
                zIndex: 10000, backgroundColor: 'white', padding: '15px',
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

            {/* <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
                {roomId.charAt(0).toUpperCase() + roomId.slice(1)} Rooom
            </h1> */}

            {Object.entries(users).map(([userId, userData]) => (
                <Avatar
                    key={userId}
                    username={userData.username}
                    x={userData.x}
                    y={userData.y}
                    color={userData.color}
                    isCurrentUser={userData.username === username}
                />
            ))}

            {Object.entries(users).map(([userId, userData]) => {
                const message = userMessages[userData.username];
                if (!message) return null;
                
                return (
                    <div
                        key={`bubble-${userId}`}
                        style={{
                            position: 'absolute',
                            left: userData.x,
                            top: userData.y - 145,
                            transform: 'translateX(-50%)',
                            maxWidth: '200px',
                            width: 'max-content',
                            overflowWrap: 'break-word',
                            wordWrap: 'break-word',
                            hyphens: 'auto',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '2px solid #333',
                            borderRadius: '15px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            textAlign: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            pointerEvents: 'none',
                            transition: 'top 0.1s linear, left 0.1s linear',
                            zIndex: message.zIndex
                        }}
                    >
                        {message.text}
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
                );
            })}

            {isHistoryOpen && (
                <div className="ui-element" style={{
                    position: 'fixed', top: '20px', right: '20px',
                    width: '350px', height: `${historyHeight}px`,
                    backgroundColor: 'white', border: '2px solid #ccc',
                    borderRadius: '8px', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', opacity: "0.7",
                    zIndex: 10000
                }}>
                    <div style={{
                        padding: '10px', backgroundColor: '#f0f0f0',
                        borderBottom: '1px solid #ccc', borderRadius: '6px 6px 0 0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <strong>Message History ({messages.length}/{MAX_MESSAGES})</strong>
                        <button onClick={() => setIsHistoryOpen(false)} style={{ padding: '2px 8px' }}>✕</button>
                    </div>
                    
                    <div 
                        ref={chatContainerRef}
                        onScroll={handleChatScroll}
                        style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                    >
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
                    onClick={() => {
                        setIsHistoryOpen(true);
                        setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                            shouldAutoScroll.current = true;
                        }, 100);
                    }}
                    style={{
                        position: 'fixed', top: '20px', right: '20px',
                        padding: '10px 20px', backgroundColor: '#4CAF50',
                        color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                        zIndex: 10000
                    }}
                >
                    Chat History
                </button>
            )}
            
            <div className="ui-element" style={{ 
                position: 'fixed', bottom: '0', left: '0', right: '0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', backgroundColor: 'white', borderTop: '1px solid #ccc',
                zIndex: 10000
            }}>
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