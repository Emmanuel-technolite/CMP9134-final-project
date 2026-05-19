from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
import json

import models, schemas, database, auth
from robot_client import RobotClient

# Create tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Robot Management System API")
robot_client = RobotClient()

@app.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role if user.role in ["Viewer", "Commander"] else "Viewer"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.get("/api/robot/status")
def get_robot_status(current_user: models.User = Depends(auth.get_current_user)):
    # Any authenticated user (Viewer or Commander) can view status
    return robot_client.get_status()

@app.post("/api/robot/move")
def move_robot(direction: str, current_user: models.User = Depends(auth.get_current_commander), db: Session = Depends(database.get_db)):
    # Only Commanders can move the robot
    response = robot_client.move(direction)
    
    # Audit log
    robot_status_str = json.dumps(response.get("data", {})) if response.get("status") == "success" else "ERROR"
    audit_entry = models.AuditLog(
        user_id=current_user.id,
        command_type=f"MOVE_{direction.upper()}",
        robot_status=robot_status_str
    )
    db.add(audit_entry)
    db.commit()
    
    if response["status"] != "success":
        raise HTTPException(status_code=503, detail=response["message"])
        
    return response

@app.get("/api/logs")
def get_logs(limit: int = 50, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
    # Format response
    formatted_logs = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        formatted_logs.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "username": user.username if user else "Unknown",
            "command": log.command_type,
            "robot_status": log.robot_status
        })
    return formatted_logs

# Mount frontend static files
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    app.mount("/", StaticFiles(directory="/frontend", html=True), name="frontend")
