"""Custom error hierarchy and global exception handler."""

from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", 404)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, 400)


def register_error_handlers(app):
    @app.exception_handler(AppError)
    async def handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message},
        )
