import fitz, os, sys

# Change to script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Open PDF
doc = fitz.open('source.pdf')
page = doc[0]

# Render to image
pix = page.get_pixmap(dpi=96)

# Save PNG
pix.save('portrait.png')

# Verify
print('PORTRAIT_SAVED size=' + str(os.path.getsize('portrait.png')))
doc.close()