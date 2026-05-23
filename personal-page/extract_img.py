import fitz
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
pdf_path = r'c:/Users/11616/Desktop/演示文稿1.pdf'
out_path = os.path.join(script_dir, 'portrait.png')

doc = fitz.open(pdf_path)
page = doc[0]
print(f"Page rect: {page.rect}")
print(f"Page text: {page.get_text()}")
images = page.get_images(full=True)
print(f"Images: {images}")

# Render page as image
pix = page.get_pixmap(dpi=200)
pix.save(out_path)
print(f"Saved to {out_path}")
print(f"File exists: {os.path.exists(out_path)}")
print(f"Size: {os.path.getsize(out_path) if os.path.exists(out_path) else 'N/A'}")
doc.close()