# services/extraction.py
import io
import PyPDF2
import docx
import pytesseract
from PIL import Image

# Configure the path to the Tesseract executable. 
# Update this path if you installed Tesseract in a different location.
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text(content: bytes, filename: str) -> str:
    """
    Extracts text from bytes based on the file extension.
    """
    filename_lower = filename.lower()
    
    try:
        if filename_lower.endswith('.pdf'):
            return extract_from_pdf(content)
        elif filename_lower.endswith('.docx'):
            return extract_from_docx(content)
        elif filename_lower.endswith('.txt'):
            return extract_from_txt(content)
        elif filename_lower.endswith('.png') or filename_lower.endswith('.jpg') or filename_lower.endswith('.jpeg'):
            return extract_from_image(content)
        else:
            return "[Unsupported file type for text extraction]"
    except Exception as e:
        return f"[Error extracting text: {str(e)}]"

def extract_from_txt(content: bytes) -> str:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("iso-8859-1")
        except UnicodeDecodeError:
            return "[Binary or unsupported file type - cannot extract text]"
    return " ".join(text.split())

def extract_from_pdf(content: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(content))
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return " ".join(text.split())

def extract_from_docx(content: bytes) -> str:
    doc = docx.Document(io.BytesIO(content))
    text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
    return " ".join(text.split())

def extract_from_image(content: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(content))
        text = pytesseract.image_to_string(image)
        if not text.strip():
            return "[No text found in image]"
        return " ".join(text.split())
    except pytesseract.TesseractNotFoundError:
        return "[Error: Tesseract OCR is not installed on this system. Please install Tesseract to extract text from images.]"
    except Exception as e:
        return f"[Error processing image: {str(e)}]"
