#MAX_FILE_SIZE
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB in bytes

# We only want to process text, PDFs, Word docs, and basic images
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"}

# MIME Types are the internal "true" file types.
# This prevents someone from renaming a virus.exe to virus.pdf
ALLOWED_MIME_TYPES = {
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # This is a .docx
    "image/png",
    "image/jpeg"
}
