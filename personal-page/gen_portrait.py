import fitz, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
doc = fitz.open('source.pdf')
page = doc[0]
pix = page.get_pixmap(dpi=96)
pix.save('portrait.png')
print('OK', os.path.getsize('portrait.png'))
doc.close()