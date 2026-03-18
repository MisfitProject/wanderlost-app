import PIL.Image

# Create a 1x1 fully transparent PNG
img = PIL.Image.new("RGBA", (512, 512), (0, 0, 0, 0))
img.save("empty-splash.png", "PNG")
print("empty-splash.png generated!")
