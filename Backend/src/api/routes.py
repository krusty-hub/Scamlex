from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from Backend.src.core.config import MAX_FILE_SIZE
from Backend.src.services.validation import validate_file  
from Backend.src.services.extraction import extract_text
from Backend.src.services.url_parser import extract_urls

from Backend.src.detector import check_message 
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=10)

router = APIRouter()


@router.get("/")
def read_root():
    return {"message": "File Scanner API is running!"}


@router.post("/scan")
async def scan_files(files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        # 1. CHECK FILE SIZE        
        if file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File {file.filename} is too large. Maximum size is 10MB."
            )
        # 2. RUN VALIDATION SERVICE (Checks Extensions & MIME Types)
        validate_file(file)



        # 3. Read the file content into memory
        content = await file.read()
        
        # 4. EXTRACT AND CLEAN TEXT
        text_content = extract_text(content, file.filename)
        
        # 5. Call check_message
        try:
            loop = asyncio.get_running_loop()
            scan_data = await asyncio.wait_for(
                loop.run_in_executor(executor, check_message, text_content),
                timeout=15.0
            )
        except Exception as e:
            scan_data = {"score": 0, "level": "ERROR", "message": f"Scan failed: {str(e)}"}
        
        results.append({
            "filename": file.filename,
            "status": "success",
            "scan_data": scan_data,
            "content": text_content})
        
    return {"results": results}
