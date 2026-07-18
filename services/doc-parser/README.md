# Neo Chat local document parser

This sidecar converts common document attachments to Markdown without calling
MinerU, LlamaParse, or an OCR provider.

Supported formats:

- PDF files with a text layer (scanned PDFs are rejected until OCR is added)
- DOCX, XLSX, XLS, and PPTX
- Common UTF-8/GB18030 text files

The Compose file builds and starts it automatically. To run it directly for a
local development server:

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

Then configure Neo Chat with:

```bash
DOCUMENT_PARSE_BACKEND=local
DOCUMENT_PARSE_BASE_URL=http://127.0.0.1:8000
```
