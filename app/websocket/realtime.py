from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)


connection_manager = ConnectionManager()


@router.websocket("/ws/realtime")
async def realtime_socket(websocket: WebSocket):
    await connection_manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_json({"event": "heartbeat", "message": message})
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)

