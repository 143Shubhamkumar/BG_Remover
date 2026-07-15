from fastapi import FastAPI, File, UploadFile, Response, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image, ImageFilter, ImageChops
import io
import numpy as np
import cv2

app = FastAPI()

# More robust CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Using 'isnet-general-use' for the highest quality results
session = new_session("isnet-general-use")


@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    bg_color: str = Form(None),
    smoothness: int = Form(15, ge=0, le=40),
    add_shadow: bool = Form(False)
):
    print(f"--- Processing New Image: {file.filename} ---")
    try:
        # 1. Read the uploaded file
        input_data = await file.read()
        img = Image.open(io.BytesIO(input_data)).convert("RGBA")

        # Capture manual transparency if it exists (user erased parts)
        manual_mask = img.split()[3]

        # --- SERVER PROTECTION: SAFE RESIZE ---
        safe_limit = 2000
        if max(img.size) > safe_limit:
            img.thumbnail((safe_limit, safe_limit), Image.Resampling.LANCZOS)
            manual_mask.thumbnail((safe_limit, safe_limit), Image.Resampling.NEAREST)

        # 2. AI Background Removal
        print("3. AI is removing background...")
        ai_foreground = remove(
            img,
            alpha_matting=True,
            alpha_matting_erode_size=smoothness,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            session=session
        )

        # 3. Merge AI Alpha with Manual Alpha
        # Use ImageChops.darker to find the minimum of both alpha channels
        ai_alpha = ai_foreground.split()[3]
        final_alpha = ImageChops.darker(ai_alpha, manual_mask)
        
        ai_foreground.putalpha(final_alpha)

        # 4. Final composition
        # Use transparent by default since frontend handles coloring
        fill_color = (0, 0, 0, 0)
        if bg_color and bg_color.startswith("#"):
            try:
                if len(bg_color) == 7: # #RRGGBB
                    r = int(bg_color[1:3], 16)
                    g = int(bg_color[3:5], 16)
                    b = int(bg_color[5:7], 16)
                    fill_color = (r, g, b, 255)
            except ValueError:
                pass

        final_img = Image.new("RGBA", ai_foreground.size, fill_color)

        # 5. Apply AI Shadow
        if add_shadow:
            shadow = Image.new("RGBA", ai_foreground.size, (0, 0, 0, 0))
            shadow_color = Image.new("RGBA", ai_foreground.size, (0, 0, 0, 150))
            shadow.paste(shadow_color, (0, 0), mask=final_alpha)
            blur_radius = max(ai_foreground.size) // 100
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=blur_radius))
            offset = blur_radius // 2
            final_img.paste(shadow, (offset, offset), mask=shadow)

        # 6. Paste result
        final_img.paste(ai_foreground, (0, 0), mask=ai_foreground)

        # 7. Save and Send
        buf = io.BytesIO()
        final_img.save(buf, format="PNG")
        print("--- Done! Sending clean image ---")
        return Response(content=buf.getvalue(), media_type="image/png")
    except Exception as e:
        print(f"!!! Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/inpaint")
async def inpaint_image(
    image: UploadFile = File(...),
    mask: UploadFile = File(...)
):
    print("--- Magic Remover: Starting Inpainting ---")
    try:
        img_bytes = await image.read()
        mask_bytes = await mask.read()

        nparr_img = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr_img, cv2.IMREAD_UNCHANGED)

        nparr_mask = np.frombuffer(mask_bytes, np.uint8)
        mask_img = cv2.imdecode(nparr_mask, cv2.IMREAD_GRAYSCALE)

        if img is None or mask_img is None:
            raise HTTPException(status_code=400, detail="Invalid image or mask data")

        if img.shape[2] == 4:
            # Separate BGR and Alpha
            bgr = img[:, :, 0:3]
            alpha = img[:, :, 3]

            # Inpaint BGR
            inpainted_bgr = cv2.inpaint(bgr, mask_img, 3, cv2.INPAINT_TELEA)
            
            # ALSO inpaint Alpha to fill holes in transparency
            inpainted_alpha = cv2.inpaint(alpha, mask_img, 3, cv2.INPAINT_TELEA)

            result = cv2.merge([
                inpainted_bgr[:, :, 0], 
                inpainted_bgr[:, :, 1], 
                inpainted_bgr[:, :, 2], 
                inpainted_alpha
            ])
        else:
            result = cv2.inpaint(img, mask_img, 3, cv2.INPAINT_TELEA)

        _, encoded_img = cv2.imencode('.png', result)
        return Response(content=encoded_img.tobytes(), media_type="image/png")
    except Exception as e:
        print(f"!!! Error in magic_remover: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/")
def read_root():
    return {"message": "Background Remover API is running!"}
