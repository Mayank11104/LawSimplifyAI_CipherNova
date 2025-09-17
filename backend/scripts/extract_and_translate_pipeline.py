import os
import sys
import argparse
import logging
import time
import io
from dataclasses import dataclass
from typing import Tuple

# Load environment variables from the .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not found. Script will rely on system environment variables.")

# Google Cloud and Third-Party Imports

from google.cloud import documentai_v1 as documentai

import vertexai
from vertexai.generative_models import GenerativeModel
from google.auth import default as default_credentials, exceptions as auth_exceptions
from google.api_core import exceptions as api_exceptions
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

# ======================================================
# 📝 LOGGING SETUP
# ======================================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', stream=sys.stdout)
logger = logging.getLogger("LegalTranslationPipeline")

# ======================================================
# 💥 CUSTOM EXCEPTION CLASSES
# ======================================================
class PipelineError(Exception): pass
class ConfigError(PipelineError): pass
class AuthenticationError(PipelineError): pass
class FileProcessingError(PipelineError): pass
class ExtractionError(PipelineError): pass
class TranslationError(PipelineError): pass

# ======================================================
# ⚙️ CONFIGURATION
# ======================================================
@dataclass
class PipelineConfig:
    project_id: str
    docai_location: str
    vertex_location: str
    docai_processor_id: str
    translation_model_name: str = "gemini-2.5-flash-lite"
    max_pdf_pages_per_chunk: int = 15

    @classmethod
    def from_env(cls):
        required = ["GCP_PROJECT_ID", "GCP_LOCATION_For_docai", "GCP_LOCATION_For_vertexai", "DOCAI_PROCESSOR_ID"]
        if missing := [v for v in required if not os.getenv(v)]:
            raise ConfigError(f"Missing required environment variables: {', '.join(missing)}")
        return cls(
            project_id=os.environ["GCP_PROJECT_ID"],
            docai_location=os.environ["GCP_LOCATION_For_docai"],
            vertex_location=os.environ["GCP_LOCATION_For_vertexai"],
            docai_processor_id=os.environ["DOCAI_PROCESSOR_ID"]
        )

# ======================================================
# 🔐 AUTHENTICATION & CLIENT INITIALIZATION
# ======================================================
def initialize_clients(config: PipelineConfig) -> Tuple[documentai.DocumentProcessorServiceClient, GenerativeModel]:
    try:
        logger.info("Authenticating with Google Cloud...")
        credentials, _ = default_credentials()
        docai_client = documentai.DocumentProcessorServiceClient(credentials=credentials)
        vertexai.init(project=config.project_id, location=config.vertex_location, credentials=credentials)
        translation_model = GenerativeModel(config.translation_model_name)
        logger.info("✅ All clients initialized successfully.")
        return docai_client, translation_model
    except auth_exceptions.DefaultCredentialsError as e:
        raise AuthenticationError("Authentication failed. Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly.") from e

# ======================================================
# 📄 EXTRACTION LOGIC
# ======================================================
from typing import Optional


def extract_with_docai(
    docai_client: documentai.DocumentProcessorServiceClient,
    config: PipelineConfig,
    filename: str,  # Use filename to get the MIME type
    content: bytes # Always expect the content
) -> str:
    """Processes document content from a direct bytes object."""
    if not content:
        raise FileProcessingError("Content bytes object is empty.")

    try:
        # Get the MIME type from the filename
        _, ext = os.path.splitext(filename or "")
        mime_types = {
            ".pdf": "application/pdf", 
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            ".doc": "application/msword", 
            ".txt": "text/plain", 
            ".gif": "image/gif", 
            ".jpg": "image/jpeg", 
            ".jpeg": "image/jpeg", 
            ".png": "image/png", 
            ".bmp": "image/bmp", 
            ".tiff": "image/tiff", 
            ".webp": "image/webp"
        }
        mime_type = mime_types.get(ext.lower(), "application/octet-stream")
        
        doc = documentai.RawDocument(content=content, mime_type=mime_type)
        name = f"projects/{config.project_id}/locations/{config.docai_location}/processors/{config.docai_processor_id}"
        req = documentai.ProcessRequest(name=name, raw_document=doc)
        
        logger.info(f"Sending document chunk to Document AI processor...")
        result = docai_client.process_document(request=req)
        return result.document.text
    except api_exceptions.InvalidArgument as e:
        raise ExtractionError(f"Document AI Error: Invalid argument. The file type may be unsupported or the document is malformed.") from e


