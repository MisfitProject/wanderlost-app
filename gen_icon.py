import urllib.request
from PIL import Image, ImageDraw, ImageFont
import os

font_url = "https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf"
font_path = "greatvibes.ttf"

urllib.request.urlretrieve(font_url, font_path)

def create_icon(size, output_file):
    bg_color = (245, 241, 230)  # #f5f1e6 (paper-light)
    text_color = (44, 44, 44)   # #2c2c2c (ink-dark)
    
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Estimate font size to be roughly 80% of image height
    font_size = int(size * 0.9)
    try:
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        font = ImageFont.load_default()
        
    text = "W"
    
    # PIL getsize/textbbox
    if hasattr(font, 'getbbox'):
        bbox = font.getbbox(text)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
    else:
        text_width, text_height = draw.textsize(text, font=font)
        
    # Manual offset adjustment for script fonts (they usually have large ascenders/descenders)
    x = (size - text_width) / 2
    y = (size - text_height) / 2 - (size * 0.1) # Script fonts usually need upward adjustment
    
    draw.text((x, y), text, fill=text_color, font=font)
    img.save(output_file, "PNG")

create_icon(512, "icon-512.png")
create_icon(192, "icon-192.png")
print("Icons generated successfully!")
