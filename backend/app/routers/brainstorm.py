"""Brainstorm multimodal workspace API."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.services.brainstorm.brainstorm_service import BrainstormService, BrainstormServiceError


router = APIRouter(prefix="/api/brainstorm", tags=["brainstorm"])


def _service_error(exc: BrainstormServiceError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


def _service_error_response(exc: BrainstormServiceError) -> JSONResponse:
    payload: dict[str, object] = {
        "success": False,
        "detail": str(exc),
    }
    if exc.partial_content:
        payload["partial_content"] = exc.partial_content
    if exc.debug_context:
        payload["debug_context"] = exc.debug_context
    return JSONResponse(status_code=exc.status_code, content=payload)


@router.post("/sessions", response_model=schemas.BrainstormSessionResponse)
async def create_session(
    request: schemas.BrainstormSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a Brainstorm workspace session."""
    service = BrainstormService(db)
    session = service.create_session(current_user.id, request.title)
    return service.serialize_session(session)


@router.get("/sessions", response_model=list[schemas.BrainstormSessionResponse])
async def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List Brainstorm sessions owned by the current user."""
    service = BrainstormService(db)
    return [service.serialize_session(session) for session in service.get_user_sessions(current_user.id)]


@router.get("/sessions/{session_id}", response_model=schemas.BrainstormSessionDetailResponse)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a Brainstorm session with messages and files."""
    service = BrainstormService(db)
    session = service.get_session(session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Brainstorm session not found")
    return service.serialize_session(session, include_detail=True)


@router.patch("/sessions/{session_id}", response_model=schemas.BrainstormSessionResponse)
async def update_session(
    session_id: int,
    request: schemas.BrainstormSessionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Rename a Brainstorm session owned by the current user."""
    service = BrainstormService(db)
    try:
        session = service.update_session_title(session_id, current_user.id, request.title)
        return service.serialize_session(session)
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a Brainstorm session and its owned messages, files, and chunks."""
    service = BrainstormService(db)
    try:
        service.delete_session(session_id, current_user.id)
        return {"success": True, "message": "Brainstorm session deleted successfully"}
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc


@router.post("/upload", response_model=schemas.BrainstormUploadResponse)
async def upload_files(
    session_id: int = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload one or more PDFs, images, or documents into a Brainstorm session."""
    service = BrainstormService(db)
    try:
        uploaded = await service.upload_files(current_user.id, session_id, files)
        return {"success": True, "files": [service.serialize_file(file) for file in uploaded]}
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc


@router.post("/upload-image", response_model=schemas.BrainstormUploadResponse)
async def upload_images(
    session_id: int = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload image files into a Brainstorm session."""
    service = BrainstormService(db)
    try:
        uploaded = await service.upload_files(current_user.id, session_id, files, image_only=True)
        return {"success": True, "files": [service.serialize_file(file) for file in uploaded]}
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}") from exc


@router.post("/chat", response_model=schemas.BrainstormChatResponse)
async def chat(
    request: schemas.BrainstormChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send a contextual Brainstorm chat message about uploaded files or ideas."""
    service = BrainstormService(db)
    try:
        user_message, ai_response = await service.chat(
            user_id=current_user.id,
            session_id=request.session_id,
            message=request.message,
            file_ids=request.file_ids,
            response_length=request.response_length,
        )
        return {
            "success": True,
            "session_id": request.session_id,
            "user_message": user_message,
            "ai_response": ai_response,
        }
    except BrainstormServiceError as exc:
        return _service_error_response(exc)
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "detail": f"Brainstorm chat failed: {exc}"},
        )


@router.get("/files/{session_id}", response_model=list[schemas.BrainstormFileResponse])
async def list_files(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List files attached to a Brainstorm session."""
    service = BrainstormService(db)
    try:
        return [service.serialize_file(file) for file in service.get_session_files(session_id, current_user.id)]
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc


@router.get("/files/{file_id}/content")
async def get_file_content(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the raw uploaded file after ownership validation."""
    service = BrainstormService(db)
    try:
        file = service.get_file(file_id, current_user.id)
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc

    path = Path(file.storage_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file is missing")

    return FastAPIFileResponse(
        path,
        media_type=file.mime_type,
        filename=file.original_filename,
    )


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete an uploaded Brainstorm file and its chunks."""
    service = BrainstormService(db)
    try:
        service.delete_file(file_id, current_user.id)
        return {"success": True, "message": "File deleted successfully"}
    except BrainstormServiceError as exc:
        raise _service_error(exc) from exc


@router.post("/summarize", response_model=schemas.BrainstormArtifactResponse)
async def summarize(
    request: schemas.BrainstormSummarizeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Summarize one file or the full session upload context."""
    service = BrainstormService(db)
    try:
        message = await service.summarize(
            user_id=current_user.id,
            session_id=request.session_id,
            style=request.style,
            file_id=request.file_id,
            file_ids=request.file_ids,
            response_length=request.response_length,
        )
        return {
            "success": True,
            "session_id": request.session_id,
            "content": message.content,
            "ai_response": message,
        }
    except BrainstormServiceError as exc:
        return _service_error_response(exc)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": f"Summarization failed: {exc}"},
        )


@router.post("/generate-notes", response_model=schemas.BrainstormArtifactResponse)
async def generate_notes(
    request: schemas.BrainstormGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate study notes from uploaded Brainstorm context."""
    return await _generate_artifact("notes", request, db, current_user)


async def _generate_artifact(
    artifact_type: str,
    request: schemas.BrainstormGenerateRequest,
    db: Session,
    current_user: models.User,
):
    service = BrainstormService(db)
    try:
        message = await service.generate_artifact(
            user_id=current_user.id,
            session_id=request.session_id,
            artifact_type=artifact_type,
            file_id=request.file_id,
            file_ids=request.file_ids,
            prompt=request.prompt,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            response_length=request.response_length,
        )
        return {
            "success": True,
            "session_id": request.session_id,
            "content": message.content,
            "ai_response": message,
        }
    except BrainstormServiceError as exc:
        return _service_error_response(exc)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": f"Artifact generation failed: {exc}"},
        )