def smart_pdf_agent(file_content: bytes, filename: str, docai_client: documentai.DocumentProcessorServiceClient, config: PipelineConfig) -> str:
    """Handles PDF splitting and processes large PDFs entirely in memory."""
    try:
        reader = PdfReader(io.BytesIO(file_content))
    except PdfReadError as e:
        raise FileProcessingError(f"Could not read PDF. It may be corrupted.") from e

    num_pages = len(reader.pages)
    logger.info(f"PDF detected with {num_pages} page(s).")

    if num_pages <= config.max_pdf_pages_per_chunk:
        # Pass the original content and filename directly
        return extract_with_docai(docai_client, config, content=file_content, filename=filename)
    
    logger.info(f"PDF is large. Processing chunks in memory...")
    full_text = []
    for i in range(0, num_pages, config.max_pdf_pages_per_chunk):
        writer = PdfWriter()
        start, end = i, min(i + config.max_pdf_pages_per_chunk, num_pages)
        logger.info(f"Processing pages {start + 1} through {end}...")
        
        for page_num in range(start, end):
            writer.add_page(reader.pages[page_num])
            
        with io.BytesIO() as pdf_chunk_stream:
            writer.write(pdf_chunk_stream)
            pdf_chunk_bytes = pdf_chunk_stream.getvalue()
            # Pass the bytes object and filename to the extraction function
            chunk_text = extract_with_docai(docai_client, config, content=pdf_chunk_bytes, filename=filename)
            full_text.append(chunk_text)
            
    return "\n\n".join(full_text)


def extraction_agent(file_content: bytes, filename: str, docai_client: documentai.DocumentProcessorServiceClient, config: PipelineConfig) -> str:
    """Routes the file to the correct extraction logic."""
    suffix = os.path.splitext(filename)[1].lower()
    if suffix == ".pdf":
        return smart_pdf_agent(file_content, filename, docai_client, config)
    else:
        return extract_with_docai(docai_client, config, content=file_content, filename=filename)

# ======================================================
# 🌐 TRANSLATION LOGIC
# ======================================================
def create_translation_prompt(text: str) -> str:
        """Creates the advanced, reusable prompt for Indian legal translation."""
        return f"""
        You are a preeminent legal expert and professional translator with deep specialization in the Indian legal system. You possess comprehensive knowledge of the Constitution of India, the Indian Penal Code (IPC), the Code of Criminal Procedure (CrPC), the Civil Procedure Code (CPC), and various corporate and contract laws applicable in India. You are fluent in both English and multiple Indian languages, including Hindi and Marathi, and have extensive experience translating documents from these languages for official use.

        Your task is to translate the following text, extracted from a formal Indian legal document, into precise, legally sound English suitable for submission in an Indian court or for use in professional legal practice within India.

        **CRITICAL INSTRUCTIONS:**

        1.  **Preserve Legal Integrity:** The absolute priority is to preserve the precise legal meaning, intent, and nuances of every clause as it would be interpreted under Indian law.
        2.  **No Simplification or Paraphrasing:** Do not simplify, paraphrase, or interpret the text. Provide a formal and exact English equivalent.
        3.  **Precise Legal Terminology:** Translate specific legal terms to their official English counterparts used in the Indian legal system.
        4.  **Contextual Awareness:** Recognize and correctly translate terms specific to regional laws or customs within India.
        5.  **Maintain Formal Structure:** The translation's tone and sentence structure must mirror the original document.
        6.  **Output:** Provide ONLY the translated English text as it is in document and without simplification.

        **Original Text to Translate:**
        
        ---
        {text}
        ---

        **Translated English Text:**
        """

# def create_translation_prompt(text: str) -> str:
#     """Creates the strict legal translation prompt."""
#     return f"""
#     ROLE & EXPERTISE:
#     You are a certified Indian Legal Translator...[Same detailed prompt as before]

#     INPUT LEGAL DOCUMENT:
#     ---
#     {text}
#     ---

#     OUTPUT TRANSLATION (mirror of original, in English):
#     """

def translate_text(text: str, model: GenerativeModel) -> str:
    """Translates text using a generative model."""
    if not text.strip():
        logger.warning("Input text for translation is empty.")
       
        return ""
    prompt = create_translation_prompt(text)
    try:
        logger.info("Sending translation request to model...")
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.2, "top_p": 0.95, "top_k": 40},
            stream=False
        )
        return response.text.strip()
    except ValueError:
        raise TranslationError("Translation failed. The model's response was blocked or empty.")

# ======================================================
# 🚀 MAIN PIPELINE EXECUTION
# ======================================================
def main(file_content: bytes, filename: str):
    """Main function to run the entire end-to-end pipeline."""
    try:
        logger.info("Starting pipeline...")
        config = PipelineConfig.from_env()
        docai_client, translation_model = initialize_clients(config)

        extracted_text = extraction_agent(file_content,filename, docai_client, config)
        logger.info("✅ Text extracted successfully.")

        translated_text = translate_text(extracted_text, translation_model)
        logger.info("✅ Text translated successfully.")

        print("\n" + "="*80)
        print("✅ PIPELINE COMPLETED: FINAL TRANSLATED OUTPUT")
        print("="*80)
        print(translated_text)
        print("\n" + "="*80)

    except (ConfigError, AuthenticationError, FileProcessingError, ExtractionError, TranslationError) as e:
        logger.error(f"🚨 A pipeline error occurred: {e}")
        sys.exit(1)

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description="End-to-end Document Extraction & Legal Translation Pipeline.")
#     parser.add_argument("file_path_parts", nargs='+', help="The full path to the document file to process.")
#     args = parser.parse_args()
#     file_path = " ".join(args.file_path_parts)
#     main(file_path,"")