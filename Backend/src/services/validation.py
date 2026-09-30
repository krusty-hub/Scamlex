# services/validation.py
import os
from fastapi import UploadFile, HTTPException
from Backend.src.core.config import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES

def validate_file(file: UploadFile):
    # 1. Check the extension (e.g. .txt)
    # os.path.splitext splits "document.txt" into ["document", ".txt"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File extension {file_ext} is not allowed."
        )

    # 2. Check the MIME type (e.g. text/plain)
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"File content type {file.content_type} is not allowed."
        )
    
    return True
