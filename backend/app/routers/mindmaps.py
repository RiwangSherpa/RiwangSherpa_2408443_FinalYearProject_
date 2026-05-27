"""Mindmap API for AI-generated concept graphs."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.services.brainstorm.brainstorm_service import BrainstormService, BrainstormServiceError
from app.services.learning_artifact_service import LearningArtifactError, LearningArtifactService


router = APIRouter(prefix="/api/mindmaps", tags=["mindmaps"])


def _service_error(exc: LearningArtifactError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/", response_model=list[schemas.MindmapResponse])
async def list_mindmaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    return service.list_mindmaps(current_user.id)


@router.get("/{mindmap_id}", response_model=schemas.MindmapResponse)
async def get_mindmap(
    mindmap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        return service.get_mindmap(current_user.id, mindmap_id)
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc


@router.post("/generate", response_model=schemas.MindmapResponse)
async def generate_mindmap(
    request: schemas.MindmapGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        return await service.generate_mindmap(
            user_id=current_user.id,
            source_type=request.source_type,
            source_id=request.source_id,
            title=request.title,
            content=request.content,
        )
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Mindmap generation failed: {exc}") from exc


@router.post("/upload-generate", response_model=schemas.MindmapResponse)
async def upload_and_generate_mindmap(
    title: str | None = Form(default=None),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload study material, extract it through Brainstorm services, then generate a mindmap."""
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one file.")

    brainstorm_service = BrainstormService(db)
    artifact_service = LearningArtifactService(db)
    session_title = title or f"Mindmap upload: {files[0].filename or 'study material'}"

    try:
        session = brainstorm_service.create_session(current_user.id, session_title)
        uploaded = await brainstorm_service.upload_files(current_user.id, session.id, files)
        ready_files = [file for file in uploaded if file.upload_status == "ready"]
        if not ready_files:
            raise LearningArtifactError("Upload succeeded, but no readable content could be extracted.", status_code=400)

        source_type = "brainstorm_file" if len(ready_files) == 1 else "brainstorm_session"
        source_id = ready_files[0].id if len(ready_files) == 1 else session.id
        return await artifact_service.generate_mindmap(
            user_id=current_user.id,
            source_type=source_type,
            source_id=source_id,
            title=title or f"{ready_files[0].original_filename} Mindmap",
        )
    except BrainstormServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload mindmap generation failed: {exc}") from exc


@router.patch("/{mindmap_id}", response_model=schemas.MindmapResponse)
async def update_mindmap(
    mindmap_id: int,
    request: schemas.MindmapUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        graph_data = request.graph_data.model_dump() if request.graph_data is not None else None
        return service.update_mindmap(
            user_id=current_user.id,
            mindmap_id=mindmap_id,
            title=request.title,
            graph_data=graph_data,
        )
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc


@router.delete("/{mindmap_id}")
async def delete_mindmap(
    mindmap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    service = LearningArtifactService(db)
    try:
        service.delete_mindmap(current_user.id, mindmap_id)
        return {"success": True}
    except LearningArtifactError as exc:
        raise _service_error(exc) from exc
