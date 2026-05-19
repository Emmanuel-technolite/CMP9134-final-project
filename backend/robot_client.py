
import requests
import logging

ROBOT_API_URL = os.environ.get("ROBOT_API_URL", "http://localhost:5000")

logger = logging.getLogger(__name__)

class RobotClient:
    """ Singleton class to handle Robot API communications """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RobotClient, cls).__new__(cls)
            cls._instance._session = requests.Session()
        return cls._instance
        
    def get_status(self):
        try:
            response = self._session.get(f"{ROBOT_API_URL}/api/status", timeout=2.0)
            response.raise_for_status()
            data = response.json()
            # Map position to root x, y so the frontend can receive it properly
            if "position" in data:
                data["x"] = data["position"].get("x", 0)
                data["y"] = data["position"].get("y", 0)
            return {"status": "success", "data": data}
        except requests.exceptions.Timeout:
            return {"status": "error", "message": "Connection timed out"}
        except requests.exceptions.ConnectionError:
            return {"status": "error", "message": "Robot simulator unreachable"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def move(self, direction: str):
        try:
            # First, fetch current status to calculate new coordinates
            status_resp = self.get_status()
            if status_resp["status"] != "success":
                return status_resp
            
            # Use mapped x and y properties
            current_x = status_resp["data"].get("x", 0)
            current_y = status_resp["data"].get("y", 0)
            
            new_x, new_y = current_x, current_y
            
            if direction == "north":
                new_y -= 1
            elif direction == "south":
                new_y += 1
            elif direction == "east":
                new_x += 1
            elif direction == "west":
                new_x -= 1
                
            # Keep within grid boundaries (0 to 20 based on frontend grid)
            new_x = max(0, min(20, new_x))
            new_y = max(0, min(20, new_y))

            payload = {"x": new_x, "y": new_y}
            response = self._session.post(f"{ROBOT_API_URL}/api/move", json=payload, timeout=2.0)
            response.raise_for_status()
            return {"status": "success", "data": response.json()}
        except requests.exceptions.Timeout:
            return {"status": "error", "message": "Connection timed out"}
        except requests.exceptions.ConnectionError:
            return {"status": "error", "message": "Robot simulator unreachable"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
