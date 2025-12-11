import { useState } from 'react';
import LoginPage from './LoginPage.jsx';
import RoomSelector from './RoomSelector.jsx';
import PublicRoom from './PublicRoom.jsx';
import PrivateRoom from './PrivateRoom.jsx';

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [currentRoom, setCurrentRoom] = useState(null);

    const handleLogin = (user) => {
        setUsername(user);
        setIsLoggedIn(true);
    };

    // Not logged in - show login page
    if (!isLoggedIn) {
        return <LoginPage onLogin={handleLogin} />;
    }

    // Logged in but no room selected - show room selector
    if (!currentRoom) {
        return <RoomSelector username={username} onSelectRoom={setCurrentRoom} />;
    }

    // Private room selected
    if (currentRoom === 'private') {
        return <PrivateRoom username={username} onChangeRoom={setCurrentRoom} />;  // Added onChangeRoom
    }

    // Public room selected (plaza, cafe, beach, etc.)
    return <PublicRoom 
        username={username} 
        roomId={currentRoom} 
        onChangeRoom={setCurrentRoom}  // Added this
    />;
}