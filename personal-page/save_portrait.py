import fitz
import os

output_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(output_dir, 'portrait.png')

doc = fitz.open(r'c:/Users/11616/Desktop/演示文稿1.pdf')
page = doc[0]
pix = page.get_pixmap(dpi=200)
pix.save(output_path)

print(f'Saved to: {output_path}')
print(f'File exists: {os.path.exists(output_path)}')
print(f'File size: {os.path.getsize(output_path)} bytes')

doc.close()