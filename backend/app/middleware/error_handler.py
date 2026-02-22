"""
Centralized error handling middleware
"""

import uuid
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorResponse(JSONResponse):
    """Standardized error response format"""
    def __init__(self, status_code: int, error_type: str, message: str, request_id: str = None):
        content = {
            "success": False,
            "error": {
                "type": error_type,
                "message": message,
                "request_id": request_id or str(uuid.uuid4())[:8]
            }
        }
        super().__init__(status_code=status_code, content=content)


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
    logger.warning(f"HTTP Exception {exc.status_code}: {exc.detail} (Request: {request_id})")
    return ErrorResponse(
        status_code=exc.status_code,
        error_type="http_error",
        message=exc.detail,
        request_id=request_id
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
    errors = []
    for error in exc.errors():
        field = ".".join(str(x) for x in error.get("loc", []))
        errors.append(f"{field}: {error.get('msg', 'Invalid value')}")
    
    logger.warning(f"Validation error (Request: {request_id}): {errors}")
    return ErrorResponse(
        status_code=422,
        error_type="validation_error",
        message="Invalid input data",
        request_id=request_id
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors - DO NOT expose internal details"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
    logger.error(f"Database error (Request: {request_id}): {str(exc)}", exc_info=True)
    return ErrorResponse(
        status_code=500,
        error_type="database_error",
        message="An internal error occurred. Please try again later.",
        request_id=request_id
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions - NEVER expose internal details"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
    logger.error(f"Unhandled exception (Request: {request_id}): {str(exc)}", exc_info=True)
    return ErrorResponse(
        status_code=500,
        error_type="internal_error",
        message="An unexpected error occurred. Please try again later.",
        request_id=request_id
    )


def setup_exception_handlers(app):
    """Register all exception handlers with the FastAPI app"""
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
