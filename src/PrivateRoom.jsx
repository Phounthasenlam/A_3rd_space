import { useEffect, useRef, useState } from 'react';
import { Canvas } from 'fabric';

// Draggable Panel Component
function DraggablePanel({ title, children, initialX, initialY, onClose }) {
    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [collapsed, setCollapsed] = useState(false);
    const panelRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        
        const rect = panelRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 1000,
                backgroundColor: 'rgba(44, 62, 80, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                color: 'white',
                minWidth: '250px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header - Draggable */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    padding: '12px 15px',
                    cursor: 'move',
                    borderBottom: collapsed ? 'none' : '1px solid #34495e',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(52, 73, 94, 0.8)',
                    borderRadius: '8px 8px 0 0'
                }}
            >
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{title}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        {collapsed ? '▼' : '▲'}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!collapsed && (
                <div style={{
                    padding: '15px',
                    overflowY: 'auto',
                    maxHeight: 'calc(80vh - 50px)'
                }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// Draggable Button Component
function DraggableButton({ children, onClick, initialX, initialY, style = {} }) {
    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const buttonRef = useRef(null);

    const handleMouseDown = (e) => {
        const rect = buttonRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsDragging(true);
        e.stopPropagation();
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
    };

    const handleMouseUp = (e) => {
        if (isDragging) {
            setIsDragging(false);
            e.stopPropagation();
        }
    };

    const handleClick = (e) => {
        if (!isDragging && onClick) {
            onClick(e);
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    return (
        <button
            ref={buttonRef}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 999,
                cursor: isDragging ? 'grabbing' : 'grab',
                ...style
            }}
        >
            {children}
        </button>
    );
}

export default function PrivateRoom({ username, onChangeRoom }) {
    const canvasRef = useRef(null);
    const fabricCanvas = useRef(null);
    const [editorMode, setEditorMode] = useState(false); // FIXED: Start in display mode (false)
    const [showElementsPanel, setShowElementsPanel] = useState(true);
    const [showLayersPanel, setShowLayersPanel] = useState(true);
    const [selectedObject, setSelectedObject] = useState(null);
    const [canvasObjects, setCanvasObjects] = useState([]);

    // Initialize Fabric.js canvas - FULL SCREEN
    useEffect(() => {
        if (canvasRef.current && !fabricCanvas.current) {
            fabricCanvas.current = new Canvas(canvasRef.current, {
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: '#ffffff'
            });

            // Listen for object selection
            fabricCanvas.current.on('selection:created', (e) => {
                setSelectedObject(e.selected[0]);
            });

            fabricCanvas.current.on('selection:updated', (e) => {
                setSelectedObject(e.selected[0]);
            });

            fabricCanvas.current.on('selection:cleared', () => {
                setSelectedObject(null);
            });

            // Update layers list when objects change
            fabricCanvas.current.on('object:added', updateLayersList);
            fabricCanvas.current.on('object:removed', updateLayersList);
            fabricCanvas.current.on('object:modified', updateLayersList);

            // Handle window resize
            const handleResize = () => {
                fabricCanvas.current.setWidth(window.innerWidth);
                fabricCanvas.current.setHeight(window.innerHeight);
                fabricCanvas.current.renderAll();
            };
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (fabricCanvas.current) {
                    fabricCanvas.current.dispose();
                    fabricCanvas.current = null;
                }
            };
        }
    }, []);

    // Update layers list
    const updateLayersList = () => {
        if (fabricCanvas.current) {
            const objects = fabricCanvas.current.getObjects();
            setCanvasObjects([...objects]);
        }
    };

    // Add Rectangle
    const addRectangle = () => {
        const rect = new fabric.Rect({
            left: 100,
            top: 100,
            fill: '#ff6b6b',
            width: 150,
            height: 100,
            name: `Rectangle ${canvasObjects.length + 1}`
        });
        fabricCanvas.current.add(rect);
        fabricCanvas.current.setActiveObject(rect);
        fabricCanvas.current.renderAll();
    };

    // Add Circle
    const addCircle = () => {
        const circle = new fabric.Circle({
            left: 200,
            top: 200,
            fill: '#4ecdc4',
            radius: 60,
            name: `Circle ${canvasObjects.length + 1}`
        });
        fabricCanvas.current.add(circle);
        fabricCanvas.current.setActiveObject(circle);
        fabricCanvas.current.renderAll();
    };

    // Add Star
    const addStar = () => {
        const star = new fabric.Polygon([
            { x: 50, y: 0 },
            { x: 61, y: 35 },
            { x: 98, y: 35 },
            { x: 68, y: 57 },
            { x: 79, y: 91 },
            { x: 50, y: 70 },
            { x: 21, y: 91 },
            { x: 32, y: 57 },
            { x: 2, y: 35 },
            { x: 39, y: 35 }
        ], {
            left: 300,
            top: 100,
            fill: '#ffe66d',
            name: `Star ${canvasObjects.length + 1}`
        });
        fabricCanvas.current.add(star);
        fabricCanvas.current.setActiveObject(star);
        fabricCanvas.current.renderAll();
    };

    // Add Text
    const addText = () => {
        const text = new fabric.IText('Click to edit text', {
            left: 150,
            top: 150,
            fontSize: 40,
            fill: '#2d3436',
            name: `Text ${canvasObjects.length + 1}`
        });
        fabricCanvas.current.add(text);
        fabricCanvas.current.setActiveObject(text);
        fabricCanvas.current.renderAll();
    };

    // Upload Image
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                fabric.Image.fromURL(event.target.result, (img) => {
                    img.scale(0.5);
                    img.set({
                        left: 100,
                        top: 100,
                        name: `Image ${canvasObjects.length + 1}`
                    });
                    fabricCanvas.current.add(img);
                    fabricCanvas.current.setActiveObject(img);
                    fabricCanvas.current.renderAll();
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Change selected object color
    const changeColor = (color) => {
        if (selectedObject) {
            selectedObject.set('fill', color);
            fabricCanvas.current.renderAll();
        }
    };

    // Delete selected object
    const deleteSelected = () => {
        if (selectedObject) {
            fabricCanvas.current.remove(selectedObject);
            setSelectedObject(null);
        }
    };

    // Lock/Unlock object
    const toggleLock = () => {
        if (selectedObject) {
            const isLocked = selectedObject.lockMovementX;
            selectedObject.set({
                lockMovementX: !isLocked,
                lockMovementY: !isLocked,
                lockScalingX: !isLocked,
                lockScalingY: !isLocked,
                lockRotation: !isLocked,
                selectable: isLocked
            });
            fabricCanvas.current.renderAll();
            setSelectedObject({ ...selectedObject });
        }
    };

    // Select object from layers panel
    const selectObject = (obj) => {
        fabricCanvas.current.setActiveObject(obj);
        fabricCanvas.current.renderAll();
        setSelectedObject(obj);
    };

    // Change background
    const changeBackground = (color) => {
        fabricCanvas.current.setBackgroundColor(color, fabricCanvas.current.renderAll.bind(fabricCanvas.current));
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            {/* Full-page canvas */}
            <canvas ref={canvasRef} />

            {/* Editor UI - Shows when editorMode is TRUE */}
            {editorMode && (
                <>
                    {/* Draggable toolbar buttons */}
                    <DraggableButton
                        initialX={20}
                        initialY={20}
                        onClick={() => setShowElementsPanel(!showElementsPanel)}
                        style={toolbarButtonStyle}
                    >
                        📦 {showElementsPanel ? 'Hide' : 'Show'} Elements
                    </DraggableButton>

                    <DraggableButton
                        initialX={220}
                        initialY={20}
                        onClick={() => setShowLayersPanel(!showLayersPanel)}
                        style={toolbarButtonStyle}
                    >
                        📋 {showLayersPanel ? 'Hide' : 'Show'} Layers
                    </DraggableButton>

                    <DraggableButton
                        initialX={420}
                        initialY={20}
                        onClick={() => onChangeRoom('plaza')}
                        style={{ ...toolbarButtonStyle, backgroundColor: '#3498db' }}
                    >
                        ← Back to Plaza
                    </DraggableButton>

                    {/* Elements Panel */}
                    {showElementsPanel && (
                        <DraggablePanel
                            title="📦 Add Elements"
                            initialX={20}
                            initialY={80}
                            onClose={() => setShowElementsPanel(false)}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Shapes</h3>
                                <button onClick={addRectangle} style={panelButtonStyle}>
                                    🟥 Rectangle
                                </button>
                                <button onClick={addCircle} style={panelButtonStyle}>
                                    🟢 Circle
                                </button>
                                <button onClick={addStar} style={panelButtonStyle}>
                                    ⭐ Star
                                </button>

                                <h3 style={{ margin: '15px 0 10px 0', fontSize: '14px' }}>Text</h3>
                                <button onClick={addText} style={panelButtonStyle}>
                                    📝 Add Text
                                </button>

                                <h3 style={{ margin: '15px 0 10px 0', fontSize: '14px' }}>Images</h3>
                                <label style={{
                                    ...panelButtonStyle,
                                    display: 'block',
                                    textAlign: 'center',
                                    cursor: 'pointer'
                                }}>
                                    🖼️ Upload Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                </label>

                                <h3 style={{ margin: '15px 0 10px 0', fontSize: '14px' }}>Background</h3>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <div onClick={() => changeBackground('#ffffff')} style={{ ...colorBox, backgroundColor: '#ffffff', border: '2px solid #ccc' }} />
                                    <div onClick={() => changeBackground('#ffebee')} style={{ ...colorBox, backgroundColor: '#ffebee' }} />
                                    <div onClick={() => changeBackground('#e3f2fd')} style={{ ...colorBox, backgroundColor: '#e3f2fd' }} />
                                    <div onClick={() => changeBackground('#f3e5f5')} style={{ ...colorBox, backgroundColor: '#f3e5f5' }} />
                                    <div onClick={() => changeBackground('#e8f5e9')} style={{ ...colorBox, backgroundColor: '#e8f5e9' }} />
                                    <div onClick={() => changeBackground('#fff3e0')} style={{ ...colorBox, backgroundColor: '#fff3e0' }} />
                                </div>
                            </div>
                        </DraggablePanel>
                    )}

                    {/* Layers Panel */}
                    {showLayersPanel && (
                        <DraggablePanel
                            title="📋 Layers & Properties"
                            initialX={window.innerWidth - 320}
                            initialY={80}
                            onClose={() => setShowLayersPanel(false)}
                        >
                            {selectedObject ? (
                                <div style={{ marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Selected Element</h3>
                                    <p style={{ margin: '5px 0', fontSize: '12px' }}>Type: {selectedObject.type}</p>

                                    <h4 style={{ margin: '10px 0 5px 0', fontSize: '12px' }}>Color</h4>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                        <div onClick={() => changeColor('#ff6b6b')} style={{ ...colorBox, backgroundColor: '#ff6b6b' }} />
                                        <div onClick={() => changeColor('#4ecdc4')} style={{ ...colorBox, backgroundColor: '#4ecdc4' }} />
                                        <div onClick={() => changeColor('#ffe66d')} style={{ ...colorBox, backgroundColor: '#ffe66d' }} />
                                        <div onClick={() => changeColor('#a29bfe')} style={{ ...colorBox, backgroundColor: '#a29bfe' }} />
                                        <div onClick={() => changeColor('#fd79a8')} style={{ ...colorBox, backgroundColor: '#fd79a8' }} />
                                        <div onClick={() => changeColor('#74b9ff')} style={{ ...colorBox, backgroundColor: '#74b9ff' }} />
                                    </div>

                                    <button onClick={toggleLock} style={panelButtonStyle}>
                                        {selectedObject.lockMovementX ? '🔓 Unlock' : '🔒 Lock'}
                                    </button>
                                    <button onClick={deleteSelected} style={{ ...panelButtonStyle, backgroundColor: '#e74c3c' }}>
                                        🗑️ Delete
                                    </button>
                                </div>
                            ) : (
                                <p style={{ color: '#bdc3c7', fontSize: '12px', marginBottom: '20px' }}>
                                    Select an element to edit properties
                                </p>
                            )}

                            <hr style={{ margin: '15px 0', borderColor: '#7f8c8d' }} />

                            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>All Elements ({canvasObjects.length})</h3>
                            {canvasObjects.length === 0 ? (
                                <p style={{ color: '#bdc3c7', fontSize: '12px' }}>No elements yet</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {canvasObjects.map((obj, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectObject(obj)}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: selectedObject === obj ? '#3498db' : '#34495e',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <span>{obj.name || obj.type}</span>
                                            {obj.lockMovementX && <span>🔒</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DraggablePanel>
                    )}
                </>
            )}

            {/* Mode toggle - Draggable */}
            <DraggableButton
                initialX={window.innerWidth - 180}
                initialY={window.innerHeight - 80}
                onClick={() => setEditorMode(!editorMode)}
                style={{
                    padding: '15px 25px',
                    backgroundColor: editorMode ? '#27ae60' : '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
            >
                {editorMode ? '👁️ Display Mode' : '✏️ Editor Mode'}
            </DraggableButton>
        </div>
    );
}

// Styles
const toolbarButtonStyle = {
    padding: '10px 15px',
    backgroundColor: 'rgba(44, 62, 80, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
};

const panelButtonStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
};

const colorBox = {
    width: '35px',
    height: '35px',
    borderRadius: '5px',
    cursor: 'pointer',
    border: '2px solid #34495e'
};