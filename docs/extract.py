import os
import docx2txt
import fitz  # PyMuPDF

docs_dir = r"c:\Users\rishi\Downloads\student-erp-system\docs"
for filename in os.listdir(docs_dir):
    if filename.endswith(".docx") or filename.endswith(".pdf"):
        filepath = os.path.join(docs_dir, filename)
        txt_path = os.path.join(docs_dir, filename + ".txt")
        print(f"Extracting {filename}...")
        try:
            if filename.endswith(".docx"):
                text = docx2txt.process(filepath)
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(text)
            elif filename.endswith(".pdf"):
                doc = fitz.open(filepath)
                with open(txt_path, "w", encoding="utf-8") as f:
                    for page in doc:
                        f.write(page.get_text())
            print(f"Extraction successful: {txt_path}")
        except Exception as e:
            print(f"Failed to extract {filename}: {e}")
